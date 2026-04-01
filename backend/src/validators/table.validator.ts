import { z } from 'zod';

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
