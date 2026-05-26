import { z } from 'zod';

const trimmedOptionalName = z
  .union([z.string(), z.null(), z.undefined()])
  .optional()
  .transform((v) => {
    if (v == null) return undefined;
    const s = String(v).trim();
    return s === '' ? undefined : s;
  });

export const createReservationSchema = z.object({
  tableId: z.union([z.string().uuid(), z.null()]).optional(),
  autoMergeTableIds: z.array(z.string().uuid()).min(2).max(12).optional(),
  reservationDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine(d => {
      // Allow yesterday to prevent timezone boundary rejections for users behind UTC
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      return d >= yesterday;
    }, { message: 'Reservation date cannot be in the past' }),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  partySize: z.number().int().min(1).max(500), // Org-specific maxPartySize enforced in service layer
  guestFirstName: trimmedOptionalName,
  guestLastName: trimmedOptionalName,
  // Staff-created bookings (POS / walk-in / phone) may omit email.
  // Public flows should still provide it; service layer handles nulls safely.
  guestEmail: z.string().email().optional(),
  guestPhone: z.string().max(50).optional(),
  specialRequests: z.string().max(1000).optional(),
  source: z.enum(['website', 'app', 'pos', 'phone', 'walk_in', 'third_party']).optional(),
  paymentMethod: z.string().max(50).optional(),
});

export const updateReservationSchema = createReservationSchema
  .partial()
  .extend({
    tableId: z.union([z.string().uuid(), z.null()]).optional(),
    internalNotes: z.string().max(2000).optional(),
  });

export const updateReservationStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'arriving', 'seated', 'completed', 'cancelled', 'no_show']),
  cancellationReason: z.string().max(500).optional(),
});

export const reservationFilterSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.string().optional(),
  tableId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(500).optional().default(20),
  sortBy: z.string().optional().default('start_time'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

export const updateTotalAmountSchema = z.object({
  totalAmount: z.number().min(0, 'Total amount must be zero or positive'),
});

export const tableReportFilterSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
  tableId: z.string().uuid().optional(),
});

export const analyticsReportFilterSchema = z.object({
  period: z.enum(['daily', 'weekly', 'bi-weekly', 'monthly']).default('weekly'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
});
