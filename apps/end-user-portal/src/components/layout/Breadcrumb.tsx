import { useMemo } from 'react';
import { useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useTenantSlug } from '@autional-cn/shared';
import { Breadcrumb as SharedBreadcrumb } from '@autional-cn/ui/antd';
import { buildNavHref } from '@/lib/nav';
import { ROUTES } from '@/lib/routes';

/**
 * 面包屑。
 *
 * 这里只剩**业务**：路由 → 文案的映射表（13 条，与另外三个门户完全不重叠）。
 * 机制（剥租户段、按段累积、中间段可点、末段纯文本、只有一项就不渲染）在设计系统那一份里 ——
 * 此前本站是 77 行**手写 nav + lucide 图标**，且只认完整路径、中间段不可点、最多两级；
 * 另外两个门户用的是 antd 的 Breadcrumb。收敛方向是少数向多数靠，所以这里换成了共同实现。
 */
export function Breadcrumb() {
	const { t } = useTranslation();
	const location = useLocation();
	const tenantSlug = useTenantSlug();

	const labels = useMemo<Record<string, string>>(
		() => ({
			[ROUTES.dashboard]: t('nav.overview'),
			[ROUTES.profile]: t('nav.profile'),
			[ROUTES.security]: t('nav.security'),
			[ROUTES.loginHistory]: t('nav.loginHistory'),
			[ROUTES.sessions]: t('nav.sessions'),
			[ROUTES.notifications]: t('nav.notifications'),
			[ROUTES.notificationPrefs]: t('nav.notificationPrefs'),
			[ROUTES.devices]: t('nav.devices'),
			[ROUTES.points]: t('nav.points'),
			[ROUTES.wallet]: t('nav.wallet'),
			[ROUTES.billing]: t('nav.billing'),
			[ROUTES.storage]: t('nav.storage'),
			[ROUTES.onboarding]: t('onboarding.title'),
		}),
		[t],
	);

	return (
		<SharedBreadcrumb
			pathname={location.pathname}
			tenantSlug={tenantSlug}
			labels={labels}
			home={{ label: t('nav.overview'), href: buildNavHref(ROUTES.dashboard, tenantSlug) }}
			buildHref={(path) => buildNavHref(path, tenantSlug)}
			className="mb-6"
		/>
	);
}
