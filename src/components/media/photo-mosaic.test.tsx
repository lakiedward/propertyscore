import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import roCommon from '@/i18n/locales/ro/common.json';
import { PhotoMosaic } from './photo-mosaic';

const PHOTOS = Array.from({ length: 5 }, (_, index) => ({
  id: `photo-${String(index)}`,
  src: `https://example.test/${String(index)}.webp`,
  smallSrc: `https://example.test/${String(index)}-medium.webp`,
  alt: `Fotografia ${String(index + 1)}`,
}));

describe('PhotoMosaic', () => {
  it('shows one large photo, two small ones and the hidden count', () => {
    render(<PhotoMosaic photos={PHOTOS} moreLabel="+2 poze" emptyLabel="Fără fotografii" />);

    expect(screen.getAllByRole('img')).toHaveLength(3);
    expect(screen.getByRole('img', { name: 'Fotografia 1' })).toBeInTheDocument();
    expect(screen.getByText('+2 poze')).toBeInTheDocument();
  });

  it('opens a photo large and steps through the others', async () => {
    const user = userEvent.setup();
    render(<PhotoMosaic photos={PHOTOS} moreLabel="+2 poze" emptyLabel="Fără fotografii" />);

    await user.click(
      screen.getByRole('button', { name: roCommon.photoGallery.open.replace('{{index}}', '2') }),
    );
    const gallery = await screen.findByRole('dialog', { name: '2 / 5' });
    expect(within(gallery).getByRole('img', { name: 'Fotografia 2' })).toHaveAttribute(
      'src',
      'https://example.test/1.webp',
    );

    await user.click(within(gallery).getByRole('button', { name: roCommon.photoGallery.next }));
    expect(await screen.findByRole('dialog', { name: '3 / 5' })).toBeInTheDocument();

    await user.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}');
    expect(await screen.findByRole('dialog', { name: '5 / 5' })).toBeInTheDocument();
  });

  it('shows every photo in the library view from the extra count', async () => {
    const user = userEvent.setup();
    render(<PhotoMosaic photos={PHOTOS} moreLabel="+2 poze" emptyLabel="Fără fotografii" />);

    await user.click(
      screen.getByRole('button', { name: roCommon.photoGallery.all.replace('{{count}}', '5') }),
    );
    const library = await screen.findByRole('dialog', {
      name: roCommon.photoGallery.title.replace('{{count}}', '5'),
    });
    expect(within(library).getAllByRole('img')).toHaveLength(5);

    await user.click(
      within(library).getByRole('button', {
        name: roCommon.photoGallery.open.replace('{{index}}', '4'),
      }),
    );
    expect(await screen.findByRole('dialog', { name: '4 / 5' })).toBeInTheDocument();
  });

  it('loads the large file for the main photo and the small one for the side photos', () => {
    render(<PhotoMosaic photos={PHOTOS} emptyLabel="Fără fotografii" />);

    expect(screen.getByRole('img', { name: 'Fotografia 1' })).toHaveAttribute(
      'src',
      'https://example.test/0.webp',
    );
    expect(screen.getByRole('img', { name: 'Fotografia 2' })).toHaveAttribute(
      'src',
      'https://example.test/1-medium.webp',
    );
  });

  it('shows the empty label when there is no photo', () => {
    render(<PhotoMosaic photos={[]} emptyLabel="Fără fotografii" />);

    expect(screen.getByText('Fără fotografii')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
