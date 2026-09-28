'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTenantSlugFromUrl } from '../auth/slug-from-url';
import { tenantPublicTenantsByTenants } from '../generated/api';
import { extractBranding } from './extract-branding';
import { readCachedBranding, writeCachedBranding } from './branding-cache';
import { useTenantBrandingStore } from './tenant-store';
import type { Branding } from './types';

const TTL = 6 * 60 * 60 * 1000; // 6h，与公开租户接口的缓存口径一致

/** 按 URL 首段 slug 拉公开品牌并写入 store；渲染 `null`，只做接线。 */
export function BrandingInitializer() {
	const slug = useTenantSlugFromUrl();
	const setBranding = useTenantBrandingStore((s) => s.setBranding);

	// 缓存先到：首屏立即有品牌（未命中则由 useBranding 回落 tokens 缺省）
	useEffect(() => {
		if (!slug) {
			setBranding(null);
			return;
		}
		const cached = readCachedBranding(slug);
		if (cached) setBranding(cached);
	}, [slug, setBranding]);

	const { data } = useQuery<Branding | null>({
		queryKey: ['tenant-branding', slug],
		queryFn: async () => {
			if (!slug) return null;
			const res = await tenantPublicTenantsByTenants(slug);
			const branding = extractBranding(res);
			if (branding) writeCachedBranding(slug, branding);
			return branding;
		},
		enabled: Boolean(slug),
		staleTime: TTL,
		gcTime: TTL * 2,
	});

	useEffect(() => {
		if (data) setBranding(data);
	}, [data, setBranding]);

	return null;
}
