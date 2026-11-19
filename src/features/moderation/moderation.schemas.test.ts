import {
  decisionFormSchema,
  DECISION_MESSAGE_MAX,
  moderationSearchSchema,
} from './moderation.schemas';

describe('moderation.schemas', () => {
  describe('decisionFormSchema', () => {
    it('asks for at least one reason', () => {
      const result = decisionFormSchema.safeParse({ reasons: [], message: 'Motiv.' });

      expect(result.error?.issues[0]?.message).toBe(
        'common:errors.reasons.decision_reason_invalid',
      );
    });

    it('asks for a message that is not only spaces', () => {
      const result = decisionFormSchema.safeParse({ reasons: ['photos'], message: '   ' });

      expect(result.error?.issues[0]?.message).toBe(
        'common:errors.reasons.decision_message_required',
      );
    });

    it('refuses a message longer than the database allows', () => {
      const result = decisionFormSchema.safeParse({
        reasons: ['photos'],
        message: 'a'.repeat(DECISION_MESSAGE_MAX + 1),
      });

      expect(result.success).toBe(false);
    });

    it('accepts every reason the database knows and trims the message', () => {
      const result = decisionFormSchema.parse({ reasons: ['rules'], message: '  Duplicat.  ' });

      expect(result).toEqual({ reasons: ['rules'], message: 'Duplicat.' });
    });
  });

  describe('moderationSearchSchema', () => {
    it('falls back to the review tab and drops a listing id that is not an id', () => {
      expect(moderationSearchSchema.parse({ status: 'bogus', listing: 'x' })).toEqual({
        status: 'pending_approval',
        listing: undefined,
      });
    });
  });
});
