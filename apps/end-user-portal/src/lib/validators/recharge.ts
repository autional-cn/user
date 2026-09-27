import { z } from 'zod';

export const rechargeSchema = z
	.object({
		amount: z.string(),
		customAmount: z.string(),
	})
	.refine(
		(data) => {
			const val = data.customAmount ? Number(data.customAmount) : Number(data.amount);
			return val > 0;
		},
		{ message: 'amountRequired', path: ['amount'] },
	);

export type RechargeFormData = z.infer<typeof rechargeSchema>;
