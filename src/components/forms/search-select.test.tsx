import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { SearchSelect } from './search-select';

const PLACEHOLDER = 'Alege';
const SEARCH_PLACEHOLDER = 'Caută';
const EMPTY_TEXT = 'Nimic găsit';

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
      placeholder={PLACEHOLDER}
      searchPlaceholder={SEARCH_PLACEHOLDER}
      emptyText={EMPTY_TEXT}
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
    await user.type(screen.getByRole('combobox', { name: SEARCH_PLACEHOLDER }), 'timisoara');

    expect(screen.queryByRole('option', { name: /Elena Matei/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: /Mihai Dobre/ }));

    expect(onChange).toHaveBeenCalledWith('mihai');
  });

  it('says when nothing matches', async () => {
    const { user } = await renderSelect();

    await user.click(await screen.findByRole('combobox'));
    await user.type(screen.getByRole('combobox', { name: SEARCH_PLACEHOLDER }), 'cluj');

    expect(screen.getByText(EMPTY_TEXT)).toBeInTheDocument();
  });
});
