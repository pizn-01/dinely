import { supabaseAdmin } from '../config/database';
import { AppError, NotFoundError } from '../middleware/errorHandler';
import { InviteStaffDto, UpdateStaffDto } from '../types/api.types';
import { UserRole } from '../types/enums';
import { generateToken, generateRefreshToken } from '../middleware/auth';
import { sanitizeSearch } from '../utils/sanitize';
import { emailService } from './email.service';

export class StaffService {
  /**
   * List all staff for a restaurant.
   */
  async list(restaurantId: string, roleFilter?: string) {
    let query = supabaseAdmin
      .from('staff_members')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (roleFilter && roleFilter !== 'all') {
      query = query.eq('role', roleFilter);
    }

    const { data, error } = await query;

    if (error) throw new AppError('Failed to fetch staff', 500);
    return (data || []).map(this.formatStaff);
  }

  /**
   * Get a single staff member.
   */
  async getById(staffId: string, restaurantId: string) {
    const { data, error } = await supabaseAdmin
      .from('staff_members')
      .select('*')
      .eq('id', staffId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (error || !data) throw new NotFoundError('Staff member');
    return this.formatStaff(data);
  }

  /**
   * Invite a new staff member via email.
   * 
   * Flow:
   * 1. Check for duplicate staff record in this restaurant
   * 2. Create staff_members tracking record
   * 3. Create/find Supabase Auth user via generateLink (no default Supabase email sent)
   * 4. Send our branded invitation email via emailService
   * 5. Return staff record (NO invite link — email only)
   */
  async invite(restaurantId: string, dto: InviteStaffDto, origin?: string) {
    // 1. Check for existing staff member in this restaurant
    const { data: existing } = await supabaseAdmin
      .from('staff_members')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('email', dto.email)
      .single();

    if (existing) {
      throw new AppError('Staff member with this email already exists in this restaurant', 409);
    }

    // Get the restaurant name for the email
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', restaurantId)
      .single();

    const restaurantName = org?.name || 'Restaurant';
    const staffName = dto.name || dto.email.split('@')[0];

    // 2. Create the local staff tracking record
    const { data: staffRecord, error: insertError } = await supabaseAdmin
      .from('staff_members')
      .insert({
        restaurant_id: restaurantId,
        name: staffName,
        email: dto.email,
        role: dto.role,
        invited_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError || !staffRecord) {
      throw new AppError('Failed to create staff record', 500);
    }

    const FRONTEND_URL = origin || process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteToken = staffRecord.id;
    const redirectTo = `${FRONTEND_URL}/accept-invite?token=${inviteToken}`;

    // 3. Create or find the Supabase Auth user via generateLink
    //    This does NOT send Supabase's default email — we send our own branded one.
    let authUserId: string | null = null;

    try {
      // Try invite type first (creates user if doesn't exist)
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email: dto.email,
        options: { redirectTo },
      });

      if (linkError) {
        // User might already exist — try magiclink instead
        console.log(`[StaffService] generateLink 'invite' failed (user may exist), trying magiclink...`);
        const { data: magicData } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: dto.email,
          options: { redirectTo },
        });

        authUserId = magicData?.user?.id || null;
      } else {
        authUserId = linkData?.user?.id || null;
      }
    } catch (err: any) {
      console.error(`[StaffService] Auth link generation failed:`, err.message);
    }

    // 4. Bridge the auth user to the staff record
    if (authUserId) {
      await supabaseAdmin
        .from('staff_members')
        .update({ user_id: authUserId })
        .eq('id', staffRecord.id);

      // Set user metadata for role
      await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        user_metadata: { role: dto.role, name: staffName },
      });
    }

    // 5. Send our branded invitation email
    try {
      await emailService.sendStaffInvite({
        to: dto.email,
        staffName,
        restaurantName,
        inviteToken,
        role: dto.role,
        baseUrl: FRONTEND_URL,
      });
      console.log(`[StaffService] ✅ Invitation email sent to ${dto.email}`);
    } catch (emailError: any) {
      console.error(`[StaffService] ⚠️  Email send failed (invite still created):`, emailError.message);
      // Don't throw — the staff record is created; admin can resend later
    }

    return {
      ...this.formatStaff(staffRecord),
      emailSent: true,
      message: `Invitation email sent to ${dto.email}`,
    };
  }

  /**
   * Accept a staff invitation — finalizes the bridged account.
   */
  async acceptInvite(staffRecordId: string, password: string, name: string) {
    // 1. Get pending staff record
    const { data: staffRecord, error: staffErr } = await supabaseAdmin
      .from('staff_members')
      .select('*, organizations(id, name, slug, setup_completed)')
      .eq('id', staffRecordId)
      .is('accepted_at', null)
      .single();

    if (staffErr || !staffRecord) {
      throw new NotFoundError('Invitation not found or already accepted');
    }

    const roleMap: Record<string, UserRole> = {
      admin: UserRole.RESTAURANT_ADMIN,
      manager: UserRole.MANAGER,
      host: UserRole.HOST,
      viewer: UserRole.VIEWER,
    };

    const userRole = roleMap[staffRecord.role] || UserRole.VIEWER;

    let authUser;

    // 2. Either process the Phase 5 Auth profile or fallback to creating local legacy profiles
    if (staffRecord.user_id) {
       // Profile already fired externally via inviteUserByEmail. We strictly push the chosen password
       const { data: updatedUser, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(staffRecord.user_id, {
         password,
         user_metadata: { name, role: userRole }
       });
       
       if (updateErr || !updatedUser.user) {
         throw new AppError(updateErr?.message || 'Failed to update user password', 500);
       }
       authUser = updatedUser.user;
    } else {
       // Legacy Phase 1/2 Stub logic: Create brand new from scratch!
       const { data: newAuthData, error: authError } = await supabaseAdmin.auth.admin.createUser({
         email: staffRecord.email,
         password,
         email_confirm: true,
         user_metadata: { name, role: userRole },
       });
       
       if (authError || !newAuthData.user) {
         throw new AppError(authError?.message || 'Failed to create account', 500);
       }
       authUser = newAuthData.user;
    }

    // 3. Link finalized auth user to local tracker
    const { error: finalizeErr } = await supabaseAdmin
      .from('staff_members')
      .update({
        user_id: authUser.id,
        name,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', staffRecordId);

    if (finalizeErr) {
      throw new AppError('Failed to accept invitation and link records properly', 500);
    }

    // 4. Generate Local JWT
    const org = staffRecord.organizations;
    const token = generateToken({
      sub: authUser.id,
      email: staffRecord.email,
      role: userRole,
      restaurantId: org.id,
    });

    const refreshToken = generateRefreshToken(authUser.id);

    return {
      user: {
        id: authUser.id,
        email: staffRecord.email,
        role: userRole,
        name,
      },
      token,
      refreshToken,
      restaurant: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        setupCompleted: org.setup_completed,
      },
    };
  }

  /**
   * Update staff member.
   */
  async update(staffId: string, restaurantId: string, dto: UpdateStaffDto) {
    const updateData: Record<string, any> = {};

    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.isActive !== undefined) updateData.is_active = dto.isActive;

    const { data, error } = await supabaseAdmin
      .from('staff_members')
      .update(updateData)
      .eq('id', staffId)
      .eq('restaurant_id', restaurantId)
      .select()
      .single();

    if (error || !data) throw new NotFoundError('Staff member');
    return this.formatStaff(data);
  }

  /**
   * Remove staff member — hard delete from database and Supabase auth.
   */
  async remove(staffId: string, restaurantId: string) {
    // 1. Fetch the staff record to get the linked auth user ID
    const { data: staff } = await supabaseAdmin
      .from('staff_members')
      .select('id, role, user_id, email')
      .eq('id', staffId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (!staff) throw new NotFoundError('Staff member');

    // 2. Hard-delete the staff_members record from the database
    const { error } = await supabaseAdmin
      .from('staff_members')
      .delete()
      .eq('id', staffId)
      .eq('restaurant_id', restaurantId);

    if (error) throw new AppError('Failed to remove staff member', 500);

    // 3. Remove the Supabase auth user if one was linked
    if (staff.user_id) {
      try {
        // Check if this user has staff records in OTHER restaurants before deleting auth
        const { data: otherRecords } = await supabaseAdmin
          .from('staff_members')
          .select('id')
          .eq('user_id', staff.user_id)
          .limit(1);

        // Only delete auth user if they have no other restaurant memberships
        if (!otherRecords || otherRecords.length === 0) {
          const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(staff.user_id);
          if (authErr) {
            console.error(`[StaffService] Failed to delete auth user ${staff.user_id}:`, authErr.message);
          } else {
            console.log(`[StaffService] ✅ Deleted auth user ${staff.user_id} (${staff.email})`);
          }
        } else {
          console.log(`[StaffService] Auth user ${staff.user_id} has other restaurant memberships, keeping auth account`);
        }
      } catch (authCleanupErr: any) {
        console.error(`[StaffService] Auth cleanup error:`, authCleanupErr.message);
        // Don't throw — the staff record is already deleted
      }
    }

    return { success: true };
  }

  /**
   * Search staff by name, email, or phone.
   */
  async search(restaurantId: string, query: string) {
    const safe = sanitizeSearch(query);
    const { data, error } = await supabaseAdmin
      .from('staff_members')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .or(`name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`);

    if (error) throw new AppError('Failed to search staff', 500);
    return (data || []).map(this.formatStaff);
  }

  // ─── Formatter ────────────────────────────────────────

  private formatStaff(row: any) {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      role: row.role,
      isActive: row.is_active,
      invitedAt: row.invited_at,
      acceptedAt: row.accepted_at,
      lastActiveAt: row.last_active_at,
      createdAt: row.created_at,
    };
  }
}

export const staffService = new StaffService();
