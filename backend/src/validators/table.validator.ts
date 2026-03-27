import { z } from 'zod';

export const createTableSchema = z.object({
  tableNumber: z.string().min(1).max(20),
  name: z.string().max(50).optional(),
  capacity: z.number().int().min(1).max(50),
  minCapacity: z.number().int().min(1).optional(),
  areaId: z.string().uuid().optional(),
  shape: z.enum(['rectangle', 'round', 'square', 'oval']).optional(),
  type: z.string().max(50).optional(),
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
