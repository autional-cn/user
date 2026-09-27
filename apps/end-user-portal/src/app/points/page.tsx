'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	usePointAccount,
	usePointTransactions,
	useExpiringPoints,
	usePointStats,
	usePointValue,
	usePointRiskScore,
} from '@/hooks/queries';
import {
	Coins,
	TrendingUp,
	TrendingDown,
	Clock,
	AlertTriangle,
	DollarSign,
	Shield,
} from 'lucide-react';
import { LoadingScreen, ErrorState, EmptyState } from '@autional-cn/ui';
import { SkeletonCard, SkeletonRow } from '@/components/ui/Skeleton';
import { isNotFoundError } from '@/lib/api-error';

export default function PointsPage() {
	const { t } = useTranslation();
	const {
		data: account,
		isLoading: accountLoading,
		error: accountError,
		refetch: refetchAccount,
	} = usePointAccount();
	const { data: expiringData } = useExpiringPoints(account?.userId || '', 30, !!account?.userId);
	const { data: stats } = usePointStats(account?.userId || '', !!account?.userId);
	const { data: value } = usePointValue(account?.userId || '', !!account?.userId);
	const { data: risk } = usePointRiskScore(account?.userId || '', !!account?.userId);

	const [page, setPage] = useState(1);
	const { data: txs } = usePointTransactions(
		account?.userId || '',
		{ page, pageSize: 20 },
		!!account?.userId,
	);

	if (accountLoading)
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
			</div>
		);
	if (accountError) {
		if (isNotFoundError(accountError)) {
			return (
				<EmptyState
					title={t('points.empty', '暂无积分数据')}
					description={t('points.emptyDesc', '当前账户尚未开通积分账户')}
				/>
			);
		}
		return (
			<ErrorState
				message={t('points.loadError', '积分信息加载失败')}
				onRetry={() => refetchAccount()}
			/>
		);
	}
	const getTypeLabel = (type: string) => {
		const key = TX_TYPE_KEYS[type];
		return key ? t(key) : type;
	};

	const balance = account?.balance ?? 0;
	const frozen = account?.frozenBalance ?? 0;

	return (
		<div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
			<h1 className="text-2xl font-bold">{t('points.title')}</h1>

			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<Card
					icon={<Coins className="w-5 h-5 text-amber-500" />}
					label={t('points.availablePoints')}
					value={balance.toLocaleString()}
				/>
				<Card
					icon={<Clock className="w-5 h-5 text-blue-500" />}
					label={t('points.frozenPoints')}
					value={frozen.toLocaleString()}
				/>
				<Card
					icon={<DollarSign className="w-5 h-5 text-green-500" />}
					label={t('points.redeemableCash')}
					value={value?.cashValue ?? '-'}
				/>
				<Card
					icon={<Shield className="w-5 h-5 text-purple-500" />}
					label={t('points.riskScore')}
					value={risk?.riskScore != null ? `${risk.riskScore}${t('points.scoreSuffix')}` : '-'}
					valueClassName={
						risk?.riskLevel === 'high'
							? 'text-red-500'
							: risk?.riskLevel === 'medium'
								? 'text-amber-500'
								: 'text-green-500'
					}
				/>
				<Card
					icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
					label={t('points.expiringSoon')}
					value={
						(expiringData?.totalExpiring ?? 0) > 0
							? `${expiringData?.totalExpiring?.toLocaleString()}${t('points.pointsUnit')}`
							: t('points.none')
					}
					valueClassName={(expiringData?.totalExpiring ?? 0) > 0 ? 'text-red-500' : 'text-gray-400'}
				/>
			</div>

			{stats && (
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
					<StatBox
						label={t('points.totalEarned')}
						value={stats.totalEarned?.toLocaleString()}
						icon={<TrendingUp className="w-4 h-4 text-green-500" />}
					/>
					<StatBox
						label={t('points.totalSpent')}
						value={stats.totalSpent?.toLocaleString()}
						icon={<TrendingDown className="w-4 h-4 text-red-500" />}
					/>
					<StatBox
						label={t('points.earnedThisMonth')}
						value={stats.earnedThisMonth?.toLocaleString()}
					/>
					<StatBox
						label={t('points.spentThisMonth')}
						value={stats.spentThisMonth?.toLocaleString()}
					/>
				</div>
			)}

			{expiringData && (expiringData.expiringPoints ?? []).length > 0 && (
				<div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
					<h2 className="text-sm font-semibold text-amber-800 mb-2">
						{t('points.expiringPointsTitle')}
					</h2>
					<div className="space-y-2">
						{(expiringData.expiringPoints ?? []).slice(0, 5).map((ep, i) => (
							<div key={i} className="flex justify-between text-sm text-amber-700">
								<span>
									{ep.amount?.toLocaleString()}
									{t('points.pointsUnit')} · {ep.source ?? t('points.systemIssued')}
								</span>
								<span>{t('points.daysUntilExpire', { days: ep.daysLeft ?? 0 })}</span>
							</div>
						))}
					</div>
				</div>
			)}

			<div>
				<h2 className="text-lg font-semibold mb-3">{t('points.transactionHistory')}</h2>
				<div className="overflow-x-auto rounded-lg border">
					<table className="w-full text-sm">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-2 text-left">{t('points.table.type')}</th>
								<th className="px-4 py-2 text-right">{t('points.table.amount')}</th>
								<th className="px-4 py-2 text-left">{t('points.table.source')}</th>
								<th className="px-4 py-2 text-right">{t('points.table.time')}</th>
							</tr>
						</thead>
						<tbody>
							{(txs?.items ?? []).map((tx) => (
								<tr key={tx.id} className="border-t">
									<td className="px-4 py-2">
										<span className={typeBadge(tx.type ?? '')}>{getTypeLabel(tx.type ?? '')}</span>
									</td>
									<td
										className={`px-4 py-2 text-right font-mono ${(tx.amount ?? 0) > 0 ? 'text-green-600' : 'text-red-600'}`}
									>
										{(tx.amount ?? 0) > 0 ? '+' : ''}
										{tx.amount?.toLocaleString() ?? 0}
									</td>
									<td className="px-4 py-2 text-gray-500">{tx.source ?? '-'}</td>
									<td className="px-4 py-2 text-right text-gray-400 text-xs">
										{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : '-'}
									</td>
								</tr>
							))}
							{(!txs?.items || txs.items.length === 0) && (
								<tr>
									<td colSpan={4}>
										<EmptyState
											title={t('points.empty', '暂无积分数据')}
											description={t('points.emptyDesc', '您的积分记录将显示在这里')}
										/>
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
							{t('common.previous')}
						</button>
						<span className="px-3 py-1 text-sm text-gray-500">
							{page} / {Math.ceil((txs.total ?? 0) / 20)}
						</span>
						<button
							disabled={page >= Math.ceil((txs.total ?? 0) / 20)}
							onClick={() => setPage(page + 1)}
							className="px-3 py-1 rounded border text-sm disabled:opacity-30"
						>
							{t('common.next')}
						</button>
					</div>
				)}
			</div>
		</div>
	);
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

const TX_TYPE_KEYS: Record<string, string> = {
	earn: 'points.txType.earn',
	spend: 'points.txType.spend',
	refund: 'points.txType.refund',
	adjust: 'points.txType.adjust',
	freeze: 'points.txType.freeze',
	unfreeze: 'points.txType.unfreeze',
	expire: 'points.txType.expire',
	confirm_deduction: 'points.txType.confirm_deduction',
};

const typeBadges: Record<string, string> = {
	earn: 'text-green-600 bg-green-50 px-2 py-0.5 rounded',
	spend: 'text-red-600 bg-red-50 px-2 py-0.5 rounded',
	refund: 'text-blue-600 bg-blue-50 px-2 py-0.5 rounded',
	adjust: 'text-purple-600 bg-purple-50 px-2 py-0.5 rounded',
	freeze: 'text-amber-600 bg-amber-50 px-2 py-0.5 rounded',
	unfreeze: 'text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded',
	expire: 'text-gray-600 bg-gray-100 px-2 py-0.5 rounded',
	confirm_deduction: 'text-orange-600 bg-orange-50 px-2 py-0.5 rounded',
};

function typeBadge(t: string) {
	return typeBadges[t] ?? '';
}
