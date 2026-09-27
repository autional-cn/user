'use client';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCommunicationLogs } from '@/hooks/queries';
import { formatTime } from '@/lib/format';
import { ErrorState } from '@autional-cn/ui';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { Mail, Smartphone, Bell, ChevronLeft, ChevronRight, History, Filter } from 'lucide-react';

const channelMeta: Record<string, { icon: typeof Mail; labelKey: string; color: string }> = {
	sms: { icon: Smartphone, labelKey: 'communication.channel.sms', color: 'text-green-700' },
	email: { icon: Mail, labelKey: 'communication.channel.email', color: 'text-blue-700' },
	push: { icon: Bell, labelKey: 'communication.channel.push', color: 'text-purple-700' },
};

const channelOptions = ['', 'sms', 'email', 'push'];

export default function CommunicationHistoryPage() {
	const { t } = useTranslation();
	const [page, setPage] = useState(1);
	const [channelFilter, setChannelFilter] = useState('');
	const pageSize = 15;

	const { data, isLoading, error } = useCommunicationLogs({
		page,
		pageSize,
		channel: channelFilter || undefined,
	});

	const list = (data as any)?.items || [];
	const total = (data as any)?.total || 0;
	const pagination = (data as any)?.pagination;

	const maskRecipient = (r?: string) => {
		if (!r) return '--';
		if (r.includes('@')) {
			const [name, domain] = r.split('@');
			return name.slice(0, 2) + '***@' + domain;
		}
		if (r.length > 7) return r.slice(0, 3) + '****' + r.slice(-3);
		return r.slice(0, 1) + '***' + r.slice(-1);
	};

	const statusLabel = (s?: string) => {
		switch (s) {
			case 'sent':
				return t('communication.status.sent');
			case 'delivered':
				return t('communication.status.delivered');
			case 'failed':
				return t('communication.status.failed');
			case 'pending':
				return t('communication.status.pending');
			default:
				return s || '--';
		}
	};

	const statusColor = (s?: string) => {
		switch (s) {
			case 'delivered':
				return 'text-emerald-600';
			case 'sent':
				return 'text-blue-600';
			case 'failed':
				return 'text-red-600';
			default:
				return 'text-neutral-500';
		}
	};

	if (isLoading)
		return (
			<div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
				<SkeletonRow />
				<SkeletonRow />
				<SkeletonRow />
				<SkeletonRow />
			</div>
		);
	if (error) return <ErrorState message={t('communication.error')} className="min-h-[40vh]" />;

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-xl font-bold text-neutral-900">
						{t('communication.historyTitle', 'Communication History')}
					</h2>
					<p className="mt-1 text-sm text-neutral-500">
						{total > 0
							? t('communication.totalLogs', { total })
							: t('communication.noLogs', 'No communication logs found')}
					</p>
				</div>
			</div>

			<div className="flex items-center gap-3">
				<div className="flex items-center gap-2">
					<Filter size={16} className="text-neutral-400" />
					<span className="text-sm text-neutral-500">
						{t('communication.filterByChannel', 'Channel:')}
					</span>
				</div>
				<div className="flex gap-1 rounded-md border border-neutral-200 bg-white p-1">
					{channelOptions.map((ch) => (
						<button
							key={ch}
							onClick={() => {
								setChannelFilter(ch);
								setPage(1);
							}}
							className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
								channelFilter === ch
									? 'bg-primary-100 text-primary-700'
									: 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
							}`}
						>
							{ch === ''
								? t('communication.allChannels', 'All')
								: t(channelMeta[ch]?.labelKey || ch)}
						</button>
					))}
				</div>
			</div>

			<div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm">
						<thead className="border-b border-neutral-200 bg-neutral-50">
							<tr>
								<th className="px-4 py-3 font-medium text-neutral-600">
									{t('communication.table.channel', 'Channel')}
								</th>
								<th className="px-4 py-3 font-medium text-neutral-600">
									{t('communication.table.recipient', 'Recipient')}
								</th>
								<th className="px-4 py-3 font-medium text-neutral-600">
									{t('communication.table.status', 'Status')}
								</th>
								<th className="px-4 py-3 font-medium text-neutral-600">
									{t('communication.table.sentAt', 'Sent At')}
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-neutral-100">
							{list.map((log: any) => {
								const meta = channelMeta[log.channel] || channelMeta.email;
								const Icon = meta.icon;
								return (
									<tr key={log.id} className="hover:bg-neutral-50/50 transition-colors">
										<td className="px-4 py-3">
											<div className="flex items-center gap-2">
												<Icon size={16} className={meta.color} />
												<span className="font-medium text-neutral-800">{t(meta.labelKey)}</span>
											</div>
										</td>
										<td className="px-4 py-3 text-neutral-700 font-mono text-xs">
											{maskRecipient(log.recipient)}
										</td>
										<td className="px-4 py-3">
											<span className={`text-sm font-medium ${statusColor(log.status)}`}>
												{statusLabel(log.status)}
											</span>
											{log.error && (
												<span className="ml-2 text-xs text-red-400" title={log.error}>
													{t('communication.errorHint', 'Details')}
												</span>
											)}
										</td>
										<td className="px-4 py-3 text-neutral-500">
											{formatTime(log.sentAt || log.createdAt)}
										</td>
									</tr>
								);
							})}
							{list.length === 0 && (
								<tr>
									<td colSpan={4} className="px-4 py-16 text-center">
										<div className="flex flex-col items-center gap-2">
											<History size={36} className="text-neutral-300" />
											<p className="text-sm text-neutral-500">
												{t('communication.empty', 'No logs yet')}
											</p>
										</div>
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>

			{pagination && pagination.totalPages > 1 && (
				<div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3">
					<span className="text-sm text-neutral-500">
						{t('communication.pageInfo', {
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
							<ChevronLeft size={14} /> {t('notifications.prev')}
						</button>
						<button
							onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
							disabled={!pagination.hasNext}
							className="flex items-center gap-1 rounded-md border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed"
						>
							{t('notifications.next')}
							<ChevronRight size={14} />
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
