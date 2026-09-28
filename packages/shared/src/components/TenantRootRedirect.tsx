import { useEffect } from 'react';
import { useCurrentTenantId, useTenants } from '../hooks/useAuth';
import { getPortalUrl } from '../config';

/**
 * 裸根 `/` 漏斗：门户入口必须带租户段（/:tenantSlug）。
 * - 已有会话且能解析出 slug → 整页跳 /<slug>/（不经过 brand）
 * - 否则整页跳 brand 选品牌（brand → auth 登录 → 回本门户 /<slug>/）
 *
 * 注：本包刻意不依赖 react-router（它只属于各 app），故不走 <Navigate>。
 */
export function TenantRootRedirect() {
	const currentTenantId = useCurrentTenantId();
	const tenants = useTenants();

	const slug = currentTenantId
		? tenants.find((t) => t.id === currentTenantId)?.name
		: undefined;

	useEffect(() => {
		if (typeof window === 'undefined') return;
		if (slug) {
			const base = window.location.pathname.replace(/\/+$/, '');
			window.location.replace(`${base}/${slug}/`);
			return;
		}
		const target = `${getPortalUrl('brand')}/?redirect=${encodeURIComponent(
			window.location.origin + window.location.pathname,
		)}`;
		window.location.replace(target);
	}, [slug]);

	return null;
}
