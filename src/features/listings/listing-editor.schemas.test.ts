import { listingEditorSearchSchema } from './listing-editor.schemas';

describe('listingEditorSearchSchema', () => {
  it('opens a known section and ignores an unknown one', () => {
    expect(listingEditorSearchSchema.parse({ section: 'photos' })).toEqual({ section: 'photos' });
    expect(listingEditorSearchSchema.parse({ section: 'nope' })).toEqual({ section: undefined });
  });
});
