import { z } from 'zod';
import type { Locale } from '@/i18n/i18n';
import { messageKey } from '@/i18n/validation';
import { EMAIL_LINK_TYPES } from './auth.types';
import { isPhoneNumber, toE164Phone } from './auth.utils';

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
  .max(PASSWORD_MAX_LENGTH)
  .regex(/[A-Za-z]/u, { error: messageKey('auth:fields.password.needsLetterAndDigit') })
  .regex(/[0-9]/u, { error: messageKey('auth:fields.password.needsLetterAndDigit') });

const newPasswordFields = {
  password: newPasswordSchema,
  confirmPassword: z.string(),
};

function passwordsMatch(values: { password: string; confirmPassword: string }) {
  return values.password === values.confirmPassword;
}

const passwordsMatchOptions = {
  path: ['confirmPassword'],
  error: messageKey('auth:newPassword.mismatch'),
};

const phoneSchema = z
  .string()
  .trim()
  .min(1, { error: messageKey('auth:fields.phone.required'), abort: true })
  .refine(isPhoneNumber, { error: messageKey('auth:fields.phone.error') });

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
  phone: phoneSchema,
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
    phone: toE164Phone(values.phone),
    locale,
    redirect,
  };
}
export type SignUpPayload = ReturnType<typeof toSignUpPayload>;

export const accountPhoneFormSchema = z.object({
  phone: phoneSchema,
});
export type AccountPhoneFormValues = z.infer<typeof accountPhoneFormSchema>;

export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});
export type PasswordResetRequestValues = z.infer<typeof passwordResetRequestSchema>;

export const newPasswordFormSchema = z
  .object(newPasswordFields)
  .refine(passwordsMatch, passwordsMatchOptions);
export type NewPasswordFormValues = z.infer<typeof newPasswordFormSchema>;

export function changePasswordFormSchema(isCurrentPasswordRequired: boolean) {
  return z
    .object({
      currentPassword: isCurrentPasswordRequired
        ? z.string().min(1, { error: messageKey('auth:settings.password.currentRequired') })
        : z.string(),
      ...newPasswordFields,
    })
    .refine(passwordsMatch, passwordsMatchOptions);
}
export type ChangePasswordFormValues = z.infer<ReturnType<typeof changePasswordFormSchema>>;

export function deleteAccountFormSchema(isPasswordAccount: boolean) {
  return z.object({
    confirmation: isPasswordAccount
      ? z.string().min(1, { error: messageKey('auth:settings.delete.passwordRequired') })
      : z
          .string()
          .trim()
          .min(1, { error: messageKey('auth:settings.delete.emailRequired') }),
  });
}
export type DeleteAccountFormValues = z.infer<ReturnType<typeof deleteAccountFormSchema>>;

export const authCallbackSearchSchema = authSearchSchema.extend({
  error: z.string().optional().catch(undefined),
  error_code: z.string().optional().catch(undefined),
});

export const authConfirmSearchSchema = z.object({
  token_hash: z.string().min(1).optional().catch(undefined),
  type: z.enum(EMAIL_LINK_TYPES).optional().catch(undefined),
  next: z.string().optional().catch(undefined),
});
export type AuthConfirmSearch = z.infer<typeof authConfirmSearchSchema>;
