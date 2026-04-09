import { z } from 'zod';

export const createReservationSchema = z.object({
  tableId: z.string().uuid().optional(),
  reservationDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine(d => {
      const today = new Date().toISOString().split('T')[0];
      return d >= today;
    }, { message: 'Reservation date cannot be in the past' }),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  partySize: z.number().int().min(1).max(50), // Org-specific maxPartySize enforced in service layer
  guestFirstName: z.string().min(1).max(100),
  guestLastName: z.string().max(100).optional(),
  guestEmail: z.string().email(),
  guestPhone: z.string().max(50).optional(),
  specialRequests: z.string().max(1000).optional(),
  source: z.enum(['website', 'app', 'pos', 'phone', 'walk_in', 'third_party']).optional(),
  paymentMethod: z.string().max(50).optional(),
});

export const updateReservationSchema = createReservationSchema.partial().extend({
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
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sortBy: z.string().optional().default('start_time'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});
