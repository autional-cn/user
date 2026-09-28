import type { Branding } from './types';

/** 品牌缓存键前缀（各租户门户口径一致；auth 站的 `page-init:tenant-branding:` 为另一套，互不影响） */
export const BRANDING_CACHE_PREFIX = 'tenant-branding:';

export function readCachedBranding(slug: string): Branding | null {
	try {
		const raw = localStorage.getItem(BRANDING_CACHE_PREFIX + slug);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as { data?: Branding } | Branding;
		return ((parsed as { data?: Branding })?.data ?? parsed) as Branding;
	} catch {
		return null;
	}
}

export function writeCachedBranding(slug: string, branding: Branding): void {
	try {
		localStorage.setItem(
			BRANDING_CACHE_PREFIX + slug,
			JSON.stringify({ data: branding, _ts: Date.now() }),
		);
	} catch {
		/* storage full or unavailable */
	}
}
