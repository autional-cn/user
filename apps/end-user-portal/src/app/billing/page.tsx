'use client';

import { useState } from 'react';
import { LoadingScreen, ErrorState, EmptyState } from '@autional-cn/ui';
import { SkeletonCard, SkeletonRow } from '@/components/ui/Skeleton';
import { useTranslation } from 'react-i18next';
import { isNotFoundError } from '@/lib/api-error';
import {
	useBillingSubscription,
	useBillingRecords,
	useBillingUsage,
	useBillingStatistics,
} from '@/hooks/queries';
import { useTenant } from '@/hooks/use-tenant';
import {
	CreditCard,
	BarChart3,
	HardDrive,
	Users,
	Activity,
	FileText,
	RefreshCw,
	Calendar,
} from 'lucide-react';

export default function BillingPage() {
	const { t } = useTranslation();
	const { currentTenantId } = useTenant();
	const tenantId = currentTenantId || '';

	const {
		data: sub,
		isLoading: subLoading,
		error: subError,
		refetch: refetchSub,
	} = useBillingSubscription(tenantId, !!tenantId);
	const { data: usage } = useBillingUsage(tenantId, !!tenantId);
	const { data: stats } = useBillingStatistics(tenantId, !!tenantId);

	const [page, setPage] = useState(1);
	const { data: records } = useBillingRecords(tenantId, { page, pageSize: 20 }, !!tenantId);

	if (subLoading)
		return (
			<div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
				<SkeletonCard />
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<SkeletonCard />
					<SkeletonCard />
				</div>
				<SkeletonRow />
				<SkeletonRow />
				<SkeletonRow />
			</div>
		);

	if (subError) {
		if (isNotFoundError(subError)) {
			return (
				<EmptyState
					title={t('billing.empty', '暂无账单数据')}
					description={t('billing.emptyDesc', '当前租户尚未产生计费记录')}
				/>
			);
		}
		return (
			<ErrorState
				message={t('billing.loadError', '账单信息加载失败')}
				onRetry={() => refetchSub()}
			/>
		);
	}

	const planName = sub?.planId ?? '-';
	const planStatus = sub?.status ?? '-';
	const periodStart = sub?.currentPeriodStart
		? new Date(sub.currentPeriodStart).toLocaleDateString()
		: '-';
	const periodEnd = sub?.currentPeriodEnd
		? new Date(sub.currentPeriodEnd).toLocaleDateString()
		: '-';
	const billingCycle = sub?.billingCycle ?? '-';
	const amount = sub?.amount ?? 0;
	const currency = sub?.currency ?? 'CNY';
	const autoRenew = sub?.autoRenew ?? false;

	const maxApiCalls = 10000;
	const maxStorage = 100;
	const maxUsers = 100;

	const apiPercent =
		usage?.apiCallsToday != null ? Math.min((usage.apiCallsToday / maxApiCalls) * 100, 100) : 0;
	const storagePercent =
		usage?.storageGb != null ? Math.min((usage.storageGb / maxStorage) * 100, 100) : 0;
	const usersPercent = usage?.users != null ? Math.min((usage.users / maxUsers) * 100, 100) : 0;

	return (
		<div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
			<h1 className="text-2xl font-bold">{t('billing.title')}</h1>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="bg-white rounded-lg border p-5">
					<div className="flex items-center gap-3 mb-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-700">
							<CreditCard size={20} />
						</div>
						<div>
							<p className="text-sm text-gray-500">{t('billing.currentSubscription')}</p>
							<p className="text-lg font-semibold capitalize">{planName}</p>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-3 text-sm">
						<div>
							<span className="text-gray-400">{t('billing.status')}</span>
							<p className="font-medium">
								<span
									className={`inline-block px-2 py-0.5 rounded text-xs ${planStatus === 'active' ? 'bg-green-50 text-green-600' : planStatus === 'trial' ? 'bg-blue-50 text-blue-600' : planStatus === 'cancelled' ? 'bg-red-50 text-red-600' : planStatus === 'past_due' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'}`}
								>
									{t(
										planStatus === 'active'
											? 'billing.statusLabels.active'
											: planStatus === 'trial'
												? 'billing.statusLabels.trial'
												: planStatus === 'cancelled'
													? 'billing.statusLabels.cancelled'
													: planStatus === 'past_due'
														? 'billing.statusLabels.pastDue'
														: planStatus,
									)}
								</span>
							</p>
						</div>
						<div>
							<span className="text-gray-400">{t('billing.billingCycle')}</span>
							<p className="font-medium capitalize">
								{t(
									billingCycle === 'monthly'
										? 'billing.cycleLabels.monthly'
										: billingCycle === 'yearly'
											? 'billing.cycleLabels.yearly'
											: billingCycle,
								)}
							</p>
						</div>
						<div>
							<span className="text-gray-400">{t('billing.amount')}</span>
							<p className="font-medium">
								{currency === 'CNY' ? '¥' : ''}
								{amount.toLocaleString()}/
								{billingCycle === 'yearly' ? t('billing.perYear') : t('billing.perMonth')}
							</p>
						</div>
						<div>
							<span className="text-gray-400">{t('billing.autoRenew')}</span>
							<p className={`font-medium ${autoRenew ? 'text-green-600' : 'text-gray-500'}`}>
								{autoRenew ? t('billing.autoRenewEnabled') : t('billing.autoRenewDisabled')}
							</p>
						</div>
					</div>
					<div className="mt-3 pt-3 border-t text-xs text-gray-400 flex items-center gap-1">
						<Calendar size={12} />
						{periodStart} ~ {periodEnd}
					</div>
				</div>

				{stats && (
					<div className="bg-white rounded-lg border p-5">
						<div className="flex items-center gap-3 mb-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-md bg-purple-50 text-purple-700">
								<BarChart3 size={20} />
							</div>
							<div>
								<p className="text-sm text-gray-500">{t('billing.spendingStats')}</p>
								<p className="text-lg font-semibold">
									{currency === 'CNY' ? '¥' : ''}
									{(stats.totalSpend ?? 0).toLocaleString()}
								</p>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-3 text-sm">
							<div>
								<span className="text-gray-400">{t('billing.mrr')}</span>
								<p className="font-medium">
									{currency === 'CNY' ? '¥' : ''}
									{(stats.mrr ?? 0).toLocaleString()}
								</p>
							</div>
							<div>
								<span className="text-gray-400">{t('billing.activeUsers')}</span>
								<p className="font-medium">{stats.activeUsers ?? 0}</p>
							</div>
							<div>
								<span className="text-gray-400">{t('billing.retentionRate')}</span>
								<p className="font-medium">
									{stats.retentionRate != null ? `${(stats.retentionRate * 100).toFixed(1)}%` : '-'}
								</p>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* 2026-08-17 修复：usage 404（无用量数据）由 useBillingUsage 转为空态（data=undefined），
			    此处始终渲染 usage 区块，字段用 ?? 0 落空态 —— 不再隐藏区块也不显示"加载失败"。 */}
			<div>
				<h2 className="text-lg font-semibold mb-3">{t('billing.usageOverview')}</h2>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<UsageCard
						icon={<Activity className="w-5 h-5 text-blue-500" />}
						label={t('billing.apiCalls')}
						value={usage?.apiCallsToday?.toLocaleString() ?? '0'}
						max={maxApiCalls}
						percent={apiPercent}
					/>
					<UsageCard
						icon={<HardDrive className="w-5 h-5 text-purple-500" />}
						label={t('billing.storageUsage')}
						value={`${usage?.storageGb ?? 0} GB`}
						max={maxStorage}
						percent={storagePercent}
						unit="GB"
					/>
					<UsageCard
						icon={<Users className="w-5 h-5 text-green-500" />}
						label={t('billing.usageUsers')}
						value={`${usage?.users ?? 0}`}
						max={maxUsers}
						percent={usersPercent}
					/>
				</div>
			</div>

			<div>
				<h2 className="text-lg font-semibold mb-3">{t('billing.billingRecords')}</h2>
				<div className="overflow-x-auto rounded-lg border">
					<table className="w-full text-sm">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-2 text-left">{t('billing.invoiceNumber')}</th>
								<th className="px-4 py-2 text-left">{t('billing.recordType')}</th>
								<th className="px-4 py-2 text-right">{t('billing.amount')}</th>
								<th className="px-4 py-2 text-center">{t('billing.recordStatus')}</th>
								<th className="px-4 py-2 text-left">{t('billing.description')}</th>
								<th className="px-4 py-2 text-right">{t('billing.date')}</th>
							</tr>
						</thead>
						<tbody>
							{(records?.items ?? []).map((r) => (
								<tr key={r.recordId} className="border-t">
									<td className="px-4 py-2 font-mono text-xs">{r.invoiceNumber ?? '-'}</td>
									<td className="px-4 py-2">
										<span className={recordTypeBadge(r.type)}>{t(recordTypeLabelKey(r.type))}</span>
									</td>
									<td className="px-4 py-2 text-right font-mono">
										¥{(r.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
									</td>
									<td className="px-4 py-2 text-center">
										<span className={recordStatusBadge(r.status)}>
											{t(recordStatusLabelKey(r.status))}
										</span>
									</td>
									<td className="px-4 py-2 text-gray-500 max-w-[200px] truncate">
										{r.description ?? '-'}
									</td>
									<td className="px-4 py-2 text-right text-gray-400 text-xs">
										{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-'}
									</td>
								</tr>
							))}
							{(!records?.items || records.items.length === 0) && (
								<tr>
									<td colSpan={6} className="px-4 py-8 text-center text-gray-400">
										{t('billing.noRecords')}
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
				{records && (records.total ?? 0) > 20 && (
					<div className="flex justify-center gap-2 mt-4">
						<button
							disabled={page <= 1}
							onClick={() => setPage(page - 1)}
							className="px-3 py-1 rounded border text-sm disabled:opacity-30"
						>
							{t('common.previous')}
						</button>
						<span className="px-3 py-1 text-sm text-gray-500">
							{page} / {Math.ceil((records.total ?? 0) / 20)}
						</span>
						<button
							disabled={page >= Math.ceil((records.total ?? 0) / 20)}
							onClick={() => setPage(page + 1)}
							className="px-3 py-1 rounded border text-sm disabled:opacity-30"
						>
							{t('common.next')}
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

function UsageCard({
	icon,
	label,
	value,
	max,
	percent,
	unit,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
	max: number;
	percent: number;
	unit?: string;
}) {
	return (
		<div className="bg-white rounded-lg border p-4">
			<div className="flex items-center gap-2 mb-3">
				{icon}
				<span className="text-sm text-gray-500">{label}</span>
			</div>
			<div className="text-xl font-bold mb-2">{value}</div>
			<div className="w-full bg-gray-100 rounded-full h-2 mb-1">
				<div
					className={`h-2 rounded-full transition-all ${percent > 80 ? 'bg-red-500' : percent > 60 ? 'bg-amber-500' : 'bg-green-500'}`}
					style={{ width: `${Math.max(percent, 2)}%` }}
				/>
			</div>
			<div className="text-xs text-gray-400">
				{value} / {max}
				{unit ? ` ${unit}` : ''} ({percent.toFixed(1)}%)
			</div>
		</div>
	);
}

const recordTypeLabels: Record<string, string> = {
	subscription: 'billing.recordTypes.subscription',
	invoice: 'billing.recordTypes.invoice',
	payment: 'billing.recordTypes.payment',
	refund: 'billing.recordTypes.refund',
	credit: 'billing.recordTypes.credit',
	adjustment: 'billing.recordTypes.adjustment',
};

const recordTypeBadges: Record<string, string> = {
	subscription: 'text-blue-600 bg-blue-50 px-2 py-0.5 rounded',
	invoice: 'text-purple-600 bg-purple-50 px-2 py-0.5 rounded',
	payment: 'text-green-600 bg-green-50 px-2 py-0.5 rounded',
	refund: 'text-orange-600 bg-orange-50 px-2 py-0.5 rounded',
	credit: 'text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded',
	adjustment: 'text-gray-600 bg-gray-100 px-2 py-0.5 rounded',
};

const recordStatusLabels: Record<string, string> = {
	paid: 'billing.recordStatusLabels.paid',
	pending: 'billing.recordStatusLabels.pending',
	failed: 'billing.recordStatusLabels.failed',
	refunded: 'billing.recordStatusLabels.refunded',
	cancelled: 'billing.recordStatusLabels.cancelled',
};

const recordStatusBadges: Record<string, string> = {
	paid: 'bg-green-50 text-green-600 px-2 py-0.5 rounded',
	pending: 'bg-amber-50 text-amber-600 px-2 py-0.5 rounded',
	failed: 'bg-red-50 text-red-600 px-2 py-0.5 rounded',
	refunded: 'bg-blue-50 text-blue-600 px-2 py-0.5 rounded',
	cancelled: 'bg-gray-100 text-gray-500 px-2 py-0.5 rounded',
};

function recordTypeLabelKey(t: string) {
	return recordTypeLabels[t] ?? t;
}
function recordTypeBadge(t: string) {
	return recordTypeBadges[t] ?? '';
}
function recordStatusLabelKey(s: string | undefined) {
	return recordStatusLabels[s ?? ''] ?? s ?? '-';
}
function recordStatusBadge(s: string | undefined) {
	return recordStatusBadges[s ?? ''] ?? '';
}
