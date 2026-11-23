import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { AddressAutocomplete, type AddressSuggestion } from './address-autocomplete';

const SUGGESTIONS: AddressSuggestion[] = [
  { id: 'a', main: 'Strada Freidorf', sub: 'Freidorf, Timișoara' },
  { id: 'b', main: 'Strada Freidorf 12', sub: 'Freidorf, Timișoara' },
];

function Harness({ onSelect }: { onSelect: (suggestion: AddressSuggestion) => void }) {
  const [value, setValue] = useState('');
  return (
    <AddressAutocomplete
      id="address"
      label="Adresa"
      placeholder="Caută adresa"
      value={value}
      suggestions={value.length > 0 ? SUGGESTIONS : []}
      isSearching={false}
      emptyText={undefined}
      onValueChange={setValue}
      onSelect={(suggestion) => {
        setValue(suggestion.main);
        onSelect(suggestion);
      }}
    />
  );
}

describe('AddressAutocomplete', () => {
  it('shows the suggestions while typing and picks one with the keyboard', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);

    await user.type(screen.getByRole('combobox'), 'Freid');

    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.getAllByText('Freid', { selector: 'mark' })).toHaveLength(2);

    await user.keyboard('{ArrowDown}{Enter}');

    expect(onSelect).toHaveBeenCalledWith(SUGGESTIONS[1]);
    expect(screen.getByRole('combobox')).toHaveValue('Strada Freidorf 12');
  });

  it('closes the list with Escape', async () => {
    const user = userEvent.setup();
    render(<Harness onSelect={vi.fn()} />);

    await user.type(screen.getByRole('combobox'), 'Str');
    expect(screen.getAllByRole('option')).toHaveLength(2);

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });
});
