'use client';
import { ROUTES } from '@/lib/routes';
import { buildNavHref } from '@/lib/nav';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import {
	Lock,
	KeyRound,
	Smartphone,
	Fingerprint,
	ShieldCheck,
	ChevronRight,
	Eye,
	EyeOff,
	X,
	Copy,
	Check,
	Loader2,
	ExternalLink,
	Unlink,
	AlertTriangle,
} from 'lucide-react';
import { Link } from 'react-router';
import { useToast } from '@/hooks/use-toast';
import {
	useAuthStore,
	useAuth,
	extractApiError,
	logout,
	AUTH_PAGES_URL,
	API_BASE_URL,
	processPasswordForTransmission,
	useTenantSlug,
} from '@autional-cn/shared';
import { PublicAuthConfigByAuthConfig } from '@autional-cn/shared/generated/api';
import {
	useMFAStatus,
	usePasskeys,
	useChangePassword,
	useDeletePasskey,
	useEnableTOTP,
	useVerifyTOTP,
	useDisableTOTP,
	useGenerateBackupCodes,
	useOAuthConnections,
	useUnbindOAuth,
} from '@/hooks/queries';
import type { OAuthConnectionItem } from '@/hooks/queries';
import { LoadingScreen } from '@autional-cn/ui';
import { ErrorState } from '@autional-cn/ui';

const passwordSchema = z
	.object({
		oldPassword: z.string().min(1, { message: 'oldPasswordRequired' }),
		newPassword: z.string().min(6, { message: 'newPasswordRequired' }),
		confirmPassword: z.string().min(1, { message: 'confirmRequired' }),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: 'passwordMismatch',
		path: ['confirmPassword'],
	});

type PasswordForm = z.infer<typeof passwordSchema>;

export default function SecurityPage() {
	const tenantSlug = useTenantSlug();

	const { t } = useTranslation();
	const toast = useToast();
	const { user } = useAuth();
	const userId = user?.id || '';

	const { data: mfaStatus, isLoading: mfaLoading, error: mfaError } = useMFAStatus();
	const { data: passkeys, isLoading: pkLoading, error: pkError } = usePasskeys();
	const changePwdMutation = useChangePassword();
	const deletePkMutation = useDeletePasskey();
	const enableTotpMutation = useEnableTOTP();
	const verifyTotpMutation = useVerifyTOTP();
	const disableTotpMutation = useDisableTOTP();
	const backupCodesMutation = useGenerateBackupCodes();
	const {
		data: oauthConnections,
		isLoading: oauthLoading,
		error: oauthError,
	} = useOAuthConnections();
	const unbindMutation = useUnbindOAuth();

	const [availableOAuthProviders, setAvailableOAuthProviders] = useState<
		Array<{ id: string; name: string }>
	>([]);

	useEffect(() => {
		const tenantId = useAuthStore.getState().currentTenantId;
		if (!tenantId) return;
		import('@autional-cn/shared/generated/api').then(({ PublicAuthConfigByAuthConfig }) => {
			PublicAuthConfigByAuthConfig(tenantId)
				.then((res: any) => {
					const providers = res?.oauth_providers || (res?.data && res.data.oauth_providers);
					if (providers && providers.length > 0) {
						setAvailableOAuthProviders(providers);
					} else {
						setAvailableOAuthProviders([
							{ id: 'google', name: 'Google' },
							{ id: 'github', name: 'GitHub' },
						]);
					}
				})
				.catch(() => {
					setAvailableOAuthProviders([
						{ id: 'google', name: 'Google' },
						{ id: 'github', name: 'GitHub' },
					]);
				});
		});
	}, []);

	function getBindProviderMeta(providerId: string) {
		const map: Record<string, { icon: string; iconStyle: string }> = {
			google: { icon: 'G', iconStyle: 'bg-red-50 text-red-700 text-xl' },
			github: { icon: '⌂', iconStyle: 'bg-neutral-800 text-white text-xl' },
			wechat: { icon: '💬', iconStyle: 'bg-emerald-50 text-emerald-700 text-lg' },
			weibo: { icon: '🔴', iconStyle: 'bg-rose-50 text-rose-700 text-lg' },
			apple: { icon: '🍎', iconStyle: 'bg-neutral-100 text-neutral-800 text-lg' },
			facebook: { icon: '📘', iconStyle: 'bg-blue-50 text-blue-700 text-lg' },
			microsoft: { icon: '🪟', iconStyle: 'bg-blue-50 text-blue-700 text-lg' },
			linkedin: { icon: '💼', iconStyle: 'bg-blue-50 text-blue-700 text-lg' },
		};
		return map[providerId] || { icon: '🔗', iconStyle: 'bg-neutral-100 text-neutral-500 text-lg' };
	}

	const handleBindProvider = async (provider: string) => {
		// No bind/redirect endpoint exists — use direct OAuth login with bind flag
		window.open(`${API_BASE_URL}/bff/oauth/api/v1/oauth/login/${provider}?bind=true`, '_self');
	};

	// Password form
	const [showPasswordForm, setShowPasswordForm] = useState(false);
	const [showOld, setShowOld] = useState(false);
	const [showNew, setShowNew] = useState(false);

	const passwordForm = useForm<PasswordForm>({
		resolver: zodResolver(passwordSchema),
		defaultValues: { oldPassword: '', newPassword: '', confirmPassword: '' },
	});
	const { errors: pwdErrors, isSubmitting: pwdSubmitting } = passwordForm.formState;

	function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
		if (!pwd) return { score: 0, label: '', color: 'bg-neutral-200' };
		let score = 0;
		if (pwd.length >= 8) score++;
		if (pwd.length >= 12) score++;
		if (/[A-Z]/.test(pwd)) score++;
		if (/[a-z]/.test(pwd)) score++;
		if (/\d/.test(pwd)) score++;
		if (/[^a-zA-Z0-9]/.test(pwd)) score++;
		const labels = ['', 'weak', 'fair', 'good', 'strong', 'very-strong'];
		const colors = [
			'',
			'bg-red-500',
			'bg-orange-500',
			'bg-yellow-500',
			'bg-green-500',
			'bg-emerald-500',
		];
		const idx = Math.min(score, 5);
		return { score: idx, label: t(`security.passwordStrength.${labels[idx]}`), color: colors[idx] };
	}

	const pwd = passwordForm.watch('newPassword');
	const strength = getPasswordStrength(pwd);

	// TOTP setup modal
	const [totpModalOpen, setTotpModalOpen] = useState(false);
	const [totpStep, setTotpStep] = useState<1 | 2 | 3>(1);
	const [totpSetup, setTotpSetup] = useState<{
		secret: string;
		qrCodeUrl?: string;
		provisioningUri?: string;
	} | null>(null);
	const [totpCode, setTotpCode] = useState('');
	const [backupCodes, setBackupCodes] = useState<string[]>([]);
	const [copied, setCopied] = useState(false);

	// TOTP disable modal
	const [disableModalOpen, setDisableModalOpen] = useState(false);
	const [disableCode, setDisableCode] = useState('');
	const [disableMethod, setDisableMethod] = useState<'totp' | 'sms' | 'email' | null>(null);

	const handleMfaSetup = () => {
		window.location.href = `${AUTH_PAGES_URL}/mfa-setup`;
	};

	// Account deletion
	const [deleteModalOpen, setDeleteModalOpen] = useState(false);
	const [deleteConfirmText, setDeleteConfirmText] = useState('');
	const [deleteLoading, setDeleteLoading] = useState(false);
	// OAuth bind modal
	const [bindModalOpen, setBindModalOpen] = useState(false);
	const [bindLoading] = useState(false);

	// Account deletion
	const [deleteError, setDeleteError] = useState('');

	const handleDeleteAccount = async () => {
		setDeleteError('');
		setDeleteLoading(true);
		try {
			const tenantId = useAuthStore.getState().currentTenantId || '';
			// 2026-08-17 安全修复：禁止静默回退 plain，契约错误必须抛错暴露
			const authConfig = await PublicAuthConfigByAuthConfig(tenantId);
			const mode = authConfig?.passwordPolicy?.passwordTransmission;
			if (mode === undefined || mode === '' || mode === null) {
				throw new Error(
					'password transmission mode is missing from tenant auth-config (contract error)',
				);
			}
			const result = await processPasswordForTransmission(
				deleteConfirmText,
				mode,
				tenantId,
				undefined,
			);
			const { authMeDeleteAccountPost } = await import('@autional-cn/shared/generated/api');
			await (authMeDeleteAccountPost as any)({
				password: result.password,
				password_transmission: result.passwordTransmission,
			});
			logout(`${AUTH_PAGES_URL}/login?account_deleted=true`);
		} catch (err: any) {
			setDeleteError(extractApiError(err, '账户删除失败，请稍后重试').message);
			setDeleteModalOpen(false);
		} finally {
			setDeleteLoading(false);
		}
	};

	const handleChangePassword = async (data: PasswordForm) => {
		try {
			const tenantId = useAuthStore.getState().currentTenantId || '';
			// 2026-08-17 安全修复：禁止静默回退 plain，契约错误必须抛错暴露
			const authConfig = await PublicAuthConfigByAuthConfig(tenantId);
			const mode = authConfig?.passwordPolicy?.passwordTransmission;
			if (mode === undefined || mode === '' || mode === null) {
				throw new Error(
					'password transmission mode is missing from tenant auth-config (contract error)',
				);
			}
			const result = await processPasswordForTransmission(
				data.newPassword,
				mode,
				tenantId,
				undefined,
			);
			await changePwdMutation.mutateAsync({
				oldPassword: data.oldPassword,
				newPassword: result.password,
				password_transmission: result.passwordTransmission,
			} as any);
			toast.success(t('security.changeSuccess'));
			setShowPasswordForm(false);
			passwordForm.reset();
		} catch (err: any) {
			toast.error(extractApiError(err, t('security.changeError')).message);
		}
	};

	const handleDeletePasskey = async (id: string) => {
		if (!confirm(t('security.passkeyDeleteConfirm'))) return;
		try {
			await deletePkMutation.mutateAsync(id);
			toast.success(t('security.passkeyDeleteSuccess'));
		} catch (err: any) {
			toast.error(extractApiError(err, t('security.passkeyDeleteError')).message);
		}
	};

	const startTOTPSetup = async () => {
		try {
			const data = await enableTotpMutation.mutateAsync();
			setTotpSetup(data);
			setTotpStep(1);
			setTotpModalOpen(true);
		} catch (err: any) {
			toast.error(extractApiError(err, t('security.totpEnableError')).message);
		}
	};

	const verifyTOTPCode = async () => {
		if (!totpCode || totpCode.length < 6) {
			toast.error(t('security.totpEnterCode'));
			return;
		}
		try {
			await verifyTotpMutation.mutateAsync(totpCode);
			toast.success(t('security.verifySuccess'));
			try {
				const bc = await backupCodesMutation.mutateAsync();
				setBackupCodes(bc.codes || []);
			} catch {
				setBackupCodes([]);
			}
			setTotpStep(3);
		} catch (err: any) {
			toast.error(extractApiError(err, t('security.totpVerifyError')).message);
		}
	};

	const closeTOTPModal = () => {
		setTotpModalOpen(false);
		setTotpStep(1);
		setTotpSetup(null);
		setTotpCode('');
		setBackupCodes([]);
		setCopied(false);
	};

	const startDisable = (method: 'totp' | 'sms' | 'email') => {
		setDisableMethod(method);
		setDisableCode('');
		setDisableModalOpen(true);
	};

	const confirmDisable = async () => {
		if (!disableCode || disableCode.length < 6) {
			toast.error(t('security.totpEnterCode'));
			return;
		}
		if (disableMethod === 'totp') {
			try {
				await disableTotpMutation.mutateAsync(disableCode);
				toast.success(t('security.disableSuccess'));
				setDisableModalOpen(false);
			} catch (err: any) {
				toast.error(extractApiError(err, t('security.disableError')).message);
			}
		} else {
			toast.info(t('security.comingSoon'));
		}
	};

	const copySecret = () => {
		if (totpSetup?.secret) {
			navigator.clipboard.writeText(totpSetup.secret);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
			toast.success(t('security.totpCopySecret'));
		}
	};

	const copyBackupCodes = () => {
		navigator.clipboard.writeText(backupCodes.join('\n'));
		toast.success(t('security.totpCopyBackupSuccess'));
	};

	const handleUnbind = async (connection: OAuthConnectionItem) => {
		if (!confirm(t('security.oauth.unbindConfirm'))) return;
		try {
			await unbindMutation.mutateAsync(connection.id!);
			toast.success(t('security.oauth.unbindSuccess'));
		} catch (err: any) {
			toast.error(extractApiError(err, t('security.oauth.unbindError')).message);
		}
	};

	const getProviderMeta = (providerId?: string): { name: string; icon: string; color: string } => {
		const map: Record<string, { name: string; icon: string; color: string }> = {
			github: { name: 'GitHub', icon: '🐙', color: 'bg-neutral-100 text-neutral-800' },
			google: { name: 'Google', icon: '🔵', color: 'bg-blue-50 text-blue-700' },
			wechat: { name: 'WeChat', icon: '💬', color: 'bg-emerald-50 text-emerald-700' },
			weibo: { name: 'Weibo', icon: '🔴', color: 'bg-rose-50 text-rose-700' },
			apple: { name: 'Apple', icon: '🍎', color: 'bg-neutral-100 text-neutral-800' },
			facebook: { name: 'Facebook', icon: '📘', color: 'bg-blue-50 text-blue-700' },
			twitter: { name: 'X (Twitter)', icon: '🐦', color: 'bg-neutral-100 text-neutral-800' },
			microsoft: { name: 'Microsoft', icon: '🪟', color: 'bg-blue-50 text-blue-700' },
			linkedin: { name: 'LinkedIn', icon: '💼', color: 'bg-blue-50 text-blue-700' },
		};
		return (
			map[providerId || ''] || {
				name: providerId || t('common.unknown'),
				icon: '🔗',
				color: 'bg-neutral-100 text-neutral-500',
			}
		);
	};

	const hasTotp = mfaStatus?.methods?.includes('totp') ?? false;
	const hasSms = mfaStatus?.methods?.includes('sms') ?? false;
	const hasEmail = mfaStatus?.methods?.includes('email') ?? false;
	const hasPasskey = mfaStatus?.methods?.includes('passkey') ?? false;

	const SecurityCard = ({
		icon: Icon,
		title,
		desc,
		status,
		statusText,
		action,
		onClick,
		loading,
	}: {
		icon: typeof Lock;
		title: string;
		desc: string;
		status: 'enabled' | 'disabled' | 'neutral';
		statusText: string;
		action: string;
		onClick?: () => void;
		loading?: boolean;
	}) => {
		const statusColors = {
			enabled: 'bg-emerald-50 text-emerald-700',
			disabled: 'bg-neutral-100 text-neutral-500',
			neutral: 'bg-blue-50 text-blue-700',
		};

		return (
			<div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 shadow-sm">
				<div className="flex items-start gap-4">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-700">
						<Icon size={20} />
					</div>
					<div className="flex-1 min-w-0">
						<div className="flex items-center justify-between">
							<h3 className="font-semibold text-[var(--color-text-primary)]">{title}</h3>
							<span
								className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[status]}`}
							>
								{loading ? t('security.processing') : statusText}
							</span>
						</div>
						<p className="mt-1 text-sm text-[var(--color-text-secondary)]">{desc}</p>
						{onClick && !loading && (
							<button
								onClick={onClick}
								className="mt-3 flex items-center gap-1 text-sm font-medium text-primary-700 hover:text-primary-800 transition-colors"
							>
								{action}
								<ChevronRight size={14} />
							</button>
						)}
					</div>
				</div>
			</div>
		);
	};

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-xl font-bold text-[var(--color-text-primary)]">
					{t('security.title')}
				</h2>
				<p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t('security.subtitle')}</p>
			</div>

			{/* Quick Links to Security Sub-pages */}
			<div className="grid gap-4 sm:grid-cols-2">
				<Link
					to={buildNavHref(ROUTES.roleActivations, tenantSlug)}
					className="flex items-center gap-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all"
				>
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-700">
						<KeyRound size={20} />
					</div>
					<div className="flex-1">
						<h3 className="font-medium text-neutral-900">{t('security.roleActivationsLink')}</h3>
						<p className="text-sm text-neutral-500">{t('security.roleActivationsLinkDesc')}</p>
					</div>
					<ChevronRight size={16} className="text-neutral-400" />
				</Link>
				<Link
					to={buildNavHref(ROUTES.linkedAccounts, tenantSlug)}
					className="flex items-center gap-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all"
				>
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-700">
						<ExternalLink size={20} />
					</div>
					<div className="flex-1">
						<h3 className="font-medium text-neutral-900">{t('security.linkedAccountsLink')}</h3>
						<p className="text-sm text-neutral-500">{t('security.linkedAccountsLinkDesc')}</p>
					</div>
					<ChevronRight size={16} className="text-neutral-400" />
				</Link>
			</div>

			{/* Password section */}
			<div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6 shadow-sm">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-50 text-primary-700">
						<Lock size={20} />
					</div>
					<div className="flex-1">
						<h3 className="font-semibold text-[var(--color-text-primary)]">
							{t('security.passwordTitle')}
						</h3>
						<p className="text-sm text-[var(--color-text-secondary)]">
							{t('security.passwordDesc')}
						</p>
					</div>
					<button
						onClick={() => setShowPasswordForm(!showPasswordForm)}
						className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 py-1.5 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
					>
						{showPasswordForm ? t('security.cancel') : t('security.changePassword')}
					</button>
				</div>

				{showPasswordForm && (
					<div className="mt-4 space-y-4 border-t border-neutral-100 pt-4">
						<div>
							<label className="block text-sm font-medium text-neutral-700">
								{t('security.oldPassword')}
							</label>
							<div className="relative mt-1">
								<input
									type={showOld ? 'text' : 'password'}
									{...passwordForm.register('oldPassword')}
									className="w-full rounded-md border border-neutral-300 px-3 py-2 pr-10 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
								/>
								<button
									type="button"
									onClick={() => setShowOld(!showOld)}
									className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
								>
									{showOld ? <EyeOff size={16} /> : <Eye size={16} />}
								</button>
							</div>
							{pwdErrors.oldPassword && (
								<p className="mt-1 text-xs text-danger">
									{t(pwdErrors.oldPassword.message || 'security.oldPasswordRequired')}
								</p>
							)}
						</div>
						<div>
							<label className="block text-sm font-medium text-neutral-700">
								{t('security.newPassword')}
							</label>
							<div className="relative mt-1">
								<input
									type={showNew ? 'text' : 'password'}
									{...passwordForm.register('newPassword')}
									className="w-full rounded-md border border-neutral-300 px-3 py-2 pr-10 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
								/>
								<button
									type="button"
									onClick={() => setShowNew(!showNew)}
									className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
								>
									{showNew ? <EyeOff size={16} /> : <Eye size={16} />}
								</button>
							</div>
							{pwdErrors.newPassword && (
								<p className="mt-1 text-xs text-danger">
									{t(pwdErrors.newPassword.message || 'security.newPasswordRequired')}
								</p>
							)}
						</div>
						{pwd && (
							<div className="mt-1 space-y-1">
								<div className="flex gap-1">
									{[1, 2, 3, 4, 5].map((i) => (
										<div
											key={i}
											className={`h-1 flex-1 rounded ${i <= strength.score ? strength.color : 'bg-neutral-200'}`}
										/>
									))}
								</div>
								{strength.label && <p className="text-xs text-neutral-500">{strength.label}</p>}
							</div>
						)}
						{pwd && (
							<div className="mt-2 space-y-1 text-xs text-neutral-500">
								<p className={pwd.length >= 8 ? 'text-green-600' : ''}>
									- {t('security.passwordMinLength')}
								</p>
								<p className={/[A-Z]/.test(pwd) ? 'text-green-600' : ''}>
									- {t('security.passwordUppercase')}
								</p>
								<p className={/\d/.test(pwd) ? 'text-green-600' : ''}>
									- {t('security.passwordDigit')}
								</p>
							</div>
						)}
						<div>
							<label className="block text-sm font-medium text-neutral-700">
								{t('security.confirmPassword')}
							</label>
							<input
								type="password"
								{...passwordForm.register('confirmPassword')}
								className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
							/>
							{pwdErrors.confirmPassword && (
								<p className="mt-1 text-xs text-danger">
									{t(pwdErrors.confirmPassword.message || 'security.passwordMismatch')}
								</p>
							)}
						</div>
						<div className="flex justify-end">
							<button
								type="button"
								onClick={passwordForm.handleSubmit(handleChangePassword)}
								disabled={pwdSubmitting}
								className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors disabled:opacity-60"
							>
								{pwdSubmitting ? t('security.processing') : t('security.confirmChange')}
							</button>
						</div>
					</div>
				)}
			</div>

			{/* MFA status */}
			{mfaLoading ? (
				<LoadingScreen message={t('security.loadingStatus')} />
			) : mfaError ? (
				<ErrorState message={t('security.statusError')} />
			) : (
				<div className="grid gap-4 sm:grid-cols-2">
					<SecurityCard
						icon={Smartphone}
						title={t('security.totpTitle')}
						desc={t('security.totpDesc')}
						status={hasTotp ? 'enabled' : 'disabled'}
						statusText={hasTotp ? t('security.enabled') : t('security.disabled')}
						action={hasTotp ? t('security.disable') : t('security.enable')}
						onClick={() => (hasTotp ? startDisable('totp') : startTOTPSetup())}
					/>
					<SecurityCard
						icon={KeyRound}
						title={t('security.smsTitle')}
						desc={t('security.smsDesc')}
						status={hasSms ? 'enabled' : 'disabled'}
						statusText={hasSms ? t('security.enabled') : t('security.disabled')}
						action={hasSms ? t('security.disable') : t('security.mfaInAuthCenter')}
						onClick={() => (hasSms ? startDisable('sms') : handleMfaSetup())}
					/>
					<SecurityCard
						icon={ShieldCheck}
						title={t('security.emailTitle')}
						desc={t('security.emailDesc')}
						status={hasEmail ? 'enabled' : 'disabled'}
						statusText={hasEmail ? t('security.enabled') : t('security.disabled')}
						action={hasEmail ? t('security.disable') : t('security.mfaInAuthCenter')}
						onClick={() => (hasEmail ? startDisable('email') : handleMfaSetup())}
					/>
					<SecurityCard
						icon={Fingerprint}
						title={t('security.passkeyTitle')}
						desc={t('security.passkeyDesc')}
						status={hasPasskey ? 'enabled' : 'disabled'}
						statusText={hasPasskey ? t('security.enabled') : t('security.disabled')}
						action={t('security.enable')}
						onClick={() => window.open(`${AUTH_PAGES_URL}/passkey?mode=register`, '_blank')}
					/>
				</div>
			)}

			{/* Passkeys list */}
			<div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6 shadow-sm">
				<h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
					{t('security.passkeyListTitle')}
				</h3>
				{pkLoading ? (
					<LoadingScreen message={t('security.passkeyLoading')} />
				) : pkError ? (
					<ErrorState message={t('security.passkeyError')} />
				) : passkeys && passkeys.length > 0 ? (
					<div className="mt-4 space-y-3">
						{passkeys.map((pk) => (
							<div
								key={pk.id}
								className="flex items-center justify-between rounded-md border border-[var(--color-border)] p-3"
							>
								<div className="flex items-center gap-3">
									<Fingerprint size={18} className="text-[var(--color-text-secondary)]" />
									<div>
										<p className="text-sm font-medium text-[var(--color-text-primary)]">
											{pk.name || t('security.passkeyUnnamed')}
											{pk.authenticatorAttachment && (
												<span className="ml-2 text-xs text-[var(--color-text-secondary)]">
													(
													{pk.authenticatorAttachment === 'platform'
														? t('security.passkeyPlatform')
														: t('security.passkeyCrossPlatform')}
													)
												</span>
											)}
										</p>
										<p className="text-xs text-[var(--color-text-secondary)]">
											{t('security.passkeyRegisteredAt')} {pk.createdAt}
											{pk.backupState && (
												<span className="ml-2 text-amber-500">
													· {t('security.passkeyCloudSynced')}
												</span>
											)}
											{pk.userVerified !== undefined && !pk.userVerified && (
												<span className="ml-2 text-amber-500">
													· {t('security.passkeyNoBiometric')}
												</span>
											)}
										</p>
									</div>
								</div>
								<button
									onClick={() => handleDeletePasskey(pk.id)}
									disabled={deletePkMutation.isPending}
									className="text-sm text-danger hover:underline disabled:opacity-50"
								>
									{t('security.passkeyDelete')}
								</button>
							</div>
						))}
					</div>
				) : (
					<div className="mt-4 text-sm text-neutral-500">{t('security.passkeyEmpty')}</div>
				)}
			</div>

			{/* OAuth Connections */}
			<div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
				<div className="flex items-center justify-between mb-4">
					<div>
						<h3 className="text-lg font-semibold text-neutral-900">{t('security.oauth.title')}</h3>
						<p className="text-sm text-neutral-500">{t('security.oauth.desc')}</p>
					</div>
					<button
						onClick={() => setBindModalOpen(true)}
						className="flex items-center gap-1.5 rounded-md border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-100 transition-colors"
					>
						<ExternalLink size={14} />
						{t('security.oauth.bindNew')}
					</button>
				</div>

				{oauthLoading ? (
					<div className="flex items-center justify-center py-8 text-sm text-neutral-500">
						<Loader2 size={20} className="animate-spin mr-2" />
						{t('security.oauth.loading')}
					</div>
				) : oauthError ? (
					<div className="rounded-md bg-neutral-50 py-8 text-center text-sm text-neutral-500">
						{t('security.oauth.loadError')}
					</div>
				) : oauthConnections && oauthConnections.length > 0 ? (
					<div className="mt-4 space-y-3">
						{oauthConnections.map((conn) => {
							const meta = getProviderMeta(conn.providerId);
							const email =
								conn.profileData &&
								typeof conn.profileData === 'object' &&
								'email' in conn.profileData
									? String(conn.profileData.email)
									: '';
							return (
								<div
									key={conn.id}
									className="flex items-center justify-between rounded-md border border-neutral-200 p-3"
								>
									<div className="flex items-center gap-3">
										<span
											className={`flex h-9 w-9 items-center justify-center rounded-md text-lg ${meta.color}`}
										>
											{meta.icon}
										</span>
										<div>
											<p className="text-sm font-medium text-neutral-900">{meta.name}</p>
											<div className="flex items-center gap-3 text-xs text-neutral-500">
												{email && <span>{email}</span>}
												{conn.createdAt && (
													<span>
														{t('security.oauth.linkedAt')} {conn.createdAt}
													</span>
												)}
											</div>
										</div>
									</div>
									<button
										onClick={() => handleUnbind(conn)}
										disabled={unbindMutation.isPending}
										className="flex items-center gap-1 text-sm text-danger hover:underline disabled:opacity-50"
									>
										<Unlink size={14} />
										{t('security.oauth.unbind')}
									</button>
								</div>
							);
						})}
					</div>
				) : (
					<div className="rounded-md bg-neutral-50 py-8 text-center text-sm text-neutral-500">
						{t('security.oauth.empty')}
					</div>
				)}
			</div>

			{/* OAuth Bind Modal */}
			{bindModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
					<div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-xl">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-bold text-neutral-900">{t('security.oauth.bindNew')}</h3>
							<button
								onClick={() => setBindModalOpen(false)}
								className="text-neutral-400 hover:text-neutral-600"
							>
								<X size={20} />
							</button>
						</div>
						<p className="text-sm text-neutral-600 mb-4">
							{t('security.oauth.bindPrompt', '选择要绑定的第三方账号')}
						</p>
						<div className="space-y-2">
							{availableOAuthProviders.map((p) => {
								const meta = getBindProviderMeta(p.id);
								return (
									<button
										key={p.id}
										onClick={() => handleBindProvider(p.id)}
										disabled={bindLoading}
										className="flex w-full items-center gap-3 rounded-md border border-neutral-200 p-3 text-left hover:bg-neutral-50 transition-colors disabled:opacity-50"
									>
										<span
											className={`flex h-10 w-10 items-center justify-center rounded-md ${meta.iconStyle}`}
										>
											{meta.icon}
										</span>
										<div>
											<p className="text-sm font-medium text-neutral-900">{p.name}</p>
											<p className="text-xs text-neutral-500">
												{t(`security.oauth.${p.id}Desc`, `绑定 ${p.name} 账号`)}
											</p>
										</div>
									</button>
								);
							})}
						</div>
					</div>
				</div>
			)}

			{/* Account Deletion */}
			<div className="rounded-lg border border-danger/30 bg-danger/5 p-6 shadow-sm">
				<div className="flex items-start gap-3">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-danger/10 text-danger">
						<AlertTriangle size={20} />
					</div>
					<div className="flex-1">
						<h3 className="font-semibold text-neutral-900">
							{t('security.deleteAccountTitle', '删除账户')}
						</h3>
						<p className="mt-1 text-sm text-neutral-500">
							{t(
								'security.deleteAccountDesc',
								'此操作将永久删除您的账户及所有相关数据。根据GDPR规定，您的数据将在30天内被永久删除。此操作不可撤销。',
							)}
						</p>
						<button
							onClick={() => setDeleteModalOpen(true)}
							className="mt-3 rounded-md border border-danger bg-white px-4 py-1.5 text-sm font-medium text-danger hover:bg-danger hover:text-white transition-colors"
						>
							{t('security.deleteAccountTitle', '删除账户')}
						</button>
					</div>
				</div>
			</div>

			{/* Account Deletion Confirm Modal */}
			{deleteModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
					<div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-xl">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-bold text-neutral-900">
								{t('security.deleteAccountConfirmTitle', '确认删除账户')}
							</h3>
							<button
								onClick={() => {
									setDeleteModalOpen(false);
									setDeleteConfirmText('');
									setDeleteError('');
								}}
								className="text-neutral-400 hover:text-neutral-600"
							>
								<X size={20} />
							</button>
						</div>

						<div className="rounded-md bg-red-50 p-4 text-sm text-red-700 mb-4">
							<p className="font-semibold">
								{t('security.deleteWarningTitle', '警告：此操作不可逆')}
							</p>
							<ul className="mt-2 list-inside list-disc space-y-1">
								<li>{t('security.deleteWarningItem1', '您的个人资料将被永久删除')}</li>
								<li>{t('security.deleteWarningItem2', '所有历史记录和数据将被清除')}</li>
								<li>{t('security.deleteWarningItem3', '您将无法再使用该账号登录任何服务')}</li>
								<li>
									{t('security.deleteWarningItem4', '根据GDPR规定，数据将在30天内被永久删除')}
								</li>
							</ul>
						</div>

						{deleteError && (
							<div className="rounded-md bg-red-50 p-3 text-sm text-danger mb-4">{deleteError}</div>
						)}

						<p className="text-sm text-neutral-600 mb-3">
							{t('security.deleteConfirmPrompt', '请输入 DELETE 以确认删除：')}
						</p>
						<input
							type="text"
							value={deleteConfirmText}
							onChange={(e) => setDeleteConfirmText(e.target.value)}
							placeholder="DELETE"
							className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-danger focus:outline-none focus:ring-1 focus:ring-danger"
						/>
						<div className="mt-4 flex justify-end gap-2">
							<button
								onClick={() => {
									setDeleteModalOpen(false);
									setDeleteConfirmText('');
									setDeleteError('');
								}}
								disabled={deleteLoading}
								className="rounded-md border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
							>
								{t('security.cancel', '取消')}
							</button>
							<button
								onClick={handleDeleteAccount}
								disabled={deleteConfirmText !== 'DELETE' || deleteLoading}
								className="rounded-md bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger/90 disabled:opacity-50"
							>
								{deleteLoading ? (
									<span className="flex items-center gap-1">
										<Loader2 size={14} className="animate-spin" />{' '}
										{t('security.deleting', '删除中...')}
									</span>
								) : (
									t('security.confirmDelete', '永久删除')
								)}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* TOTP Setup Modal */}
			{totpModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
					<div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-xl">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-bold text-neutral-900">
								{totpStep === 1 && t('security.totpEnableTitle')}
								{totpStep === 2 && t('security.totpEnterCode')}
								{totpStep === 3 && t('security.totpBackupTitle')}
							</h3>
							<button onClick={closeTOTPModal} className="text-neutral-400 hover:text-neutral-600">
								<X size={20} />
							</button>
						</div>

						{totpStep === 1 && totpSetup && (
							<div className="space-y-4">
								<p className="text-sm text-neutral-600">{t('security.totpScanPrompt')}</p>
								<div className="flex flex-col items-center gap-3">
									{totpSetup.qrCodeUrl ? (
										<img
											src={totpSetup.qrCodeUrl}
											alt="TOTP QR Code"
											className="h-40 w-40 rounded-md border border-neutral-200"
										/>
									) : (
										<div className="flex h-40 w-40 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 text-neutral-400">
											{t('security.totpQrFail')}
										</div>
									)}
									<div className="flex items-center gap-2 rounded-md bg-neutral-100 px-3 py-2">
										<code className="text-xs text-neutral-700">{totpSetup.secret}</code>
										<button
											onClick={copySecret}
											className="text-neutral-500 hover:text-primary-700"
										>
											{copied ? <Check size={14} /> : <Copy size={14} />}
										</button>
									</div>
								</div>
								<div>
									<label className="block text-sm font-medium text-neutral-700">
										{t('security.totpEnterCode')}
									</label>
									<input
										type="text"
										inputMode="numeric"
										maxLength={6}
										value={totpCode}
										onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
										placeholder="000000"
										className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm tracking-widest focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
									/>
								</div>
								<div className="flex justify-end gap-2">
									<button
										onClick={closeTOTPModal}
										className="rounded-md border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
									>
										{t('security.cancel')}
									</button>
									<button
										onClick={verifyTOTPCode}
										disabled={verifyTotpMutation.isPending || totpCode.length < 6}
										className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
									>
										{verifyTotpMutation.isPending ? (
											<span className="flex items-center gap-1">
												<Loader2 size={14} className="animate-spin" /> {t('security.totpVerifying')}
											</span>
										) : (
											t('security.totpVerifyAndEnable')
										)}
									</button>
								</div>
							</div>
						)}

						{totpStep === 3 && (
							<div className="space-y-4">
								<p className="text-sm text-neutral-600">{t('security.totpBackupPrompt')}</p>
								<div className="rounded-md border border-amber-200 bg-amber-50 p-4">
									<div className="grid grid-cols-2 gap-2">
										{backupCodes.map((code, idx) => (
											<code
												key={idx}
												className="rounded bg-white px-2 py-1 text-center text-sm font-mono text-neutral-800 border border-amber-100"
											>
												{code}
											</code>
										))}
									</div>
									<button
										onClick={copyBackupCodes}
										className="mt-3 flex items-center gap-1 text-sm font-medium text-amber-800 hover:text-amber-900"
									>
										<Copy size={14} /> {t('security.totpCopyBackupCodes')}
									</button>
								</div>
								<div className="flex justify-end">
									<button
										onClick={closeTOTPModal}
										className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
									>
										{t('security.totpDone')}
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Disable MFA Modal */}
			{disableModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
					<div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-xl">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-bold text-neutral-900">
								{t('security.disableTitle', {
									method:
										disableMethod === 'totp'
											? 'TOTP'
											: disableMethod === 'sms'
												? t('security.smsTitle')
												: t('security.emailTitle'),
								})}
							</h3>
							<button
								onClick={() => setDisableModalOpen(false)}
								className="text-neutral-400 hover:text-neutral-600"
							>
								<X size={20} />
							</button>
						</div>
						<p className="text-sm text-neutral-600 mb-4">
							{t('security.disablePrompt', {
								hint:
									disableMethod === 'totp'
										? t('security.disableTotpHint')
										: t('security.disableSmsHint'),
							})}
						</p>
						<input
							type="text"
							inputMode="numeric"
							maxLength={8}
							value={disableCode}
							onChange={(e) => setDisableCode(e.target.value.replace(/\s/g, ''))}
							placeholder={
								disableMethod === 'totp'
									? t('security.disablePlaceholder', { method: 'TOTP' })
									: t('security.disablePlaceholder', { method: t('security.smsTitle') })
							}
							className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
						/>
						<div className="mt-4 flex justify-end gap-2">
							<button
								onClick={() => setDisableModalOpen(false)}
								className="rounded-md border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
							>
								{t('security.disableCancel')}
							</button>
							<button
								onClick={confirmDisable}
								disabled={disableTotpMutation.isPending}
								className="rounded-md bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger/90 disabled:opacity-60"
							>
								{disableTotpMutation.isPending
									? t('security.processing')
									: t('security.disableConfirm')}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
