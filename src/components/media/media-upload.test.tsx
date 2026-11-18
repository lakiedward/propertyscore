import { createEvent, fireEvent, screen } from '@testing-library/react';
import { MediaUpload } from './media-upload';
import { renderWithProviders } from '@/test/render';

const LABEL = 'Adaugă fotografii';
const HINT = 'Trage fotografiile aici.';

function photo(name: string) {
  return new File(['photo'], name, { type: 'image/jpeg' });
}

function dropFiles(element: HTMLElement, files: File[]) {
  const event = createEvent.drop(element);
  Object.defineProperty(event, 'dataTransfer', { value: { files, types: ['Files'] } });
  fireEvent(element, event);
}

describe('MediaUpload', () => {
  it('passes the chosen files on and describes the zone with its hint', async () => {
    const onAdd = vi.fn();
    const { user } = await renderWithProviders(
      <MediaUpload label={LABEL} hint={HINT} accept="image/jpeg" onAdd={onAdd} />,
    );

    const input = screen.getByLabelText(LABEL);
    expect(input).toHaveAccessibleDescription(HINT);
    await user.upload(input, [photo('a.jpg'), photo('b.jpg')]);

    expect(onAdd).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'a.jpg' }),
      expect.objectContaining({ name: 'b.jpg' }),
    ]);
  });

  it('takes files dropped on the zone', async () => {
    const onAdd = vi.fn();
    await renderWithProviders(
      <MediaUpload label={LABEL} hint={HINT} accept="image/jpeg" onAdd={onAdd} />,
    );

    dropFiles(screen.getByText(HINT), [photo('c.jpg')]);

    expect(onAdd).toHaveBeenCalledWith([expect.objectContaining({ name: 'c.jpg' })]);
  });

  it('ignores files while it is busy or disabled', async () => {
    const onAdd = vi.fn();
    await renderWithProviders(
      <MediaUpload label={LABEL} hint={HINT} accept="image/jpeg" isBusy onAdd={onAdd} />,
    );

    expect(screen.getByLabelText(LABEL)).toBeDisabled();
    dropFiles(screen.getByText(HINT), [photo('d.jpg')]);

    expect(onAdd).not.toHaveBeenCalled();
  });
});
