import { z } from 'zod';

/**
 * Schema for super admin updating an organization.
 * Explicitly whitelists allowed fields to prevent
 * injection of protected columns (id, owner_id, created_at, etc.).
 */
export const adminUpdateOrgSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(100).optional(),
  address: z.string().max(500).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional(),
  openingTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  closingTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  maxPartySize: z.number().int().min(1).max(100).optional(),
  defaultReservationDurationMin: z.number().int().min(15).max(480).optional(),
  minAdvanceBookingHours: z.number().min(0).max(168).optional(),
  maxAdvanceBookingDays: z.number().int().min(1).max(365).optional(),
  allowWalkIns: z.boolean().optional(),
  logoUrl: z.string().url().max(500).optional().nullable(),
}).strict(); // .strict() rejects any unknown keys

/**
 * Schema for toggling organization active status.
 * Ensures isActive is explicitly a boolean.
 */
export const adminToggleOrgStatusSchema = z.object({
  isActive: z.boolean(),
});
