'use client';
import { ROUTES } from '@/lib/routes';
import { buildNavHref } from '@/lib/nav';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth, extractApiError, useTenantSlug } from '@autional-cn/shared';
import {
	useCommunicationPushTokens,
	useRegisterPushToken,
	useDeletePushToken,
} from '@/hooks/queries';
import { useToast } from '@/hooks/use-toast';
import { formatTime } from '@/lib/format';
import { LoadingScreen } from '@autional-cn/ui';
import { ErrorState } from '@autional-cn/ui';
import { Link } from 'react-router';
import { Smartphone, Monitor, Globe, Laptop, Plus, Trash2, ChevronLeft } from 'lucide-react';

const platformMeta: Record<string, { icon: typeof Smartphone; labelKey: string; color: string }> = {
	ios: { icon: Smartphone, labelKey: 'communication.platform.ios', color: 'text-neutral-700' },
	android: {
		icon: Smartphone,
		labelKey: 'communication.platform.android',
		color: 'text-green-700',
	},
	web: { icon: Globe, labelKey: 'communication.platform.web', color: 'text-blue-700' },
	desktop: { icon: Monitor, labelKey: 'communication.platform.desktop', color: 'text-purple-700' },
};

export default function PushTokensPage() {
	const tenantSlug = useTenantSlug();

	const { t } = useTranslation();
	const toast = useToast();
	const { user } = useAuth();
	const userId = user?.id || '';

	const { data, isLoading, error } = useCommunicationPushTokens();
	const registerMutation = useRegisterPushToken();
	const deleteMutation = useDeletePushToken();

	const [showForm, setShowForm] = useState(false);
	const [newToken, setNewToken] = useState('');
	const [newPlatform, setNewPlatform] = useState('web');
	const [newDeviceId, setNewDeviceId] = useState('');

	const list = (data as any)?.items || [];

	const handleRegister = async () => {
		if (!newToken.trim()) {
			toast.warning(t('communication.pushTokens.tokenRequired', 'Push token is required'));
			return;
		}
		try {
			await registerMutation.mutateAsync({
				token: newToken.trim(),
				platform: newPlatform,
				deviceId: newDeviceId.trim() || undefined,
				userId,
			});
			toast.success(t('communication.pushTokens.registered', 'Push token registered'));
			setNewToken('');
			setNewDeviceId('');
			setShowForm(false);
		} catch (err: any) {
			toast.error(extractApiError(err, t('common.error')).message);
		}
	};

	const handleDelete = async (id: string) => {
		try {
			await deleteMutation.mutateAsync(id);
			toast.success(t('communication.pushTokens.deleted', 'Push token deleted'));
		} catch (err: any) {
			toast.error(extractApiError(err, t('common.error')).message);
		}
	};

	if (isLoading) return <LoadingScreen message={t('communication.pushTokens.loading')} />;
	if (error)
		return <ErrorState message={t('communication.pushTokens.error')} className="min-h-[40vh]" />;

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link
						to={buildNavHref(ROUTES.communication, tenantSlug)}
						className="flex items-center gap-1 rounded-md border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
					>
						<ChevronLeft size={14} />
						{t('communication.backToHistory', 'History')}
					</Link>
					<div>
						<h2 className="text-xl font-bold text-neutral-900">
							{t('communication.pushTokens.title', 'Push Tokens')}
						</h2>
						<p className="mt-1 text-sm text-neutral-600">
							{t(
								'communication.pushTokens.description',
								'Manage your device push notification tokens',
							)}
						</p>
					</div>
				</div>
				<button
					onClick={() => setShowForm(!showForm)}
					className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
				>
					<Plus size={16} />
					{showForm
						? t('common.cancel', 'Cancel')
						: t('communication.pushTokens.register', 'Register Token')}
				</button>
			</div>

			{showForm && (
				<div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm max-w-lg">
					<h3 className="text-base font-semibold text-neutral-900">
						{t('communication.pushTokens.registerTitle', 'Register New Push Token')}
					</h3>
					<div className="mt-4 space-y-4">
						<div>
							<label className="block text-sm font-medium text-neutral-700">
								{t('communication.pushTokens.token', 'Token')}
							</label>
							<input
								type="text"
								value={newToken}
								onChange={(e) => setNewToken(e.target.value)}
								placeholder={t(
									'communication.pushTokens.tokenPlaceholder',
									'Paste your device push token...',
								)}
								className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-neutral-700">
								{t('communication.pushTokens.platform', 'Platform')}
							</label>
							<select
								value={newPlatform}
								onChange={(e) => setNewPlatform(e.target.value)}
								className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
							>
								<option value="web">Web</option>
								<option value="ios">iOS</option>
								<option value="android">Android</option>
								<option value="desktop">{t('communication.platform.desktop', 'Desktop')}</option>
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-neutral-700">
								{t('communication.pushTokens.deviceId', 'Device ID')}
							</label>
							<input
								type="text"
								value={newDeviceId}
								onChange={(e) => setNewDeviceId(e.target.value)}
								placeholder={t(
									'communication.pushTokens.deviceIdPlaceholder',
									'Optional device identifier...',
								)}
								className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
							/>
						</div>
						<button
							onClick={handleRegister}
							disabled={registerMutation.isPending}
							className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
						>
							{registerMutation.isPending ? (
								<>
									<div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
									{t('communication.pushTokens.registering', 'Registering...')}
								</>
							) : (
								<>
									<Plus size={16} />
									{t('communication.pushTokens.register', 'Register Token')}
								</>
							)}
						</button>
					</div>
				</div>
			)}

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{list.map((token: any) => {
					const meta = platformMeta[token.platform] || platformMeta.web;
					const Icon = meta.icon;
					return (
						<div
							key={token.id}
							className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
						>
							<div className="flex items-start justify-between">
								<div className="flex items-center gap-3">
									<div
										className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-neutral-100 ${meta.color}`}
									>
										<Icon size={20} />
									</div>
									<div>
										<p className="text-sm font-semibold text-neutral-900">{t(meta.labelKey)}</p>
										{token.deviceId && (
											<p className="text-xs text-neutral-500 mt-0.5">{token.deviceId}</p>
										)}
									</div>
								</div>
								<button
									onClick={() => handleDelete(token.id)}
									disabled={deleteMutation.isPending}
									className="rounded-md p-1.5 text-neutral-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
									title={t('communication.pushTokens.delete', 'Delete')}
								>
									<Trash2 size={16} />
								</button>
							</div>

							<div className="mt-3 pt-3 border-t border-neutral-100 space-y-1">
								<div className="flex items-center gap-2">
									<span
										className={`inline-block h-2 w-2 rounded-full ${token.isActive ? 'bg-green-500' : 'bg-neutral-300'}`}
									/>
									<span className="text-xs text-neutral-600">
										{token.isActive
											? t('communication.pushTokens.active', 'Active')
											: t('communication.pushTokens.inactive', 'Inactive')}
									</span>
								</div>
								<p className="text-xs text-neutral-500 font-mono truncate" title={token.token}>
									{token.token
										? token.token.length > 30
											? token.token.slice(0, 15) + '...' + token.token.slice(-10)
											: token.token
										: '--'}
								</p>
								<p className="text-xs text-neutral-500">{formatTime(token.createdAt)}</p>
							</div>
						</div>
					);
				})}
				{list.length === 0 && (
					<div className="col-span-full flex flex-col items-center justify-center rounded-lg border border-neutral-200 bg-white py-16 text-center">
						<Laptop size={40} className="text-neutral-300" />
						<p className="mt-4 text-sm text-neutral-600">
							{t('communication.pushTokens.empty', 'No push tokens registered')}
						</p>
						<button
							onClick={() => setShowForm(true)}
							className="mt-3 text-sm font-medium text-primary-700 hover:text-primary-800"
						>
							{t('communication.pushTokens.registerFirst', 'Register your first token')}
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
