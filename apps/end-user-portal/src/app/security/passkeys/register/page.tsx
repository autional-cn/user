'use client';
import { ROUTES } from '@/lib/routes';
import { buildNavHref } from '@/lib/nav';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Fingerprint, Loader2, AlertTriangle, CheckCircle2, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router';
import { useToast } from '@/hooks/use-toast';
import {
	useAuthStore,
	useAuth,
	extractApiError,
	processPasswordForTransmission,
	useTenantSlug,
} from '@autional-cn/shared';
import {
	authWebauthnRegisterBeginPost,
	authWebauthnRegisterCompletePost,
	PublicAuthConfigByAuthConfig,
} from '@autional-cn/shared/generated/api';
import { Button } from '@autional-cn/ui';

export default function PasskeyRegisterPage() {
	const tenantSlug = useTenantSlug();

	const { t } = useTranslation();
	const toast = useToast();
	const navigate = useNavigate();

	const { user } = useAuth();
	const [step, setStep] = useState<'idle' | 'password' | 'loading' | 'error' | 'success'>('idle');
	const [errorMsg, setErrorMsg] = useState('');
	const [password, setPassword] = useState('');
	const [passwordError, setPasswordError] = useState('');

	const handleRegister = async () => {
		if (!window.PublicKeyCredential) {
			setErrorMsg(t('security.passkeys.register.unsupported'));
			setStep('error');
			return;
		}
		setStep('password');
	};

	const beginRegistration = async () => {
		if (!password) {
			setPasswordError(t('security.passkeys.register.passwordRequired'));
			return;
		}
		setStep('loading');
		setErrorMsg('');

		const userName = user?.username || '';

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
			const result = await processPasswordForTransmission(password, mode, tenantId, undefined);
			const beginRes = await authWebauthnRegisterBeginPost({
				user_name: userName,
				display_name: userName,
				password: result.password,
				password_transmission: result.passwordTransmission,
			} as any);
			const options = beginRes as PublicKeyCredentialCreationOptions;

			if (!options || !options.challenge) {
				throw new Error('Server returned invalid WebAuthn registration options');
			}

			options.challenge = base64ToArrayBuffer(options.challenge as unknown as string);
			if (options.user?.id) {
				(options.user as unknown as Record<string, unknown>).id = base64ToArrayBuffer(
					options.user.id as unknown as string,
				);
			}

			const credential = (await navigator.credentials.create({
				publicKey: options,
			})) as PublicKeyCredential;

			if (!credential) {
				throw new Error('Failed to create credential');
			}

			const completeRes = await authWebauthnRegisterCompletePost({
				credential: {
					id: credential.id,
					raw_id: arrayBufferToBase64(credential.rawId),
					type: credential.type,
					response: {
						attestation_object: arrayBufferToBase64(
							(credential.response as AuthenticatorAttestationResponse).attestationObject,
						),
						client_data_json: arrayBufferToBase64(
							(credential.response as AuthenticatorAttestationResponse).clientDataJSON,
						),
					},
				},
			} as any);

			if (completeRes) {
				setStep('success');
				setPassword('');
				toast.success(t('security.passkeys.register.success'));
				setTimeout(() => navigate(buildNavHref(ROUTES.security, tenantSlug)), 2000);
			} else {
				throw new Error('Registration failed');
			}
		} catch (err: any) {
			const errorName = err?.name || 'Error';
			const errorMessages: Record<string, string> = {
				NotAllowedError: t('security.passkeys.register.errorCancelled'),
				InvalidStateError: t('security.passkeys.register.errorAlreadyExists'),
				ConstraintError: t('security.passkeys.register.errorConstraint'),
				AbortError: t('security.passkeys.register.errorTimeout'),
				NotSupportedError: t('security.passkeys.register.unsupported'),
			};
			const msg =
				errorMessages[errorName] ||
				extractApiError(err, t('security.passkeys.register.error')).message;
			setErrorMsg(msg);
			setStep('error');
			toast.error(msg);
		}
	};

	return (
		<div className="max-w-lg mx-auto space-y-6">
			<div className="flex items-center gap-3">
				<Link
					to={buildNavHref(ROUTES.security, tenantSlug)}
					className="text-neutral-600 hover:text-neutral-600 transition-colors"
				>
					<ChevronLeft size={20} />
				</Link>
				<div>
					<h2 className="text-xl font-bold text-neutral-900">
						{t('security.passkeys.register.title')}
					</h2>
					<p className="mt-1 text-sm text-neutral-600">
						{t('security.passkeys.register.subtitle')}
					</p>
				</div>
			</div>

			{step === 'idle' && (
				<div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm text-center">
					<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-primary-700">
						<Fingerprint size={32} />
					</div>
					<h3 className="mt-4 text-lg font-semibold text-neutral-900">
						{t('security.passkeys.register.ready')}
					</h3>
					<p className="mt-2 text-sm text-neutral-600">{t('security.passkeys.register.desc')}</p>
					<ul className="mt-4 space-y-2 text-left text-sm text-neutral-600">
						<li className="flex items-start gap-2">
							<CheckCircle2 size={16} className="mt-0.5 text-success shrink-0" />
							{t('security.passkeys.register.benefit1')}
						</li>
						<li className="flex items-start gap-2">
							<CheckCircle2 size={16} className="mt-0.5 text-success shrink-0" />
							{t('security.passkeys.register.benefit2')}
						</li>
						<li className="flex items-start gap-2">
							<CheckCircle2 size={16} className="mt-0.5 text-success shrink-0" />
							{t('security.passkeys.register.benefit3')}
						</li>
					</ul>
					<div className="mt-6">
						<Button onClick={handleRegister} variant="primary" className="gap-2">
							<Fingerprint size={16} />
							{t('security.passkeys.register.start')}
						</Button>
					</div>
				</div>
			)}

			{step === 'password' && (
				<div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
					<h3 className="text-lg font-semibold text-neutral-900">
						{t('security.passkeys.register.passwordTitle')}
					</h3>
					<p className="mt-1 text-sm text-neutral-600">
						{t('security.passkeys.register.passwordDesc')}
					</p>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							beginRegistration();
						}}
						className="mt-4 space-y-4"
					>
						<div>
							<label
								htmlFor="passkey-password"
								className="block text-sm font-medium text-neutral-700 mb-1"
							>
								{t('security.passkeys.register.passwordLabel')}
							</label>
							<input
								id="passkey-password"
								type="password"
								autoComplete="current-password"
								value={password}
								onChange={(e) => {
									setPassword(e.target.value);
									setPasswordError('');
								}}
								placeholder={t('security.passkeys.register.passwordPlaceholder')}
								className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
							/>
							{passwordError && <p className="mt-1 text-sm text-danger-text">{passwordError}</p>}
						</div>
						<div className="flex justify-end gap-3">
							<Button
								onClick={() => {
									setStep('idle');
									setPassword('');
									setPasswordError('');
								}}
								variant="outline"
							>
								{t('common.cancel')}
							</Button>
							<Button type="submit" variant="primary">
								{t('security.passkeys.register.continueButton')}
							</Button>
						</div>
					</form>
				</div>
			)}

			{step === 'loading' && (
				<div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm text-center">
					<div className="mx-auto flex h-16 w-16 items-center justify-center">
						<Loader2 size={32} className="animate-spin text-primary-600" />
					</div>
					<h3 className="mt-4 text-lg font-semibold text-neutral-900">
						{t('security.passkeys.register.loading')}
					</h3>
					<p className="mt-2 text-sm text-neutral-600">
						{t('security.passkeys.register.loadingDesc')}
					</p>
				</div>
			)}

			{step === 'error' && (
				<div className="rounded-lg border border-danger-soft bg-white p-6 shadow-sm text-center">
					<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger-soft text-danger-text">
						<AlertTriangle size={32} />
					</div>
					<h3 className="mt-4 text-lg font-semibold text-neutral-900">
						{t('security.passkeys.register.errorTitle')}
					</h3>
					<p className="mt-2 text-sm text-danger-text">{errorMsg}</p>
					<div className="mt-6 flex justify-center gap-3">
						<Button onClick={() => setStep('idle')} variant="outline">
							{t('common.cancel')}
						</Button>
						<Button onClick={handleRegister} variant="primary">
							{t('common.retry')}
						</Button>
					</div>
				</div>
			)}

			{step === 'success' && (
				<div className="rounded-lg border border-success-soft bg-white p-6 shadow-sm text-center">
					<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success-text">
						<CheckCircle2 size={32} />
					</div>
					<h3 className="mt-4 text-lg font-semibold text-neutral-900">
						{t('security.passkeys.register.successTitle')}
					</h3>
					<p className="mt-2 text-sm text-neutral-600">
						{t('security.passkeys.register.successDesc')}
					</p>
					<p className="mt-2 text-sm text-neutral-600">
						{t('security.passkeys.register.redirecting')}
					</p>
				</div>
			)}
		</div>
	);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
	const binary = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
