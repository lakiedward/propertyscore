import { checkSearchSchema, reportSearchSchema } from './smart-check.schemas';

describe('smart-check.schemas', () => {
  it('keeps a known step and drops an unknown one', () => {
    expect(checkSearchSchema.parse({ step: 'details' })).toEqual({ step: 'details' });
    expect(checkSearchSchema.parse({ step: 'refund' })).toEqual({ step: undefined });
  });

  it('keeps only a well-formed share token', () => {
    const token = 'a'.repeat(48);
    expect(reportSearchSchema.parse({ share: token })).toEqual({ share: token });
    expect(reportSearchSchema.parse({ share: 'abc' })).toEqual({ share: undefined });
  });
});
