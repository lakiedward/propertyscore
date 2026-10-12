import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

const VALIDATION_KEYS = [
  'required',
  'email',
  'number',
  'invalid',
  'minLength',
  'maxLength',
  'min',
  'max',
] as const;

type ValidationKey = (typeof VALIDATION_KEYS)[number];
type ValidationParams = { count?: number; min?: number; max?: number };
type ZodIssue = Parameters<NonNullable<z.core.$ZodConfig['customError']>>[0];

const PREFIX = 'validation.';
const PARAMS_SEPARATOR = '|';

function isValidationKey(value: string): value is ValidationKey {
  return VALIDATION_KEYS.some((key) => key === value);
}

export function validationMessage(key: ValidationKey, params?: ValidationParams): string {
  return params ? `${PREFIX}${key}${PARAMS_SEPARATOR}${JSON.stringify(params)}` : `${PREFIX}${key}`;
}

function parseParams(raw: string | undefined): ValidationParams {
  if (!raw) {
    return {};
  }
  const parsed = z
    .object({ count: z.number(), min: z.number(), max: z.number() })
    .partial()
    .safeParse(JSON.parse(raw));
  return parsed.success ? parsed.data : {};
}

export function parseValidationMessage(message: string): {
  key: ValidationKey;
  params: ValidationParams;
} {
  const [rawKey = '', rawParams] = message.split(PARAMS_SEPARATOR, 2);
  const key = rawKey.startsWith(PREFIX) ? rawKey.slice(PREFIX.length) : '';
  if (!isValidationKey(key)) {
    return { key: 'invalid', params: {} };
  }
  return { key, params: parseParams(rawParams) };
}

function messageForIssue(issue: ZodIssue): string {
  switch (issue.code) {
    case 'invalid_type':
      if (issue.input === undefined || issue.input === null || issue.input === '') {
        return validationMessage('required');
      }
      return validationMessage(issue.expected === 'number' ? 'number' : 'invalid');
    case 'too_small': {
      const minimum = Number(issue.minimum);
      if (issue.origin === 'string' || issue.origin === 'array') {
        return minimum <= 1
          ? validationMessage('required')
          : validationMessage('minLength', { count: minimum });
      }
      return validationMessage('min', { min: minimum });
    }
    case 'too_big': {
      const maximum = Number(issue.maximum);
      if (issue.origin === 'string' || issue.origin === 'array') {
        return validationMessage('maxLength', { count: maximum });
      }
      return validationMessage('max', { max: maximum });
    }
    case 'invalid_format':
      return validationMessage(issue.format === 'email' ? 'email' : 'invalid');
    default:
      return validationMessage('invalid');
  }
}

export function configureValidationMessages() {
  z.config({ customError: messageForIssue });
}

export function translateValidationMessage(t: TFunction, message: string): string {
  const { key, params } = parseValidationMessage(message);
  return t(`validation.${key}`, params);
}

export function useValidationMessage() {
  const { t } = useTranslation('common');
  return (message: string | undefined) =>
    message ? translateValidationMessage(t, message) : undefined;
}
