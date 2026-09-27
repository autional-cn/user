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
