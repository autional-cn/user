import i18n from '@/i18n';

function getLocale(): string {
	return i18n.language || 'zh-CN';
}

export function formatTime(iso: string | undefined | null, locale?: string): string {
	if (!iso) return '--';
	try {
		const d = new Date(iso);
		if (isNaN(d.getTime())) return iso;
		return d.toLocaleString(locale || getLocale(), {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
		});
	} catch {
		return iso;
	}
}

export type AuditStatusKind = 'success' | 'failed' | 'unknown';

/**
 * 审计日志状态三态判定：登录历史表格/CSV 与 activity CSV 共用的唯一判定点（AC-02-3）。
 * 只有明确的 'success' / 'failed' 才落成功/失败档；''、undefined 及其他值一律 unknown → 显示「—」。
 */
export function auditStatusKind(status: string | undefined | null): AuditStatusKind {
	if (status === 'success') return 'success';
	if (status === 'failed') return 'failed';
	return 'unknown';
}

export function formatDate(iso: string | undefined | null, locale?: string): string {
	if (!iso) return '--';
	try {
		const d = new Date(iso);
		if (isNaN(d.getTime())) return iso;
		return d.toLocaleDateString(locale || getLocale(), {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
		});
	} catch {
		return iso;
	}
}
