'use client';
import { ROUTES } from '@/lib/routes';
import { buildNavHref } from '@/lib/nav';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Download,
	Loader2,
	CheckCircle2,
	AlertTriangle,
	ChevronLeft,
	FileJson,
} from 'lucide-react';
import { Link } from 'react-router';
import { useToast } from '@/hooks/use-toast';
import { extractApiError, useTenantSlug } from '@autional-cn/shared';
import { authMeExportDataPost } from '@autional-cn/shared/generated/api';
import { ConsolePageHeader, Button, ConfirmDialog } from '@autional-cn/ui';

export default function ExportDataPage() {
	const tenantSlug = useTenantSlug();

	const { t } = useTranslation();
	const toast = useToast();

	const [step, setStep] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
	const [errorMsg, setErrorMsg] = useState('');
	const [downloadUrl, setDownloadUrl] = useState('');
	const [exportId, setExportId] = useState('');
	// UP-95：PII 导出原为单击直发。补轻确认（neutral 档），不升级为 step-up 级重认证闸门。
	const [confirmOpen, setConfirmOpen] = useState(false);

	const handleExport = async () => {
		setStep('loading');
		setErrorMsg('');

		try {
			const res = (await authMeExportDataPost()) as {
				exportId?: string;
				downloadUrl?: string;
				status?: string;
			};
			const data = res;

			setExportId(data.exportId || '');
			setDownloadUrl(data.downloadUrl || '');
			setStep('success');
			toast.success(t('privacy.exportData.success'));

			if (data.downloadUrl) {
				window.open(data.downloadUrl, '_blank');
			}
		} catch (err: any) {
			const msg = extractApiError(err, t('privacy.exportData.error')).message;
			setErrorMsg(msg);
			setStep('error');
			toast.error(msg);
		}
	};

	const handleDownload = () => {
		if (downloadUrl) {
			window.open(downloadUrl, '_blank');
		}
	};

	return (
		<div className="max-w-lg mx-auto space-y-6">
			<Link
				to={buildNavHref(ROUTES.profile, tenantSlug)}
				className="text-neutral-600 hover:text-neutral-600 transition-colors"
			>
				<ChevronLeft size={20} />
			</Link>
			<ConsolePageHeader
				title={t('privacy.exportData.title')}
				description={t('privacy.exportData.subtitle')}
			/>

			{step === 'idle' && (
				<div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm text-center">
					<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-primary-700">
						<FileJson size={32} />
					</div>
					<h3 className="mt-4 text-lg font-semibold text-neutral-900">
						{t('privacy.exportData.ready')}
					</h3>
					<p className="mt-2 text-sm text-neutral-600">{t('privacy.exportData.desc')}</p>
					<ul className="mt-4 space-y-2 text-left text-sm text-neutral-600">
						<li className="flex items-start gap-2">
							<CheckCircle2 size={16} className="mt-0.5 text-success shrink-0" />
							{t('privacy.exportData.include1')}
						</li>
						<li className="flex items-start gap-2">
							<CheckCircle2 size={16} className="mt-0.5 text-success shrink-0" />
							{t('privacy.exportData.include2')}
						</li>
						<li className="flex items-start gap-2">
							<CheckCircle2 size={16} className="mt-0.5 text-success shrink-0" />
							{t('privacy.exportData.include3')}
						</li>
						<li className="flex items-start gap-2">
							<CheckCircle2 size={16} className="mt-0.5 text-success shrink-0" />
							{t('privacy.exportData.include4')}
						</li>
					</ul>
					<div className="mt-6">
						<Button onClick={() => setConfirmOpen(true)} variant="primary" className="gap-2">
							<Download size={16} />
							{t('privacy.exportData.start')}
						</Button>
					</div>
				</div>
			)}

			{step === 'loading' && (
				<div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm text-center">
					<div className="mx-auto flex h-16 w-16 items-center justify-center">
						<Loader2 size={32} className="animate-spin text-primary-600" />
					</div>
					<h3 className="mt-4 text-lg font-semibold text-neutral-900">
						{t('privacy.exportData.loading')}
					</h3>
					<p className="mt-2 text-sm text-neutral-600">{t('privacy.exportData.loadingDesc')}</p>
				</div>
			)}

			{step === 'error' && (
				<div className="rounded-lg border border-danger-soft bg-white p-6 shadow-sm text-center">
					<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger-soft text-danger-text">
						<AlertTriangle size={32} />
					</div>
					<h3 className="mt-4 text-lg font-semibold text-neutral-900">
						{t('privacy.exportData.errorTitle')}
					</h3>
					<p className="mt-2 text-sm text-danger-text">{errorMsg}</p>
					<div className="mt-6 flex justify-center gap-3">
						<Button onClick={() => setStep('idle')} variant="outline">
							{t('common.cancel')}
						</Button>
						<Button onClick={handleExport} variant="primary">
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
						{t('privacy.exportData.successTitle')}
					</h3>
					<p className="mt-2 text-sm text-neutral-600">{t('privacy.exportData.successDesc')}</p>
					{exportId && (
						<p className="mt-1 text-xs text-neutral-600">
							{t('privacy.exportData.exportId')}: {exportId}
						</p>
					)}
					<div className="mt-4">
						<Button onClick={handleDownload} variant="primary" className="gap-2">
							<Download size={16} />
							{t('privacy.exportData.download')}
						</Button>
					</div>
					<p className="mt-2 text-xs text-neutral-600">{t('privacy.exportData.autoDownload')}</p>
				</div>
			)}

			<ConfirmDialog
				open={confirmOpen}
				title={t('privacy.exportData.confirmTitle', '确认导出个人数据')}
				description={t(
					'privacy.exportData.confirmDesc',
					'将生成包含您个人数据的导出文件，以下载链接形式提供。请确认由您本人操作。',
				)}
				variant="neutral"
				confirmText={t('privacy.exportData.confirmAction', '开始导出')}
				onConfirm={() => {
					setConfirmOpen(false);
					handleExport();
				}}
				onCancel={() => setConfirmOpen(false)}
			/>
		</div>
	);
}
