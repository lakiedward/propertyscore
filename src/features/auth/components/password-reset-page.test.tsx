import { screen } from '@testing-library/react';
import roAuth from '@/i18n/locales/ro/auth.json';
import { renderWithProviders } from '@/test/render';
import { NewPasswordPage } from './new-password-page';
import { PasswordResetPage } from './password-reset-page';

describe('PasswordResetPage', () => {
  it('asks for a valid email, then confirms the link was sent', async () => {
    const { user } = await renderWithProviders(<PasswordResetPage />);

    await user.click(screen.getByRole('button', { name: new RegExp(roAuth.passwordReset.submit) }));
    expect(await screen.findByText(roAuth.fields.email.error)).toBeInTheDocument();

    await user.type(screen.getByLabelText(roAuth.fields.email.label), 'ana.ro@example.test');
    await user.click(screen.getByRole('button', { name: new RegExp(roAuth.passwordReset.submit) }));

    expect(
      await screen.findByRole('heading', { name: roAuth.passwordReset.sent.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(roAuth.passwordReset.sent.text.replace('{{email}}', 'ana.ro@example.test')),
    ).toBeInTheDocument();
  });
});

describe('NewPasswordPage', () => {
  it('rejects passwords that do not match, then confirms the change', async () => {
    const { user } = await renderWithProviders(<NewPasswordPage />);

    await user.type(screen.getByLabelText(roAuth.newPassword.password), 'casa2026');
    await user.type(screen.getByLabelText(roAuth.newPassword.repeat), 'casa2025');
    await user.click(screen.getByRole('button', { name: roAuth.newPassword.submit }));
    expect(await screen.findByText(roAuth.newPassword.mismatch)).toBeInTheDocument();

    await user.clear(screen.getByLabelText(roAuth.newPassword.repeat));
    await user.type(screen.getByLabelText(roAuth.newPassword.repeat), 'casa2026');
    await user.click(screen.getByRole('button', { name: roAuth.newPassword.submit }));

    expect(
      await screen.findByRole('heading', { name: roAuth.newPassword.done.title }),
    ).toBeInTheDocument();
  });
});
