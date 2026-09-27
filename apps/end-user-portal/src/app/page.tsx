'use client';
import { useAuth, useTenantSlug } from '@autional-cn/shared';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { UserCircle, ShieldCheck, Monitor, Bell, Wallet, Coins } from 'lucide-react';
import {
	useProfile,
	useWalletBalance,
	usePointAccount,
	useUnreadNotifications,
} from '@/hooks/queries';
import { ErrorState } from '@autional-cn/ui';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { ROUTES } from '@/lib/routes';
import { buildNavHref } from '@/lib/nav';
import { isNotFoundError } from '@/lib/api-error';

export default function DashboardPage() {
	const { t } = useTranslation();
	const { user } = useAuth();
	const tenantSlug = useTenantSlug();

	const { data: profile } = useProfile();
	const walletQ = useWalletBalance();
	const pointQ = usePointAccount();
	const unreadQ = useUnreadNotifications();
	const userInitial =
		profile?.username?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || 'U';

	const isStatsLoading = walletQ.isLoading || pointQ.isLoading || unreadQ.isLoading;
	const statsError =
		(walletQ.error && !isNotFoundError(walletQ.error)) ||
		(pointQ.error && !isNotFoundError(pointQ.error));

	const quickLinks = [
		{
			to: buildNavHref(ROUTES.profile, tenantSlug),
			label: t('nav.profile'),
			desc: t('dashboard.quickLinkProfile'),
			icon: UserCircle,
			color: 'bg-blue-50 text-blue-700',
		},
		{
			to: buildNavHref(ROUTES.security, tenantSlug),
			label: t('nav.security'),
			desc: t('dashboard.quickLinkSecurity'),
			icon: ShieldCheck,
			color: 'bg-emerald-50 text-emerald-700',
		},
		{
			to: buildNavHref(ROUTES.sessions, tenantSlug),
			label: t('nav.sessions'),
			desc: t('dashboard.quickLinkSessions'),
			icon: Monitor,
			color: 'bg-purple-50 text-purple-700',
		},
		{
			to: buildNavHref(ROUTES.notifications, tenantSlug),
			label: t('nav.notifications'),
			desc: t('dashboard.quickLinkNotifications'),
			icon: Bell,
			color: 'bg-amber-50 text-amber-700',
		},
	];

	const tips = [t('dashboard.tip1'), t('dashboard.tip2'), t('dashboard.tip3'), t('dashboard.tip4')];

	return (
		<div className="space-y-8">
			{/* Welcome header */}
			<div className="flex items-center gap-4">
				<div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-xl font-bold text-primary-700">
					{userInitial}
				</div>
				<div>
					<h2 className="text-2xl font-bold text-neutral-900">
						{t('dashboard.greeting', {
							name: profile?.username || user?.username || user?.email || t('common.userFallback'),
						})}
					</h2>
					<p className="mt-1 text-neutral-600">{t('dashboard.welcome')}</p>
				</div>
			</div>

			{/* Quick stats row */}
			{isStatsLoading ? (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<SkeletonCard />
					<SkeletonCard />
					<SkeletonCard />
					<SkeletonCard />
				</div>
			) : statsError ? (
				<ErrorState message={t('dashboard.statsError')} />
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-700">
								<Wallet size={20} />
							</div>
							<div>
								<p className="text-sm text-neutral-500">{t('dashboard.stats.walletBalance')}</p>
								{/* 2026-08-17 修复：member/guest 等无钱包账户（wallet 404，空态由 isNotFoundError 过滤）
								    显示 ¥0.00 而非 ¥ --；有账户时格式化 ¥ + 2 位小数 */}
								<p className="text-lg font-semibold text-neutral-900">
									¥
									{Number(
										walletQ.data?.availableBalance ?? walletQ.data?.balance ?? 0,
									).toLocaleString(undefined, { minimumFractionDigits: 2 })}
								</p>
							</div>
						</div>
					</div>
					<div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-50 text-amber-700">
								<Coins size={20} />
							</div>
							<div>
								<p className="text-sm text-neutral-500">{t('dashboard.stats.points')}</p>
								{/* 2026-08-17 修复：member/guest 无积分账户（404，isNotFoundError 判定）显示 0 而非 -- */}
								<p className="text-lg font-semibold text-neutral-900">
									{pointQ.isError
										? isNotFoundError(pointQ.error)
											? '0'
											: '0'
										: ((pointQ.data as any)?.available ?? pointQ.data?.balance ?? '0')}
								</p>
							</div>
						</div>
					</div>
					<div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
								<ShieldCheck size={20} />
							</div>
							<div>
								<p className="text-sm text-neutral-500">{t('dashboard.stats.securityStatus')}</p>
								<p className="text-lg font-semibold text-emerald-700">
									{t('dashboard.securityGood')}
								</p>
							</div>
						</div>
					</div>
					<div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-md bg-rose-50 text-rose-700">
								<Bell size={20} />
							</div>
							<div>
								<p className="text-sm text-neutral-500">
									{t('dashboard.stats.unreadNotifications')}
								</p>
								<p className="text-lg font-semibold text-neutral-900">
									{unreadQ.data != null ? unreadQ.data.length : '0'}
								</p>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Quick links */}
			<div>
				<h3 className="text-lg font-semibold text-neutral-900">{t('dashboard.quickLinks')}</h3>
				<div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					{quickLinks.map((item) => (
						<Link
							key={item.to}
							to={item.to}
							className="group flex items-start gap-4 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-neutral-300"
						>
							<div
								className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${item.color}`}
							>
								<item.icon size={20} />
							</div>
							<div>
								<h3 className="font-semibold text-neutral-900 group-hover:text-primary-700 transition-colors">
									{item.label}
								</h3>
								<p className="mt-1 text-sm text-neutral-500">{item.desc}</p>
							</div>
						</Link>
					))}
				</div>
			</div>

			{/* Tips */}
			{isStatsLoading ? (
				<div className="rounded-lg border border-neutral-200 bg-white p-6 animate-pulse">
					<div className="h-6 w-1/3 rounded bg-neutral-200" />
					<div className="mt-4 space-y-3">
						<div className="h-4 w-2/3 rounded bg-neutral-100" />
						<div className="h-4 w-3/4 rounded bg-neutral-100" />
						<div className="h-4 w-1/2 rounded bg-neutral-100" />
						<div className="h-4 w-5/6 rounded bg-neutral-100" />
					</div>
				</div>
			) : (
				<div className="rounded-lg border border-neutral-200 bg-white p-6">
					<h3 className="text-lg font-semibold text-neutral-900">{t('dashboard.securityTips')}</h3>
					<ul className="mt-4 list-disc list-inside space-y-2 text-neutral-700">
						{tips.map((tip, i) => (
							<li key={i}>{tip}</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}
