import { describe, expect, it } from 'vitest';
import {
	WALLET_NOT_CREATED_CODE,
	isNotFoundError,
	isUnauthorizedError,
	isWalletNotCreatedError,
} from '@/lib/api-error';

describe('api-error', () => {
	it('isNotFoundError / isUnauthorizedError：只认状态码', () => {
		expect(isNotFoundError({ response: { status: 404 } })).toBe(true);
		expect(isNotFoundError({ response: { status: 500 } })).toBe(false);
		expect(isNotFoundError(undefined)).toBe(false);

		expect(isUnauthorizedError({ response: { status: 401 } })).toBe(true);
		expect(isUnauthorizedError({ response: { status: 403 } })).toBe(false);
	});

	it('isWalletNotCreatedError：404 + 61060101 → true（唯一 CTA 触发条件）', () => {
		expect(
			isWalletNotCreatedError({
				response: { status: 404, data: { code: WALLET_NOT_CREATED_CODE } },
			}),
		).toBe(true);
		// 字符串序列化同值也认（仍只认这一个业务码）
		expect(
			isWalletNotCreatedError({ response: { status: 404, data: { code: '61060101' } } }),
		).toBe(true);
	});

	it('isWalletNotCreatedError：404 + 其他 code / 无 code → false（维持原错误态）', () => {
		expect(
			isWalletNotCreatedError({ response: { status: 404, data: { code: 61040010 } } }),
		).toBe(false);
		expect(isWalletNotCreatedError({ response: { status: 404, data: {} } })).toBe(false);
		expect(isWalletNotCreatedError({ response: { status: 404 } })).toBe(false);
	});

	it('isWalletNotCreatedError：非 404 一律 false（即使带同 code）', () => {
		expect(
			isWalletNotCreatedError({
				response: { status: 500, data: { code: WALLET_NOT_CREATED_CODE } },
			}),
		).toBe(false);
		expect(isWalletNotCreatedError(new Error('network'))).toBe(false);
		expect(isWalletNotCreatedError(undefined)).toBe(false);
	});
});
