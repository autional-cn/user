'use client';
import { ROUTES } from '@/lib/routes';
import { buildNavHref } from '@/lib/nav';
import { useTenantSlug } from '@autional-cn/shared';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Bell,
	Mail,
	Smartphone,
	MonitorSmartphone,
	ShieldCheck,
	CreditCard,
	Info,
	Megaphone,
	Save,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/hooks/queries';
import { LoadingScreen, ErrorState } from '@autional-cn/ui';
import { Link } from 'react-router';

const NOTIFICATION_TYPES = [
	{
		key: 'security',
		labelKey: 'notifications.type.security',
		icon: ShieldCheck,
		descKey: 'notifications.prefs.securityDesc',
	},
	{
		key: 'account',
		labelKey: 'notifications.type.account',
		icon: MonitorSmartphone,
		descKey: 'notifications.prefs.accountDesc',
	},
	{
		key: 'billing',
		labelKey: 'notifications.type.billing',
		icon: CreditCard,
		descKey: 'notifications.prefs.billingDesc',
	},
	{
		key: 'marketing',
		labelKey: 'notifications.type.marketing',
		icon: Megaphone,
		descKey: 'notifications.prefs.marketingDesc',
	},
	{
		key: 'system',
		labelKey: 'notifications.type.system',
		icon: Info,
		descKey: 'notifications.prefs.systemDesc',
	},
];

const CHANNELS = [
	{ key: 'email', labelKey: 'notifications.prefs.channelEmail', icon: Mail },
	{ key: 'push', labelKey: 'notifications.prefs.channelPush', icon: Bell },
	{ key: 'inApp', labelKey: 'notifications.prefs.channelInApp', icon: Smartphone },
];

export default function NotificationPreferencesPage() {
	const tenantSlug = useTenantSlug();

	const { t } = useTranslation();
	const toast = useToast();

	const { data: prefs, isLoading, error } = useNotificationPreferences();
	const updateMutation = useUpdateNotificationPreferences();

	const [typeToggles, setTypeToggles] = useState<Record<string, boolean>>({});
	const [channelToggles, setChannelToggles] = useState<Record<string, boolean>>({});

	useEffect(() => {
		if (prefs) {
			const types: Record<string, boolean> = {};
			for (const t of NOTIFICATION_TYPES) {
				types[t.key] = prefs.typePrefs?.[t.key]?.enabled ?? true;
			}
			setTypeToggles(types);

			const channels: Record<string, boolean> = {};
			for (const ch of CHANNELS) {
				channels[ch.key] =
					prefs.channels?.[ch.key]?.enabled ?? (ch.key === 'inApp' ? true : ch.key === 'email');
			}
			if (prefs.emailEnabled !== undefined) channels.email = prefs.emailEnabled;
			if (prefs.pushEnabled !== undefined) channels.push = prefs.pushEnabled;
			setChannelToggles(channels);
		}
	}, [prefs]);

	const handleSave = async () => {
		try {
			await updateMutation.mutateAsync({
				emailEnabled: channelToggles.email,
				pushEnabled: channelToggles.push,
				channels: {
					email: {
						enabled: channelToggles.email,
						types: Object.entries(typeToggles)
							.filter(([, v]) => v)
							.map(([k]) => k),
					},
					push: {
						enabled: channelToggles.push,
						types: Object.entries(typeToggles)
							.filter(([, v]) => v)
							.map(([k]) => k),
					},
					inApp: {
						enabled: channelToggles.inApp,
						types: Object.entries(typeToggles)
							.filter(([, v]) => v)
							.map(([k]) => k),
					},
				},
				typePrefs: Object.fromEntries(
					NOTIFICATION_TYPES.map((t) => [t.key, { enabled: typeToggles[t.key] }]),
				),
			});
			toast.success(t('notifications.prefs.saved', '偏好设置已保存'));
		} catch (err: any) {
			toast.error(err?.message || t('common.error'));
		}
	};
	if (isLoading) return <LoadingScreen message={t('common.loading')} />;

	if (error) return <ErrorState message={t('notifications.error')} className="min-h-[40vh]" />;

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-xl font-bold text-neutral-900">
					{t('notifications.prefs.title', '通知偏好设置')}
				</h2>
				<p className="mt-1 text-sm text-neutral-500">
					{t('notifications.prefs.description', '管理您希望接收的通知类型和渠道')}
				</p>
			</div>

			{/* Notification Types */}
			<div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
				<h3 className="text-base font-semibold text-neutral-900">
					{t('notifications.prefs.typesTitle', '通知类型')}
				</h3>
				<p className="mt-1 text-sm text-neutral-500">
					{t('notifications.prefs.typesDesc', '选择您希望接收的通知类型')}
				</p>
				<div className="mt-4 divide-y divide-neutral-100">
					{NOTIFICATION_TYPES.map((nt) => (
						<div
							key={nt.key}
							className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
						>
							<div className="flex items-start gap-3">
								<nt.icon size={18} className="mt-0.5 text-neutral-500" />
								<div>
									<p className="text-sm font-medium text-neutral-800">{t(nt.labelKey)}</p>
									<p className="text-xs text-neutral-500">{t(nt.descKey)}</p>
								</div>
							</div>
							<button
								type="button"
								role="switch"
								aria-checked={typeToggles[nt.key]}
								onClick={() => setTypeToggles((prev) => ({ ...prev, [nt.key]: !prev[nt.key] }))}
								className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
									typeToggles[nt.key] ? 'bg-primary-600' : 'bg-neutral-200'
								}`}
							>
								<span
									className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
										typeToggles[nt.key] ? 'translate-x-5' : 'translate-x-0'
									}`}
								/>
							</button>
						</div>
					))}
				</div>
			</div>

			{/* Delivery Channels */}
			<div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
				<h3 className="text-base font-semibold text-neutral-900">
					{t('notifications.prefs.channelsTitle', '通知渠道')}
				</h3>
				<p className="mt-1 text-sm text-neutral-500">
					{t('notifications.prefs.channelsDesc', '选择通知的发送渠道')}
				</p>
				<div className="mt-4 divide-y divide-neutral-100">
					{CHANNELS.map((ch) => (
						<div
							key={ch.key}
							className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
						>
							<div className="flex items-center gap-3">
								<ch.icon size={18} className="text-neutral-500" />
								<p className="text-sm font-medium text-neutral-800">{t(ch.labelKey)}</p>
							</div>
							<button
								type="button"
								role="switch"
								aria-checked={channelToggles[ch.key]}
								onClick={() => setChannelToggles((prev) => ({ ...prev, [ch.key]: !prev[ch.key] }))}
								className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
									channelToggles[ch.key] ? 'bg-primary-600' : 'bg-neutral-200'
								}`}
							>
								<span
									className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
										channelToggles[ch.key] ? 'translate-x-5' : 'translate-x-0'
									}`}
								/>
							</button>
						</div>
					))}
				</div>
			</div>

			{/* Save button */}
			<div className="flex items-center gap-3">
				<button
					onClick={handleSave}
					disabled={updateMutation.isPending}
					className="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
				>
					{updateMutation.isPending ? (
						<>
							<div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
							{t('common.saving', '保存中...')}
						</>
					) : (
						<>
							<Save size={16} />
							{t('notifications.prefs.save', '保存偏好')}
						</>
					)}
				</button>
				<Link
					to={buildNavHref(ROUTES.notifications, tenantSlug)}
					className="rounded-md border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
				>
					{t('notifications.backToList', '返回通知列表')}
				</Link>
			</div>
		</div>
	);
}
