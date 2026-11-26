import { zodResolver } from '@hookform/resolvers/zod';
import { screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import ro from '@/i18n/locales/ro/common.json';
import { renderWithProviders } from '@/test/render';
import { TextField } from './text-field';

const LABEL = 'Suprafață';
const HINT = 'Suprafața utilă';
const SUFFIX = 'm²';

const schema = z.object({ area: z.string().min(1, 'validation.required') });

type Values = z.infer<typeof schema>;

function AreaForm({
  onSubmit,
  isLabelHidden,
}: {
  onSubmit: (values: Values) => void;
  isLabelHidden?: boolean;
}) {
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { area: '' } });
  return (
    <form onSubmit={(event) => void form.handleSubmit(onSubmit)(event)} noValidate>
      <TextField
        control={form.control}
        name="area"
        label={LABEL}
        hint={HINT}
        suffix={SUFFIX}
        inputMode="decimal"
        maxLength={6}
        isLabelHidden={isLabelHidden}
      />
      <button type="submit">{ro.actions.retry}</button>
    </form>
  );
}

describe('TextField', () => {
  it('ties the label and the hint to the input and shows the suffix', async () => {
    await renderWithProviders(<AreaForm onSubmit={vi.fn()} />);

    const input = await screen.findByRole('textbox', { name: LABEL });
    expect(input).toHaveAccessibleDescription(HINT);
    expect(input).toHaveAttribute('inputmode', 'decimal');
    expect(input).toHaveAttribute('maxlength', '6');
    expect(screen.getByText(SUFFIX)).toBeInTheDocument();
  });

  it('shows the translated error after submit and submits the typed value', async () => {
    const onSubmit = vi.fn();
    const { user } = await renderWithProviders(<AreaForm onSubmit={onSubmit} />);

    await user.click(await screen.findByRole('button', { name: ro.actions.retry }));
    expect(await screen.findByText(ro.validation.required)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: LABEL })).toHaveAttribute('aria-invalid', 'true');

    await user.type(screen.getByRole('textbox', { name: LABEL }), '72');
    await user.click(screen.getByRole('button', { name: ro.actions.retry }));
    expect(onSubmit).toHaveBeenCalledWith({ area: '72' }, expect.anything());
  });

  it('keeps a hidden label for screen readers', async () => {
    await renderWithProviders(<AreaForm onSubmit={vi.fn()} isLabelHidden />);

    expect(await screen.findByText(LABEL)).toHaveClass('sr-only');
  });
});
