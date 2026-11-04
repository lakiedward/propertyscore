import { renderHook } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { messageKey } from '@/i18n/validation';
import { AppError } from '@/lib/errors';
import { applyServerErrors } from './forms';

function createForm() {
  const { result } = renderHook(() => useForm({ defaultValues: { email: '', password: '' } }));
  return result;
}

describe('applyServerErrors', () => {
  it('puts an error with a field on that field as a translation key', () => {
    const form = createForm();
    const error = new AppError('validation', 'taken', {
      field: 'email',
      reason: 'user_already_exists',
    });

    expect(applyServerErrors(form.current, error)).toBe(true);
    expect(form.current.getFieldState('email').error?.message).toBe(
      messageKey('common:errors.reasons.user_already_exists'),
    );
  });

  it('falls back to the error code when there is no reason', () => {
    const form = createForm();

    applyServerErrors(form.current, new AppError('conflict', 'conflict', { field: 'password' }));

    expect(form.current.getFieldState('password').error?.message).toBe(
      messageKey('common:errors.conflict'),
    );
  });

  it('leaves errors without a matching field to the form', () => {
    const form = createForm();

    expect(applyServerErrors(form.current, new AppError('network', 'offline'))).toBe(false);
    expect(
      applyServerErrors(form.current, new AppError('validation', 'bad', { field: 'phone' })),
    ).toBe(false);
    expect(applyServerErrors(form.current, new Error('boom'))).toBe(false);
    expect(form.current.getFieldState('email').error).toBeUndefined();
  });
});
