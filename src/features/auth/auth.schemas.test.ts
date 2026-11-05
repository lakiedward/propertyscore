import { messageKey } from '@/i18n/validation';
import {
  changePasswordFormSchema,
  credentialsSchema,
  deleteAccountFormSchema,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  signUpSchema,
  toSignUpPayload,
  type SignUpValues,
} from './auth.schemas';

const validSignUp: SignUpValues = {
  fullName: 'Ana Pop',
  email: 'nou@example.test',
  password: 'Parola-Lunga-1',
  acceptsTerms: true,
};

function signUpMessages(overrides: Partial<SignUpValues>): Record<string, string | undefined> {
  const result = signUpSchema.safeParse({ ...validSignUp, ...overrides });
  if (result.success) {
    return {};
  }
  return Object.fromEntries(
    result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
  );
}

describe('auth schemas', () => {
  it('accepts a complete sign-up and trims the name', () => {
    expect(signUpSchema.parse({ ...validSignUp, fullName: '  Ana Pop  ' }).fullName).toBe(
      'Ana Pop',
    );
  });

  it('keeps the password between the minimum and the maximum length', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
    expect(PASSWORD_MAX_LENGTH).toBe(72);
    expect(signUpMessages({ password: 'abc1234' }).password).toBe(
      messageKey('auth:fields.password.tooShort', { count: 8 }),
    );
    expect(signUpMessages({ password: 'abcd1234' }).password).toBeUndefined();
    expect(signUpMessages({ password: `${'a'.repeat(71)}1` }).password).toBeUndefined();
    expect(signUpMessages({ password: `${'a'.repeat(72)}1` }).password).toMatch(
      /^validation\.maxLength/,
    );
  });

  it('asks for at least one letter and one digit', () => {
    expect(signUpMessages({ password: 'parolafaracifre' }).password).toBe(
      messageKey('auth:fields.password.needsLetterAndDigit'),
    );
    expect(signUpMessages({ password: '1234567890' }).password).toBe(
      messageKey('auth:fields.password.needsLetterAndDigit'),
    );
    expect(signUpMessages({ password: 'Șosea123' }).password).toBeUndefined();
  });

  it('rejects a name made only of spaces and a name longer than 120 characters', () => {
    expect(signUpMessages({ fullName: '   ' }).fullName).toBe(messageKey('auth:fields.name.error'));
    expect(signUpMessages({ fullName: 'a'.repeat(120) }).fullName).toBeUndefined();
    expect(signUpMessages({ fullName: 'a'.repeat(121) }).fullName).toBe(
      messageKey('auth:fields.name.tooLong', { count: 120 }),
    );
  });

  it('requires the terms to be accepted', () => {
    expect(signUpMessages({ acceptsTerms: false }).acceptsTerms).toBe(
      messageKey('auth:fields.terms.error'),
    );
  });

  it('uses the auth keys for the sign-in messages', () => {
    const result = credentialsSchema.safeParse({ email: 'nope', password: '' });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      messageKey('auth:fields.email.error'),
      messageKey('auth:fields.password.required'),
    ]);
  });

  it('asks for the current password only when the account has one', () => {
    const values = {
      currentPassword: '',
      password: 'Parola-Noua-1',
      confirmPassword: 'Parola-Noua-1',
    };

    expect(changePasswordFormSchema(true).safeParse(values).error?.issues[0]?.message).toBe(
      messageKey('auth:settings.password.currentRequired'),
    );
    expect(changePasswordFormSchema(false).safeParse(values).success).toBe(true);
  });

  it('asks for the new password twice when changing it', () => {
    const result = changePasswordFormSchema(true).safeParse({
      currentPassword: 'Parola-Veche-1',
      password: 'Parola-Noua-1',
      confirmPassword: 'Parola-Alta-1',
    });

    expect(result.error?.issues).toEqual([
      expect.objectContaining({
        path: ['confirmPassword'],
        message: messageKey('auth:newPassword.mismatch'),
      }),
    ]);
  });

  it('asks for the password or the email to confirm deleting the account', () => {
    expect(
      deleteAccountFormSchema(true).safeParse({ confirmation: '' }).error?.issues[0]?.message,
    ).toBe(messageKey('auth:settings.delete.passwordRequired'));
    expect(
      deleteAccountFormSchema(false).safeParse({ confirmation: '  ' }).error?.issues[0]?.message,
    ).toBe(messageKey('auth:settings.delete.emailRequired'));
    expect(deleteAccountFormSchema(false).parse({ confirmation: ' ana@example.test ' })).toEqual({
      confirmation: 'ana@example.test',
    });
  });

  it('builds the sign-up payload with the language and the redirect', () => {
    expect(toSignUpPayload(validSignUp, 'en', '/publish')).toEqual({
      email: 'nou@example.test',
      password: 'Parola-Lunga-1',
      fullName: 'Ana Pop',
      locale: 'en',
      redirect: '/publish',
    });
  });
});
