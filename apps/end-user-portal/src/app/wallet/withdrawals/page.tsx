'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@autional-cn/shared';
import { LoadingScreen, ErrorState, EmptyState } from '@autional-cn/ui';
import { useTranslation } from 'react-i18next';
import { Wallet, ArrowDownCircle, CheckCircle, XCircle, Loader2, Banknote } from 'lucide-react';
import { useWalletBalance, useWithdrawWallet, useWalletTransactions } from '@/hooks/queries';
import { withdrawalSchema, type WithdrawalFormData } from '@/lib/validators';
import { isNotFoundError } from '@/lib/api-error';

const WITHDRAWAL_STATUSES = ['all', 'pending', 'approved', 'rejected', 'completed'] as const;

export default function WithdrawalsPage() {
	const { t } = useTranslation();
	const { user } = useAuth();
	const userId = user?.id || '';
	const {
		data: balance,
		isLoading: balanceLoading,
		error: balanceError,
		refetch: refetchBalance,
	} = useWalletBalance();
	const withdrawMutation = useWithdrawWallet();

	const channels = [
		{
			code: 'bank_transfer',
			label: t('wallet.withdrawals.channels.bankTransfer'),
			icon: <Banknote className="w-5 h-5" />,
		},
		{
			code: 'wallet',
			label: t('wallet.withdrawals.channels.balanceWithdraw'),
			icon: <Wallet className="w-5 h-5" />,
		},
	];

	const [page, setPage] = useState(1);
	const [statusFilter, setStatusFilter] = useState<string>('all');
	const { data: txs } = useWalletTransactions(userId, { page, pageSize: 20 }, !!userId);

	const {
		register,
		handleSubmit,
		reset,
		watch,
		setValue,
		formState: { errors, isSubmitting },
	} = useForm<WithdrawalFormData>({
		resolver: zodResolver(withdrawalSchema),
		defaultValues: { amount: '', method: 'bank_transfer', notes: '' },
	});

	const watchedAmount = watch('amount');

	const [formStatus, setFormStatus] = useState<'idle' | 'success' | 'error'>('idle');
	const [resultKey, setResultKey] = useState<string>('');

	const onWithdraw = async (data: WithdrawalFormData) => {
		setFormStatus('idle');
		try {
			await withdrawMutation.mutateAsync({
				userId,
				amount: data.amount,
				remark: data.notes || undefined,
			});
			setFormStatus('success');
			setResultKey('wallet.withdrawals.success');
			reset({ amount: '', method: 'bank_transfer', notes: '' });
		} catch (e: unknown) {
			setFormStatus('error');
			setResultKey(e instanceof Error ? e.message : 'wallet.withdrawals.failed');
		}
	};

	if (balanceLoading) return <LoadingScreen message={t('wallet.loadingBalance', '正在加载钱包余额…')} />;

	if (balanceError) {
		if (isNotFoundError(balanceError)) {
			return (
				<EmptyState
					title={t('wallet.empty', '暂无钱包数据')}
					description={t('wallet.emptyDesc', '当前账户尚未开通钱包')}
				/>
			);
		}
		return (
			<ErrorState
				message={t('wallet.loadBalanceError', '钱包余额加载失败')}
				onRetry={() => refetchBalance()}
			/>
		);
	}

	const currentBalance = parseFloat(
		balance?.availableBalance ?? balance?.available ?? balance?.balance ?? '0',
	);

	const withdrawalTxs = (txs?.items ?? []).filter((tx) => {
		if (tx.type === 'withdraw' || tx.type === 'withdrawal') {
			if (statusFilter === 'all') return true;
			return tx.status === statusFilter;
		}
		return false;
	});

	return (
		<div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
			<h1 className="text-2xl font-bold">{t('wallet.withdrawals.title')}</h1>

			<div className="bg-white rounded-lg border p-6 flex items-center gap-4">
				<div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
					<Wallet className="w-6 h-6 text-green-600" />
				</div>
				<div>
					<div className="text-sm text-gray-500">{t('wallet.withdrawals.availableBalance')}</div>
					<div className="text-2xl font-bold text-green-600">¥{currentBalance.toFixed(2)}</div>
				</div>
			</div>

			<form
				onSubmit={handleSubmit(onWithdraw)}
				className="bg-white rounded-lg border p-6 space-y-5"
			>
				<h2 className="text-lg font-semibold">{t('wallet.withdrawals.applyWithdrawal')}</h2>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						{t('wallet.withdrawals.amount')}
					</label>
					<div className="relative">
						<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
						<input
							type="number"
							placeholder={t('wallet.withdrawals.amountPlaceholder')}
							{...register('amount')}
							className="w-full pl-8 pr-3 py-3 rounded-lg border border-gray-200 text-lg font-semibold focus:border-primary focus:outline-none"
						/>
					</div>
					{errors.amount && (
						<p className="text-sm text-red-500 mt-1">
							{t(errors.amount.message || 'wallet.withdrawals.amountRequired')}
						</p>
					)}
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						{t('wallet.withdrawals.method')}
					</label>
					<input type="hidden" {...register('method')} />
					<div className="flex gap-3">
						{channels.map((ch) => (
							<button
								key={ch.code}
								type="button"
								onClick={() => setValue('method', ch.code)}
								className={`flex items-center gap-2 px-5 py-3 rounded-lg border transition-colors ${
									watch('method') === ch.code
										? 'border-primary bg-primary-50 text-primary'
										: 'border-gray-200 hover:border-primary'
								}`}
							>
								{ch.icon}
								<span className="font-medium">{ch.label}</span>
							</button>
						))}
					</div>
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						{t('wallet.withdrawals.remark')}
					</label>
					<textarea
						placeholder={t('wallet.withdrawals.remarkPlaceholder')}
						{...register('notes')}
						rows={3}
						className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary focus:outline-none resize-none"
					/>
				</div>

				<button
					type="submit"
					disabled={isSubmitting}
					className="w-full py-4 rounded-lg bg-primary text-white font-semibold text-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
				>
					{isSubmitting ? (
						<>
							<Loader2 className="w-5 h-5 animate-spin" />
							{t('wallet.withdrawals.submitting')}
						</>
					) : (
						<>
							<ArrowDownCircle className="w-5 h-5" />
							{t('wallet.withdrawals.submit', {
								amount: watchedAmount ? parseFloat(watchedAmount).toFixed(2) : '0.00',
							})}
						</>
					)}
				</button>

				{formStatus === 'success' && (
					<div className="flex items-center gap-2 p-4 rounded-lg bg-green-50 text-green-700">
						<CheckCircle className="w-5 h-5" />
						<span className="font-medium">{t(resultKey)}</span>
						<button
							type="button"
							onClick={() => setFormStatus('idle')}
							className="ml-auto text-sm text-primary hover:underline"
						>
							{t('wallet.withdrawals.continueWithdraw')}
						</button>
					</div>
				)}

				{formStatus === 'error' && (
					<div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 text-red-700">
						<XCircle className="w-5 h-5" />
						<span className="font-medium">{t(resultKey)}</span>
						<button
							type="button"
							onClick={() => setFormStatus('idle')}
							className="ml-auto text-sm text-primary hover:underline"
						>
							{t('wallet.withdrawals.retry')}
						</button>
					</div>
				)}
			</form>

			<div>
				<div className="flex items-center justify-between mb-3">
					<h2 className="text-lg font-semibold">{t('wallet.withdrawals.history')}</h2>
					<select
						value={statusFilter}
						onChange={(e) => {
							setStatusFilter(e.target.value);
							setPage(1);
						}}
						className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
					>
						{WITHDRAWAL_STATUSES.map((s) => (
							<option key={s} value={s}>
								{s === 'all' ? t('wallet.withdrawals.allStatus') : t(withdrawalStatusLabelKey(s))}
							</option>
						))}
					</select>
				</div>

				<div className="overflow-x-auto rounded-lg border">
					<table className="w-full text-sm">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-2 text-left">{t('wallet.withdrawals.date')}</th>
								<th className="px-4 py-2 text-right">{t('wallet.amount')}</th>
								<th className="px-4 py-2 text-center">{t('wallet.withdrawals.status')}</th>
								<th className="px-4 py-2 text-left">{t('wallet.withdrawals.method')}</th>
								<th className="px-4 py-2 text-left">{t('wallet.remark')}</th>
							</tr>
						</thead>
						<tbody>
							{withdrawalTxs.map((tx) => (
								<tr key={tx.id} className="border-t">
									<td className="px-4 py-2 text-gray-500">
										{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : '-'}
									</td>
									<td className="px-4 py-2 text-right font-mono text-red-600">
										-¥
										{Number(tx.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
									</td>
									<td className="px-4 py-2 text-center">
										<span className={withdrawalStatusBadge(tx.status)}>
											{t(withdrawalStatusLabelKey(tx.status))}
										</span>
									</td>
									<td className="px-4 py-2 text-gray-500">{t(methodLabelKey(tx.type))}</td>
									<td className="px-4 py-2 text-gray-500 max-w-[200px] truncate">
										{tx.description ?? '-'}
									</td>
								</tr>
							))}
							{withdrawalTxs.length === 0 && (
								<tr>
									<td colSpan={5} className="px-4 py-8 text-center text-gray-400">
										{t('wallet.withdrawals.noRecords')}
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
		</div>
	);
}

const withdrawalStatusLabels: Record<string, string> = {
	pending: 'wallet.withdrawals.statusLabels.pending',
	approved: 'wallet.withdrawals.statusLabels.approved',
	rejected: 'wallet.withdrawals.statusLabels.rejected',
	completed: 'wallet.withdrawals.statusLabels.completed',
};

const withdrawalStatusBadges: Record<string, string> = {
	pending: 'bg-amber-50 text-amber-600 px-2 py-0.5 rounded',
	approved: 'bg-blue-50 text-blue-600 px-2 py-0.5 rounded',
	rejected: 'bg-red-50 text-red-600 px-2 py-0.5 rounded',
	completed: 'bg-green-50 text-green-600 px-2 py-0.5 rounded',
};

const methodLabels: Record<string, string> = {
	bank_transfer: 'wallet.withdrawals.methodLabels.bankTransfer',
	wallet: 'wallet.withdrawals.methodLabels.balanceWithdraw',
	withdraw: 'wallet.withdrawals.methodLabels.bankTransfer',
	withdrawal: 'wallet.withdrawals.methodLabels.balanceWithdraw',
};

function withdrawalStatusLabelKey(s: string | undefined): string {
	if (!s) return '-';
	return withdrawalStatusLabels[s] ?? s;
}

function withdrawalStatusBadge(s: string | undefined): string {
	if (!s) return '';
	return withdrawalStatusBadges[s] ?? 'bg-gray-100 text-gray-500 px-2 py-0.5 rounded';
}

function methodLabelKey(t: string | undefined): string {
	if (!t) return '-';
	return methodLabels[t] ?? t;
}
