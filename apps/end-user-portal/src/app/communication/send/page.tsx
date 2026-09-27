'use client';
import { ROUTES } from '@/lib/routes';
import { buildNavHref } from '@/lib/nav';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useAuth, extractApiError, useTenantSlug } from '@autional-cn/shared';
import { useSendSms, useSendEmail, useSendPush } from '@/hooks/queries';
import { useToast } from '@/hooks/use-toast';
import { Mail, Smartphone, Bell, Send, Eye, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router';

type Channel = 'sms' | 'email' | 'push';

const smsSchema = z.object({
	phone: z
		.string()
		.min(1, { message: 'phoneRequired' })
		.regex(/^\+?[\d\s\-()]{7,20}$/, { message: 'invalidPhone' }),
	content: z.string().min(1, { message: 'contentRequired' }),
});

const emailSchema = z.object({
	to: z.string().min(1, { message: 'emailRequired' }).email({ message: 'invalidEmail' }),
	subject: z.string().min(1, { message: 'subjectRequired' }),
	content: z.string().min(1, { message: 'contentRequired' }),
});

const pushSchema = z.object({
	title: z.string().min(1, { message: 'titleRequired' }),
	body: z.string().min(1, { message: 'bodyRequired' }),
	platform: z.string(),
});

type SmsForm = z.infer<typeof smsSchema>;
type EmailForm = z.infer<typeof emailSchema>;
type PushForm = z.infer<typeof pushSchema>;

export default function CommunicationSendPage() {
	const tenantSlug = useTenantSlug();

	const { t } = useTranslation();
	const toast = useToast();
	const { user } = useAuth();
	const userId = user?.id || '';

	const [channel, setChannel] = useState<Channel>('sms');
	const [previewOpen, setPreviewOpen] = useState(false);

	const smsForm = useForm<SmsForm>({
		resolver: zodResolver(smsSchema),
		defaultValues: { phone: '', content: '' },
	});
	const smsWatched = smsForm.watch();
	const smsErrors = smsForm.formState.errors;

	const emailForm = useForm<EmailForm>({
		resolver: zodResolver(emailSchema),
		defaultValues: { to: '', subject: '', content: '' },
	});
	const emailWatched = emailForm.watch();
	const emailErrors = emailForm.formState.errors;

	const pushForm = useForm<PushForm>({
		resolver: zodResolver(pushSchema),
		defaultValues: { title: '', body: '', platform: 'all' },
	});
	const pushWatched = pushForm.watch();
	const pushErrors = pushForm.formState.errors;

	const smsMutation = useSendSms();
	const emailMutation = useSendEmail();
	const pushMutation = useSendPush();

	const channels: { key: Channel; icon: typeof Mail; label: string }[] = [
		{ key: 'sms', icon: Smartphone, label: t('communication.channel.sms', 'SMS') },
		{ key: 'email', icon: Mail, label: t('communication.channel.email', 'Email') },
		{ key: 'push', icon: Bell, label: t('communication.channel.push', 'Push') },
	];

	const isSubmitting =
		smsForm.formState.isSubmitting ||
		emailForm.formState.isSubmitting ||
		pushForm.formState.isSubmitting;

	const handleSmsSubmit = async (data: SmsForm) => {
		try {
			await smsMutation.mutateAsync({
				phone: data.phone.trim(),
				content: data.content.trim(),
				userId,
			});
			toast.success(t('communication.send.smsSent', 'SMS sent successfully'));
			smsForm.reset();
		} catch (err: any) {
			toast.error(extractApiError(err, t('common.error')).message);
		}
	};

	const handleEmailSubmit = async (data: EmailForm) => {
		try {
			await emailMutation.mutateAsync({
				to: data.to
					.split(',')
					.map((s) => s.trim())
					.filter(Boolean),
				subject: data.subject.trim(),
				content: data.content.trim() || undefined,
				userId,
			});
			toast.success(t('communication.send.emailSent', 'Email sent successfully'));
			emailForm.reset();
		} catch (err: any) {
			toast.error(extractApiError(err, t('common.error')).message);
		}
	};

	const handlePushSubmit = async (data: PushForm) => {
		try {
			await pushMutation.mutateAsync({
				userId,
				title: data.title.trim(),
				body: data.body.trim(),
				platform: data.platform || 'all',
			});
			toast.success(t('communication.send.pushSent', 'Push notification sent successfully'));
			pushForm.reset();
		} catch (err: any) {
			toast.error(extractApiError(err, t('common.error')).message);
		}
	};

	const handleSend = () => {
		if (channel === 'sms') smsForm.handleSubmit(handleSmsSubmit)();
		else if (channel === 'email') emailForm.handleSubmit(handleEmailSubmit)();
		else pushForm.handleSubmit(handlePushSubmit)();
	};

	return (
		<div className="space-y-6">
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
						{t('communication.sendTitle', 'Send Message')}
					</h2>
					<p className="mt-1 text-sm text-neutral-500">
						{t('communication.sendDescription', 'Compose and send messages via different channels')}
					</p>
				</div>
			</div>

			<div className="flex gap-1 rounded-md border border-neutral-200 bg-white p-1 w-fit">
				{channels.map((ch) => (
					<button
						key={ch.key}
						onClick={() => setChannel(ch.key)}
						className={`flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors ${
							channel === ch.key
								? 'bg-primary-100 text-primary-700'
								: 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
						}`}
					>
						<ch.icon size={16} />
						{ch.label}
					</button>
				))}
			</div>

			<div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm max-w-2xl">
				{channel === 'sms' && (
					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-neutral-700">
								{t('communication.send.phone', 'Phone Number')}
							</label>
							<input
								type="text"
								{...smsForm.register('phone')}
								placeholder="+8613800138000"
								className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
							/>
							{smsErrors.phone && (
								<p className="mt-1 text-xs text-danger">
									{t(smsErrors.phone.message || 'phoneRequired')}
								</p>
							)}
						</div>
						<div>
							<label className="block text-sm font-medium text-neutral-700">
								{t('communication.send.content', 'Content')}
							</label>
							<textarea
								{...smsForm.register('content')}
								rows={4}
								maxLength={500}
								placeholder={t('communication.send.smsPlaceholder', 'Type your SMS message...')}
								className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-y"
							/>
							<p className="mt-1 text-xs text-neutral-400">
								{(smsWatched.content ?? '').length}/500
							</p>
							{smsErrors.content && (
								<p className="mt-1 text-xs text-danger">
									{t(smsErrors.content.message || 'contentRequired')}
								</p>
							)}
						</div>
					</div>
				)}

				{channel === 'email' && (
					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-neutral-700">
								{t('communication.send.to', 'To')}
							</label>
							<input
								type="text"
								{...emailForm.register('to')}
								placeholder="user@example.com"
								className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
							/>
							<p className="mt-1 text-xs text-neutral-400">
								{t(
									'communication.send.multipleRecipients',
									'Separate multiple recipients with commas',
								)}
							</p>
							{emailErrors.to && (
								<p className="mt-1 text-xs text-danger">
									{t(emailErrors.to.message || 'emailRequired')}
								</p>
							)}
						</div>
						<div>
							<label className="block text-sm font-medium text-neutral-700">
								{t('communication.send.subject', 'Subject')}
							</label>
							<input
								type="text"
								{...emailForm.register('subject')}
								placeholder={t('communication.send.subjectPlaceholder', 'Email subject')}
								className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
							/>
							{emailErrors.subject && (
								<p className="mt-1 text-xs text-danger">
									{t(emailErrors.subject.message || 'subjectRequired')}
								</p>
							)}
						</div>
						<div>
							<label className="block text-sm font-medium text-neutral-700">
								{t('communication.send.body', 'Body')}
							</label>
							<textarea
								{...emailForm.register('content')}
								rows={6}
								placeholder={t(
									'communication.send.emailPlaceholder',
									'Write your email content...',
								)}
								className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-y"
							/>
							{emailErrors.content && (
								<p className="mt-1 text-xs text-danger">
									{t(emailErrors.content.message || 'contentRequired')}
								</p>
							)}
						</div>
					</div>
				)}

				{channel === 'push' && (
					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-neutral-700">
								{t('communication.send.pushPlatform', 'Platform')}
							</label>
							<select
								{...pushForm.register('platform')}
								className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
							>
								<option value="all">{t('communication.platform.all', 'All Platforms')}</option>
								<option value="ios">iOS</option>
								<option value="android">Android</option>
								<option value="web">Web</option>
								<option value="desktop">{t('communication.platform.desktop', 'Desktop')}</option>
							</select>
						</div>
						<div>
							<label className="block text-sm font-medium text-neutral-700">
								{t('communication.send.pushTitle', 'Title')}
							</label>
							<input
								type="text"
								{...pushForm.register('title')}
								placeholder={t('communication.send.pushTitlePlaceholder', 'Notification title')}
								className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
							/>
							{pushErrors.title && (
								<p className="mt-1 text-xs text-danger">
									{t(pushErrors.title.message || 'titleRequired')}
								</p>
							)}
						</div>
						<div>
							<label className="block text-sm font-medium text-neutral-700">
								{t('communication.send.pushBody', 'Body')}
							</label>
							<textarea
								{...pushForm.register('body')}
								rows={4}
								maxLength={200}
								placeholder={t('communication.send.pushPlaceholder', 'Push notification body...')}
								className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-y"
							/>
							<p className="mt-1 text-xs text-neutral-400">{(pushWatched.body ?? '').length}/200</p>
							{pushErrors.body && (
								<p className="mt-1 text-xs text-danger">
									{t(pushErrors.body.message || 'bodyRequired')}
								</p>
							)}
						</div>
					</div>
				)}

				<div className="flex items-center gap-3 pt-4 border-t border-neutral-100">
					<button
						onClick={handleSend}
						disabled={isSubmitting}
						className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
					>
						{isSubmitting ? (
							<>
								<div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
								{t('communication.send.sending', 'Sending...')}
							</>
						) : (
							<>
								<Send size={16} />
								{channel === 'sms'
									? t('communication.send.sendSms', 'Send SMS')
									: channel === 'email'
										? t('communication.send.sendEmail', 'Send Email')
										: t('communication.send.sendPush', 'Send Push')}
							</>
						)}
					</button>
					<button
						onClick={() => setPreviewOpen(!previewOpen)}
						className="flex items-center gap-2 rounded-md border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
					>
						<Eye size={16} />
						{previewOpen
							? t('communication.send.hidePreview', 'Hide Preview')
							: t('communication.send.preview', 'Preview')}
					</button>
				</div>

				{previewOpen && (
					<div className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 p-4">
						<h4 className="text-sm font-semibold text-neutral-700 mb-2">
							{t('communication.send.previewTitle', 'Preview')}
						</h4>
						{channel === 'sms' && (
							<div className="rounded bg-white border border-neutral-200 p-3 text-sm text-neutral-800">
								<p className="text-xs text-neutral-400 mb-1">
									{t('communication.send.to', 'To')}: {smsWatched.phone || '—'}
								</p>
								<p>{smsWatched.content || t('communication.send.emptyPreview', '(empty)')}</p>
							</div>
						)}
						{channel === 'email' && (
							<div className="rounded bg-white border border-neutral-200 p-3 space-y-2">
								<p className="text-xs text-neutral-400">
									{t('communication.send.to', 'To')}: {emailWatched.to || '—'}
								</p>
								<p className="text-sm font-semibold text-neutral-800">
									{emailWatched.subject || t('communication.send.noSubject', '(no subject)')}
								</p>
								<p className="text-sm text-neutral-700 whitespace-pre-wrap">
									{emailWatched.content || t('communication.send.emptyPreview', '(empty)')}
								</p>
							</div>
						)}
						{channel === 'push' && (
							<div className="rounded bg-white border border-neutral-200 p-3 space-y-1">
								<p className="text-xs text-neutral-400">{pushWatched.platform}</p>
								<p className="text-sm font-semibold text-neutral-800">
									{pushWatched.title || t('communication.send.noTitle', '(no title)')}
								</p>
								<p className="text-sm text-neutral-600">
									{pushWatched.body || t('communication.send.emptyPreview', '(empty)')}
								</p>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
