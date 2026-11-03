import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import { ScoreValue } from './score-value';

const LABEL = 'Scor zonă 78 din 100';

describe('ScoreValue', () => {
  it('is an image named by its label', async () => {
    await renderWithProviders(<ScoreValue value={78} hue="safety" label={LABEL} />);

    expect(screen.getByRole('img', { name: LABEL })).toHaveTextContent('78');
  });

  it.each([
    [140, '100%'],
    [-5, '0%'],
    [50, '50%'],
  ])('fills the disc ring for %s within 0 and the maximum', async (value, fill) => {
    await renderWithProviders(<ScoreValue value={value} label={LABEL} />);

    expect(screen.getByRole('img', { name: LABEL }).style.getPropertyValue('--ring-fill')).toBe(
      fill,
    );
  });

  it('shows the value in the stroke variant', async () => {
    await renderWithProviders(
      <ScoreValue variant="stroke" size="sm" value={92} hue="transport" label={LABEL} />,
    );

    expect(screen.getByRole('img', { name: LABEL })).toHaveTextContent('92');
  });

  it('shows its caption in the stroke variant', async () => {
    await renderWithProviders(
      <ScoreValue
        variant="stroke"
        size="lg"
        value={84}
        hue="onInverse"
        caption="din 100"
        label={LABEL}
      />,
    );

    expect(screen.getByRole('img', { name: LABEL })).toHaveTextContent('84din 100');
  });
});
