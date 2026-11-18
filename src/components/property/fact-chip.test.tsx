import { screen } from '@testing-library/react';
import { RulerIcon } from 'lucide-react';
import { renderWithProviders } from '@/test/render';
import { FactChip } from './fact-chip';

describe('FactChip', () => {
  it('shows the fact and keeps the icon out of what is read aloud', async () => {
    await renderWithProviders(<FactChip icon={RulerIcon} label="90 m²" />);

    expect(screen.getByText('90 m²')).toHaveAccessibleName('');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
