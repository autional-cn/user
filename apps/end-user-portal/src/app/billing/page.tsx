'use client';

import { useState } from 'react';
import { ErrorState, EmptyState, StatusBadge } from '@autional-cn/ui';
import type { StatusVariant } from '@autional-cn/ui';
import { DataTable } from '@autional-cn/ui/antd';
import type { DataTableColumns } from '@autional-cn/ui/antd';
import { SkeletonCard, SkeletonRow } from '@/components/ui/Skeleton';
import { useTranslation } from 'react-i18next';
import { isNotFoundError } from '@/lib/api-error';
import {
	useBillingSubscription,
	useBillingRecords,
	useBillingUsage,
	useBillingStatistics,
} from '@/hooks/queries';
// 行的形状**只有一份**：由 hooks 导出。此前本页自己声明过一个等价接口，那是第二份定义，
// 后端的字段一改就会有一边跟不上（而类型检查不会报——两边各自成立）。
import type { BillingRecordItem } from '@/hooks/queries';
import { useTenant } from '@/hooks/use-tenant';

import {
	CreditCard,
	BarChart3,
	HardDrive,
	Users,
	Activity,
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

	// 列定义：只描述「这一页有哪些列」。表头底色 / 悬浮态 / 边框 / 行高 / 分页外观，
	// 由设计系统下发的组件级令牌决定 —— 与控制台那 156 处 antd Table 吃的是同一份令牌。
	const columns: DataTableColumns<BillingRecordItem> = [
		{
			title: t('billing.invoiceNumber'),
			dataIndex: 'invoiceNumber',
			key: 'invoiceNumber',
			render: (v: string | undefined) => <span className="font-mono text-xs">{v ?? '-'}</span>,
		},
		{
			title: t('billing.recordType'),
			dataIndex: 'type',
			key: 'type',
			render: (v: string) => (
				<StatusBadge variant={recordTypeVariant(v)}>{t(recordTypeLabelKey(v))}</StatusBadge>
			),
		},
		{
			title: t('billing.amount'),
			dataIndex: 'amount',
			key: 'amount',
			align: 'right',
			render: (v: number | string | undefined) => (
				<span className="font-mono">
					{/* v 可能是字符串（后端 decimal 序列化）：String.toLocaleString 会忽略选项参数、
						千分位/两位小数全部落空（UP-56）。先 Number() 归一，并显式封顶两位小数。 */}
					¥{Number(v ?? 0).toLocaleString(undefined, {
						minimumFractionDigits: 2,
						maximumFractionDigits: 2,
					})}
				</span>
			),
		},
		{
			title: t('billing.recordStatus'),
			dataIndex: 'status',
			key: 'status',
			align: 'center',
			render: (v: string | undefined) => (
				<StatusBadge variant={recordStatusVariant(v)}>{t(recordStatusLabelKey(v))}</StatusBadge>
			),
		},
		{
			title: t('billing.description'),
			dataIndex: 'description',
			key: 'description',
			render: (v: string | undefined) => (
				<span className="text-neutral-600 inline-block max-w-[200px] truncate">{v ?? '-'}</span>
			),
		},
		{
			title: t('billing.date'),
			dataIndex: 'createdAt',
			key: 'createdAt',
			align: 'right',
			render: (v: string | undefined) => (
				<span className="text-neutral-600 text-xs">
					{v ? new Date(v).toLocaleDateString() : '-'}
				</span>
			),
		},
	];

	return (
		<div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
			<h1 className="text-2xl font-bold">{t('billing.title')}</h1>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="bg-white rounded-lg border p-5">
					<div className="flex items-center gap-3 mb-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-md bg-info-soft text-info-text">
							<CreditCard size={20} />
						</div>
						<div>
							<p className="text-sm text-neutral-600">{t('billing.currentSubscription')}</p>
							<p className="text-lg font-semibold capitalize">{planName}</p>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-3 text-sm">
						<div>
							<span className="text-neutral-600">{t('billing.status')}</span>
							<p className="font-medium">
								<span
									className={`inline-block px-2 py-0.5 rounded text-xs ${planStatus === 'active' ? 'bg-success-soft text-success' : planStatus === 'trial' ? 'bg-info-soft text-info' : planStatus === 'cancelled' ? 'bg-danger-soft text-danger' : planStatus === 'past_due' ? 'bg-amber-50 text-amber-600' : 'bg-neutral-200 text-neutral-600'}`}
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
							<span className="text-neutral-600">{t('billing.billingCycle')}</span>
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
							<span className="text-neutral-600">{t('billing.amount')}</span>
							<p className="font-medium">
								{currency === 'CNY' ? '¥' : ''}
								{amount.toLocaleString()}/
								{billingCycle === 'yearly' ? t('billing.perYear') : t('billing.perMonth')}
							</p>
						</div>
						<div>
							<span className="text-neutral-600">{t('billing.autoRenew')}</span>
							<p className={`font-medium ${autoRenew ? 'text-success-text' : 'text-neutral-600'}`}>
								{autoRenew ? t('billing.autoRenewEnabled') : t('billing.autoRenewDisabled')}
							</p>
						</div>
					</div>
					<div className="mt-3 pt-3 border-t text-xs text-neutral-600 flex items-center gap-1">
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
								<p className="text-sm text-neutral-600">{t('billing.spendingStats')}</p>
								<p className="text-lg font-semibold">
									{currency === 'CNY' ? '¥' : ''}
									{(stats.totalSpend ?? 0).toLocaleString()}
								</p>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-3 text-sm">
							<div>
								<span className="text-neutral-600">{t('billing.mrr')}</span>
								<p className="font-medium">
									{currency === 'CNY' ? '¥' : ''}
									{(stats.mrr ?? 0).toLocaleString()}
								</p>
							</div>
							<div>
								<span className="text-neutral-600">{t('billing.activeUsers')}</span>
								<p className="font-medium">{stats.activeUsers ?? 0}</p>
							</div>
							<div>
								<span className="text-neutral-600">{t('billing.retentionRate')}</span>
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
						icon={<Activity className="w-5 h-5 text-info" />}
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
						icon={<Users className="w-5 h-5 text-success" />}
						label={t('billing.usageUsers')}
						value={`${usage?.users ?? 0}`}
						max={maxUsers}
						percent={usersPercent}
					/>
				</div>
			</div>

			<div>
				<h2 className="text-lg font-semibold mb-3">{t('billing.billingRecords')}</h2>
				<DataTable<BillingRecordItem>
					rowKey={(r, i) => r.recordId ?? String(i)}
					columns={columns}
					dataSource={records?.items ?? []}
					scroll={{ x: 'max-content' }}
					locale={{ emptyText: t('billing.noRecords') }}
					pagination={{
						current: page,
						pageSize: 20,
						total: records?.total ?? 0,
						onChange: setPage,
						// 原来的手写翻页只在 total > 20 时出现；hideOnSinglePage 保留「不足一页不显示分页条」。
						hideOnSinglePage: true,
					}}
				/>
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
				<span className="text-sm text-neutral-600">{label}</span>
			</div>
			<div className="text-xl font-bold mb-2">{value}</div>
			<div className="w-full bg-neutral-200 rounded-full h-2 mb-1">
				<div
					className={`h-2 rounded-full transition-all ${percent > 80 ? 'bg-danger' : percent > 60 ? 'bg-amber-500' : 'bg-success'}`}
					style={{ width: `${Math.max(percent, 2)}%` }}
				/>
			</div>
			<div className="text-xs text-neutral-600">
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

// 记录类型 → 设计系统徽标档位。**只做映射，不做样式**。
// 原表这里是 6 套裸色阶，其中 purple / cyan / orange 根本不在设计系统的色阶里 ——
// 同一件事在四个 portal 各有各的写法，也没有任何一套做过对比度验证。
// 类型是「分类」不是状态，所以按原色阶的语义族归档：绿→success、蓝/青→info、紫/灰→neutral；
// refund 取 info，是为了跟本页 recordStatus 的 refunded、以及发票页的 refunded 落在同一档。
const RECORD_TYPE_VARIANTS: Record<string, StatusVariant> = {
	subscription: 'info',
	invoice: 'neutral',
	payment: 'success',
	refund: 'info',
	credit: 'info',
	adjustment: 'neutral',
};

const recordStatusLabels: Record<string, string> = {
	paid: 'billing.recordStatusLabels.paid',
	pending: 'billing.recordStatusLabels.pending',
	failed: 'billing.recordStatusLabels.failed',
	refunded: 'billing.recordStatusLabels.refunded',
	cancelled: 'billing.recordStatusLabels.cancelled',
};

// 记录状态 → 设计系统徽标档位。档位与发票页的 STATUS_VARIANTS 逐项对齐，
// 免得「已退款」在两个页面是两个颜色。
const RECORD_STATUS_VARIANTS: Record<string, StatusVariant> = {
	paid: 'success',
	pending: 'warning',
	failed: 'danger',
	refunded: 'info',
	cancelled: 'neutral',
};

function recordTypeLabelKey(t: string) {
	return recordTypeLabels[t] ?? t;
}
function recordTypeVariant(t: string): StatusVariant {
	return RECORD_TYPE_VARIANTS[t] ?? 'neutral';
}
function recordStatusLabelKey(s: string | undefined) {
	return recordStatusLabels[s ?? ''] ?? s ?? '-';
}
function recordStatusVariant(s: string | undefined): StatusVariant {
	return RECORD_STATUS_VARIANTS[s ?? ''] ?? 'neutral';
}
