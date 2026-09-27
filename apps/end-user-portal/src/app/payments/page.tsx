'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, Eye } from 'lucide-react';
import { ErrorState, EmptyState, Modal } from '@autional-cn/ui';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { usePayments, useReceipt, type PaymentInfo, type ReceiptInfo } from '@/hooks/queries';

const STATUS_BADGES: Record<string, string> = {
	pending: 'bg-amber-100 text-amber-700',
	processing: 'bg-blue-100 text-blue-700',
	completed: 'bg-green-100 text-green-700',
	paid: 'bg-green-100 text-green-700',
	failed: 'bg-red-100 text-red-700',
	cancelled: 'bg-gray-100 text-gray-600',
	refunded: 'bg-purple-100 text-purple-700',
};

export default function PaymentsPage() {
	const { t } = useTranslation();
	const [page, setPage] = useState(1);
	const [receiptPaymentId, setReceiptPaymentId] = useState<string | null>(null);
	const {
		data: paymentsData,
		isLoading,
		error: paymentsError,
		refetch: refetchPayments,
	} = usePayments({ page, pageSize: 20 });
	const { data: receipt } = useReceipt(receiptPaymentId || '');

	const payments = paymentsData?.items || [];

	const getStatusLabel = (status: string) => {
		const labels: Record<string, string> = {
			pending: t('payments.status.pending'),
			processing: t('payments.status.processing'),
			completed: t('payments.status.completed'),
			paid: t('payments.status.paid'),
			failed: t('payments.status.failed'),
			cancelled: t('payments.status.cancelled'),
			refunded: t('payments.status.refunded'),
		};
		return labels[status] || status;
	};

	const getChannelLabel = (channel: string) => {
		const labels: Record<string, string> = {
			wechat: t('payments.channel.wechat'),
			alipay: t('payments.channel.alipay'),
			stripe: t('payments.channel.stripe'),
		};
		return labels[channel] || channel;
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
	if (paymentsError)
		return (
			<ErrorState
				message={t('payments.loadError', '支付记录加载失败')}
				onRetry={() => refetchPayments()}
			/>
		);
	if (!payments.length)
		return <EmptyState title={t('payments.emptyTitle')} description={t('payments.emptyDesc')} />;

	return (
		<div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
			<h1 className="text-2xl font-bold">{t('payments.title')}</h1>

			<div className="overflow-x-auto rounded-lg border bg-white">
				<table className="w-full text-sm">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
								{t('payments.date')}
							</th>
							<th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
								{t('payments.amount')}
							</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
								{t('payments.channelLabel')}
							</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
								{t('payments.statusLabel')}
							</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
								{t('payments.description')}
							</th>
							<th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
								{t('payments.actions')}
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-100">
						{payments.map((p: PaymentInfo) => (
							<tr key={p.paymentId} className="hover:bg-gray-50">
								<td className="px-4 py-3 text-gray-600">
									{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '-'}
								</td>
								<td className="px-4 py-3 text-right font-mono font-medium">
									¥{parseFloat(p.amount || '0').toFixed(2)}
								</td>
								<td className="px-4 py-3 text-gray-600">{getChannelLabel(p.channelCode || '')}</td>
								<td className="px-4 py-3">
									<span
										className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGES[p.status || ''] || 'bg-gray-100 text-gray-600'}`}
									>
										{getStatusLabel(p.status || '')}
									</span>
								</td>
								<td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">
									{p.itemDescription || '-'}
								</td>
								<td className="px-4 py-3 text-right">
									<button
										onClick={() => setReceiptPaymentId(p.paymentId || '')}
										className="inline-flex items-center gap-1 text-primary hover:text-primary-600 text-sm font-medium"
									>
										<Eye className="w-4 h-4" />
										{t('payments.receipt')}
									</button>
								</td>
							</tr>
						))}
						{payments.length === 0 && (
							<tr>
								<td colSpan={6} className="px-4 py-12 text-center text-gray-400">
									<CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
									{t('payments.empty')}
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			{paymentsData && (paymentsData.total || 0) > 20 && (
				<div className="flex justify-center gap-2">
					<button
						disabled={page <= 1}
						onClick={() => setPage(page - 1)}
						className="px-3 py-1.5 rounded border text-sm disabled:opacity-30 hover:bg-gray-50"
					>
						{t('common.previous')}
					</button>
					<span className="px-3 py-1.5 text-sm text-gray-500">
						{page} / {Math.ceil((paymentsData.total || 0) / 20)}
					</span>
					<button
						disabled={page >= Math.ceil((paymentsData.total || 0) / 20)}
						onClick={() => setPage(page + 1)}
						className="px-3 py-1.5 rounded border text-sm disabled:opacity-30 hover:bg-gray-50"
					>
						{t('common.next')}
					</button>
				</div>
			)}

			{/* Receipt Modal */}
			<Modal
				open={receiptPaymentId !== null && !!receipt}
				onClose={() => setReceiptPaymentId(null)}
				title={t('payments.receiptTitle')}
				maxWidth="md"
				footer={
					<button
						onClick={() => setReceiptPaymentId(null)}
						className="w-full py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary-600 transition-colors"
					>
						{t('common.close')}
					</button>
				}
			>
				{receipt ? (
					<div className="space-y-3 text-sm">
						<ReceiptRow
							label={t('payments.receiptNumber')}
							value={receipt.receiptNumber}
						/>
						<ReceiptRow
							label={t('payments.amount')}
							value={`¥${parseFloat(receipt.amount || '0').toFixed(2)}`}
							bold
						/>
						<ReceiptRow
							label={t('payments.paymentChannel')}
							value={getChannelLabel(receipt.channelCode)}
						/>
						<ReceiptRow
							label={t('payments.date')}
							value={receipt.createdAt ? new Date(receipt.createdAt).toLocaleDateString() : '-'}
						/>
						<ReceiptRow
							label={t('payments.itemDescription')}
							value={receipt.itemDescription || '-'}
						/>
					</div>
				) : null}
			</Modal>
		</div>
	);
}

function ReceiptRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
	return (
		<div className="flex justify-between py-1.5 border-b border-gray-100">
			<span className="text-gray-500">{label}</span>
			<span className={bold ? 'font-bold text-gray-900' : 'text-gray-700'}>{value}</span>
		</div>
	);
}
