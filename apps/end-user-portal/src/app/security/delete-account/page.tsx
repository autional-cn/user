'use client';
import { ROUTES } from '@/lib/routes';
import { buildNavHref } from '@/lib/nav';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ChevronLeft, ShieldOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useToast } from '@/hooks/use-toast';
import {
	extractApiError,
	logout,
	AUTH_PAGES_URL,
	processPasswordForTransmission,
	getCurrentTenantId,
	useTenantSlug,
} from '@autional-cn/shared';
import {
	authMeDeleteAccountPost,
	PublicAuthConfigByAuthConfig,
} from '@autional-cn/shared/generated/api';
import { Button } from '@autional-cn/ui';
import { deleteSchema, type DeleteFormData } from '@/lib/validators';

export default function DeleteAccountPage() {
	const tenantSlug = useTenantSlug();

	const { t } = useTranslation();
	const toast = useToast();
	const navigate = useNavigate();
	const [apiError, setApiError] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		formState: { errors, isValid, isSubmitting },
	} = useForm<DeleteFormData>({
		resolver: zodResolver(deleteSchema),
		mode: 'onChange',
	});

	const onSubmit = async (data: DeleteFormData) => {
		setApiError(null);
		try {
			const tenantId = getCurrentTenantId() || '';
			// 2026-08-17 安全修复：禁止静默回退 plain。
			// 后端恒返回 password_transmission；undefined/空串 = 契约错误必须抛错暴露，
			// 不能降级明文（hash/symmetric 租户会 61000104）。
			const authConfig = await PublicAuthConfigByAuthConfig(tenantId);
			const mode = authConfig?.passwordPolicy?.passwordTransmission;
			if (mode === undefined || mode === '' || mode === null) {
				throw new Error(
					'password transmission mode is missing from tenant auth-config (contract error)',
				);
			}
			const result = await processPasswordForTransmission(
				data.password,
				mode,
				tenantId,
				undefined,
			);
			await (authMeDeleteAccountPost as any)({
				password: result.password,
				password_transmission: result.passwordTransmission,
			});
			toast.success(t('security.deleteAccount.success'));
			setTimeout(() => {
				logout(`${AUTH_PAGES_URL}/login?account_deleted=true`);
			}, 1500);
		} catch (err: any) {
			const msg = extractApiError(err, t('security.deleteAccount.error')).message;
			setApiError(msg);
			toast.error(msg);
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
						{t('security.deleteAccount.pageTitle')}
					</h2>
					<p className="mt-1 text-sm text-neutral-500">
						{t('security.deleteAccount.pageSubtitle')}
					</p>
				</div>
			</div>

			<div className="rounded-lg border border-red-200 bg-white p-6 shadow-sm">
				<div className="flex items-start gap-4">
					<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
						<ShieldOff size={24} />
					</div>
					<div className="flex-1">
						<h3 className="text-lg font-semibold text-red-700">
							{t('security.deleteAccount.warningTitle')}
						</h3>
						<p className="mt-1 text-sm text-neutral-600">
							{t('security.deleteAccount.warningDesc')}
						</p>
					</div>
				</div>

				<div className="mt-4 rounded-md bg-red-50 p-4">
					<div className="flex items-start gap-2">
						<AlertTriangle size={16} className="mt-0.5 text-red-600 shrink-0" />
						<div className="text-sm text-red-700">
							<p className="font-semibold">{t('security.deleteAccount.irreversible')}</p>
							<ul className="mt-2 list-inside list-disc space-y-1 text-red-600">
								<li>{t('security.deleteAccount.consequence1')}</li>
								<li>{t('security.deleteAccount.consequence2')}</li>
								<li>{t('security.deleteAccount.consequence3')}</li>
								<li>{t('security.deleteAccount.consequence4')}</li>
							</ul>
						</div>
					</div>
				</div>

				{apiError && (
					<div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{apiError}</div>
				)}

				<form onSubmit={handleSubmit(onSubmit)}>
					<div className="mt-6 border-t border-neutral-100 pt-4">
						<p className="text-sm text-neutral-700 font-medium">
							{t('security.deleteAccount.passwordLabel')}
						</p>
						<input
							type="password"
							{...register('password')}
							autoComplete="current-password"
							placeholder={t('security.deleteAccount.passwordPlaceholder', '请输入当前密码')}
							className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
						/>
						{errors.password && (
							<p className="mt-1 text-sm text-red-600">
								{t('security.deleteAccount.passwordRequired')}
							</p>
						)}
					</div>

					<div className="mt-4 border-t border-neutral-100 pt-4">
						<p className="text-sm text-neutral-700 font-medium">
							{t('security.deleteAccount.confirmPrompt')}
						</p>
						<input
							type="text"
							{...register('confirmText')}
							placeholder="DELETE"
							className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-mono tracking-widest focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
						/>
						{errors.confirmText && (
							<p className="mt-1 text-sm text-red-600">
								{t('security.deleteAccount.confirmPrompt')}
							</p>
						)}
					</div>

					<div className="mt-6 flex justify-end gap-3">
						<Button
							type="button"
							onClick={() => navigate(buildNavHref(ROUTES.security, tenantSlug))}
							variant="outline"
							disabled={isSubmitting}
						>
							{t('common.cancel')}
						</Button>
						<Button
							type="submit"
							variant="danger"
							disabled={!isValid || isSubmitting}
							isLoading={isSubmitting}
						>
							{isSubmitting
								? t('security.deleteAccount.deleting')
								: t('security.deleteAccount.confirmButton')}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}
