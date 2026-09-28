import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Breadcrumb } from './Breadcrumb';
import { useTenant } from '@/hooks/use-tenant';
import { ROUTES } from '@/lib/routes';
import { buildNavHref } from '@/lib/nav';
import { useTenantSlug, extractItem } from '@autional-cn/shared';
import {
	useAuth,
	useLogout,
	useBootstrap,
	refreshAccessToken,
	logout,
	AUTH_PAGES_URL,
} from '@autional-cn/shared';
import { useQuery } from '@tanstack/react-query';
import { useUnreadNotifications } from '@/hooks/queries';
import { useNotificationStream } from '@/hooks/use-notification-stream';
import { useEffect, useRef } from 'react';
import { showToast, LanguageSwitcher, ThemeToggle, EmptyState } from '@autional-cn/ui';
import {
	LayoutDashboard,
	UserCircle,
	ShieldCheck,
	Monitor,
	Bell,
	Clock,
	History,
	KeyRound,
	Link2,
	Eye,
	Menu,
	X,
	LogOut,
	User,
	ChevronDown,
	Building2,
	Smartphone,
	Settings,
	Coins,
	Wallet,
	ArrowDownCircle,
	CreditCard,
	FolderOpen,
	Link,
	Users,
	MessageSquare,
	Radio,
	Send,
	Megaphone,
	FileCheck,
} from 'lucide-react';

export default function AppLayout() {
	const { t } = useTranslation();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [userMenuOpen, setUserMenuOpen] = useState(false);
	const { user } = useAuth();
	const { tenants, currentTenant, switchTenant } = useTenant();
	useBootstrap();
	const navigate = useNavigate();
	const { data: unreadData } = useUnreadNotifications();
	const unreadCount = unreadData?.length || 0;
	const { lastEvent, addListener, authExpired } = useNotificationStream();
	const prevLastEventId = useRef<string | null>(null);
	const tenantSlug = useTenantSlug();

	/**
	 * P2-5：统一侧边栏/顶栏导航 URL 形态。
	 * - basename 含 tenantSlug（多段 URL，如 /acme-corp/profile）→ to 用无前缀内部路径，React Router 自动拼 basename
	 * - basename 为 /（单段 URL，如 /acme-corp）→ to 显式带 slug 前缀，避免链接退化为无 slug 形态
	 */
	const navHref = (path: string): string => buildNavHref(path, tenantSlug);

	useEffect(() => {
		return addListener((notification) => {
			showToast(notification.title || '', 'info', 5000);
		});
	}, [addListener]);

	useEffect(() => {
		if (!authExpired) return;
		refreshAccessToken().catch(() => {
			logout(`${AUTH_PAGES_URL}/login?session_expired=true`);
		});
	}, [authExpired]);

	useEffect(() => {
		if (lastEvent && lastEvent.id !== prevLastEventId.current) {
			prevLastEventId.current = lastEvent.id || null;
		}
	}, [lastEvent]);

	const { data: gatesData } = useQuery({
		queryKey: ['featureGates'],
		queryFn: async () => {
			const { billingFeatureGates } = await import('@autional-cn/shared/generated/api');
			return billingFeatureGates();
		},
		staleTime: 5 * 60 * 1000,
	});
	const nhiEnabled =
		// 2026-08-17 修复：billingFeatureGates 经拦截器 camelCase → featureGates
		// （原 snake_case feature_gates 恒 undefined → 永远回退 env，后端开启的 NHI 门不生效）
		extractItem<{ featureGates?: Array<{ key: string; enabled: boolean }> }>(gatesData)
			?.featureGates?.some((g) => g.key === 'nhi' && g.enabled) ??
		import.meta.env.VITE_NHI_ENABLED === 'true';

	const navSections = [
		{
			header: t('nav.section.account'),
			items: [
				{ to: ROUTES.dashboard, label: t('nav.overview'), icon: LayoutDashboard },
				{ to: ROUTES.profile, label: t('nav.profile'), icon: UserCircle },
				{ to: ROUTES.privacyImpact, label: t('nav.privacyImpact'), icon: Eye },
				{ to: ROUTES.security, label: t('nav.security'), icon: ShieldCheck },
				{ to: ROUTES.roleActivations, label: t('nav.roleActivations'), icon: KeyRound },
				{ to: ROUTES.linkedAccounts, label: t('nav.linkedAccounts'), icon: Link2 },
				{ to: ROUTES.consents, label: t('nav.consents'), icon: FileCheck },
			],
		},
		{
			header: t('nav.section.activity'),
			items: [
				{ to: ROUTES.loginHistory, label: t('nav.loginHistory'), icon: Clock },
				{ to: ROUTES.activity, label: t('nav.activityLog'), icon: History },
				{ to: ROUTES.devices, label: t('nav.devices'), icon: Smartphone },
				{ to: ROUTES.sessions, label: t('nav.sessions'), icon: Monitor },
			],
		},
		...(nhiEnabled
			? [
					{
						header: t('nav.section.myThings'),
						items: [
							{ to: ROUTES.devices, label: t('nav.myDevices'), icon: Smartphone },
							{ to: ROUTES.devicesPair, label: t('nav.pairDevice'), icon: Link },
							{ to: ROUTES.devicesFamily, label: t('nav.familyAccess'), icon: Users },
						],
					},
				]
			: []),
		{
			header: t('nav.section.finance'),
			items: [
				{ to: ROUTES.wallet, label: t('nav.wallet'), icon: Wallet },
				{ to: ROUTES.walletRecharge, label: t('nav.recharge'), icon: CreditCard },
				{ to: ROUTES.walletWithdrawals, label: t('nav.withdrawals'), icon: ArrowDownCircle },
				{ to: ROUTES.points, label: t('nav.points'), icon: Coins },
				{ to: ROUTES.billing, label: t('nav.billing'), icon: CreditCard },
				{ to: ROUTES.storage, label: t('nav.storage'), icon: FolderOpen },
			],
		},
		{
			header: t('nav.section.messages'),
			items: [
				{ to: ROUTES.notifications, label: t('nav.notifications'), icon: Bell },
				{ to: ROUTES.notificationPrefs, label: t('nav.notificationPrefs'), icon: Settings },
			],
		},
		{
			header: t('nav.section.communication'),
			items: [
				{ to: ROUTES.communication, label: t('nav.communication'), icon: MessageSquare },
				{ to: ROUTES.communicationSend, label: t('nav.communicationSend'), icon: Send },
				{ to: ROUTES.pushTokens, label: t('nav.pushTokens'), icon: Radio },
			],
		},
		{
			header: t('nav.section.announcements'),
			items: [{ to: ROUTES.announcements, label: t('nav.announcements'), icon: Megaphone }],
		},
	];

	const handleLogout = useLogout();

	const userInitial = user?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';

	if (tenants.length === 0) {
		return (
			<div className="flex h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-900">
				<EmptyState title={t('tenant.noTenants')} description={t('tenant.noTenantsDesc')} />
			</div>
		);
	}

	return (
		<div className="flex h-screen bg-neutral-50 dark:bg-neutral-900">
			{/* Mobile overlay */}
			{sidebarOpen && (
				<div
					className="fixed inset-0 z-40 bg-black/30 lg:hidden"
					onClick={() => setSidebarOpen(false)}
				/>
			)}

			{/* Sidebar */}
			<aside
				className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-neutral-200 bg-white transition-transform duration-200 dark:border-neutral-700 dark:bg-neutral-800 lg:static lg:translate-x-0 ${
					sidebarOpen ? 'translate-x-0' : '-translate-x-full'
				}`}
			>
				<div className="flex h-16 items-center justify-between px-6 border-b border-neutral-200 dark:border-neutral-700">
					<span className="text-lg font-bold text-primary-700 dark:text-primary-400">
						{t('dashboard.title')}
					</span>
					<button
						className="lg:hidden text-neutral-500 hover:text-neutral-800"
						onClick={() => setSidebarOpen(false)}
						aria-label={t('nav.closeMenu')}
					>
						<X size={20} />
					</button>
				</div>

				{/* Tenant Switcher */}
				{tenants.length > 1 && currentTenant && (
					<div className="border-b border-neutral-200 p-3 dark:border-neutral-700">
						<div className="relative">
							<Building2
								size={14}
								className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400"
							/>
							<select
								value={currentTenant.id}
								onChange={(e) => switchTenant(e.target.value)}
								className="w-full appearance-none rounded-md border border-neutral-200 bg-neutral-50 py-2 pl-8 pr-8 text-xs font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200"
							>
								{tenants.map((t) => (
									<option key={t.id} value={t.id}>
										{t.name}
									</option>
								))}
							</select>
							<ChevronDown
								size={14}
								className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
							/>
						</div>
					</div>
				)}

				<nav className="flex flex-col gap-4 p-4 overflow-y-auto">
					{navSections.map((section) => (
						<div key={section.header}>
							<h3 className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
								{section.header}
							</h3>
							<div className="flex flex-col gap-1">
								{section.items.map((item) => (
									<NavLink
										key={item.to}
										to={navHref(item.to)}
										end={item.to === ROUTES.dashboard}
										onClick={() => setSidebarOpen(false)}
										className={({ isActive }) =>
											`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
												isActive
													? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
													: 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200'
											}`
										}
									>
										<item.icon size={18} />
										{item.label}
									</NavLink>
								))}
							</div>
						</div>
					))}
				</nav>

				<div className="absolute bottom-0 left-0 right-0 border-t border-neutral-200 p-4 dark:border-neutral-700">
					<button
						onClick={handleLogout}
						className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
					>
						<LogOut size={18} />
						{t('common.logout')}
					</button>
				</div>
			</aside>

			{/* Main content */}
			<div className="flex flex-1 flex-col min-w-0">
				{/* Top bar */}
				<header className="sticky top-0 z-10 flex h-[var(--layout-header-height)] items-center justify-between gap-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-4 lg:px-8">
					<div className="flex items-center gap-4">
						<button
							className="lg:hidden text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
							onClick={() => setSidebarOpen(true)}
							aria-label={t('nav.openMenu')}
						>
							<Menu size={20} />
						</button>
						<h1 className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
							{t('dashboard.title')}
						</h1>
					</div>

					<div className="flex items-center gap-3">
						<button
							onClick={() => navigate(navHref(ROUTES.notifications))}
							className="relative rounded-md p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
							title={t('nav.notifications')}
							aria-label={t('nav.notifications')}
						>
							<Bell size={18} />
							{unreadCount > 0 && (
								<span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
									{unreadCount > 99 ? '99+' : unreadCount}
								</span>
							)}
						</button>

						<button
							onClick={() => navigate(navHref(ROUTES.announcements))}
							className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
							title={t('nav.announcements')}
							aria-label={t('nav.announcements')}
						>
							<Megaphone size={18} />
						</button>

						{/* Language switcher */}
						<LanguageSwitcher className="rounded-md px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors dark:text-neutral-400 dark:hover:text-neutral-200" />

						{/* Theme toggle */}
						<ThemeToggle
							className="text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
							iconSize={18}
						/>

						{/* User menu */}
						<div className="relative">
							<button
								onClick={() => setUserMenuOpen(!userMenuOpen)}
								className="flex items-center gap-2 rounded-md p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700"
								aria-label={t('common.userMenu')}
							>
								<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
									{userInitial}
								</div>
								<span className="hidden text-sm font-medium text-neutral-700 md:block dark:text-neutral-200">
									{user?.username || user?.email || 'User'}
								</span>
								<ChevronDown size={14} className="text-neutral-400" />
							</button>

							{userMenuOpen && (
								<>
									<div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
									<div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-neutral-200 bg-white py-2 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
										<div className="border-b border-neutral-100 px-4 py-3 dark:border-neutral-700">
											<p className="text-sm font-medium text-neutral-900 dark:text-neutral-200">
												{user?.username || user?.email}
											</p>
											<p className="text-xs text-neutral-500 dark:text-neutral-400">
												{user?.email}
											</p>
										</div>
										<div className="py-1">
											<button
												onClick={() => {
													setUserMenuOpen(false);
													navigate(navHref(ROUTES.profile));
												}}
												className="flex w-full items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-700"
											>
												<User size={16} />
												{t('common.settings')}
											</button>
											<button
												onClick={() => {
													setUserMenuOpen(false);
													handleLogout();
												}}
												className="flex w-full items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-danger/5 dark:hover:bg-danger/10"
											>
												<LogOut size={16} />
												{t('common.logout')}
											</button>
										</div>
									</div>
								</>
							)}
						</div>
					</div>
				</header>

				{/* Page content */}
				<main className="flex-1 overflow-auto p-4 lg:p-8">
					<Breadcrumb />
					<Outlet />
				</main>
			</div>
		</div>
	);
}
