'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, X, Download } from 'lucide-react';
import { ErrorState, EmptyState, StatusBadge } from '@autional-cn/ui';
import type { StatusVariant } from '@autional-cn/ui';
import { DataTable } from '@autional-cn/ui/antd';
import type { DataTableColumns } from '@autional-cn/ui/antd';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { useTenant } from '@/hooks/use-tenant';
import { useInvoices, useInvoice } from '@/hooks/queries';
import type { BillingRecord, InvoiceLineItem } from '@/hooks/queries';

// 状态 → 设计系统徽标档位。这里**只做映射，不做样式**。
// 此前每个状态各写一套裸色阶（bg-green-100 text-green-700 / bg-amber-100 …）：
// 那是又一处「同一个概念在四个 portal 各有各的写法」，而且裸色阶里没有一套做过对比度验证。
// StatusBadge 的 -soft / -text 是**成对**的，每一对的对比度都验过（success 5.51 / warning 4.85 /
// danger 4.65 / info 6.70）。所以映射表留在业务侧（哪个状态算成功是业务语义），配色归设计系统。
const STATUS_VARIANTS: Record<string, StatusVariant> = {
	paid: 'success',
	pending: 'warning',
	overdue: 'danger',
	cancelled: 'neutral',
	refunded: 'info',
};

const money = (v: string | number | undefined) => '¥' + parseFloat(String(v ?? '0')).toFixed(2);
const fmtDate = (v: string | undefined) => (v ? new Date(v).toLocaleDateString() : '-');

export default function InvoicesPage() {
	const { t } = useTranslation();
	const { currentTenantId } = useTenant();
	const tenantId = currentTenantId || '';
	const [page, setPage] = useState(1);
	const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
	const {
		data: invoicesData,
		isLoading,
		error: invoicesError,
		refetch: refetchInvoices,
	} = useInvoices(tenantId, { page, pageSize: 20 });
	const { data: invoiceDetail } = useInvoice(selectedInvoice || '');

	const invoices = invoicesData?.items || [];

	const getStatusLabel = (status: string) => {
		const labels: Record<string, string> = {
			paid: t('billing.invoices.status.paid'),
			pending: t('billing.invoices.status.pending'),
			overdue: t('billing.invoices.status.overdue'),
			cancelled: t('billing.invoices.status.cancelled'),
			refunded: t('billing.invoices.status.refunded'),
		};
		return labels[status] || status;
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
	if (invoicesError)
		return (
			<ErrorState
				message={t('billing.invoices.loadError', '发票列表加载失败')}
				onRetry={() => refetchInvoices()}
			/>
		);
	if (!invoices.length)
		return (
			<EmptyState
				title={t('billing.invoices.emptyTitle')}
				description={t('billing.invoices.emptyDesc')}
			/>
		);

	// 列定义：只描述**这一页有哪些列**，外观（表头底色 / 悬浮态 / 边框 / 行高 / 分页样式）
	// 由设计系统下发的组件级令牌决定 —— 控制台那 156 处 antd Table 吃的是同一份令牌。
	const columns: DataTableColumns<BillingRecord> = [
		{
			title: t('billing.invoices.invoiceNumber'),
			dataIndex: 'invoiceNumber',
			key: 'invoiceNumber',
			render: (v: string | undefined) => <span className="font-mono text-xs">{v || '-'}</span>,
		},
		{
			title: t('billing.invoices.amount'),
			dataIndex: 'amount',
			key: 'amount',
			align: 'right',
			render: (v: string | undefined) => <span className="font-mono font-medium">{money(v)}</span>,
		},
		{
			title: t('billing.invoices.plan'),
			dataIndex: 'plan',
			key: 'plan',
			render: (v: string | undefined) => v || '-',
		},
		{
			title: t('billing.invoices.statusLabel'),
			dataIndex: 'status',
			key: 'status',
			render: (v: string | undefined) => (
				<StatusBadge variant={STATUS_VARIANTS[v || ''] || 'neutral'}>{getStatusLabel(v || '')}</StatusBadge>
			),
		},
		{
			title: t('billing.invoices.date'),
			dataIndex: 'createdAt',
			key: 'createdAt',
			render: (v: string | undefined) => <span className="text-gray-500 text-xs">{fmtDate(v)}</span>,
		},
		{
			title: t('billing.invoices.actions'),
			key: 'actions',
			align: 'right',
			render: (_: unknown, inv: BillingRecord) => (
				<button
					onClick={() => setSelectedInvoice(inv.invoiceNumber || '')}
					className="inline-flex items-center gap-1 text-[var(--color-brand)] hover:text-primary-600 text-sm font-medium"
				>
					<Eye className="w-4 h-4" />
					{t('billing.invoices.detail')}
				</button>
			),
		},
	];

	const itemColumns: DataTableColumns<InvoiceLineItem> = [
		{ title: t('billing.invoices.item'), dataIndex: 'description', key: 'description' },
		{
			title: t('billing.invoices.quantity'),
			dataIndex: 'quantity',
			key: 'quantity',
			align: 'right',
		},
		{
			title: t('billing.invoices.unitPrice'),
			dataIndex: 'unitPrice',
			key: 'unitPrice',
			align: 'right',
			render: (v: string | undefined) => <span className="font-mono">{money(v)}</span>,
		},
		{
			title: t('billing.invoices.amount'),
			dataIndex: 'amount',
			key: 'amount',
			align: 'right',
			render: (v: string | undefined) => <span className="font-mono font-medium">{money(v)}</span>,
		},
	];

	return (
		<div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
			<h1 className="text-2xl font-bold">{t('billing.invoices.title')}</h1>

			{/* rowKey 用 id 兜 invoiceNumber：两者都可能为空，兜底成 '-' 会让多行同 key（React 会告警）。
			   此处 id 是后端主键，invoiceNumber 只是展示字段。 */}
			<DataTable<BillingRecord>
				rowKey={(r) => r.id || r.invoiceNumber || '-'}
				columns={columns}
				dataSource={invoices}
				scroll={{ x: 'max-content' }}
				pagination={{
					current: page,
					pageSize: 20,
					total: invoicesData?.total || 0,
					onChange: setPage,
					// 原来的手写翻页只在超过一页时才出现；这个行为要保留，否则会出现一行都没有的分页条。
					hideOnSinglePage: true,
				}}
			/>

			{/* Invoice Detail Modal */}
			{selectedInvoice && invoiceDetail && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
					onClick={() => setSelectedInvoice(null)}
				>
					<div
						className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg m-4 max-h-[80vh] overflow-y-auto"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-lg font-bold">{t('billing.invoices.detailTitle')}</h2>
							<button
								onClick={() => setSelectedInvoice(null)}
								className="text-gray-400 hover:text-gray-600"
							>
								<X className="w-5 h-5" />
							</button>
						</div>
						<div className="space-y-4 text-sm">
							<div className="grid grid-cols-2 gap-3">
								<Field label={t('billing.invoices.invoiceNumber')}>
									<span className="font-mono font-medium">{invoiceDetail.invoiceNumber || '-'}</span>
								</Field>
								<Field label={t('billing.invoices.statusLabel')}>
									<StatusBadge variant={STATUS_VARIANTS[invoiceDetail.status || ''] || 'neutral'}>
										{getStatusLabel(invoiceDetail.status || '')}
									</StatusBadge>
								</Field>
								<Field label={t('billing.invoices.plan')}>
									<span className="font-medium">{invoiceDetail.plan || '-'}</span>
								</Field>
								<Field label={t('billing.invoices.billingCycle')}>
									<span className="font-medium">{invoiceDetail.billingCycle || '-'}</span>
								</Field>
								<Field label={t('billing.invoices.createdAt')}>{fmtDate(invoiceDetail.createdAt)}</Field>
								<Field label={t('billing.invoices.dueDate')}>{fmtDate(invoiceDetail.dueDate)}</Field>
								{invoiceDetail.paidAt && (
									<Field label={t('billing.invoices.paidAt')}>
										<span className="text-green-600">{fmtDate(invoiceDetail.paidAt)}</span>
									</Field>
								)}
							</div>

							{invoiceDetail.items && invoiceDetail.items.length > 0 && (
								<div>
									<h3 className="font-semibold text-sm mb-2">{t('billing.invoices.itemsTitle')}</h3>
									{/* 合计行用 DataTable.Summary（antd 的复合成员）——
									    这正是 DS 必须透传复合成员的理由：不透传，消费方就只能自己拼裸 <tr>/<td>。 */}
									<DataTable<InvoiceLineItem>
										rowKey={(r, i) => r.description + '-' + (i ?? 0)}
										columns={itemColumns}
										dataSource={invoiceDetail.items}
										pagination={false}
										size="small"
										scroll={{ x: 'max-content' }}
										summary={() => (
											<DataTable.Summary.Row>
												<DataTable.Summary.Cell index={0} colSpan={3}>
													<span className="font-bold block text-right">{t('billing.invoices.total')}</span>
												</DataTable.Summary.Cell>
												<DataTable.Summary.Cell index={1} align="right">
													<span className="font-mono font-bold">{money(invoiceDetail.amount)}</span>
												</DataTable.Summary.Cell>
											</DataTable.Summary.Row>
										)}
									/>
								</div>
							)}

							{selectedInvoice && (
								<a
									href={'/billing/api/v1/billing/invoice/' + selectedInvoice + '/export'}
									target="_blank"
									className="inline-flex items-center gap-2 text-sm text-[var(--color-brand)] hover:text-primary-600 font-medium"
								>
									<Download className="w-4 h-4" />
									{t('billing.invoices.exportPdf')}
								</a>
							)}
						</div>
						<button
							onClick={() => setSelectedInvoice(null)}
							className="w-full mt-6 py-2.5 rounded-lg bg-[var(--color-brand)] text-white font-medium hover:bg-primary-600 transition-colors"
						>
							{t('common.close')}
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div>
			<div className="text-gray-500 text-xs">{label}</div>
			{children}
		</div>
	);
}
