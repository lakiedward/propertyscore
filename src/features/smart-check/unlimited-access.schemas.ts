import { z } from 'zod';
import { messageKey } from '@/i18n/validation';

export const unlimitedAccessFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, messageKey('common:validation.required'))
    .pipe(z.email({ error: messageKey('common:validation.email') })),
});

export type UnlimitedAccessFormValues = z.infer<typeof unlimitedAccessFormSchema>;
