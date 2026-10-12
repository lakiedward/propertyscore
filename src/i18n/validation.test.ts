import { z } from 'zod';
import { changeLocale, i18n } from './i18n';
import {
  parseValidationMessage,
  translateValidationMessage,
  validationMessage,
} from './validation';

function firstMessage(schema: z.ZodType, value: unknown): string {
  const result = schema.safeParse(value);
  if (result.success) {
    throw new Error('Expected the value to be invalid');
  }
  return result.error.issues[0]?.message ?? '';
}

function translate(message: string): string {
  return translateValidationMessage(i18n.getFixedT(null, 'common'), message);
}

describe('validation messages', () => {
  it('maps Zod issues to translation keys with their values', () => {
    expect(parseValidationMessage(firstMessage(z.string(), undefined)).key).toBe('required');
    expect(parseValidationMessage(firstMessage(z.string().trim().min(1), '  ')).key).toBe(
      'required',
    );
    expect(parseValidationMessage(firstMessage(z.email(), 'nope')).key).toBe('email');
    expect(parseValidationMessage(firstMessage(z.string().min(3), 'ab'))).toEqual({
      key: 'minLength',
      params: { count: 3 },
    });
    expect(parseValidationMessage(firstMessage(z.number().max(10), 11))).toEqual({
      key: 'max',
      params: { max: 10 },
    });
  });

  it('keeps an explicit key from a schema', () => {
    expect(parseValidationMessage(validationMessage('email')).key).toBe('email');
  });

  it('falls back to invalid for text that is not a validation key', () => {
    expect(parseValidationMessage('Something else').key).toBe('invalid');
  });

  it('uses the three Romanian plural forms', async () => {
    await changeLocale('ro');
    expect(translate(validationMessage('minLength', { count: 1 }))).toBe(
      'Introdu cel puțin 1 caracter.',
    );
    expect(translate(validationMessage('minLength', { count: 2 }))).toBe(
      'Introdu cel puțin 2 caractere.',
    );
    expect(translate(validationMessage('minLength', { count: 19 }))).toBe(
      'Introdu cel puțin 19 caractere.',
    );
    expect(translate(validationMessage('minLength', { count: 20 }))).toBe(
      'Introdu cel puțin 20 de caractere.',
    );
    expect(translate(validationMessage('minLength', { count: 101 }))).toBe(
      'Introdu cel puțin 101 caractere.',
    );
    expect(translate(validationMessage('minLength', { count: 120 }))).toBe(
      'Introdu cel puțin 120 de caractere.',
    );
  });

  it('uses the two English plural forms', async () => {
    await changeLocale('en');
    expect(translate(validationMessage('minLength', { count: 1 }))).toBe(
      'Enter at least 1 character.',
    );
    expect(translate(validationMessage('minLength', { count: 20 }))).toBe(
      'Enter at least 20 characters.',
    );
  });
});
