'use client';
import { ROUTES } from '@/lib/routes';
import { buildNavHref } from '@/lib/nav';
import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Mail, Phone, Plus, Trash2, ChevronLeft, Shield, Loader2, X } from 'lucide-react';
import { Link } from 'react-router';
import { useToast } from '@/hooks/use-toast';
import { extractApiError, useTenantSlug } from '@autional-cn/shared';
import {
	authMeRecoveryContacts,
	authMeRecoveryContactsPost,
	authMeRecoveryContactsByRecoveryContactsDelete,
} from '@autional-cn/shared/generated/api';
import { LoadingScreen, ErrorState, EmptyState, Button } from '@autional-cn/ui';
import { FormInput } from '@autional-cn/ui/rhf';
import { addContactSchema, type AddContactFormData } from '@/lib/validators';

interface RecoveryContact {
	id: string;
	type: 'email' | 'phone';
	value: string;
	verified: boolean;
	createdAt?: string;
}

export default function RecoveryContactsPage() {
	const tenantSlug = useTenantSlug();

	const { t } = useTranslation();
	const toast = useToast();

	const [contacts, setContacts] = useState<RecoveryContact[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	const [showAddForm, setShowAddForm] = useState(false);

	const [deletingId, setDeletingId] = useState<string | null>(null);

	const {
		control,
		handleSubmit,
		setValue,
		watch,
		reset,
		setError: setFormError,
		formState: { errors, isSubmitting },
	} = useForm<AddContactFormData>({
		resolver: zodResolver(addContactSchema),
		defaultValues: { type: 'email', value: '' },
		mode: 'onChange',
	});

	const addType = watch('type');

	const fetchContacts = useCallback(async () => {
		setLoading(true);
		setError('');
		try {
			const data = (await authMeRecoveryContacts()) as {
				data?: RecoveryContact[];
				items?: RecoveryContact[];
			};
			setContacts(data?.data || data?.items || []);
		} catch (err: any) {
			const msg = extractApiError(err, t('security.recoveryContacts.loadError')).message;
			setError(msg);
		} finally {
			setLoading(false);
		}
	}, [t]);

	useEffect(() => {
		fetchContacts();
	}, [fetchContacts]);

	const onAdd = async (data: AddContactFormData) => {
		try {
			await authMeRecoveryContactsPost({ type: data.type, value: data.value.trim() } as any);
			toast.success(t('security.recoveryContacts.addSuccess'));
			setShowAddForm(false);
			reset({ type: 'email', value: '' });
			fetchContacts();
		} catch (err: any) {
			const msg = extractApiError(err, t('security.recoveryContacts.addError')).message;
			setFormError('root', { message: msg });
			toast.error(msg);
		}
	};

	const handleDelete = async (id: string) => {
		if (!confirm(t('security.recoveryContacts.deleteConfirm'))) return;

		setDeletingId(id);
		try {
			await authMeRecoveryContactsByRecoveryContactsDelete(id);
			toast.success(t('security.recoveryContacts.deleteSuccess'));
			setContacts((prev) => prev.filter((c) => c.id !== id));
		} catch (err: any) {
			toast.error(extractApiError(err, t('security.recoveryContacts.deleteError')).message);
		} finally {
			setDeletingId(null);
		}
	};

	return (
		<div className="max-w-lg mx-auto space-y-6">
			<div className="flex items-center gap-3">
				<Link
					to={buildNavHref(ROUTES.security, tenantSlug)}
					className="text-neutral-400 hover:text-neutral-600 transition-colors"
				>
					<ChevronLeft size={20} />
				</Link>
				<div>
					<h2 className="text-xl font-bold text-neutral-900">
						{t('security.recoveryContacts.title')}
					</h2>
					<p className="mt-1 text-sm text-neutral-500">{t('security.recoveryContacts.subtitle')}</p>
				</div>
			</div>

			<div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
				<div className="flex items-start gap-3">
					<Shield size={18} className="mt-0.5 text-blue-600 shrink-0" />
					<p className="text-sm text-blue-700">{t('security.recoveryContacts.info')}</p>
				</div>
			</div>

			{loading ? (
				<LoadingScreen message={t('security.recoveryContacts.loading')} />
			) : error ? (
				<ErrorState message={error} onRetry={fetchContacts} />
			) : contacts.length === 0 && !showAddForm ? (
				<div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
					<EmptyState
						icon={<Mail size={32} />}
						title={t('security.recoveryContacts.empty')}
						description={t('security.recoveryContacts.emptyDesc')}
					/>
					<div className="mt-4 text-center">
						<Button onClick={() => setShowAddForm(true)} variant="primary" className="gap-2">
							<Plus size={16} />
							{t('security.recoveryContacts.addFirst')}
						</Button>
					</div>
				</div>
			) : (
				<div className="space-y-3">
					{contacts.map((contact) => (
						<div
							key={contact.id}
							className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
						>
							<div className="flex items-center gap-3">
								<div className="flex h-9 w-9 items-center justify-center rounded-md bg-neutral-100 text-neutral-500">
									{contact.type === 'email' ? <Mail size={18} /> : <Phone size={18} />}
								</div>
								<div>
									<p className="text-sm font-medium text-neutral-900">{contact.value}</p>
									<p className="text-xs text-neutral-500">
										{contact.type === 'email'
											? t('security.recoveryContacts.email')
											: t('security.recoveryContacts.phone')}
										{contact.verified ? (
											<span className="ml-2 text-emerald-600">
												{t('security.recoveryContacts.verified')}
											</span>
										) : (
											<span className="ml-2 text-amber-600">
												{t('security.recoveryContacts.pending')}
											</span>
										)}
									</p>
								</div>
							</div>
							<button
								onClick={() => handleDelete(contact.id)}
								disabled={deletingId === contact.id}
								className="text-neutral-400 hover:text-red-600 transition-colors disabled:opacity-50"
							>
								{deletingId === contact.id ? (
									<Loader2 size={16} className="animate-spin" />
								) : (
									<Trash2 size={16} />
								)}
							</button>
						</div>
					))}

					{!showAddForm && (
						<div className="text-center">
							<Button onClick={() => setShowAddForm(true)} variant="outline" className="gap-2">
								<Plus size={16} />
								{t('security.recoveryContacts.addAnother')}
							</Button>
						</div>
					)}
				</div>
			)}

			{showAddForm && (
				<div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
					<div className="flex items-center justify-between mb-4">
						<h3 className="font-semibold text-neutral-900">
							{t('security.recoveryContacts.addTitle')}
						</h3>
						<button
							onClick={() => {
								setShowAddForm(false);
								setFormError('root', { message: '' });
								reset({ type: 'email', value: '' });
							}}
							className="text-neutral-400 hover:text-neutral-600"
						>
							<X size={18} />
						</button>
					</div>

					<form onSubmit={handleSubmit(onAdd)} className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-neutral-700">
								{t('security.recoveryContacts.type')}
							</label>
							<div className="mt-1 flex gap-2">
								<button
									type="button"
									onClick={() => setValue('type', 'email')}
									className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
										addType === 'email'
											? 'border-primary-500 bg-primary-50 text-primary-700'
											: 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
									}`}
								>
									<Mail size={16} />
									{t('security.recoveryContacts.email')}
								</button>
								<button
									type="button"
									onClick={() => setValue('type', 'phone')}
									className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
										addType === 'phone'
											? 'border-primary-500 bg-primary-50 text-primary-700'
											: 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
									}`}
								>
									<Phone size={16} />
									{t('security.recoveryContacts.phone')}
								</button>
							</div>
						</div>

						<div>
							<FormInput<AddContactFormData>
								name="value"
								control={control}
								type={addType === 'email' ? 'email' : 'tel'}
								label={
									addType === 'email'
										? t('security.recoveryContacts.emailAddress')
										: t('security.recoveryContacts.phoneNumber')
								}
								placeholder={addType === 'email' ? 'name@example.com' : '+8613800138000'}
								// 今天这一行渲染的就是 zod 的原始 message（required / invalidEmail / invalidPhone），
								// 照抄同一条以免换掉用户看到的字；它没走 t() 是既有问题，不在本次收敛范围内。
								error={errors.value ? errors.value.message : undefined}
							/>
						</div>

						{errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}

						<div className="flex justify-end gap-3">
							<Button
								type="button"
								onClick={() => {
									setShowAddForm(false);
									setFormError('root', { message: '' });
									reset({ type: 'email', value: '' });
								}}
								variant="outline"
								disabled={isSubmitting}
							>
								{t('common.cancel')}
							</Button>
							<Button type="submit" variant="primary" isLoading={isSubmitting}>
								{t('security.recoveryContacts.add')}
							</Button>
						</div>
					</form>
				</div>
			)}
		</div>
	);
}
