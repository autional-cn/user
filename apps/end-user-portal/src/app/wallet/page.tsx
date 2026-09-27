'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@autional-cn/shared';
import { LoadingScreen, ErrorState, EmptyState } from '@autional-cn/ui';
import { SkeletonCard, SkeletonRow } from '@/components/ui/Skeleton';
import { useTranslation } from 'react-i18next';
import { isNotFoundError } from '@/lib/api-error';
import { useQueries } from '@tanstack/react-query';
import {
	useWalletTransactions,
	useRedeemCoupon,
	queryKeys,
	getWalletBalance,
	getWalletStats,
	getWalletCoupons,
	getWalletBalanceHistory,
} from '@/hooks/queries';
import {
	Wallet,
	Snowflake,
	Receipt,
	TrendingUp,
	TrendingDown,
	Ticket,
	ArrowRightLeft,
} from 'lucide-react';

export default function WalletPage() {
	const { t } = useTranslation();
	const { userId } = useAuth();

	const [balanceQuery, statsQuery, couponsQuery, historyQuery] = useQueries({
		queries: [
			{
				queryKey: queryKeys.wallet(userId || ''),
				queryFn: () => getWalletBalance(userId || ''),
				enabled: !!userId,
				retry: 1,
			},
			{
				queryKey: queryKeys.walletStats(userId || ''),
				queryFn: async () => {
					const r = await getWalletStats(userId || '');
					return r.data;
				},
				enabled: !!userId,
				retry: 1,
			},
			{
				queryKey: queryKeys.walletCoupons(userId || ''),
				queryFn: () => getWalletCoupons(userId || ''),
				enabled: !!userId,
				retry: 1,
			},
			{
				queryKey: queryKeys.walletBalanceHistory(userId || ''),
				queryFn: () => getWalletBalanceHistory(userId || ''),
				enabled: !!userId,
				retry: 1,
			},
		],
	});

	const {
		data: balance,
		isLoading: balanceLoading,
		error: balanceError,
		refetch: refetchBalance,
	} = balanceQuery;
	const { data: stats } = statsQuery;
	const { data: coupons } = couponsQuery;
	const { data: history } = historyQuery;
	const walletId = balance?.walletId;

	const [page, setPage] = useState(1);
	const [couponCode, setCouponCode] = useState('');
	const { data: txs } = useWalletTransactions(userId || '', { page, pageSize: 20 }, !!userId);
	const redeemQ = useRedeemCoupon();

	if (balanceLoading)
		return (
			<div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
				<SkeletonCard />
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
					<SkeletonCard />
					<SkeletonCard />
					<SkeletonCard />
					<SkeletonCard />
				</div>
				<SkeletonRow />
				<SkeletonRow />
				<SkeletonRow />
				<SkeletonRow />
				<SkeletonRow />
			</div>
		);

	if (balanceError) {
		if (isNotFoundError(balanceError)) {
			return (
				<EmptyState
					title={t('wallet.empty', '暂无钱包数据')}
					description={t('wallet.emptyDesc', '当前账户尚未开通钱包，完成充值后即可使用')}
				/>
			);
		}
		return (
			<ErrorState message={t('wallet.loadError', '钱包信息加载失败')} onRetry={() => refetchBalance()} />
		);
	}

	const available = balance?.availableBalance ?? balance?.available ?? balance?.balance ?? '0';
	const frozen = balance?.frozenBalance ?? balance?.frozen ?? '0';
	const currency = balance?.currency ?? 'CNY';

	const handleRedeem = () => {
		if (!couponCode.trim() || !userId) return;
		redeemQ.mutate({ userId, code: couponCode.trim() });
		setCouponCode('');
	};

	return (
		<div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
			<h1 className="text-2xl font-bold">{t('wallet.title')}</h1>

			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<Card
					icon={<Wallet className="w-5 h-5 text-green-500" />}
					label={t('wallet.availableBalance')}
					value={`${currency === 'CNY' ? '¥' : ''}${Number(available).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
				/>
				<Card
					icon={<Snowflake className="w-5 h-5 text-blue-500" />}
					label={t('wallet.frozenBalance')}
					value={`${currency === 'CNY' ? '¥' : ''}${Number(frozen).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
				/>
				<Card
					icon={<Receipt className="w-5 h-5 text-purple-500" />}
					label={t('wallet.currency')}
					value={currency}
				/>
				<Card
					icon={<Ticket className="w-5 h-5 text-amber-500" />}
					label={t('wallet.availableCoupons')}
					value={`${coupons?.total ?? coupons?.items?.length ?? 0} ${t('wallet.couponUnit')}`}
				/>
			</div>

			{stats && (
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
					<StatBox
						label={t('wallet.transactionCount')}
						value={stats.transactionCount?.toLocaleString()}
						icon={<ArrowRightLeft className="w-4 h-4 text-blue-500" />}
					/>
					<StatBox
						label={t('wallet.totalDeposits')}
						value={`¥${Number(stats.totalDeposits ?? 0).toLocaleString()}`}
						icon={<TrendingUp className="w-4 h-4 text-green-500" />}
					/>
					<StatBox
						label={t('wallet.totalWithdrawals')}
						value={`¥${Number(stats.totalWithdrawals ?? 0).toLocaleString()}`}
						icon={<TrendingDown className="w-4 h-4 text-red-500" />}
					/>
					<StatBox
						label={t('wallet.avgTransaction')}
						value={`¥${Number(stats.averageTransaction ?? 0).toLocaleString()}`}
					/>
				</div>
			)}

			<div>
				<h2 className="text-lg font-semibold mb-3">{t('wallet.transactionHistory')}</h2>
				<div className="overflow-x-auto rounded-lg border">
					<table className="w-full text-sm">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-2 text-left">{t('wallet.txType')}</th>
								<th className="px-4 py-2 text-right">{t('wallet.amount')}</th>
								<th className="px-4 py-2 text-left">{t('wallet.remark')}</th>
								<th className="px-4 py-2 text-center">{t('wallet.status')}</th>
								<th className="px-4 py-2 text-right">{t('wallet.time')}</th>
							</tr>
						</thead>
						<tbody>
							{(txs?.items ?? []).map((tx) => (
								<tr key={tx.id} className="border-t">
									<td className="px-4 py-2">
										<span className={txTypeBadge(tx.type)}>{t(txTypeLabelKey(tx.type))}</span>
									</td>
									<td
										className={`px-4 py-2 text-right font-mono ${
											tx.type === 'deposit' || tx.type === 'refund' || tx.type === 'transfer_in'
												? 'text-green-600'
												: 'text-red-600'
										}`}
									>
										{tx.type === 'deposit' || tx.type === 'refund' || tx.type === 'transfer_in'
											? '+'
											: '-'}
										¥
										{Number(tx.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
									</td>
									<td className="px-4 py-2 text-gray-500 max-w-[200px] truncate">
										{tx.description ?? '-'}
									</td>
									<td className="px-4 py-2 text-center">
										<span className={txStatusBadge(tx.status)}>
											{t(txStatusLabelKey(tx.status))}
										</span>
									</td>
									<td className="px-4 py-2 text-right text-gray-400 text-xs">
										{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : '-'}
									</td>
								</tr>
							))}
							{(!txs?.items || txs.items.length === 0) && (
								<tr>
									<td colSpan={5} className="px-4 py-8 text-center text-gray-400">
										{t('wallet.noTransactions')}
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
				{txs && (txs.total ?? 0) > 20 && (
					<div className="flex justify-center gap-2 mt-4">
						<button
							disabled={page <= 1}
							onClick={() => setPage(page - 1)}
							className="px-3 py-1 rounded border text-sm disabled:opacity-30"
						>
							{t('wallet.previousPage')}
						</button>
						<span className="px-3 py-1 text-sm text-gray-500">
							{page} / {Math.ceil((txs.total ?? 0) / 20)}
						</span>
						<button
							disabled={page >= Math.ceil((txs.total ?? 0) / 20)}
							onClick={() => setPage(page + 1)}
							className="px-3 py-1 rounded border text-sm disabled:opacity-30"
						>
							{t('wallet.nextPage')}
						</button>
					</div>
				)}
			</div>

			{history && (history.items ?? []).length > 0 && (
				<div>
					<h2 className="text-lg font-semibold mb-3">{t('wallet.balanceHistory')}</h2>
					<div className="overflow-x-auto rounded-lg border">
						<table className="w-full text-sm">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-4 py-2 text-left">{t('wallet.txType')}</th>
									<th className="px-4 py-2 text-right">{t('wallet.amount')}</th>
									<th className="px-4 py-2 text-right">{t('wallet.balanceBefore')}</th>
									<th className="px-4 py-2 text-right">{t('wallet.balanceAfter')}</th>
									<th className="px-4 py-2 text-right">{t('wallet.date')}</th>
								</tr>
							</thead>
							<tbody>
								{(history.items ?? []).map((h, i) => (
									<tr key={h.transactionId ?? i} className="border-t">
										<td className="px-4 py-2">{h.type}</td>
										<td
											className={`px-4 py-2 text-right font-mono ${Number(h.amount ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}
										>
											¥
											{Number(h.amount ?? 0).toLocaleString(undefined, {
												minimumFractionDigits: 2,
											})}
										</td>
										<td className="px-4 py-2 text-right font-mono text-gray-500">
											¥
											{Number(h.balanceBefore ?? 0).toLocaleString(undefined, {
												minimumFractionDigits: 2,
											})}
										</td>
										<td className="px-4 py-2 text-right font-mono text-gray-700">
											¥
											{Number(h.balanceAfter ?? 0).toLocaleString(undefined, {
												minimumFractionDigits: 2,
											})}
										</td>
										<td className="px-4 py-2 text-right text-gray-400 text-xs">
											{h.date ? new Date(h.date).toLocaleDateString() : '-'}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{coupons && (
				<div>
					<h2 className="text-lg font-semibold mb-3">{t('wallet.coupons')}</h2>
					<div className="flex gap-2 mb-4">
						<input
							type="text"
							value={couponCode}
							onChange={(e) => setCouponCode(e.target.value)}
							placeholder={t('wallet.enterCouponCode')}
							className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
						/>
						<button
							onClick={handleRedeem}
							disabled={!couponCode.trim() || redeemQ.isPending}
							className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
						>
							{redeemQ.isPending ? t('wallet.redeeming') : t('wallet.redeem')}
						</button>
					</div>
					{redeemQ.isSuccess && (
						<div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
							{t('wallet.redeemSuccess')}
						</div>
					)}
					{redeemQ.isError && (
						<div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
							{t('wallet.redeemError')}
						</div>
					)}
					{(coupons.items ?? []).length > 0 ? (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							{(coupons.items ?? []).map((c) => (
								<div
									key={c.id ?? c.code}
									className="bg-white rounded-lg border p-4 flex justify-between items-start"
								>
									<div>
										<div className="font-semibold text-sm">{c.name ?? c.code}</div>
										<div className="text-xs text-gray-500 mt-1">
											{t(
												c.type === 'discount'
													? 'wallet.couponType.discount'
													: c.type === 'cash'
														? 'wallet.couponType.cash'
														: c.type,
											)}
											{' · '}
											{c.type === 'discount'
												? `${c.value}%`
												: `¥${Number(c.value ?? 0).toFixed(2)}`}
											{c.minAmount
												? ` · ${t('wallet.minPurchase', { amount: Number(c.minAmount).toFixed(2) })}`
												: ''}
										</div>
										<div className="text-xs text-gray-400 mt-1">
											{t('wallet.validUntil')}{' '}
											{c.validUntil ? new Date(c.validUntil).toLocaleDateString() : '-'}
										</div>
									</div>
									<span
										className={cn(
											'text-xs px-2 py-0.5 rounded',
											c.status === 'unused'
												? 'bg-green-50 text-green-600'
												: c.status === 'used'
													? 'bg-gray-100 text-gray-500'
													: c.status === 'expired'
														? 'bg-red-50 text-red-500'
														: 'bg-gray-100 text-gray-500',
										)}
									>
										{t(
											c.status === 'unused'
												? 'wallet.couponStatus.unused'
												: c.status === 'used'
													? 'wallet.couponStatus.used'
													: c.status === 'expired'
														? 'wallet.couponStatus.expired'
														: (c.status ?? '-'),
										)}
									</span>
								</div>
							))}
						</div>
					) : (
						<div className="text-center py-8 text-gray-400 text-sm">{t('wallet.noCoupons')}</div>
					)}
				</div>
			)}
		</div>
	);
}

function cn(...classes: (string | undefined | false)[]) {
	return classes.filter(Boolean).join(' ');
}

function Card({
	icon,
	label,
	value,
	valueClassName,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
	valueClassName?: string;
}) {
	return (
		<div className="bg-white rounded-lg border p-4 flex items-center gap-3">
			{icon}
			<div>
				<div className="text-xs text-gray-500">{label}</div>
				<div className={`text-lg font-semibold ${valueClassName ?? ''}`}>{value}</div>
			</div>
		</div>
	);
}

function StatBox({
	label,
	value,
	icon,
}: {
	label: string;
	value?: string;
	icon?: React.ReactNode;
}) {
	return (
		<div className="bg-white rounded-lg border p-3 text-center">
			<div className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1">
				{icon}
				{label}
			</div>
			<div className="text-base font-semibold">{value ?? '0'}</div>
		</div>
	);
}

const txLabels: Record<string, string> = {
	deposit: 'wallet.txTypes.deposit',
	withdraw: 'wallet.txTypes.withdrawal',
	transfer: 'wallet.txTypes.transfer',
	transfer_in: 'wallet.txTypes.transferIn',
	transfer_out: 'wallet.txTypes.transferOut',
	refund: 'wallet.txTypes.refund',
	freeze: 'wallet.txTypes.freeze',
	unfreeze: 'wallet.txTypes.unfreeze',
	payment: 'wallet.txTypes.payment',
	adjustment: 'wallet.txTypes.adjustment',
};

const txTypeBadges: Record<string, string> = {
	deposit: 'text-green-600 bg-green-50 px-2 py-0.5 rounded',
	withdraw: 'text-red-600 bg-red-50 px-2 py-0.5 rounded',
	transfer: 'text-blue-600 bg-blue-50 px-2 py-0.5 rounded',
	transfer_in: 'text-green-600 bg-green-50 px-2 py-0.5 rounded',
	transfer_out: 'text-red-600 bg-red-50 px-2 py-0.5 rounded',
	refund: 'text-blue-600 bg-blue-50 px-2 py-0.5 rounded',
	freeze: 'text-amber-600 bg-amber-50 px-2 py-0.5 rounded',
	unfreeze: 'text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded',
	payment: 'text-purple-600 bg-purple-50 px-2 py-0.5 rounded',
	adjustment: 'text-orange-600 bg-orange-50 px-2 py-0.5 rounded',
};

const statusLabels: Record<string, string> = {
	completed: 'wallet.statusLabels.completed',
	pending: 'wallet.statusLabels.pending',
	failed: 'wallet.statusLabels.failed',
	cancelled: 'wallet.statusLabels.cancelled',
	processing: 'wallet.statusLabels.processing',
};

const statusBadges: Record<string, string> = {
	completed: 'bg-green-50 text-green-600 px-2 py-0.5 rounded',
	pending: 'bg-amber-50 text-amber-600 px-2 py-0.5 rounded',
	failed: 'bg-red-50 text-red-600 px-2 py-0.5 rounded',
	cancelled: 'bg-gray-100 text-gray-500 px-2 py-0.5 rounded',
	processing: 'bg-blue-50 text-blue-600 px-2 py-0.5 rounded',
};

function txTypeLabelKey(t: string | undefined) {
	return txLabels[t ?? ''] ?? t ?? '-';
}
function txTypeBadge(t: string | undefined) {
	return txTypeBadges[t ?? ''] ?? '';
}
function txStatusLabelKey(s: string | undefined) {
	return statusLabels[s ?? ''] ?? s ?? '-';
}
function txStatusBadge(s: string | undefined) {
	return statusBadges[s ?? ''] ?? '';
}
