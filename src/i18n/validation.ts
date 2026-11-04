import type { i18n as I18nInstance, ParseKeys } from 'i18next';
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

const MESSAGE_NAMESPACES = ['common', 'auth'] as const;

type ValidationKey = (typeof VALIDATION_KEYS)[number];
type MessageNamespace = (typeof MESSAGE_NAMESPACES)[number];
type ValidationParams = { count?: number; min?: number; max?: number };
type ZodIssue = Parameters<NonNullable<z.core.$ZodConfig['customError']>>[0];

export type MessageKey = {
  [Namespace in MessageNamespace]: `${Namespace}:${ParseKeys<Namespace>}`;
}[MessageNamespace];

type ParsedMessage =
  | { kind: 'validation'; key: ValidationKey; params: ValidationParams }
  | { kind: 'key'; key: string; params: ValidationParams };

const PREFIX = 'validation.';
const PARAMS_SEPARATOR = '|';

function isValidationKey(value: string): value is ValidationKey {
  return VALIDATION_KEYS.some((key) => key === value);
}

function withParams(key: string, params: ValidationParams | undefined): string {
  return params ? `${key}${PARAMS_SEPARATOR}${JSON.stringify(params)}` : key;
}

export function validationMessage(key: ValidationKey, params?: ValidationParams): string {
  return withParams(`${PREFIX}${key}`, params);
}

export function messageKey(key: MessageKey, params?: ValidationParams): string {
  return withParams(key, params);
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

export function parseValidationMessage(message: string): ParsedMessage {
  const [rawKey = '', rawParams] = message.split(PARAMS_SEPARATOR, 2);
  const params = parseParams(rawParams);
  if (MESSAGE_NAMESPACES.some((namespace) => rawKey.startsWith(`${namespace}:`))) {
    return { kind: 'key', key: rawKey, params };
  }
  const key = rawKey.startsWith(PREFIX) ? rawKey.slice(PREFIX.length) : '';
  if (!isValidationKey(key)) {
    return { kind: 'validation', key: 'invalid', params: {} };
  }
  return { kind: 'validation', key, params };
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

function isMessageKey(
  instance: I18nInstance,
  value: string,
  params: ValidationParams,
): value is MessageKey {
  return instance.exists(value, params);
}

export function translateValidationMessage(instance: I18nInstance, message: string): string {
  const parsed = parseValidationMessage(message);
  if (parsed.kind === 'key') {
    return isMessageKey(instance, parsed.key, parsed.params)
      ? instance.t(parsed.key, parsed.params)
      : instance.t('common:validation.invalid');
  }
  return instance.t(`common:validation.${parsed.key}`, parsed.params);
}

export function useValidationMessage() {
  const { i18n } = useTranslation('common');
  return (message: string | undefined) =>
    message ? translateValidationMessage(i18n, message) : undefined;
}
