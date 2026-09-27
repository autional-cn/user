'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@autional-cn/shared';
import { FileText, Eye, X, Download, File } from 'lucide-react';
import { ErrorState, EmptyState } from '@autional-cn/ui';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { useTenant } from '@/hooks/use-tenant';
import { useInvoices, useInvoice, type BillingRecord } from '@/hooks/queries';

const STATUS_BADGES: Record<string, string> = {
	paid: 'bg-green-100 text-green-700',
	pending: 'bg-amber-100 text-amber-700',
	overdue: 'bg-red-100 text-red-700',
	cancelled: 'bg-gray-100 text-gray-600',
	refunded: 'bg-purple-100 text-purple-700',
};

export default function InvoicesPage() {
	const { t } = useTranslation();
	const { user } = useAuth();
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

	return (
		<div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
			<h1 className="text-2xl font-bold">{t('billing.invoices.title')}</h1>

			<div className="overflow-x-auto rounded-lg border bg-white">
				<table className="w-full text-sm">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
								{t('billing.invoices.invoiceNumber')}
							</th>
							<th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
								{t('billing.invoices.amount')}
							</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
								{t('billing.invoices.plan')}
							</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
								{t('billing.invoices.statusLabel')}
							</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
								{t('billing.invoices.date')}
							</th>
							<th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
								{t('billing.invoices.actions')}
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-100">
						{invoices.map((inv: BillingRecord) => (
							<tr key={inv.id || inv.invoiceNumber} className="hover:bg-gray-50">
								<td className="px-4 py-3 font-mono text-xs text-gray-700">
									{inv.invoiceNumber || '-'}
								</td>
								<td className="px-4 py-3 text-right font-mono font-medium">
									¥{parseFloat(inv.amount || '0').toFixed(2)}
								</td>
								<td className="px-4 py-3 text-gray-600">{inv.plan || '-'}</td>
								<td className="px-4 py-3">
									<span
										className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGES[inv.status || ''] || 'bg-gray-100 text-gray-600'}`}
									>
										{getStatusLabel(inv.status || '')}
									</span>
								</td>
								<td className="px-4 py-3 text-gray-500 text-xs">
									{inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : '-'}
								</td>
								<td className="px-4 py-3 text-right">
									<button
										onClick={() => setSelectedInvoice(inv.invoiceNumber || '')}
										className="inline-flex items-center gap-1 text-primary hover:text-primary-600 text-sm font-medium"
									>
										<Eye className="w-4 h-4" />
										{t('billing.invoices.detail')}
									</button>
								</td>
							</tr>
						))}
						{invoices.length === 0 && (
							<tr>
								<td colSpan={6} className="px-4 py-12 text-center text-gray-400">
									<FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
									{t('billing.invoices.empty')}
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			{invoicesData && (invoicesData.total || 0) > 20 && (
				<div className="flex justify-center gap-2">
					<button
						disabled={page <= 1}
						onClick={() => setPage(page - 1)}
						className="px-3 py-1.5 rounded border text-sm disabled:opacity-30 hover:bg-gray-50"
					>
						{t('common.previous')}
					</button>
					<span className="px-3 py-1.5 text-sm text-gray-500">
						{page} / {Math.ceil((invoicesData.total || 0) / 20)}
					</span>
					<button
						disabled={page >= Math.ceil((invoicesData.total || 0) / 20)}
						onClick={() => setPage(page + 1)}
						className="px-3 py-1.5 rounded border text-sm disabled:opacity-30 hover:bg-gray-50"
					>
						{t('common.next')}
					</button>
				</div>
			)}

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
								<div>
									<div className="text-gray-500 text-xs">{t('billing.invoices.invoiceNumber')}</div>
									<div className="font-mono font-medium">{invoiceDetail.invoiceNumber || '-'}</div>
								</div>
								<div>
									<div className="text-gray-500 text-xs">{t('billing.invoices.statusLabel')}</div>
									<span
										className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGES[invoiceDetail.status || ''] || ''}`}
									>
										{getStatusLabel(invoiceDetail.status || '')}
									</span>
								</div>
								<div>
									<div className="text-gray-500 text-xs">{t('billing.invoices.plan')}</div>
									<div className="font-medium">{invoiceDetail.plan || '-'}</div>
								</div>
								<div>
									<div className="text-gray-500 text-xs">{t('billing.invoices.billingCycle')}</div>
									<div className="font-medium">{invoiceDetail.billingCycle || '-'}</div>
								</div>
								<div>
									<div className="text-gray-500 text-xs">{t('billing.invoices.createdAt')}</div>
									<div>
										{invoiceDetail.createdAt
											? new Date(invoiceDetail.createdAt).toLocaleDateString()
											: '-'}
									</div>
								</div>
								<div>
									<div className="text-gray-500 text-xs">{t('billing.invoices.dueDate')}</div>
									<div>
										{invoiceDetail.dueDate
											? new Date(invoiceDetail.dueDate).toLocaleDateString()
											: '-'}
									</div>
								</div>
								{invoiceDetail.paidAt && (
									<div>
										<div className="text-gray-500 text-xs">{t('billing.invoices.paidAt')}</div>
										<div className="text-green-600">
											{new Date(invoiceDetail.paidAt).toLocaleDateString()}
										</div>
									</div>
								)}
							</div>

							{invoiceDetail.items && invoiceDetail.items.length > 0 && (
								<div>
									<h3 className="font-semibold text-sm mb-2">{t('billing.invoices.itemsTitle')}</h3>
									<table className="w-full text-sm border">
										<thead className="bg-gray-50">
											<tr>
												<th className="px-3 py-2 text-left text-xs text-gray-500">
													{t('billing.invoices.item')}
												</th>
												<th className="px-3 py-2 text-right text-xs text-gray-500">
													{t('billing.invoices.quantity')}
												</th>
												<th className="px-3 py-2 text-right text-xs text-gray-500">
													{t('billing.invoices.unitPrice')}
												</th>
												<th className="px-3 py-2 text-right text-xs text-gray-500">
													{t('billing.invoices.amount')}
												</th>
											</tr>
										</thead>
										<tbody>
											{invoiceDetail.items.map((item, i) => (
												<tr key={i} className="border-t">
													<td className="px-3 py-2">{item.description}</td>
													<td className="px-3 py-2 text-right">{item.quantity}</td>
													<td className="px-3 py-2 text-right font-mono">
														¥{parseFloat(item.unitPrice || '0').toFixed(2)}
													</td>
													<td className="px-3 py-2 text-right font-mono font-medium">
														¥{parseFloat(item.amount || '0').toFixed(2)}
													</td>
												</tr>
											))}
										</tbody>
										<tfoot>
											<tr className="border-t-2 font-bold">
												<td colSpan={3} className="px-3 py-2 text-right">
													{t('billing.invoices.total')}
												</td>
												<td className="px-3 py-2 text-right font-mono">
													¥{parseFloat(invoiceDetail.amount || '0').toFixed(2)}
												</td>
											</tr>
										</tfoot>
									</table>
								</div>
							)}

							{selectedInvoice && (
								<a
									href={`/billing/api/v1/billing/invoice/${selectedInvoice}/export`}
									target="_blank"
									className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary-600 font-medium"
								>
									<Download className="w-4 h-4" />
									{t('billing.invoices.exportPdf')}
								</a>
							)}
						</div>
						<button
							onClick={() => setSelectedInvoice(null)}
							className="w-full mt-6 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary-600 transition-colors"
						>
							{t('common.close')}
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
