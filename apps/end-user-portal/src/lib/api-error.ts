/**
 * API 错误工具 — 区分 404（资源不存在 → 空态）与其他错误（→ 错误态）
 */
export function isNotFoundError(err: unknown): boolean {
	return (err as { response?: { status?: number } })?.response?.status === 404;
}

export function isUnauthorizedError(err: unknown): boolean {
	return (err as { response?: { status?: number } })?.response?.status === 401;
}
