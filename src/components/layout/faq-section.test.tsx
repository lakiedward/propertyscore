import { screen } from '@testing-library/react';
import roPublish from '@/i18n/locales/ro/publish.json';
import { renderWithProviders } from '@/test/render';
import { FaqSection } from './faq-section';

const [first, second] = roPublish.faq.items;
const items = roPublish.faq.items;

describe('FaqSection', () => {
  it('names the section after its title', async () => {
    await renderWithProviders(
      <FaqSection id="questions" title={roPublish.faq.title} items={items} density="comfortable" />,
    );

    expect(screen.getByRole('region', { name: roPublish.faq.title })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: roPublish.faq.title }),
    ).toBeInTheDocument();
  });

  it('opens several answers at once', async () => {
    const { user } = await renderWithProviders(
      <FaqSection id="questions" title={roPublish.faq.title} items={items} density="compact" />,
    );

    await user.click(screen.getByRole('button', { name: first?.q }));
    await user.click(screen.getByRole('button', { name: second?.q }));

    expect(screen.getByText(first?.a ?? '')).toBeVisible();
    expect(screen.getByText(second?.a ?? '')).toBeVisible();
  });
});
