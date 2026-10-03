'use client';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth, extractApiError } from '@autional-cn/shared';
import { authMeSamlLinks, authMeSamlLinksBySamlLinksDelete } from '@autional-cn/shared/generated/api';
import { useToast } from '@/hooks/use-toast';
import { formatTime } from '@/lib/format';
import { LoadingScreen, Modal } from '@autional-cn/ui';
import { ErrorState } from '@autional-cn/ui';
import { Link2, Unlink, Loader2, ExternalLink, Info } from 'lucide-react';

interface SammLinkedAccount {
	id: string;
	providerId: string;
	providerName: string;
	nameId: string;
	email?: string;
	linkedAt: string;
	lastLoginAt?: string;
	attributes?: Record<string, string>;
}

async function fetchSammLinkedAccounts(): Promise<SammLinkedAccount[]> {
	const data = (await authMeSamlLinks()) as any;
	return data?.data || data?.items || [];
}

async function unlinkSammAccount(linkId: string): Promise<void> {
	await authMeSamlLinksBySamlLinksDelete(linkId);
}

export default function LinkedAccountsPage() {
	const { t } = useTranslation();
	const toast = useToast();
	const qc = useQueryClient();
	const { user } = useAuth();
	const userId = user?.id || '';

	const {
		data: accounts,
		isLoading,
		error,
	} = useQuery<SammLinkedAccount[], Error>({
		queryKey: ['saml-linked-accounts', userId],
		queryFn: fetchSammLinkedAccounts,
		enabled: !!userId,
		retry: 1,
	});

	const unlinkMutation = useMutation<unknown, Error, string>({
		mutationFn: unlinkSammAccount,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['saml-linked-accounts', userId] });
			toast.success(t('linkedAccounts.unlinkSuccess'));
		},
		onError: (err) => {
			toast.error(extractApiError(err, t('linkedAccounts.unlinkError')).message);
		},
	});

	const [unlinkConfirmId, setUnlinkConfirmId] = useState<string | null>(null);

	const handleUnlink = (account: SammLinkedAccount) => {
		setUnlinkConfirmId(account.id);
	};

	const confirmUnlink = async () => {
		if (!unlinkConfirmId) return;
		unlinkMutation.mutate(unlinkConfirmId);
		setUnlinkConfirmId(null);
	};

	const getProviderIcon = (providerName?: string) => {
		const name = (providerName || '').toLowerCase();
		if (name.includes('azure') || name.includes('entra')) return '🪟';
		if (name.includes('okta')) return '🔵';
		if (name.includes('google')) return '🔴';
		if (name.includes('aws') || name.includes('amazon')) return '🟠';
		if (name.includes('ping')) return '🟢';
		if (name.includes('onelogin')) return '🟣';
		if (name.includes('auth0')) return '🟡';
		return '🔗';
	};

	if (isLoading) return <LoadingScreen message={t('linkedAccounts.loading')} />;
	if (error) return <ErrorState message={t('linkedAccounts.error')} className="min-h-[40vh]" />;

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-xl font-bold text-neutral-900">{t('linkedAccounts.title')}</h2>
				<p className="mt-1 text-sm text-neutral-500">{t('linkedAccounts.subtitle')}</p>
			</div>

			{/* Info banner */}
			<div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
				<div className="flex items-start gap-3">
					<Info size={20} className="text-blue-600 shrink-0 mt-0.5" />
					<div>
						<p className="text-sm font-medium text-blue-800">{t('linkedAccounts.infoTitle')}</p>
						<p className="mt-1 text-sm text-blue-700">{t('linkedAccounts.infoDesc')}</p>
					</div>
				</div>
			</div>

			{/* Accounts List */}
			<div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
				{accounts && accounts.length > 0 ? (
					<div className="divide-y divide-neutral-100">
						{accounts.map((account) => (
							<div key={account.id} className="flex items-center justify-between p-5">
								<div className="flex items-center gap-4">
									<span className="flex h-10 w-10 items-center justify-center rounded-md bg-neutral-100 text-xl">
										{getProviderIcon(account.providerName)}
									</span>
									<div>
										<div className="flex items-center gap-2">
											<p className="font-medium text-neutral-900">
												{account.providerName || t('linkedAccounts.unknownProvider')}
											</p>
											{account.email && (
												<span className="text-sm text-neutral-500">{account.email}</span>
											)}
										</div>
										<div className="flex items-center gap-3 mt-0.5 text-xs text-neutral-500">
											{account.nameId && (
												<span className="font-mono">
													{t('linkedAccounts.nameId')}: {account.nameId}
												</span>
											)}
											<span>
												{t('linkedAccounts.linkedAt')}: {formatTime(account.linkedAt)}
											</span>
											{account.lastLoginAt && (
												<span>
													{t('linkedAccounts.lastLogin')}: {formatTime(account.lastLoginAt)}
												</span>
											)}
										</div>
									</div>
								</div>
								<button
									onClick={() => handleUnlink(account)}
									disabled={unlinkMutation.isPending}
									className="flex items-center gap-1 text-sm text-danger hover:underline disabled:opacity-50"
								>
									<Unlink size={14} />
									{t('linkedAccounts.unlink')}
								</button>
							</div>
						))}
					</div>
				) : (
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<Link2 size={40} className="text-neutral-300" />
						<p className="mt-4 text-sm text-neutral-500">{t('linkedAccounts.empty')}</p>
						<p className="mt-1 text-xs text-neutral-400">{t('linkedAccounts.emptyHint')}</p>
					</div>
				)}
			</div>

			{/* External SSO link */}
			<div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-50 text-primary-700">
						<ExternalLink size={20} />
					</div>
					<div>
						<h3 className="font-medium text-neutral-900">{t('linkedAccounts.ssoInfo')}</h3>
						<p className="text-sm text-neutral-500">{t('linkedAccounts.ssoInfoDesc')}</p>
					</div>
				</div>
			</div>

			{/* Unlink Confirm Modal */}
			<Modal
				open={!!unlinkConfirmId}
				onClose={() => setUnlinkConfirmId(null)}
				title={t('linkedAccounts.unlinkConfirmTitle')}
				maxWidth="sm"
				footer={
					<>
						<button
							onClick={() => setUnlinkConfirmId(null)}
							disabled={unlinkMutation.isPending}
							className="rounded-md border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
						>
							{t('common.cancel')}
						</button>
						<button
							onClick={confirmUnlink}
							disabled={unlinkMutation.isPending}
							className="rounded-md bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger/90 disabled:opacity-60"
						>
							{unlinkMutation.isPending ? (
								<span className="flex items-center gap-1">
									<Loader2 size={14} className="animate-spin" />
									{t('linkedAccounts.unlinking')}
								</span>
							) : (
								t('linkedAccounts.confirmUnlink')
							)}
						</button>
					</>
				}
			>
				<div className="rounded-md bg-amber-50 p-4 text-sm text-amber-800 mb-4">
					<p>{t('linkedAccounts.unlinkWarning')}</p>
				</div>

				<p className="text-sm text-neutral-600 mb-4">{t('linkedAccounts.unlinkConfirmText')}</p>
			</Modal>
		</div>
	);
}
