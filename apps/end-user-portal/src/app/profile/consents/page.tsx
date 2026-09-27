'use client';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, Shield, Plus, Trash2 } from 'lucide-react';
import { useAuth, extractApiError } from '@autional-cn/shared';
import {
	profilesConsentsByProfiles,
	profilesConsentsByProfilesPost,
	profilesConsentsByProfilesByConsentsDelete,
} from '@autional-cn/shared/generated/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LoadingScreen } from '@autional-cn/ui';
import { ErrorState, EmptyState } from '@autional-cn/ui';
import { showToast } from '@autional-cn/ui';
import { isNotFoundError } from '@/lib/api-error';

interface ConsentField {
	fieldKey: string;
	displayName: string;
	consented: boolean;
	requiresConsent: boolean;
	dataClassification: string;
	grantedAt?: string;
	revokedAt?: string;
}

interface ConsentFieldMetadata {
	key: string;
	label: string;
	description: string;
}

const AVAILABLE_FIELDS: ConsentFieldMetadata[] = [
	{
		key: 'health_data',
		label: 'Health Data',
		description: 'Access to your health-related profile data',
	},
	{ key: 'location', label: 'Location', description: 'Your geographic location data' },
	{ key: 'contacts', label: 'Contacts', description: 'Your contact list and address book' },
	{
		key: 'biometric_data',
		label: 'Biometric Data',
		description: 'Fingerprint, face recognition, and other biometric data',
	},
	{
		key: 'browsing_history',
		label: 'Browsing History',
		description: 'Your in-app browsing and activity history',
	},
];

async function fetchConsents(userId: string): Promise<ConsentField[]> {
	const data = (await profilesConsentsByProfiles(userId)) as any;
	return data?.data?.fields || data?.fields || [];
}

async function grantConsents(userId: string, fieldKeys: string[]): Promise<void> {
	await profilesConsentsByProfilesPost(userId, { field_keys: fieldKeys } as any);
}

async function revokeConsent(userId: string, fieldKey: string): Promise<void> {
	await profilesConsentsByProfilesByConsentsDelete(userId, fieldKey);
}

export default function ConsentsPage() {
	const { t } = useTranslation();
	const { user } = useAuth();
	const userId = user?.id || '';
	const qc = useQueryClient();
	const [showModal, setShowModal] = useState(false);
	const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
	const [revokingField, setRevokingField] = useState<string | null>(null);

	const {
		data: consents = [],
		isLoading,
		error,
	} = useQuery<ConsentField[], Error>({
		queryKey: ['consents', userId],
		queryFn: () => fetchConsents(userId),
		enabled: !!userId,
		retry: 1,
	});

	const grantMutation = useMutation<void, Error, string[]>({
		mutationFn: (fieldKeys) => grantConsents(userId, fieldKeys),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['consents', userId] });
			setShowModal(false);
			setSelectedFields(new Set());
			showToast(t('consents.grantSuccess'), 'success');
		},
		onError: (err) => {
			showToast(extractApiError(err, t('consents.grantError')).message, 'error');
		},
	});

	const revokeMutation = useMutation<void, Error, string>({
		mutationFn: (fieldKey) => revokeConsent(userId, fieldKey),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['consents', userId] });
			setRevokingField(null);
			showToast(t('consents.revokeSuccess'), 'success');
		},
		onError: (err) => {
			showToast(extractApiError(err, t('consents.revokeError')).message, 'error');
		},
	});

	const consentedKeys = new Set(consents.filter((c) => c.consented).map((c) => c.fieldKey));
	const availableFields = AVAILABLE_FIELDS.filter((f) => !consentedKeys.has(f.key));

	const toggleField = (key: string) => {
		setSelectedFields((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	};

	const handleGrant = () => {
		if (selectedFields.size === 0) return;
		grantMutation.mutate(Array.from(selectedFields));
	};

	if (isLoading) return <LoadingScreen message={t('consents.loading')} />;
	if (error)
		return isNotFoundError(error) ? (
			<EmptyState
				title={t('consents.empty', '暂无授权记录')}
				description={t('consents.emptyDesc', '当前账户暂无数据授权记录')}
			/>
		) : (
			<ErrorState message={t('consents.error')} className="min-h-[40vh]" />
		);

	const classificationColor = (cls: string) => {
		switch (cls) {
			case 'sensitive':
				return 'bg-rose-50 text-rose-700 border-rose-200';
			case 'internal':
				return 'bg-amber-50 text-amber-700 border-amber-200';
			case 'public':
				return 'bg-emerald-50 text-emerald-700 border-emerald-200';
			default:
				return 'bg-neutral-50 text-neutral-700 border-neutral-200';
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-xl font-bold text-neutral-900">{t('consents.title')}</h2>
					<p className="mt-1 text-sm text-neutral-500">{t('consents.subtitle')}</p>
				</div>
				{availableFields.length > 0 && (
					<button
						onClick={() => setShowModal(true)}
						className="flex items-center gap-1.5 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
					>
						<Plus size={14} />
						{t('consents.grantNew')}
					</button>
				)}
			</div>

			{/* Active Consents */}
			<div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
				<div className="border-b border-neutral-100 px-6 py-4">
					<h3 className="text-sm font-semibold text-neutral-700">{t('consents.activeConsents')}</h3>
				</div>
				{consents.length === 0 ? (
					<div className="px-6 py-12 text-center">
						<Shield size={40} className="mx-auto text-neutral-300 mb-3" />
						<p className="text-sm text-neutral-500">{t('consents.noConsents')}</p>
					</div>
				) : (
					<div className="divide-y divide-neutral-100">
						{consents.map((field) => (
							<div key={field.fieldKey} className="flex items-center justify-between px-6 py-4">
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2">
										<h4 className="text-sm font-medium text-neutral-900">{field.displayName}</h4>
										{field.consented ? (
											<span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
												<Check size={10} />
												{t('consents.granted')}
											</span>
										) : (
											<span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
												<X size={10} />
												{t('consents.revoked')}
											</span>
										)}
										{field.dataClassification && (
											<span
												className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${classificationColor(field.dataClassification)}`}
											>
												{field.dataClassification}
											</span>
										)}
									</div>
									<div className="mt-1 flex items-center gap-4 text-xs text-neutral-400">
										<span>{field.fieldKey}</span>
										{field.grantedAt && (
											<span>
												{t('consents.grantedAt')}: {new Date(field.grantedAt).toLocaleDateString()}
											</span>
										)}
										{field.revokedAt && (
											<span>
												{t('consents.revokedAt')}: {new Date(field.revokedAt).toLocaleDateString()}
											</span>
										)}
									</div>
								</div>
								{field.consented && (
									<button
										onClick={() => setRevokingField(field.fieldKey)}
										className="ml-4 flex items-center gap-1 rounded-md border border-rose-200 bg-white px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
									>
										<Trash2 size={12} />
										{t('consents.revoke')}
									</button>
								)}
							</div>
						))}
					</div>
				)}
			</div>

			{/* Grant Consent Modal */}
			{showModal && (
				<>
					<div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowModal(false)} />
					<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
						<div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white shadow-xl">
							<div className="border-b border-neutral-100 px-6 py-4">
								<h3 className="text-lg font-semibold text-neutral-900">
									{t('consents.grantModalTitle')}
								</h3>
								<p className="mt-0.5 text-sm text-neutral-500">{t('consents.grantModalDesc')}</p>
							</div>
							<div className="px-6 py-4 space-y-3 max-h-80 overflow-y-auto">
								{availableFields.length === 0 ? (
									<p className="text-center text-sm text-neutral-400 py-4">
										{t('consents.allFieldsConsented')}
									</p>
								) : (
									availableFields.map((field) => (
										<label
											key={field.key}
											className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
												selectedFields.has(field.key)
													? 'border-primary-300 bg-primary-50'
													: 'border-neutral-200 hover:border-neutral-300 bg-white'
											}`}
										>
											<input
												type="checkbox"
												checked={selectedFields.has(field.key)}
												onChange={() => toggleField(field.key)}
												className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
											/>
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium text-neutral-900">{field.label}</p>
												<p className="text-xs text-neutral-500">{field.description}</p>
											</div>
										</label>
									))
								)}
							</div>
							<div className="flex items-center justify-end gap-2 border-t border-neutral-100 px-6 py-4">
								<button
									onClick={() => {
										setShowModal(false);
										setSelectedFields(new Set());
									}}
									className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
								>
									{t('consents.cancel')}
								</button>
								<button
									onClick={handleGrant}
									disabled={selectedFields.size === 0 || grantMutation.isPending}
									className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors disabled:opacity-60"
								>
									{grantMutation.isPending ? t('consents.granting') : t('consents.grant')}
								</button>
							</div>
						</div>
					</div>
				</>
			)}

			{/* Revoke Confirmation Dialog */}
			{revokingField && (
				<>
					<div className="fixed inset-0 z-40 bg-black/30" onClick={() => setRevokingField(null)} />
					<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
						<div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white shadow-xl">
							<div className="px-6 py-5">
								<h3 className="text-lg font-semibold text-neutral-900">
									{t('consents.revokeConfirmTitle')}
								</h3>
								<p className="mt-2 text-sm text-neutral-500">
									{t('consents.revokeConfirmDesc', { field: revokingField })}
								</p>
							</div>
							<div className="flex items-center justify-end gap-2 border-t border-neutral-100 px-6 py-4">
								<button
									onClick={() => setRevokingField(null)}
									className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
								>
									{t('consents.cancel')}
								</button>
								<button
									onClick={() => revokeMutation.mutate(revokingField)}
									disabled={revokeMutation.isPending}
									className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors disabled:opacity-60"
								>
									{revokeMutation.isPending ? t('consents.revoking') : t('consents.confirmRevoke')}
								</button>
							</div>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
