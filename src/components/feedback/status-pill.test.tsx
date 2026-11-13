import { render, screen } from '@testing-library/react';
import { BanIcon } from 'lucide-react';
import { StatusPill } from './status-pill';

describe('StatusPill', () => {
  it('shows only its label to assistive technology', () => {
    render(<StatusPill tone="error" label="Blocat" icon={BanIcon} />);

    expect(screen.getByText('Blocat')).toHaveTextContent(/^Blocat$/);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('keeps the pill shape unless the tag shape is asked for', () => {
    const { rerender } = render(<StatusPill tone="info" label="De verificat" />);
    expect(screen.getByText('De verificat')).toHaveClass('rounded-full');

    rerender(<StatusPill tone="info" label="De verificat" shape="tag" />);
    expect(screen.getByText('De verificat')).toHaveClass('rounded-sm');
  });
});
