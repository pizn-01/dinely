import { z } from 'zod';

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(255),
  address: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  openingTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Must be in HH:MM or HH:MM:SS format').optional(),
  closingTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Must be in HH:MM or HH:MM:SS format').optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  openingTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  closingTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  currency: z.string().max(10).optional(),
  allowMergeableTables: z.boolean().optional(),
  allowWalkIns: z.boolean().optional(),
  defaultReservationDurationMin: z.number().int().min(15).max(480).optional(),
  minAdvanceBookingHours: z.number().int().min(0).optional(),
  maxAdvanceBookingDays: z.number().int().min(1).max(365).optional(),
  maxPartySize: z.number().int().min(1).max(100).optional(),
  requirePayment: z.boolean().optional(),
  cancellationPolicy: z.string().optional(),
});

export const setupStepSchema = z.object({
  setupStep: z.number().int().min(0).max(4),
  setupCompleted: z.boolean().optional(),
});
