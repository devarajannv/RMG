import { z } from 'zod';

const userStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'LOCKED']);

export const userIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const userRoleParamSchema = z.object({
  id: z.string().uuid(),
  roleId: z.string().uuid(),
});

export const createUserSchema = z
  .object({
    email: z.string().email().max(255),
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    password: z.string().min(12),
    status: userStatusSchema.optional(),
    roleIds: z.array(z.string().uuid()).optional(),
  })
  .strict();

export const updateUserSchema = z
  .object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    email: z.string().email().max(255).optional(),
    status: userStatusSchema.optional(),
  })
  .strict();

export const assignRoleSchema = z
  .object({
    roleId: z.string().uuid(),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(12),
  })
  .strict();
