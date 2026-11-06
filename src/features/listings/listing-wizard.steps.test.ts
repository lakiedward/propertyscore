import { firstStepWithError, stepAt } from './listing-wizard.steps';

describe('listing wizard steps', () => {
  it('maps a position to its step and keeps it inside the wizard', () => {
    expect(stepAt(1)).toBe('type');
    expect(stepAt(4)).toBe('address');
    expect(stepAt(0)).toBe('type');
    expect(stepAt(9)).toBe('contact');
  });

  it('finds the first step that holds an invalid field', () => {
    expect(firstStepWithError(['pin', 'price'])).toBe(3);
    expect(firstStepWithError(['title'])).toBe(2);
    expect(firstStepWithError([])).toBe(1);
  });
});
