import { z } from 'zod';

export const addContactSchema = z
	.object({
		type: z.enum(['email', 'phone']),
		value: z.string().min(1, { message: 'required' }),
	})
	.superRefine((data, ctx) => {
		if (data.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.value)) {
			ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: 'invalidEmail' });
		}
		if (data.type === 'phone' && !/^\+?[\d\s\-()]{7,20}$/.test(data.value)) {
			ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: 'invalidPhone' });
		}
	});

export type AddContactFormData = z.infer<typeof addContactSchema>;
