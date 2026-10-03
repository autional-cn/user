'use client';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCommunicationLogs } from '@/hooks/queries';
import { formatTime } from '@/lib/format';
import { ErrorState, StatusBadge } from '@autional-cn/ui';
import type { StatusVariant } from '@autional-cn/ui';
import { DataTable } from '@autional-cn/ui/antd';
import type { DataTableColumns } from '@autional-cn/ui/antd';
import type { CommunicationLogItem } from '@/hooks/queries';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { Mail, Smartphone, Bell, History, Filter } from 'lucide-react';

const channelMeta: Record<string, { icon: typeof Mail; labelKey: string; color: string }> = {
	sms: { icon: Smartphone, labelKey: 'communication.channel.sms', color: 'text-green-700' },
	email: { icon: Mail, labelKey: 'communication.channel.email', color: 'text-blue-700' },
	push: { icon: Bell, labelKey: 'communication.channel.push', color: 'text-purple-700' },
};

const channelOptions = ['', 'sms', 'email', 'push'];

// 状态 → 设计系统徽标档位。**只做映射，不做样式**。
// 原来这里是裸色阶拼的文字色（delivered 用 emerald、sent 用 blue、failed 用 red），
// pending 干脆没有颜色、落到默认灰 —— 现在四档语义一次讲清，配色归设计系统。
const STATUS_VARIANTS: Record<string, StatusVariant> = {
	delivered: 'success',
	sent: 'info',
	pending: 'warning',
	failed: 'danger',
};

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

	// 列定义：只描述「这一页有哪些列」。表头底色 / 悬浮态 / 边框 / 行高 / 分页外观，
	// 由设计系统下发的组件级令牌决定 —— 与控制台那 156 处 antd Table 吃的是同一份令牌。
	const columns: DataTableColumns<CommunicationLogItem> = [
		{
			title: t('communication.table.channel', 'Channel'),
			dataIndex: 'channel',
			key: 'channel',
			render: (v: string | undefined) => {
				const meta = channelMeta[v ?? ''] || channelMeta.email;
				const Icon = meta.icon;
				return (
					<span className="inline-flex items-center gap-2">
						<Icon size={16} className={meta.color} />
						<span className="font-medium text-neutral-800">{t(meta.labelKey)}</span>
					</span>
				);
			},
		},
		{
			title: t('communication.table.recipient', 'Recipient'),
			dataIndex: 'recipient',
			key: 'recipient',
			render: (v: string | undefined) => (
				<span className="font-mono text-xs text-neutral-700">{maskRecipient(v)}</span>
			),
		},
		{
			title: t('communication.table.status', 'Status'),
			dataIndex: 'status',
			key: 'status',
			render: (v: string | undefined, log: CommunicationLogItem) => (
				<>
					<StatusBadge variant={STATUS_VARIANTS[v ?? ''] ?? 'neutral'}>{statusLabel(v)}</StatusBadge>
					{log.error && (
						<span className="ml-2 text-xs text-red-400" title={log.error}>
							{t('communication.errorHint', 'Details')}
						</span>
					)}
				</>
			),
		},
		{
			title: t('communication.table.sentAt', 'Sent At'),
			dataIndex: 'sentAt',
			key: 'sentAt',
			render: (_: unknown, log: CommunicationLogItem) => (
				<span className="text-neutral-600">{formatTime(log.sentAt || log.createdAt)}</span>
			),
		},
	];

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-xl font-bold text-neutral-900">
						{t('communication.historyTitle', 'Communication History')}
					</h2>
					<p className="mt-1 text-sm text-neutral-600">
						{total > 0
							? t('communication.totalLogs', { total })
							: t('communication.noLogs', 'No communication logs found')}
					</p>
				</div>
			</div>

			<div className="flex items-center gap-3">
				<div className="flex items-center gap-2">
					<Filter size={16} className="text-neutral-500" />
					<span className="text-sm text-neutral-600">
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

			<DataTable<CommunicationLogItem>
				rowKey={(r, i) => r.id ?? String(i)}
				columns={columns}
				dataSource={list}
				scroll={{ x: 'max-content' }}
				locale={{
					emptyText: (
						<div className="flex flex-col items-center gap-2">
							<History size={36} className="text-neutral-300" />
							<span className="text-sm text-neutral-600">
								{t('communication.empty', 'No logs yet')}
							</span>
						</div>
					),
				}}
				pagination={{
					current: page,
					pageSize,
					total,
					onChange: setPage,
					// 原来的手写翻页只在 totalPages > 1 时出现；hideOnSinglePage 保留「不足一页不显示分页条」。
					hideOnSinglePage: true,
				}}
			/>
		</div>
	);
}
