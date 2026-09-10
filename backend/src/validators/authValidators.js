import { z } from 'zod';

export const PASSWORD_RULE =
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter and a number.';

export const passwordSchema = z
  .string()
  .min(8, PASSWORD_RULE)
  .max(72, 'Password must be at most 72 characters.')
  .refine(
    (value) => /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value),
    PASSWORD_RULE,
  );

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address.');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Reset token is missing or invalid.'),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Your current password is required.'),
  newPassword: passwordSchema,
});
