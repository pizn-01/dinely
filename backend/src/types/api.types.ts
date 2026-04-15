import { Request } from 'express';
import { UserRole } from './enums';

// ─── Auth Types ────────────────────────────────────────

export interface JwtPayload {
  sub: string;          // user id
  email: string;
  role: UserRole;
  restaurantId?: string;
  jti?: string;         // unique token ID for revocation
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  restaurantId?: string;
}

// ─── API Response Types ────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ─── Organization Types ────────────────────────────────

export interface CreateOrganizationDto {
  name: string;
  address?: string;
  country?: string;
  timezone?: string;
  openingTime?: string;
  closingTime?: string;
}

export interface UpdateOrganizationDto {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  openingTime?: string;
  closingTime?: string;
  currency?: string;
  allowMergeableTables?: boolean;
  allowWalkIns?: boolean;
  defaultReservationDurationMin?: number;
  minAdvanceBookingHours?: number;
  maxAdvanceBookingDays?: number;
  maxPartySize?: number;
  requirePayment?: boolean;
  cancellationPolicy?: string;
  setupCompleted?: boolean;
  logoUrl?: string;
  vipMembershipFee?: number;
  weeklyHours?: Record<string, { open: string; close: string; closed: boolean }>;
}

// ─── Table Types ───────────────────────────────────────

export interface CreateTableDto {
  tableNumber: string;
  name?: string;
  capacity: number;
  minCapacity?: number;
  areaId?: string;
  shape?: string;
  type?: string;
  isMergeable?: boolean;
  positionX?: number;
  positionY?: number;
  isPremium?: boolean;
  premiumPrice?: number;
  parentTableId?: string | null;
}

export interface UpdateTableDto extends Partial<CreateTableDto> {
  isActive?: boolean;
}

// ─── Floor Area Types ──────────────────────────────────

export interface CreateAreaDto {
  name: string;
  displayOrder?: number;
}

export interface UpdateAreaDto extends Partial<CreateAreaDto> {
  isActive?: boolean;
}

// ─── Reservation Types ─────────────────────────────────

export interface CreateReservationDto {
  tableId?: string;
  reservationDate: string;
  startTime: string;
  endTime?: string;
  partySize: number;
  guestFirstName: string;
  guestLastName?: string;
  guestEmail: string;
  guestPhone?: string;
  specialRequests?: string;
  source?: string;
  paymentMethod?: string;
}

export interface UpdateReservationDto extends Partial<CreateReservationDto> {
  internalNotes?: string;
}

export interface ReservationFilterQuery extends PaginationQuery {
  date?: string;
  status?: string;
  tableId?: string;
  search?: string;
}

// ─── Staff Types ───────────────────────────────────────

export interface InviteStaffDto {
  email: string;
  name: string;
  role: string;
}

export interface UpdateStaffDto {
  role?: string;
  name?: string;
  phone?: string;
  isActive?: boolean;
}

// ─── Customer Types ────────────────────────────────────

export interface CustomerProfile {
  id: string;
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  totalVisits: number;
  lastVisitAt?: string;
}

// ─── Auth Request/Response Types ───────────────────────

export interface SignupDto {
  businessName: string;
  ownerName: string;
  email: string;
  password: string;
  phone?: string;
  country?: string;
  timezone?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface CustomerSignupDto {
  firstName: string;
  lastName?: string;
  email: string;
  password: string;
  phone?: string;
}

export interface CustomerLoginDto {
  email: string;
  password: string;
}

export interface StaffLoginDto {
  email: string;
  password: string;
  restaurantSlug?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    role: UserRole;
    name: string;
    isVip?: boolean;
  };
  token: string;
  refreshToken?: string;
  restaurant?: {
    id: string;
    name: string;
    slug: string;
    setupCompleted: boolean;
    openingTime?: string;
    stripeAccountId?: string;
    stripeOnboardingComplete?: boolean;
    vipMembershipFee?: number;
  };
}

// ─── Waiting List Types ────────────────────────────────

export interface CreateWaitingListDto {
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  partySize: number;
  requestedDate: string;
  requestedTime?: string;
  preferredArea?: string;
  notes?: string;
}
