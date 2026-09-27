import { z } from 'zod';

export const withdrawalSchema = z.object({
	amount: z
		.string()
		.min(1, { message: 'wallet.withdrawals.amountRequired' })
		.refine((v) => parseFloat(v) > 0, { message: 'wallet.withdrawals.amountRequired' }),
	method: z.string().min(1),
	notes: z.string().optional(),
});

export type WithdrawalFormData = z.infer<typeof withdrawalSchema>;
