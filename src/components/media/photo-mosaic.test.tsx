import { render, screen } from '@testing-library/react';
import { PhotoMosaic } from './photo-mosaic';

const PHOTOS = Array.from({ length: 5 }, (_, index) => ({
  id: `photo-${String(index)}`,
  src: `https://example.test/${String(index)}.webp`,
  smallSrc: `https://example.test/${String(index)}-medium.webp`,
  alt: `Fotografia ${String(index + 1)}`,
}));

describe('PhotoMosaic', () => {
  it('shows the main photo, three thumbnails and the hidden count', () => {
    render(<PhotoMosaic photos={PHOTOS} moreLabel="+1 poză" emptyLabel="Fără fotografii" />);

    expect(screen.getAllByRole('img')).toHaveLength(4);
    expect(screen.getByRole('img', { name: 'Fotografia 1' })).toBeInTheDocument();
    expect(screen.getByText('+1 poză')).toBeInTheDocument();
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
