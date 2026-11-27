const PHONE_SEPARATORS = /[\s.()/-]/gu;
const ROMANIAN_NATIONAL_PHONE = /^0[1-9]\d{8}$/u;
const ROMANIAN_PHONE = /^\+40\d{9}$/u;
const INTERNATIONAL_PHONE = /^\+[1-9]\d{7,14}$/u;

export function toE164Phone(value: string): string {
  const compact = value.replace(PHONE_SEPARATORS, '');
  if (compact.startsWith('00')) {
    return `+${compact.slice(2)}`;
  }
  if (ROMANIAN_NATIONAL_PHONE.test(compact)) {
    return `+40${compact.slice(1)}`;
  }
  return compact;
}

export function isPhoneNumber(value: string): boolean {
  const phone = toE164Phone(value);
  return phone.startsWith('+40') ? ROMANIAN_PHONE.test(phone) : INTERNATIONAL_PHONE.test(phone);
}
