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
