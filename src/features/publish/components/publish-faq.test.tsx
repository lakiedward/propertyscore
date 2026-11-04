import { screen } from '@testing-library/react';
import roPublish from '@/i18n/locales/ro/publish.json';
import { renderWithProviders } from '@/test/render';
import { PublishFaq } from './publish-faq';

const [first] = roPublish.faq.items;

describe('PublishFaq', () => {
  it('opens an answer from its question', async () => {
    const { user } = await renderWithProviders(<PublishFaq />);
    if (!first) throw new Error('missing FAQ item');

    const question = screen.getByRole('button', { name: first.q });
    expect(question).toHaveAttribute('aria-expanded', 'false');

    await user.click(question);

    expect(question).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(first.a)).toBeVisible();
  });
});
