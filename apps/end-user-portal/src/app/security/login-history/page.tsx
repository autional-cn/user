'use client';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { extractApiError } from '@autional-cn/shared';
import { useAuditLogs } from '@/hooks/queries';
import type { AuditLogItem, PageInfo } from '@/hooks/queries';
import { formatTime } from '@/lib/format';
import { LoadingScreen } from '@autional-cn/ui';
import { ErrorState } from '@autional-cn/ui';
import {
	History,
	Download,
	CheckCircle2,
	XCircle,
	ChevronLeft,
	ChevronRight,
	Clock,
	Globe,
	Monitor,
	MapPin,
	Search,
} from 'lucide-react';

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
	const pagination: PageInfo | undefined = data?.pagination;

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
				<div className="flex items-center gap-2">
					<label className="text-xs font-medium text-neutral-500">
						{t('loginHistory.startDate')}
					</label>
					<input
						type="date"
						value={startDate}
						onChange={(e) => {
							setStartDate(e.target.value);
							setPage(1);
						}}
						className="rounded-md border border-neutral-200 px-2 py-1 text-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
					/>
				</div>
				<div className="flex items-center gap-2">
					<label className="text-xs font-medium text-neutral-500">
						{t('loginHistory.endDate')}
					</label>
					<input
						type="date"
						value={endDate}
						onChange={(e) => {
							setEndDate(e.target.value);
							setPage(1);
						}}
						className="rounded-md border border-neutral-200 px-2 py-1 text-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
					/>
				</div>
			</div>

			{/* Table */}
			<div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead className="border-b border-neutral-200 bg-neutral-50">
							<tr>
								<th className="whitespace-nowrap px-4 py-3 text-left font-medium text-neutral-600">
									<span className="flex items-center gap-1">
										<Clock size={14} />
										{t('loginHistory.time')}
									</span>
								</th>
								<th className="whitespace-nowrap px-4 py-3 text-left font-medium text-neutral-600">
									{t('loginHistory.ip')}
								</th>
								<th className="whitespace-nowrap px-4 py-3 text-left font-medium text-neutral-600">
									<span className="flex items-center gap-1">
										<Monitor size={14} />
										{t('loginHistory.device')}
									</span>
								</th>
								<th className="whitespace-nowrap px-4 py-3 text-left font-medium text-neutral-600">
									<span className="flex items-center gap-1">
										<MapPin size={14} />
										{t('loginHistory.location')}
									</span>
								</th>
								<th className="whitespace-nowrap px-4 py-3 text-left font-medium text-neutral-600">
									{t('loginHistory.status')}
								</th>
								<th className="whitespace-nowrap px-4 py-3 text-left font-medium text-neutral-600">
									{t('loginHistory.reason')}
								</th>
							</tr>
						</thead>
						<tbody>
							{items.map((item, idx) => {
								const ua = parseUserAgent(item.userAgent);
								const isSuccess = item.status !== 'failed';
								return (
									<tr
										key={item.id || idx}
										className={`border-b border-neutral-100 hover:bg-neutral-50 transition-colors ${!isSuccess ? 'bg-rose-50/30' : ''}`}
									>
										<td className="px-4 py-3 text-neutral-700 whitespace-nowrap">
											{formatTime(item.timestamp || item.createdAt)}
										</td>
										<td className="px-4 py-3 font-mono text-xs text-neutral-600 whitespace-nowrap">
											{item.ip || '-'}
										</td>
										<td className="px-4 py-3 text-neutral-600 max-w-[200px] truncate">
											{`${ua.browser} ${ua.os}`.trim() || t('loginHistory.unknownDevice')}
										</td>
										<td className="px-4 py-3 text-neutral-600">
											{item.location || t('loginHistory.unknownLocation')}
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											{isSuccess ? (
												<span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
													<CheckCircle2 size={12} />
													{t('loginHistory.statusSuccess')}
												</span>
											) : (
												<span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
													<XCircle size={12} />
													{t('loginHistory.statusFailed')}
												</span>
											)}
										</td>
										<td className="px-4 py-3 text-neutral-500 text-xs">
											{!isSuccess ? item.reason || t('loginHistory.unknownReason') : '-'}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>

				{items.length === 0 && (
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<History size={40} className="text-neutral-300" />
						<p className="mt-4 text-sm text-neutral-500">{t('loginHistory.empty')}</p>
					</div>
				)}
			</div>

			{/* Pagination */}
			{pagination && pagination.totalPages > 1 && (
				<div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3">
					<span className="text-sm text-neutral-500">
						{t('loginHistory.pageInfo', {
							page: pagination.page,
							totalPages: pagination.totalPages,
						})}
					</span>
					<div className="flex items-center gap-2">
						<button
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={!pagination.hasPrev}
							className="flex items-center gap-1 rounded-md border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed"
						>
							<ChevronLeft size={14} /> {t('loginHistory.prev')}
						</button>
						<button
							onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
							disabled={!pagination.hasNext}
							className="flex items-center gap-1 rounded-md border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed"
						>
							{t('loginHistory.next')}
							<ChevronRight size={14} />
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
