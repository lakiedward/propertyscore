import { screen } from '@testing-library/react';
import roCommon from '@/i18n/locales/ro/common.json';
import { renderWithProviders } from '@/test/render';
import { TrustBadge } from './trust-badge';

const trust = roCommon.trust;

describe('TrustBadge', () => {
  it('names a physical check', async () => {
    await renderWithProviders(<TrustBadge kind="physical" />);

    expect(screen.getByText(trust.physical)).toBeInTheDocument();
    expect(screen.getByText(trust.physicalShort)).toBeInTheDocument();
  });

  it('names a listing without a report', async () => {
    await renderWithProviders(<TrustBadge kind="none" />);

    expect(screen.getByText(trust.none)).toBeInTheDocument();
    expect(screen.getByText(trust.noneShort)).toBeInTheDocument();
  });

  it('reads and shows the Smart Check score', async () => {
    await renderWithProviders(<TrustBadge kind="online" score={72} />);

    expect(screen.getByText(trust.smartcheck.replace('{{score}}', '72'))).toBeInTheDocument();
    expect(screen.getByText('72')).toBeInTheDocument();
  });

  it.each([null, undefined])(
    'never reports a zero for a missing Smart Check score (%s)',
    async (score) => {
      await renderWithProviders(<TrustBadge kind="online" score={score} />);

      expect(screen.getByText(trust.smartcheckNoScore)).toBeInTheDocument();
      expect(screen.queryByText(/\b0\b/)).not.toBeInTheDocument();
    },
  );
});
