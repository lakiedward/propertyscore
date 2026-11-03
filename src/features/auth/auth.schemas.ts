import { z } from 'zod';
import type { Locale } from '@/i18n/i18n';
import { messageKey } from '@/i18n/validation';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
const FULL_NAME_MAX_LENGTH = 120;

export const authSearchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
});

const emailSchema = z.email({ error: messageKey('auth:fields.email.error') });

const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, {
    error: messageKey('auth:fields.password.tooShort', { count: PASSWORD_MIN_LENGTH }),
  })
  .max(PASSWORD_MAX_LENGTH);

export const credentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: messageKey('auth:fields.password.required') }),
});
export type Credentials = z.infer<typeof credentialsSchema>;

export const signUpSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, { error: messageKey('auth:fields.name.error') })
    .max(FULL_NAME_MAX_LENGTH, {
      error: messageKey('auth:fields.name.tooLong', { count: FULL_NAME_MAX_LENGTH }),
    }),
  email: emailSchema,
  password: newPasswordSchema,
  acceptsTerms: z.boolean().refine((value) => value, {
    error: messageKey('auth:fields.terms.error'),
  }),
});
export type SignUpValues = z.infer<typeof signUpSchema>;

export function toSignUpPayload(values: SignUpValues, locale: Locale, redirect?: string) {
  return {
    email: values.email,
    password: values.password,
    fullName: values.fullName,
    locale,
    redirect,
  };
}
export type SignUpPayload = ReturnType<typeof toSignUpPayload>;

export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});
export type PasswordResetRequestValues = z.infer<typeof passwordResetRequestSchema>;

export const newPasswordFormSchema = z
  .object({
    password: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    error: messageKey('auth:newPassword.mismatch'),
  });
export type NewPasswordFormValues = z.infer<typeof newPasswordFormSchema>;

export const authCallbackSearchSchema = authSearchSchema.extend({
  error_code: z.string().optional().catch(undefined),
});
