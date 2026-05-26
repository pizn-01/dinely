import { z } from 'zod';

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const createTableSchema = z.object({
  tableNumber: z.union([z.string(), z.number()]).transform(val => String(val)).pipe(z.string().min(1).max(20)),
  name: z.string().max(50).optional(),
  capacity: z.union([z.number(), z.string().transform(val => parseInt(val, 10))]).pipe(z.number().int().min(1).max(50)),
  minCapacity: z.union([z.number(), z.string().transform(val => parseInt(val, 10))]).pipe(z.number().int().min(1)).optional(),
  areaId: z.string().uuid().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  shape: z.enum(['rectangle', 'round', 'circle', 'square', 'oval']).optional(),
  type: z.string().max(50).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  isMergeable: z.boolean().optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
  isPremium: z.boolean().optional(),
  premiumPrice: z.number().min(0).nullable().optional(),
  parentTableId: z.string().uuid().optional().nullable(),
  isMerged: z.boolean().optional(),
  mergedTableIds: z.array(z.string().uuid()).optional(),
});

export const updateTableSchema = createTableSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const bulkUpdatePositionsSchema = z.object({
  tables: z.array(
    z.object({
      id: z.string().uuid(),
      positionX: z.number(),
      positionY: z.number(),
    })
  ).max(200),
});

export const createAreaSchema = z.object({
  name: z.string().min(1).max(100),
  displayOrder: z.number().int().optional(),
});

export const updateAreaSchema = createAreaSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const mergeTablesSchema = z.object({
  sourceTableIds: z.array(z.string().uuid()).min(2),
  mergedTable: z.object({
    name: z.string().min(1).max(50),
    capacity: z.number().int().min(1)
  }),
  /** First day the merged table replaces its parts (YYYY-MM-DD). If after org-local today, children stay active until then. */
  mergeEffectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: timeSchema.optional(),
  endTime: timeSchema.optional(),
}).refine((data) => Boolean(data.startTime) === Boolean(data.endTime), {
  message: 'startTime and endTime must be provided together',
  path: ['endTime'],
}).refine((data) => !data.startTime || !data.endTime || data.startTime < data.endTime, {
  message: 'endTime must be after startTime',
  path: ['endTime'],
});
