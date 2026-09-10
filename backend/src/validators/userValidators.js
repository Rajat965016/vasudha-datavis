import { z } from 'zod';

import { emailSchema, passwordSchema } from './authValidators.js';

export const createAdminSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(120),
  email: emailSchema,
  /** Optional – a strong password is generated when omitted. */
  password: passwordSchema.optional(),
  sendCredentialsEmail: z.boolean().optional().default(true),
});

export const updateAdminSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update.',
  });

export const resetAdminPasswordSchema = z.object({
  password: passwordSchema.optional(),
  sendCredentialsEmail: z.boolean().optional().default(true),
});
