import { z } from 'zod';

export const deleteSchema = z.object({
	password: z.string().min(1, 'mustMatch'),
	confirmText: z.literal('DELETE', { errorMap: () => ({ message: 'mustMatch' }) }),
});

export type DeleteFormData = z.infer<typeof deleteSchema>;
