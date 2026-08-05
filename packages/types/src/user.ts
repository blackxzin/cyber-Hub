import { z } from 'zod';

// espelja enum RoleName do Prisma — mantém front/bot desacoplados do @prisma/client
export const userRoleSchema = z.enum(['ADMIN', 'ANALYST', 'VIEWER', 'BOT']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userDtoSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: userRoleSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type UserDto = z.infer<typeof userDtoSchema>;

export const updateUserSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
});
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
