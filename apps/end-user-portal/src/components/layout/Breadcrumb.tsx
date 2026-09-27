import { useMemo } from 'react';
import { useLocation, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Home } from 'lucide-react';
import { useTenantSlug } from '@autional-cn/shared';
import { buildNavHref } from '@/lib/nav';
import { ROUTES } from '@/lib/routes';

export function Breadcrumb() {
	const { t } = useTranslation();
	const location = useLocation();
	const tenantSlug = useTenantSlug();
	const rawPathname = location.pathname;

	// URL 形如 /acme-corp/profile（basename 恒为 /，路径带 tenantSlug 前缀）。
	// 剥离 /{tenantSlug} 前缀后得到内部路径，用于 breadcrumbMap 匹配。
	const pathname = tenantSlug
		? rawPathname.replace(new RegExp(`^/${tenantSlug}`), '') || '/'
		: rawPathname;

	const breadcrumbMap: Record<string, string> = {
		'/': t('nav.overview'),
		'/profile': t('nav.profile'),
		'/security': t('nav.security'),
		'/security/login-history': t('nav.loginHistory'),
		'/session/api/v1/sessions': t('nav.sessions'),
		'/notification/api/v1/notifications': t('nav.notifications'),
		'/notification/api/v1/notifications/preferences': t('nav.notificationPrefs'),
		'/devices': t('nav.devices'),
		'/point/api/v1/points': t('nav.points'),
		'/wallet': t('nav.wallet'),
		'/billing': t('nav.billing'),
		'/storage/api/v1/storage': t('nav.storage'),
		'/onboarding': t('onboarding.title'),
	};

	const items = useMemo(() => {
		if (pathname === '/') {
			return [];
		}

		const result: { label: React.ReactNode; key: string }[] = [
			{
				label: (
					<Link to={buildNavHref(ROUTES.dashboard, tenantSlug)} className="flex items-center gap-1 hover:text-primary-700 transition-colors">
						<Home size={14} />
						<span>{t('nav.overview')}</span>
					</Link>
				),
				key: 'home',
			},
		];

		const name = breadcrumbMap[pathname];
		if (name) {
			result.push({
				label: <span className="text-neutral-900 font-medium">{name}</span>,
				key: pathname,
			});
		}

		return result;
	}, [pathname, t, tenantSlug]);

	if (items.length <= 1) return null;

	return (
		<nav className="mb-6 flex items-center gap-2 text-sm text-neutral-500">
			{items.map((item, idx) => (
				<div key={item.key} className="flex items-center gap-2">
					{idx > 0 && <ChevronRight size={14} className="text-neutral-300" />}
					{item.label}
				</div>
			))}
		</nav>
	);
}
