import { fieldsOf, isEditorSection, sectionsWithErrors } from './listing-editor.sections';

describe('listing editor sections', () => {
  it('finds the sections that hold the fields with errors, in page order', () => {
    expect(sectionsWithErrors(['title', 'pin', 'price'])).toEqual(['details', 'address', 'text']);
    expect(sectionsWithErrors([])).toEqual([]);
    expect(sectionsWithErrors(['heating', 'land_area_m2'])).toEqual(['details', 'extras']);
  });

  it('lists the fields of the given sections', () => {
    expect(fieldsOf(['address', 'photos'])).toEqual(['city', 'street_label', 'pin']);
  });

  it('recognises only known sections', () => {
    expect(isEditorSection('photos')).toBe(true);
    expect(isEditorSection('type')).toBe(false);
  });
});
