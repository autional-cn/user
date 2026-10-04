/**
 * API 错误工具 — 区分 404（资源不存在 → 空态）与其他错误（→ 错误态）
 */
export function isNotFoundError(err: unknown): boolean {
	return (err as { response?: { status?: number } })?.response?.status === 404;
}

export function isUnauthorizedError(err: unknown): boolean {
	return (err as { response?: { status?: number } })?.response?.status === 401;
}

/** service-wallet ErrCodeWalletNotFound：钱包未开通时余额接口返回的 404 业务码 */
export const WALLET_NOT_CREATED_CODE = 61060101;

/**
 * 404 细分（AC-05-2）：仅 404 + 61060101 视为「钱包未开通」→ 空态 + 开通 CTA；
 * 其他 404（含无 code 的裸 404）与其他错误一律维持原错误态，不误显 CTA。
 * 判定只此一处，页面层只消费类型。
 */
export function isWalletNotCreatedError(err: unknown): boolean {
	const res = (err as { response?: { status?: number; data?: { code?: unknown } } })?.response;
	if (res?.status !== 404) return false;
	const code = res.data?.code;
	// code 理论上为数字（Go int）；容忍字符串序列化同值，仍只认这一个业务码。
	return code === WALLET_NOT_CREATED_CODE || code === String(WALLET_NOT_CREATED_CODE);
}
