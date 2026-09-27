'use client';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuditLogs } from '@/hooks/queries';
import type { AuditLogItem } from '@/hooks/queries';
import { formatTime } from '@/lib/format';
import { LoadingScreen, ErrorState, EmptyState } from '@autional-cn/ui';
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
					<Clock size={14} className="text-neutral-400" />
					<input
						type="date"
						value={startDate}
						onChange={(e) => {
							setStartDate(e.target.value);
							setPage(1);
						}}
						className="h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm"
					/>
					<span className="text-sm text-neutral-400">{t('activity.dateRangeSeparator')}</span>
					<input
						type="date"
						value={endDate}
						onChange={(e) => {
							setEndDate(e.target.value);
							setPage(1);
						}}
						className="h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm"
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
				<div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
					<table className="w-full text-left text-sm">
						<thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
							<tr>
								<th className="px-4 py-3 font-medium w-40">{t('activity.table.time')}</th>
								<th className="px-4 py-3 font-medium w-28">{t('activity.table.action')}</th>
								<th className="px-4 py-3 font-medium">{t('activity.table.ip')}</th>
								<th className="px-4 py-3 font-medium">{t('activity.table.device')}</th>
								<th className="px-4 py-3 font-medium w-24">{t('activity.table.result')}</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-neutral-100 text-neutral-700">
							{items.map((log, i) => (
								<tr key={log.id || i} className="hover:bg-neutral-50">
									<td className="px-4 py-3 text-xs whitespace-nowrap">
										{log.timestamp ? formatTime(log.timestamp) : '—'}
									</td>
									<td className="px-4 py-3">
										<span className="inline-flex items-center rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-700">
											{getActionLabel(log.action)}
										</span>
									</td>
									<td className="px-4 py-3 text-xs font-mono">{log.ip || '—'}</td>
									<td className="px-4 py-3 text-xs flex items-center gap-1.5">
										{getDeviceIcon(log.userAgent)}
										<span>{log.userAgent ? log.userAgent.slice(0, 40) : '—'}</span>
									</td>
									<td className="px-4 py-3">
										{log.status === 'success' ? (
											<span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
												<CheckCircle2 size={10} /> {t('activity.status.success')}
											</span>
										) : log.status === 'failed' ? (
											<span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">
												<XCircle size={10} /> {t('activity.status.failed')}
											</span>
										) : (
											<span className="text-xs text-neutral-400">—</span>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{total > pageSize && (
				<div className="flex items-center justify-center gap-4">
					<button
						onClick={() => setPage(Math.max(1, page - 1))}
						disabled={page <= 1}
						className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50"
					>
						{t('common.previous')}
					</button>
					<span className="text-sm text-neutral-500">
						{page} / {Math.ceil(total / pageSize)}
					</span>
					<button
						onClick={() => setPage(page + 1)}
						disabled={page * pageSize >= total}
						className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50"
					>
						{t('common.next')}
					</button>
				</div>
			)}
		</div>
	);
}
