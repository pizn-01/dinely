import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../config/database';
import { generateToken, generateRefreshToken } from '../middleware/auth';
import { generateUniqueSlug } from '../utils/slug';
import { createClient } from '@supabase/supabase-js';
import { SignupDto, LoginDto, StaffLoginDto, AuthResponse, JwtPayload, CustomerSignupDto, CustomerLoginDto } from '../types/api.types';
import { UserRole } from '../types/enums';
import { AppError, NotFoundError, ConflictError } from '../middleware/errorHandler';
import { env } from '../config/env';
import { emailService } from './email.service';

export class AuthService {
  /**
   * Register a new restaurant owner + create organization.
   */
  async signup(dto: SignupDto): Promise<AuthResponse> {
    const { data: existingUser } = await supabaseAdmin
      .from('staff_members')
      .select('id')
      .eq('email', dto.email)
      .single();

    if (existingUser) {
      throw new ConflictError('An account with this email already exists');
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
      user_metadata: {
        name: dto.ownerName,
        role: UserRole.RESTAURANT_ADMIN,
      },
    });

    if (authError || !authData.user) {
      throw new AppError(authError?.message || 'Failed to create user', 500);
    }

    const userId = authData.user.id;

    const slug = await generateUniqueSlug(dto.businessName);
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: dto.businessName,
        slug,
        owner_id: userId,
        country: dto.country || 'United Kingdom',
        timezone: dto.timezone || 'Europe/London',
        phone: dto.phone || null,
      })
      .select()
      .single();

    if (orgError || !org) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new AppError('Failed to create organization', 500);
    }

    await supabaseAdmin.from('staff_members').insert({
      user_id: userId,
      restaurant_id: org.id,
      role: 'admin',
      name: dto.ownerName,
      email: dto.email,
      accepted_at: new Date().toISOString(),
    });

    const token = generateToken({
      sub: userId,
      email: dto.email,
      role: UserRole.RESTAURANT_ADMIN,
      restaurantId: org.id,
    });

    const refreshToken = generateRefreshToken(userId);

    return {
      user: {
        id: userId,
        email: dto.email,
        role: UserRole.RESTAURANT_ADMIN,
        name: dto.ownerName,
      },
      token,
      refreshToken,
      restaurant: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        setupCompleted: org.setup_completed,
        openingTime: org.opening_time,
      },
    };
  }

  /**
   * Login for restaurant admin/owner.
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    // Use a fresh anon client for sign-in to avoid mutating the global admin client
    const tempClient = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_ANON_KEY as string, {
      auth: { persistSession: false },
    });

    const { data: authData, error: authError } = await tempClient.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (authError || !authData.user) {
      throw new AppError('Invalid email or password', 401);
    }

    const userId = authData.user.id;

    // Use .limit(1) instead of .single() to avoid errors when a user
    // has staff memberships at multiple restaurants
    const { data: staffMembers, error: staffError } = await supabaseAdmin
      .from('staff_members')
      .select('*, organizations(*)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1);

    const staffMember = staffMembers?.[0] || null;

    if (staffError || !staffMember) {
      const { data: superAdmin } = await supabaseAdmin
        .from('super_admins')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (superAdmin) {
        const token = generateToken({
          sub: userId,
          email: dto.email,
          role: UserRole.SUPER_ADMIN,
        });

        return {
          user: {
            id: userId,
            email: dto.email,
            role: UserRole.SUPER_ADMIN,
            name: superAdmin.name,
          },
          token,
        };
      }

      throw new AppError('No active staff account found for this email', 401);
    }

    const roleMap: Record<string, UserRole> = {
      admin: UserRole.RESTAURANT_ADMIN,
      manager: UserRole.MANAGER,
      host: UserRole.HOST,
      viewer: UserRole.VIEWER,
    };

    const role = roleMap[staffMember.role] || UserRole.VIEWER;
    const org = staffMember.organizations;

    await supabaseAdmin
      .from('staff_members')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', staffMember.id);

    const token = generateToken({
      sub: userId,
      email: dto.email,
      role,
      restaurantId: org.id,
    });

    const refreshToken = generateRefreshToken(userId);

    return {
      user: {
        id: userId,
        email: dto.email,
        role,
        name: staffMember.name,
      },
      token,
      refreshToken,
      restaurant: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        setupCompleted: org.setup_completed,
        openingTime: org.opening_time,
      },
    };
  }

  /**
   * Staff-specific login (can specify restaurant slug).
   * When a slug is provided, scopes the staff membership lookup
   * to that specific restaurant. This prevents crashes when a
   * user has staff memberships at multiple restaurants.
   */
  async staffLogin(dto: StaffLoginDto): Promise<AuthResponse> {
    // Authenticate credentials first
    const tempClient = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_ANON_KEY as string, {
      auth: { persistSession: false },
    });

    const { data: authData, error: authError } = await tempClient.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (authError || !authData.user) {
      throw new AppError('Invalid email or password', 401);
    }

    const userId = authData.user.id;

    // Build staff lookup query, optionally scoped to a specific restaurant slug
    let query = supabaseAdmin
      .from('staff_members')
      .select('*, organizations(*)')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (dto.restaurantSlug) {
      // Filter by the organization's slug via the joined organizations table
      query = query.eq('organizations.slug', dto.restaurantSlug);
    }

    const { data: staffMembers } = await query.limit(1);
    const staffMember = staffMembers?.[0] || null;

    if (!staffMember) {
      // Fall back to super admin check
      const { data: superAdmins } = await supabaseAdmin
        .from('super_admins')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1);

      const superAdmin = superAdmins?.[0] || null;

      if (superAdmin) {
        const token = generateToken({
          sub: userId,
          email: dto.email,
          role: UserRole.SUPER_ADMIN,
        });
        return {
          user: {
            id: userId,
            email: dto.email,
            role: UserRole.SUPER_ADMIN,
            name: superAdmin.name,
          },
          token,
        };
      }

      throw new AppError('No active staff account found for this email', 401);
    }

    const roleMap: Record<string, UserRole> = {
      admin: UserRole.RESTAURANT_ADMIN,
      manager: UserRole.MANAGER,
      host: UserRole.HOST,
      viewer: UserRole.VIEWER,
    };

    const role = roleMap[staffMember.role] || UserRole.VIEWER;
    const org = staffMember.organizations;

    await supabaseAdmin
      .from('staff_members')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', staffMember.id);

    const token = generateToken({
      sub: userId,
      email: dto.email,
      role,
      restaurantId: org.id,
    });

    const refreshToken = generateRefreshToken(userId);

    return {
      user: {
        id: userId,
        email: dto.email,
        role,
        name: staffMember.name,
      },
      token,
      refreshToken,
      restaurant: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        setupCompleted: org.setup_completed,
        openingTime: org.opening_time,
      },
    };
  }

  /**
   * Get current user profile from JWT.
   */
  async getProfile(userId: string) {
    const { data: staffMember } = await supabaseAdmin
      .from('staff_members')
      .select('*, organizations(id, name, slug, setup_completed)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (staffMember) {
      return {
        id: userId,
        email: staffMember.email,
        name: staffMember.name,
        role: staffMember.role,
        restaurant: staffMember.organizations,
      };
    }

    const { data: superAdmin } = await supabaseAdmin
      .from('super_admins')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (superAdmin) {
      return {
        id: userId,
        email: superAdmin.email,
        name: superAdmin.name,
        role: UserRole.SUPER_ADMIN,
      };
    }

    throw new NotFoundError('User profile');
  }

  // ─── Password Reset ──────────────────────────────────

  /**
   * Request a password reset — sends reset link via Resend.
   */
  async forgotPassword(email: string, slug?: string, origin?: string) {
    const frontendUrl = origin || process.env.FRONTEND_URL || 'https://dinely-ashy.vercel.app';
    const redirectUrl = `${frontendUrl}/reset-password${slug ? `/${slug}` : ''}`;
    
    // Generate a recovery link through Supabase Admin without sending Supabase's default email
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: redirectUrl,
      }
    });

    if (error) {
      // Don't reveal if email exists or not
      console.error('Password reset generation error:', error.message);
    } else if (data?.properties?.action_link) {
      // Send the exact verification link from Supabase via Resend. 
      // Supabase will automatically redirect to the redirectTo URL above with the token hash appended.
      await emailService.sendPasswordReset({
        to: email,
        resetUrl: data.properties.action_link
      });
    }

    // Always return success to prevent email enumeration
    return { message: 'If an account with that email exists, a password reset link has been sent.' };
  }

  /**
   * Reset password using token from Supabase Auth email link.
   */
  async resetPassword(accessToken: string, newPassword: string) {
    // Verify the token with Supabase and get the user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !user) {
      throw new AppError('Invalid or expired token', 400);
    }

    // Update the password using the resolved user ID
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (error) {
      throw new AppError('Failed to reset password.', 400);
    }

    return { message: 'Password has been reset successfully.' };
  }

  // ─── Token Refresh ───────────────────────────────────

  /**
   * Refresh an access token using a refresh token.
   */
  async refreshToken(refreshTokenStr: string) {
    try {
      const decoded = jwt.verify(refreshTokenStr, env.JWT_SECRET) as any;

      if (decoded.type !== 'refresh') {
        throw new AppError('Invalid refresh token', 401);
      }

      const userId = decoded.sub;

      // Look up user to get fresh role/restaurant data
      const { data: staffMember } = await supabaseAdmin
        .from('staff_members')
        .select('*, organizations(*)')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (staffMember) {
        const roleMap: Record<string, UserRole> = {
          admin: UserRole.RESTAURANT_ADMIN,
          manager: UserRole.MANAGER,
          host: UserRole.HOST,
          viewer: UserRole.VIEWER,
        };

        const role = roleMap[staffMember.role] || UserRole.VIEWER;
        const org = staffMember.organizations;

        const token = generateToken({
          sub: userId,
          email: staffMember.email,
          role,
          restaurantId: org.id,
        });

        const newRefreshToken = generateRefreshToken(userId);

        return {
          token,
          refreshToken: newRefreshToken,
          user: {
            id: userId,
            email: staffMember.email,
            role,
            name: staffMember.name,
          },
        };
      }

      // Super admin
      const { data: superAdmin } = await supabaseAdmin
        .from('super_admins')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (superAdmin) {
        const token = generateToken({
          sub: userId,
          email: superAdmin.email,
          role: UserRole.SUPER_ADMIN,
        });

        const newRefreshToken = generateRefreshToken(userId);

        return {
          token,
          refreshToken: newRefreshToken,
          user: {
            id: userId,
            email: superAdmin.email,
            role: UserRole.SUPER_ADMIN,
            name: superAdmin.name,
          },
        };
      }

      throw new AppError('User not found', 401);
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Invalid or expired refresh token', 401);
    }
  }

  // ─── Customer Auth ───────────────────────────────────

  /**
   * Register a new customer member.
   */
  async customerSignup(dto: CustomerSignupDto): Promise<AuthResponse> {
    // Check for existing customer records:
    // - If a linked customer (with user_id) exists → conflict, can't re-register
    // - If an un-linked guest record exists → merge it with the new user
    const { data: existingCustomer } = await supabaseAdmin
      .from('customers')
      .select('id, user_id')
      .eq('email', dto.email)
      .maybeSingle();

    if (existingCustomer?.user_id) {
      throw new ConflictError('A customer account with this email already exists');
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
      user_metadata: {
        name: `${dto.firstName} ${dto.lastName || ''}`.trim(),
        role: UserRole.CUSTOMER,
      },
    });

    if (authError || !authData.user) {
      throw new AppError(authError?.message || 'Failed to create user', 500);
    }

    const userId = authData.user.id;
    let customer: any;

    if (existingCustomer) {
      // Merge: adopt the existing guest record by linking it to the new user
      const { data: merged, error: mergeError } = await supabaseAdmin
        .from('customers')
        .update({
          user_id: userId,
          first_name: dto.firstName,
          last_name: dto.lastName || null,
          phone: dto.phone || null,
        })
        .eq('id', existingCustomer.id)
        .select()
        .single();

      if (mergeError || !merged) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw new AppError('Failed to link existing customer profile', 500);
      }
      customer = merged;
    } else {
      // Create a fresh customer record
      const { data: newCustomer, error: customerError } = await supabaseAdmin
        .from('customers')
        .insert({
          user_id: userId,
          first_name: dto.firstName,
          last_name: dto.lastName || null,
          email: dto.email,
          phone: dto.phone || null,
          is_vip: false,
        })
        .select()
        .single();

      if (customerError || !newCustomer) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw new AppError('Failed to create customer profile', 500);
      }
      customer = newCustomer;
    }

    const token = generateToken({
      sub: userId,
      email: dto.email,
      role: UserRole.CUSTOMER,
    });

    const refreshToken = generateRefreshToken(userId);

    return {
      user: {
        id: userId,
        email: dto.email,
        role: UserRole.CUSTOMER,
        name: `${dto.firstName} ${dto.lastName || ''}`.trim(),
        isVip: customer.is_vip,
      },
      token,
      refreshToken,
    };
  }

  /**
   * Login for customer members.
   */
  async customerLogin(dto: CustomerLoginDto): Promise<AuthResponse> {
    // Use a fresh anon client for sign-in to avoid mutating the global admin client
    const tempClient = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_ANON_KEY as string, {
      auth: { persistSession: false },
    });

    const { data: authData, error: authError } = await tempClient.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (authError || !authData.user) {
      throw new AppError('Invalid email or password', 401);
    }

    const userId = authData.user.id;

    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (customerError || !customer) {
      throw new AppError('No customer profile found for this email', 404);
    }

    const token = generateToken({
      sub: userId,
      email: dto.email,
      role: UserRole.CUSTOMER,
    });

    const refreshToken = generateRefreshToken(userId);

    return {
      user: {
        id: userId,
        email: dto.email,
        role: UserRole.CUSTOMER,
        name: `${customer.first_name} ${customer.last_name || ''}`.trim(),
        isVip: customer.is_vip,
      },
      token,
      refreshToken,
    };
  }
}

export const authService = new AuthService();
