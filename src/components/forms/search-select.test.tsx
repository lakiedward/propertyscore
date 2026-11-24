import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { SearchSelect } from './search-select';

const OPTIONS = [
  { value: 'elena', label: 'Elena Matei', description: 'București' },
  { value: 'mihai', label: 'Mihai Dobre', description: 'Timișoara' },
];

async function renderSelect(onChange = vi.fn()) {
  const { user } = await renderWithProviders(
    <SearchSelect
      value="elena"
      options={OPTIONS}
      onChange={onChange}
      placeholder="Alege"
      searchPlaceholder="Caută"
      emptyText="Nimic găsit"
    />,
  );
  return { user, onChange };
}

describe('SearchSelect', () => {
  it('shows the chosen option on the trigger', async () => {
    await renderSelect();

    expect(await screen.findByRole('combobox')).toHaveTextContent('Elena Matei');
  });

  it('finds an option without diacritics and chooses it', async () => {
    const { user, onChange } = await renderSelect();

    await user.click(await screen.findByRole('combobox'));
    await user.type(screen.getByRole('combobox', { name: 'Caută' }), 'timisoara');

    expect(screen.queryByRole('option', { name: /Elena Matei/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: /Mihai Dobre/ }));

    expect(onChange).toHaveBeenCalledWith('mihai');
  });

  it('says when nothing matches', async () => {
    const { user } = await renderSelect();

    await user.click(await screen.findByRole('combobox'));
    await user.type(screen.getByRole('combobox', { name: 'Caută' }), 'cluj');

    expect(screen.getByText('Nimic găsit')).toBeInTheDocument();
  });
});
