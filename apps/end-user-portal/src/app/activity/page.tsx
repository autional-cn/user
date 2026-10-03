'use client';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuditLogs } from '@/hooks/queries';
import type { AuditLogItem } from '@/hooks/queries';
import { formatTime } from '@/lib/format';
import { LoadingScreen, ErrorState, EmptyState, StatusBadge } from '@autional-cn/ui';
import type { StatusVariant } from '@autional-cn/ui';
import { DataTable, DateRangeFilter } from '@autional-cn/ui/antd';
import type { DataTableColumns } from '@autional-cn/ui/antd';
import { History, Download, CheckCircle2, XCircle, Clock, Monitor, Smartphone } from 'lucide-react';

const ACTION_OPTIONS = [
	{ value: '', labelKey: 'activity.allActions' },
	{ value: 'login', labelKey: 'activity.eventType.login' },
	{ value: 'logout', labelKey: 'activity.eventType.logout' },
	{ value: 'password_change', labelKey: 'activity.eventType.password_change' },
	{ value: 'mfa_enable', labelKey: 'activity.eventType.mfa_enable' },
	{ value: 'mfa_disable', labelKey: 'activity.eventType.mfa_disable' },
	{ value: 'profile_update', labelKey: 'activity.eventType.profile_update' },
	{ value: 'create', labelKey: 'activity.eventType.create' },
	{ value: 'update', labelKey: 'activity.eventType.update' },
	{ value: 'delete', labelKey: 'activity.eventType.delete' },
];

// 操作类型 → 设计系统徽标档位。**只做映射，不做样式**。
// 原表里这 10 种操作共用同一个中性灰标签（它们是分类，不是「成功/失败」这类状态），
// 所以映射整齐地落在 neutral：换 StatusBadge 是把配色交回设计系统，不是顺手按操作分色。
const ACTION_VARIANTS: Record<string, StatusVariant> = {
	login: 'neutral',
	logout: 'neutral',
	password_change: 'neutral',
	mfa_enable: 'neutral',
	mfa_disable: 'neutral',
	profile_update: 'neutral',
	create: 'neutral',
	update: 'neutral',
	delete: 'neutral',
};

// 执行结果 → 设计系统徽标档位。原来 success 是 emerald、failed 是 red 两套裸色阶，
// 现在只保留「哪一档」的语义（成功→success、失败→danger），配色由 StatusBadge 决定。
const RESULT_VARIANTS: Record<string, StatusVariant> = {
	success: 'success',
	failed: 'danger',
};

export default function ActivityPage() {
	const { t } = useTranslation();
	const [page, setPage] = useState(1);
	const [actionFilter, setActionFilter] = useState('');
	const [startDate, setStartDate] = useState('');
	const [endDate, setEndDate] = useState('');
	const pageSize = 15;

	const params: Record<string, unknown> = { page, pageSize };
	if (actionFilter) params.action = actionFilter;
	if (startDate) params.startDate = startDate;
	if (endDate) params.endDate = endDate;

	const { data, isLoading, error, refetch } = useAuditLogs(params as any);

	const items = data?.items || [];
	const total = data?.total || 0;

	const getActionLabel = (action?: string) => {
		const opt = ACTION_OPTIONS.find((a) => a.value === action);
		return opt?.labelKey ? t(opt.labelKey) : action || '—';
	};

	const getDeviceIcon = (userAgent?: string) => {
		if (!userAgent) return <Monitor size={14} />;
		if (/iPhone|iPad|Android|Mobile/i.test(userAgent)) return <Smartphone size={14} />;
		return <Monitor size={14} />;
	};

	const exportCSV = () => {
		if (items.length === 0) return;
		const headers = [
			t('activity.table.time'),
			t('activity.table.action'),
			t('activity.table.ip'),
			t('activity.table.device'),
			t('activity.table.location'),
			t('activity.table.result'),
		];
		const rows = items.map((log) => [
			log.timestamp ? formatTime(log.timestamp) : '',
			getActionLabel(log.action),
			log.ip || '',
			log.userAgent || '',
			log.location || '',
			log.status === 'success' ? t('activity.status.success') : t('activity.status.failed'),
		]);
		const csvContent = [
			headers.join(','),
			...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')),
		].join('\n');
		const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		link.href = URL.createObjectURL(blob);
		link.download = `activity_${new Date().toISOString().slice(0, 10)}.csv`;
		link.click();
		URL.revokeObjectURL(link.href);
	};

	if (isLoading) return <LoadingScreen message={t('common.loadingData')} />;
	if (error) return <ErrorState message={t('common.error')} onRetry={() => refetch()} />;

	// 列定义：只描述「这一页有哪些列」。表头底色 / 悬浮态 / 边框 / 行高 / 分页外观，
	// 由设计系统下发的组件级令牌决定 —— 与控制台那 156 处 antd Table 吃的是同一份令牌。
	const columns: DataTableColumns<AuditLogItem> = [
		{
			title: t('activity.table.time'),
			dataIndex: 'timestamp',
			key: 'timestamp',
			render: (v: string | undefined) => (
				<span className="text-xs whitespace-nowrap">{v ? formatTime(v) : '—'}</span>
			),
		},
		{
			title: t('activity.table.action'),
			dataIndex: 'action',
			key: 'action',
			render: (v: string | undefined) => (
				<StatusBadge variant={ACTION_VARIANTS[v ?? ''] ?? 'neutral'}>{getActionLabel(v)}</StatusBadge>
			),
		},
		{
			title: t('activity.table.ip'),
			dataIndex: 'ip',
			key: 'ip',
			render: (v: string | undefined) => <span className="text-xs font-mono">{v || '—'}</span>,
		},
		{
			title: t('activity.table.device'),
			dataIndex: 'userAgent',
			key: 'userAgent',
			render: (v: string | undefined) => (
				<span className="inline-flex items-center gap-1.5 text-xs">
					{getDeviceIcon(v)}
					<span>{v ? v.slice(0, 40) : '—'}</span>
				</span>
			),
		},
		{
			title: t('activity.table.result'),
			dataIndex: 'status',
			key: 'status',
			render: (v: string | undefined) =>
				v === 'success' ? (
					<StatusBadge variant={RESULT_VARIANTS.success}>
						<CheckCircle2 size={10} /> {t('activity.status.success')}
					</StatusBadge>
				) : v === 'failed' ? (
					<StatusBadge variant={RESULT_VARIANTS.failed}>
						<XCircle size={10} /> {t('activity.status.failed')}
					</StatusBadge>
				) : (
					<span className="text-xs text-neutral-500">—</span>
				),
		},
	];

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold text-neutral-900">{t('activity.title')}</h2>
				<p className="mt-2 text-neutral-600">{t('activity.description')}</p>
			</div>

			<div className="flex flex-wrap items-center gap-3">
				<select
					value={actionFilter}
					onChange={(e) => {
						setActionFilter(e.target.value);
						setPage(1);
					}}
					className="h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm"
				>
					{ACTION_OPTIONS.map((a) => (
						<option key={a.value} value={a.value}>
							{t(a.labelKey)}
						</option>
					))}
				</select>

				<div className="flex items-center gap-2">
					<Clock size={14} className="text-neutral-500" />
					{/* 原来是两个原生 <input type="date"> 加一个「~」分隔符：自绘、与其余三个门户的日期控件
					    不同源，而且「空区间」有 startDate / endDate 两个半选状态（只选了一端时查询里会出现一个
					    孤立的边界）。换成设计系统的区间件之后，值进值出都是字符串、空只有 null 一种。 */}
					<DateRangeFilter
						value={startDate && endDate ? [startDate, endDate] : null}
						onChange={(v) => {
							setStartDate(v?.[0] ?? '');
							setEndDate(v?.[1] ?? '');
							setPage(1);
						}}
					/>
				</div>

				{items.length > 0 && (
					<button
						onClick={exportCSV}
						className="flex items-center gap-1.5 h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-600 hover:bg-neutral-50"
					>
						<Download size={14} />
						{t('activity.export')}
					</button>
				)}
			</div>

			{items.length === 0 ? (
				<EmptyState
					icon={<History />}
					title={t('common.empty')}
					description={
						actionFilter || startDate || endDate
							? t('activity.noMatchingRecords')
							: t('activity.noRecords')
					}
				/>
			) : (
				<DataTable<AuditLogItem>
					rowKey={(r, i) => r.id ?? String(i)}
					columns={columns}
					dataSource={items}
					scroll={{ x: 'max-content' }}
					pagination={{
						current: page,
						pageSize,
						total,
						onChange: setPage,
						// 原来的手写翻页只在 total > pageSize 时才出现；hideOnSinglePage 保留「不足一页不显示分页条」。
						hideOnSinglePage: true,
					}}
				/>
			)}
		</div>
	);
}
