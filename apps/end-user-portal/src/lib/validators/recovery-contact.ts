import { z } from 'zod';

// message 一律用完整扁平 ns 键：i18n keySeparator:false，页面侧 t(message) 才可解析（UP-96）。
export const addContactSchema = z
	.object({
		type: z.enum(['email', 'phone']),
		value: z.string().min(1, { message: 'security.recoveryContacts.valueRequired' }),
	})
	.superRefine((data, ctx) => {
		if (data.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.value)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['value'],
				message: 'security.recoveryContacts.invalidEmail',
			});
		}
		if (data.type === 'phone' && !/^\+?[\d\s\-()]{7,20}$/.test(data.value)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['value'],
				message: 'security.recoveryContacts.invalidPhone',
			});
		}
	});

export type AddContactFormData = z.infer<typeof addContactSchema>;
