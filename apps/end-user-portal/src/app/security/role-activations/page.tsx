'use client';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth, extractApiError } from '@autional-cn/shared';
import {
	authMeRoleActivations,
	authMeRoleActivationsPost,
	adminRoles,
} from '@autional-cn/shared/generated/api';
import { useToast } from '@/hooks/use-toast';
import { formatTime } from '@/lib/format';
import { LoadingScreen } from '@autional-cn/ui';
import { ErrorState } from '@autional-cn/ui';
import {
	ShieldCheck,
	Clock,
	AlertCircle,
	CheckCircle2,
	XCircle,
	Plus,
	X,
	Loader2,
} from 'lucide-react';

interface RoleActivation {
	id: string;
	tenantId: string;
	userId: string;
	roleId: string;
	roleName?: string;
	status: string;
	justification: string;
	activatedAt: string;
	expireAt: string;
	revokedAt?: string;
	createdAt: string;
}

interface RoleItem {
	id: string;
	name: string;
	code: string;
	description?: string;
}

async function fetchRoleActivations(): Promise<RoleActivation[]> {
	// 2026-08-17 修复：authMeRoleActivations 经拦截器解包为数组本身，
	// 原 `data?.data || []` 对数组取 .data 恒 undefined → 列表恒空（即便有激活记录）
	const data = (await authMeRoleActivations()) as RoleActivation[];
	return Array.isArray(data) ? data : [];
}

async function fetchAvailableRoles(): Promise<RoleItem[]> {
	try {
		const data = (await adminRoles({ page_size: 100 })) as any;
		return data?.items || data?.data || [];
	} catch {
		return [];
	}
}

async function requestActivation(data: {
	role_id: string;
	justification: string;
	duration: string;
}): Promise<unknown> {
	return authMeRoleActivationsPost(data as any);
}

async function cancelActivation(activationId: string): Promise<void> {
	// TODO: No generated function for DELETE /auth/me/role-activations/:id — authMeRoleActivationsByIdDelete missing from api.ts
	const { apiClient: api } = await import('@autional-cn/shared');
	await api.delete(`/identity/api/v1/auth/me/role-activations/${activationId}`); // @generated-api-exempt
}

export default function RoleActivationsPage() {
	const { t } = useTranslation();
	const toast = useToast();
	const qc = useQueryClient();
	const { user } = useAuth();
	const userId = user?.id || '';

	const {
		data: activations,
		isLoading,
		error,
	} = useQuery<RoleActivation[], Error>({
		queryKey: ['role-activations', userId],
		queryFn: fetchRoleActivations,
		enabled: !!userId,
		retry: 1,
	});

	const { data: roles } = useQuery<RoleItem[], Error>({
		queryKey: ['available-roles'],
		queryFn: fetchAvailableRoles,
		retry: 1,
		staleTime: 5 * 60 * 1000,
	});

	const requestMutation = useMutation<
		unknown,
		Error,
		{ role_id: string; justification: string; duration: string }
	>({
		mutationFn: requestActivation,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['role-activations', userId] });
			toast.success(t('roleActivations.requestSuccess'));
			setShowForm(false);
			setForm({ role_id: '', justification: '', duration: '1h' });
		},
		onError: (err) => {
			toast.error(extractApiError(err, t('roleActivations.requestError')).message);
		},
	});

	const cancelMutation = useMutation<unknown, Error, string>({
		mutationFn: cancelActivation,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['role-activations', userId] });
			toast.success(t('roleActivations.cancelSuccess'));
		},
		onError: (err) => {
			toast.error(extractApiError(err, t('roleActivations.cancelError')).message);
		},
	});

	const [showForm, setShowForm] = useState(false);
	const [form, setForm] = useState({ role_id: '', justification: '', duration: '1h' });

	const durationOptions = [
		{ value: '15m', label: t('roleActivations.duration15m') },
		{ value: '30m', label: t('roleActivations.duration30m') },
		{ value: '1h', label: t('roleActivations.duration1h') },
		{ value: '4h', label: t('roleActivations.duration4h') },
		{ value: '8h', label: t('roleActivations.duration8h') },
		{ value: '12h', label: t('roleActivations.duration12h') },
		{ value: '24h', label: t('roleActivations.duration24h') },
	];

	const getStatusBadge = (status: string) => {
		const map: Record<string, { color: string; icon: typeof Clock; label: string }> = {
			active: {
				color: 'bg-emerald-50 text-emerald-700',
				icon: CheckCircle2,
				label: t('roleActivations.statusActive'),
			},
			pending: {
				color: 'bg-amber-50 text-amber-700',
				icon: Clock,
				label: t('roleActivations.statusPending'),
			},
			expired: {
				color: 'bg-neutral-100 text-neutral-500',
				icon: XCircle,
				label: t('roleActivations.statusExpired'),
			},
			revoked: {
				color: 'bg-rose-50 text-rose-700',
				icon: XCircle,
				label: t('roleActivations.statusRevoked'),
			},
		};
		const meta = map[status] || {
			color: 'bg-neutral-100 text-neutral-500',
			icon: AlertCircle,
			label: status,
		};
		const Icon = meta.icon;
		return (
			<span
				className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.color}`}
			>
				<Icon size={12} />
				{meta.label}
			</span>
		);
	};

	const getRoleName = (roleId: string) => {
		const role = roles?.find((r) => r.id === roleId);
		return role?.name || role?.code || roleId;
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.role_id || !form.justification) {
			toast.error(t('roleActivations.fillAll'));
			return;
		}
		requestMutation.mutate(form);
	};

	const isExpired = (expireAt: string) => new Date(expireAt) < new Date();

	if (isLoading) return <LoadingScreen message={t('roleActivations.loading')} />;
	if (error) return <ErrorState message={t('roleActivations.error')} className="min-h-[40vh]" />;

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-xl font-bold text-neutral-900">{t('roleActivations.title')}</h2>
					<p className="mt-1 text-sm text-neutral-500">{t('roleActivations.subtitle')}</p>
				</div>
				<button
					onClick={() => setShowForm(!showForm)}
					className="flex items-center gap-1.5 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
				>
					<Plus size={16} />
					{t('roleActivations.requestButton')}
				</button>
			</div>

			{/* Request Form */}
			{showForm && (
				<div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-semibold text-neutral-900">
							{t('roleActivations.requestTitle')}
						</h3>
						<button
							onClick={() => setShowForm(false)}
							className="text-neutral-400 hover:text-neutral-600"
						>
							<X size={20} />
						</button>
					</div>

					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-neutral-700">
								{t('roleActivations.selectRole')}
							</label>
							<select
								value={form.role_id}
								onChange={(e) => setForm({ ...form, role_id: e.target.value })}
								className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
							>
								<option value="">{t('roleActivations.selectRolePlaceholder')}</option>
								{roles?.map((role) => (
									<option key={role.id} value={role.id}>
										{role.name || role.code} {role.description ? `(${role.description})` : ''}
									</option>
								))}
							</select>
						</div>

						<div>
							<label className="block text-sm font-medium text-neutral-700">
								{t('roleActivations.duration')}
							</label>
							<select
								value={form.duration}
								onChange={(e) => setForm({ ...form, duration: e.target.value })}
								className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
							>
								{durationOptions.map((opt) => (
									<option key={opt.value} value={opt.value}>
										{opt.label}
									</option>
								))}
							</select>
						</div>

						<div>
							<label className="block text-sm font-medium text-neutral-700">
								{t('roleActivations.justification')}
							</label>
							<textarea
								value={form.justification}
								onChange={(e) => setForm({ ...form, justification: e.target.value })}
								rows={3}
								placeholder={t('roleActivations.justificationPlaceholder')}
								className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
							/>
						</div>

						<div className="flex justify-end gap-2">
							<button
								type="button"
								onClick={() => setShowForm(false)}
								className="rounded-md border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
							>
								{t('common.cancel')}
							</button>
							<button
								type="submit"
								disabled={requestMutation.isPending}
								className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
							>
								{requestMutation.isPending ? (
									<span className="flex items-center gap-1">
										<Loader2 size={14} className="animate-spin" />
										{t('roleActivations.submitting')}
									</span>
								) : (
									t('roleActivations.submit')
								)}
							</button>
						</div>
					</form>
				</div>
			)}

			{/* Info banner */}
			<div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
				<div className="flex items-start gap-3">
					<AlertCircle size={20} className="text-blue-600 shrink-0 mt-0.5" />
					<div>
						<p className="text-sm font-medium text-blue-800">{t('roleActivations.infoTitle')}</p>
						<p className="mt-1 text-sm text-blue-700">{t('roleActivations.infoDesc')}</p>
					</div>
				</div>
			</div>

			{/* Activations List */}
			<div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
				{activations && activations.length > 0 ? (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead className="border-b border-neutral-200 bg-neutral-50">
								<tr>
									<th className="whitespace-nowrap px-4 py-3 text-left font-medium text-neutral-600">
										{t('roleActivations.role')}
									</th>
									<th className="whitespace-nowrap px-4 py-3 text-left font-medium text-neutral-600">
										{t('roleActivations.status')}
									</th>
									<th className="whitespace-nowrap px-4 py-3 text-left font-medium text-neutral-600">
										{t('roleActivations.justificationCol')}
									</th>
									<th className="whitespace-nowrap px-4 py-3 text-left font-medium text-neutral-600">
										{t('roleActivations.expireAt')}
									</th>
									<th className="whitespace-nowrap px-4 py-3 text-left font-medium text-neutral-600">
										{t('roleActivations.createdAt')}
									</th>
									<th className="whitespace-nowrap px-4 py-3 text-right font-medium text-neutral-600">
										{t('roleActivations.actions')}
									</th>
								</tr>
							</thead>
							<tbody>
								{activations.map((item) => (
									<tr
										key={item.id}
										className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
									>
										<td className="px-4 py-3 text-neutral-900 font-medium">
											{getRoleName(item.roleId)}
										</td>
										<td className="px-4 py-3">{getStatusBadge(item.status)}</td>
										<td
											className="px-4 py-3 text-neutral-600 max-w-[200px] truncate"
											title={item.justification}
										>
											{item.justification}
										</td>
										<td className="px-4 py-3 text-neutral-600 whitespace-nowrap">
											{formatTime(item.expireAt)}
											{item.status === 'active' && isExpired(item.expireAt) && (
												<span className="ml-2 text-xs text-rose-500">
													{t('roleActivations.expired')}
												</span>
											)}
										</td>
										<td className="px-4 py-3 text-neutral-500 text-xs">
											{formatTime(item.createdAt)}
										</td>
										<td className="px-4 py-3 text-right">
											{(item.status === 'active' || item.status === 'pending') && (
												<button
													onClick={() => {
														if (confirm(t('roleActivations.cancelConfirm')))
															cancelMutation.mutate(item.id);
													}}
													disabled={cancelMutation.isPending}
													className="text-sm text-danger hover:underline disabled:opacity-50"
												>
													{t('roleActivations.cancel')}
												</button>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<ShieldCheck size={40} className="text-neutral-300" />
						<p className="mt-4 text-sm text-neutral-500">{t('roleActivations.empty')}</p>
						<button
							onClick={() => setShowForm(true)}
							className="mt-3 flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:text-primary-800"
						>
							<Plus size={14} />
							{t('roleActivations.requestFirst')}
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
