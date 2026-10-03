'use client';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { useAuditLogs } from '@/hooks/queries';
import type { AuditLogItem } from '@/hooks/queries';
import { formatTime } from '@/lib/format';
import { LoadingScreen } from '@autional-cn/ui';
import { ErrorState } from '@autional-cn/ui';
import { StatusBadge } from '@autional-cn/ui';
import type { StatusVariant } from '@autional-cn/ui';
import { DataTable, DateRangeFilter } from '@autional-cn/ui/antd';
import type { DataTableColumns } from '@autional-cn/ui/antd';
import {
	History,
	Download,
	CheckCircle2,
	XCircle,
	Clock,
	Monitor,
	MapPin,
} from 'lucide-react';

// 状态 → 设计系统徽标档位。只做映射，配色归设计系统（-soft/-text 是成对的、做过对比度验证）。
const STATUS_VARIANTS: Record<string, StatusVariant> = {
	success: 'success',
	failed: 'danger',
};

export default function LoginHistoryPage() {
	const { t } = useTranslation();
	const toast = useToast();

	const [page, setPage] = useState(1);
	const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
	const [startDate, setStartDate] = useState('');
	const [endDate, setEndDate] = useState('');
	const pageSize = 10;

	const params: Record<string, unknown> = { page, pageSize };
	if (startDate) params.startDate = startDate;
	if (endDate) params.endDate = endDate;

	const { data, isLoading, error } = useAuditLogs(
		params as {
			page?: number;
			pageSize?: number;
			startDate?: string;
			endDate?: string;
			action?: string;
			status?: string;
		},
	);

	const allItems: AuditLogItem[] = data?.items || [];
	const total: number = data?.total || 0;

	const items = useMemo(() => {
		if (statusFilter === 'all') return allItems;
		return allItems.filter((item) =>
			statusFilter === 'success' ? item.status !== 'failed' : item.status === 'failed',
		);
	}, [allItems, statusFilter]);

	const parseUserAgent = (ua?: string): { browser: string; os: string } => {
		if (!ua) return { browser: t('loginHistory.unknownBrowser'), os: '' };
		let browser = ua;
		let os = '';
		if (ua.includes('Chrome')) browser = 'Chrome';
		else if (ua.includes('Firefox')) browser = 'Firefox';
		else if (ua.includes('Safari')) browser = 'Safari';
		else if (ua.includes('Edge')) browser = 'Edge';

		if (ua.includes('Windows')) os = 'Windows';
		else if (ua.includes('Mac')) os = 'macOS';
		else if (ua.includes('Linux')) os = 'Linux';
		else if (ua.includes('Android')) os = 'Android';
		else if (ua.includes('iPhone') || ua.includes('iOS')) os = 'iOS';

		return { browser, os: os ? `(${os})` : '' };
	};

	const handleExportCSV = () => {
		if (items.length === 0) {
			toast.info(t('loginHistory.empty'));
			return;
		}
		try {
			const headers = [
				t('loginHistory.time'),
				t('loginHistory.ip'),
				t('loginHistory.device'),
				t('loginHistory.location'),
				t('loginHistory.status'),
				t('loginHistory.reason'),
			];
			const rows = items.map((item) => {
				const ua = parseUserAgent(item.userAgent);
				return [
					item.timestamp || item.createdAt || '',
					item.ip || '',
					`${ua.browser} ${ua.os}`.trim(),
					item.location || t('loginHistory.unknownLocation'),
					item.status === 'success'
						? t('loginHistory.statusSuccess')
						: t('loginHistory.statusFailed'),
					item.reason || (item.status !== 'success' ? t('loginHistory.unknownReason') : ''),
				];
			});
			const bom = '\uFEFF';
			const csv =
				bom +
				[headers, ...rows]
					.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
					.join('\n');
			const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `login-history-${new Date().toISOString().slice(0, 10)}.csv`;
			a.click();
			URL.revokeObjectURL(url);
			toast.success(t('loginHistory.exportSuccess'));
		} catch {
			toast.error(t('loginHistory.exportError'));
		}
	};

	if (isLoading) return <LoadingScreen message={t('loginHistory.loading')} />;
	if (error) return <ErrorState message={t('loginHistory.error')} className="min-h-[40vh]" />;

	// 列定义：只描述**这一页有哪些列**；表头底色 / 悬浮态 / 边框 / 行高 / 分页外观
	// 由设计系统下发的组件级令牌决定 —— 四个门户吃的是同一份令牌。
	const columns: DataTableColumns<AuditLogItem> = [
		{
			title: (
				<span className="flex items-center gap-1">
					<Clock size={14} />
					{t('loginHistory.time')}
				</span>
			),
			key: 'time',
			render: (_: unknown, item: AuditLogItem) => (
				<span className="whitespace-nowrap">{formatTime(item.timestamp || item.createdAt)}</span>
			),
		},
		{
			title: t('loginHistory.ip'),
			dataIndex: 'ip',
			key: 'ip',
			render: (v: string | undefined) => <span className="font-mono text-xs">{v || '-'}</span>,
		},
		{
			title: (
				<span className="flex items-center gap-1">
					<Monitor size={14} />
					{t('loginHistory.device')}
				</span>
			),
			key: 'device',
			render: (_: unknown, item: AuditLogItem) => {
				const ua = parseUserAgent(item.userAgent);
				return (
					<span className="inline-block max-w-[200px] truncate">
						{`${ua.browser} ${ua.os}`.trim() || t('loginHistory.unknownDevice')}
					</span>
				);
			},
		},
		{
			title: (
				<span className="flex items-center gap-1">
					<MapPin size={14} />
					{t('loginHistory.location')}
				</span>
			),
			dataIndex: 'location',
			key: 'location',
			render: (v: string | undefined) => v || t('loginHistory.unknownLocation'),
		},
		{
			title: t('loginHistory.status'),
			dataIndex: 'status',
			key: 'status',
			render: (v: string | undefined) => {
				// 原表的判定是「非 failed 一律算成功」，判定与徽标文案都要原样保留。
				const isSuccess = v !== 'failed';
				return (
					<StatusBadge variant={STATUS_VARIANTS[isSuccess ? 'success' : 'failed']}>
						{isSuccess ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
						{isSuccess ? t('loginHistory.statusSuccess') : t('loginHistory.statusFailed')}
					</StatusBadge>
				);
			},
		},
		{
			title: t('loginHistory.reason'),
			dataIndex: 'reason',
			key: 'reason',
			render: (v: string | undefined, item: AuditLogItem) => (
				<span className="text-xs">
					{item.status !== 'failed' ? '-' : v || t('loginHistory.unknownReason')}
				</span>
			),
		},
	];

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-xl font-bold text-neutral-900">{t('loginHistory.title')}</h2>
					<p className="mt-1 text-sm text-neutral-500">{t('loginHistory.subtitle')}</p>
				</div>
				<button
					onClick={handleExportCSV}
					disabled={items.length === 0}
					className="flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
				>
					<Download size={14} />
					{t('loginHistory.export')}
				</button>
			</div>

			{/* Filters */}
			<div className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4">
				<div className="flex items-center gap-1 rounded-md bg-neutral-100 p-0.5">
					{(['all', 'success', 'failed'] as const).map((f) => (
						<button
							key={f}
							onClick={() => {
								setStatusFilter(f);
								setPage(1);
							}}
							className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
								statusFilter === f
									? 'bg-white text-neutral-900 shadow-sm'
									: 'text-neutral-500 hover:text-neutral-700'
							}`}
						>
							{f === 'all'
								? t('loginHistory.filterAll')
								: f === 'success'
									? t('loginHistory.filterSuccess')
									: t('loginHistory.filterFailed')}
						</button>
					))}
				</div>
				<div className="h-5 w-px bg-neutral-200" />
				{/* 两个原生 date 输入 → 设计系统的区间件。原来「开始日期 / 结束日期」是两个独立标签，
					现在这两个文案变成区间件的两个占位符（同一批 i18n 键，语义不变）。 */}
				<DateRangeFilter
					size="small"
					placeholder={[t('loginHistory.startDate'), t('loginHistory.endDate')]}
					value={startDate && endDate ? [startDate, endDate] : null}
					onChange={(v) => {
						setStartDate(v?.[0] ?? '');
						setEndDate(v?.[1] ?? '');
						setPage(1);
					}}
				/>
			</div>

			{/* 列定义只描述「这一页有哪些列」；表头 / 悬浮态 / 边框 / 行高 / 分页外观
			    由设计系统下发的组件级令牌决定，与其它三个门户同源。 */}
			{/* 原来「登录失败」整行铺一层浅色底 —— 那是这一页唯一的危险信号，rowClassName 保留该行为。
			    原来「无数据」也不是表体里的占位 <tr>，而是表格外的一整块（图标 + 文案）；
			    整块放进 emptyText 才能一条不丢地搬过来。 */}
			<DataTable<AuditLogItem>
				rowKey={(r, i) => r.id || String(i)}
				columns={columns}
				dataSource={items}
				scroll={{ x: 'max-content' }}
				rowClassName={(r) => (r.status === 'failed' ? 'bg-rose-50/30' : '')}
				locale={{
					emptyText: (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<History size={40} className="text-neutral-300" />
							<p className="mt-4 text-sm text-neutral-500">{t('loginHistory.empty')}</p>
						</div>
					),
				}}
				pagination={{
					current: page,
					pageSize,
					total,
					onChange: setPage,
					// 原来的手写翻页只在超过一页时才出现；hideOnSinglePage 保留这个行为。
					hideOnSinglePage: true,
				}}
			/>
		</div>
	);
}
