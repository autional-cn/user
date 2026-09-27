'use client';

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useTenantSlug } from '@autional-cn/shared';
import { buildNavHref } from '@/lib/nav';
import { ROUTES } from '@/lib/routes';
import { useTranslation } from 'react-i18next';
import {
	ArrowRightLeft,
	ArrowLeft,
	Smartphone,
	CheckCircle,
	XCircle,
	Loader2,
	Info,
} from 'lucide-react';
import { Button, Input, Label, SectionCard, LoadingScreen, ErrorState } from '@autional-cn/ui';

export default function DeviceTransferPage() {
	const tenantSlug = useTenantSlug();
	const { t } = useTranslation();
	const { id: deviceId } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const [email, setEmail] = useState('');
	const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
	const [errorMsg, setErrorMsg] = useState('');

	const isLoading = false;
	const loadError = null;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const trimmedEmail = email.trim();
		if (!trimmedEmail) {
			// P2-2: 空提交必须切换到 error 状态，否则错误提示不渲染
			setStatus('error');
			setErrorMsg(t('devices.transfer.emailRequired'));
			return;
		}
		setStatus('submitting');
		setErrorMsg('');
		try {
			// TODO: wire to actual API
			await new Promise((r) => setTimeout(r, 1200));
			setStatus('success');
		} catch (err: any) {
			setStatus('error');
			setErrorMsg(err?.message || t('devices.transfer.submitError'));
		}
	};

	const handleReset = () => {
		setStatus('idle');
		setEmail('');
		setErrorMsg('');
	};

	if (isLoading) return <LoadingScreen message={t('devices.transfer.loading')} />;

	if (loadError)
		return <ErrorState message={t('devices.transfer.loadError')} className="min-h-[40vh]" />;

	return (
		<div className="max-w-2xl mx-auto space-y-6">
			<button
				onClick={() => navigate(buildNavHref(ROUTES.devices, tenantSlug))}
				className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
			>
				<ArrowLeft size={14} />
				{t('devices.transfer.back')}
			</button>

			<div>
				<h2 className="text-xl font-bold text-neutral-900">{t('devices.transfer.title')}</h2>
				<p className="mt-1 text-sm text-neutral-500">{t('devices.transfer.subtitle')}</p>
			</div>

			<div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
				<Info size={18} className="shrink-0 text-amber-500" />
				<p className="text-sm text-amber-700">{t('devices.transfer.info')}</p>
			</div>

			{deviceId && (
				<div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-500">
						<Smartphone size={20} />
					</div>
					<div>
						<p className="text-sm font-medium text-neutral-900">{t('devices.transfer.deviceId')}</p>
						<p className="text-xs text-neutral-500 font-mono">{deviceId}</p>
					</div>
				</div>
			)}

			{status === 'success' ? (
				<div className="rounded-lg border border-emerald-200 bg-emerald-50 p-8 text-center space-y-4">
					<div className="flex justify-center">
						<CheckCircle size={48} className="text-emerald-500" />
					</div>
					<div>
						<h3 className="text-lg font-semibold text-emerald-800">
							{t('devices.transfer.successTitle')}
						</h3>
						<p className="mt-1 text-sm text-emerald-600">{t('devices.transfer.successDesc')}</p>
					</div>
					<div className="flex items-center justify-center gap-3">
						<Button
							variant="outline"
							size="sm"
							onClick={() => navigate(buildNavHref(ROUTES.devices, tenantSlug))}
						>
							{t('devices.transfer.backToDevices')}
						</Button>
						<Button size="sm" onClick={handleReset}>
							{t('devices.transfer.transferAnother')}
						</Button>
					</div>
				</div>
			) : (
				<SectionCard padding="md">
					<form onSubmit={handleSubmit} className="space-y-5">
						<div>
							<h3 className="text-base font-semibold text-neutral-900">
								{t('devices.transfer.formTitle')}
							</h3>
							<p className="mt-1 text-sm text-neutral-500">{t('devices.transfer.formDesc')}</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor="transfer-email" required>
								{t('devices.transfer.emailLabel')}
							</Label>
							<Input
								id="transfer-email"
								type="email"
								placeholder={t('devices.transfer.emailPlaceholder')}
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								disabled={status === 'submitting'}
							/>
						</div>

						{status === 'error' && (
							<div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
								<XCircle size={16} className="shrink-0" />
								<span>{errorMsg}</span>
							</div>
						)}

						<div className="flex items-center gap-3 pt-1">
							<Button
								type="submit"
								isLoading={status === 'submitting'}
								disabled={status === 'submitting'}
							>
								{status === 'submitting'
									? t('devices.transfer.submitting')
									: t('devices.transfer.submit')}
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => navigate(buildNavHref(ROUTES.devices, tenantSlug))}
								disabled={status === 'submitting'}
							>
								{t('devices.transfer.cancel')}
							</Button>
						</div>
					</form>
				</SectionCard>
			)}
		</div>
	);
}
