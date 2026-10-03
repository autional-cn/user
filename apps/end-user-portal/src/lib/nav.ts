/**
 * 生成导航链接 URL — 统一带 tenantSlug 绝对路径。
 *
 * BrowserRouter basename 恒为 "/"（见 main.tsx），因此所有导航链接必须
 * 使用带 tenantSlug 的绝对路径（/acme-corp/profile），否则会退化为无 slug
 * 形态并触发 basename 自锁（P1：SPA 二次导航侧边栏退化 + 双重前缀）。
 *
 * 历史：早期用 resolvePortalBasename() 动态判断是否带 slug，但 basename 是
 * 挂载时固定的，SPA 导航后 pathname 变化导致重算不一致 → 回归。现已改为恒定带 slug。
 */
export function buildNavHref(path: string, tenantSlug?: string): string {
	if (typeof window === 'undefined') return path;
	return tenantSlug ? `/${tenantSlug}${path === '/' ? '' : path}` : path;
}

/**
 * 剥离 tenantSlug 前缀得到站内相对路径，并归一尾斜杠。
 * 直接加载 /acme-corp/、/acme-corp/profile/ 这类带尾斜杠 URL 时须归一，
 * 否则与导航项路径精确比较会失配（如「概览」在 /acme-corp/ 下不高亮）。
 */
export function stripTenantPrefix(pathname: string, tenantSlug?: string): string {
	if (!tenantSlug) return trimTrailingSlash(pathname);
	const prefix = `/${tenantSlug}`;
	if (pathname === prefix) return '/';
	if (!pathname.startsWith(`${prefix}/`)) return trimTrailingSlash(pathname);
	return trimTrailingSlash(pathname.slice(prefix.length)) || '/';
}

/**
 * 高亮判定：在全部导航项路径中取与站内当前路径匹配（精确或段边界前缀）**最长**的一个。
 * 返回单一路径 → 父项不会在子路由下与子项同时高亮（曾用 NavLink 默认前缀匹配致 2~3 处齐亮）；
 * 返回 null = 无导航项匹配（调用方决定是否回退）。
 */
export function pickActiveNavPath(
	navPaths: readonly string[],
	internalPath: string,
): string | null {
	let best: string | null = null;
	for (const to of navPaths) {
		const matched =
			to === '/'
				? internalPath === '/'
				: internalPath === to || internalPath.startsWith(`${to}/`);
		if (matched && (best === null || to.length > best.length)) best = to;
	}
	return best;
}

function trimTrailingSlash(path: string): string {
	return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
}
