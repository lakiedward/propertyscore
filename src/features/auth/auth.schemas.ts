import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 8;

export const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});
export type Credentials = z.infer<typeof credentialsSchema>;

export const signUpSchema = z.object({
  email: z.email(),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(72),
});
export type SignUpValues = z.infer<typeof signUpSchema>;
