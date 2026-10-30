import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 8;

export const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});
export type Credentials = z.infer<typeof credentialsSchema>;

export const signUpSchema = z.object({
  fullName: z.string().trim().min(1),
  email: z.email(),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(72),
  acceptsTerms: z.boolean().refine((value) => value),
});
export type SignUpValues = z.infer<typeof signUpSchema>;

export const passwordResetSchema = z.object({
  email: z.email(),
});
export type PasswordResetValues = z.infer<typeof passwordResetSchema>;

export const newPasswordSchema = z
  .object({
    password: z.string().min(PASSWORD_MIN_LENGTH).max(72),
    repeat: z.string(),
  })
  .refine((values) => values.password === values.repeat, { path: ['repeat'] });
export type NewPasswordValues = z.infer<typeof newPasswordSchema>;
