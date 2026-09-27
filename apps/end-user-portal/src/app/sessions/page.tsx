'use client';
import { useState, useMemo } from 'react';
import {
	Monitor,
	MapPin,
	Clock,
	LogOut,
	Smartphone,
	Globe,
	ShieldCheck,
	ShieldAlert,
	ShieldOff,
	Shield,
	Filter,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { extractApiError } from '@autional-cn/shared';
import { useSessions, useRevokeSession, useRevokeAllSessions } from '@/hooks/queries';
import type { SessionInfo } from '@/hooks/queries';
import { LoadingScreen, ErrorState, EmptyState } from '@autional-cn/ui';
import { SkeletonRow } from '@/components/ui/Skeleton';

function parseUserAgent(ua?: string): { browser: string; os: string } {
	if (!ua) return { browser: '', os: '' };
	let browser = '';
	let os = '';
	if (ua.includes('Chrome')) browser = 'Chrome';
	else if (ua.includes('Firefox')) browser = 'Firefox';
	else if (ua.includes('Safari')) browser = 'Safari';
	else if (ua.includes('Edge')) browser = 'Edge';
	if (ua.includes('Windows')) os = 'Windows';
	else if (ua.includes('Mac')) os = 'macOS';
	else if (ua.includes('Linux')) os = 'Linux';
	else if (ua.includes('Android')) os = 'Android';
	else if (ua.includes('iPhone') || ua.includes('iOS')) os = 'iOS';
	return { browser, os };
}

function getDeviceLabel(session: SessionInfo, t: (k: string) => string): string {
	const deviceType = session.deviceType || '';
	const ua = parseUserAgent(session.userAgent);
	if (deviceType) return deviceType;
	if (ua.browser && ua.os) return `${ua.browser} · ${ua.os}`;
	if (ua.browser) return ua.browser;
	if (ua.os) return ua.os;
	return t('sessions.unknownDevice');
}

function getTrustColor(score: number): string {
	if (score >= 80) return 'text-emerald-600 bg-emerald-50';
	if (score >= 50) return 'text-amber-600 bg-amber-50';
	if (score >= 30) return 'text-orange-600 bg-orange-50';
	return 'text-red-600 bg-red-50';
}

function getTrustIcon(score: number) {
	if (score >= 80) return <ShieldCheck size={14} />;
	if (score >= 50) return <Shield size={14} />;
	if (score >= 30) return <ShieldAlert size={14} />;
	return <ShieldOff size={14} />;
}

const PAGE_SIZE = 10;

export default function SessionsPage() {
	const { t } = useTranslation();
	const toast = useToast();
	const [highRiskOnly, setHighRiskOnly] = useState(false);
	const [page, setPage] = useState(1);

	const { data: sessions, isLoading, error } = useSessions(page, PAGE_SIZE);
	const revokeMutation = useRevokeSession();
	const revokeAllMutation = useRevokeAllSessions();

	const handleRevoke = async (sessionId: string) => {
		try {
			await revokeMutation.mutateAsync(sessionId);
			toast.success(t('sessions.revokeSuccess', '会话已注销'));
		} catch (err: any) {
			toast.error(extractApiError(err, t('sessions.revokeError', '注销失败')).message);
		}
	};

	const handleRevokeAll = async () => {
		if (!confirm(t('sessions.revokeAllConfirm'))) return;
		try {
			await revokeAllMutation.mutateAsync({ exceptCurrent: true });
			toast.success(t('sessions.revokeAllSuccess', '所有其他会话已注销'));
		} catch (err: any) {
			toast.error(extractApiError(err, t('common.error')).message);
		}
	};

	const getTrustLabel = (score: number): string => {
		if (score >= 80) return t('sessions.trustHigh', '高');
		if (score >= 50) return t('sessions.trustMedium', '中');
		if (score >= 30) return t('sessions.trustLow', '低');
		return t('sessions.trustRisk', '风险');
	};

	const getTrustTooltip = (score: number): string => {
		return t('sessions.trustTooltip', '信任分数: 0-100，分数越高越可信').replace(
			'{score}',
			String(score),
		);
	};

	const rawList = sessions || [];
	const hasMore = rawList.length >= PAGE_SIZE;
	const sessionList = useMemo(() => {
		if (!highRiskOnly) return rawList;
		return rawList.filter((s) => (s as any).trustScore != null && (s as any).trustScore < 50);
	}, [rawList, highRiskOnly]);

	if (isLoading)
		return (
			<div className="space-y-4 px-4 py-8">
				<SkeletonRow />
				<SkeletonRow />
				<SkeletonRow />
				<SkeletonRow />
			</div>
		);
	if (error) return <ErrorState message={t('sessions.error')} className="min-h-[40vh]" />;

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-xl font-bold text-neutral-900">{t('sessions.title')}</h2>
					<p className="mt-1 text-sm text-neutral-500">{t('sessions.subtitle')}</p>
				</div>
				<div className="flex items-center gap-3">
					<button
						onClick={() => setHighRiskOnly((v) => !v)}
						className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
							highRiskOnly
								? 'border-red-200 bg-red-50 text-red-700'
								: 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
						}`}
					>
						<Filter size={14} />
						{highRiskOnly
							? t('sessions.showingHighRisk', '仅高风险')
							: t('sessions.filterHighRisk', '仅显示高风险会话')}
					</button>
					{rawList.length > 1 && (
						<button
							onClick={handleRevokeAll}
							disabled={revokeAllMutation.isPending}
							className="rounded-md border border-danger/20 bg-danger/5 px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
						>
							{revokeAllMutation.isPending ? t('common.loading') : t('sessions.revokeAll')}
						</button>
					)}
				</div>
			</div>

			{highRiskOnly && (
				<div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
					{t('sessions.highRiskFilterActive', '已启用高风险过滤：仅显示信任分数低于 50 的会话')}
				</div>
			)}

			<div className="space-y-4">
			{sessionList.map((session) => {
				const trustScore = (session as any).trustScore as number | undefined;
				const ua = parseUserAgent(session.userAgent);
				return (
					<div
						key={session.id}
						className={`rounded-lg border p-5 shadow-sm ${
							session.isCurrentSession
								? 'border-primary-200 bg-primary-50/40'
								: 'border-neutral-200 bg-white'
						}`}
					>
						<div className="flex items-start justify-between gap-4">
							<div className="flex items-start gap-4">
								<div
									className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
										session.isCurrentSession
											? 'bg-primary-100 text-primary-700'
											: 'bg-neutral-100 text-neutral-500'
									}`}
								>
									{session.deviceType?.toLowerCase().includes('phone') ||
									session.deviceType?.toLowerCase().includes('mobile') ? (
										<Smartphone size={20} />
									) : (
										<Monitor size={20} />
									)}
								</div>
								<div>
									<div className="flex items-center gap-2">
										<h3 className="font-semibold text-neutral-900">
											{getDeviceLabel(session, t)}
										</h3>
										{session.isCurrentSession && (
											<span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
												{t('sessions.current')}
											</span>
										)}
									</div>
									<div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500">
										{ua.browser && (
											<span className="flex items-center gap-1">
												<Globe size={14} />
												{ua.browser}
												{ua.os ? ` · ${ua.os}` : ''}
											</span>
										)}
										<span className="flex items-center gap-1">
											<MapPin size={14} />
											{session.geoip || t('sessions.unknownLocation')}
											{session.ip ? ` · ${session.ip}` : ''}
										</span>
										<span className="flex items-center gap-1">
											<Clock size={14} />
											{t('sessions.lastActive')}: {session.lastActiveAt || session.createdAt}
										</span>
									</div>
								</div>
							</div>

							<div className="flex items-center gap-3">
								{trustScore != null && (
									<span
										title={getTrustTooltip(trustScore)}
										className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold cursor-help ${getTrustColor(trustScore)}`}
									>
										{getTrustIcon(trustScore)}
										{getTrustLabel(trustScore)} {trustScore}
									</span>
								)}
								{!session.isCurrentSession && (
										<button
											onClick={() => handleRevoke(session.id)}
											disabled={revokeMutation.isPending}
											className="flex shrink-0 items-center gap-1 rounded-md border border-danger/20 bg-danger/5 px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
										>
											<LogOut size={14} />
											{t('sessions.revoke')}
										</button>
									)}
								</div>
							</div>
						</div>
					);
				})}

				{sessionList.length === 0 && (
					<EmptyState
						title={
							highRiskOnly
								? t('sessions.noHighRisk', 'No high risk sessions')
								: t('sessions.empty', 'No sessions')
						}
						description={
							highRiskOnly ? '' : t('sessions.emptyDesc', 'Your active sessions will appear here.')
						}
					/>
				)}
			</div>

			{rawList.length > 0 && (
				<div className="flex items-center justify-center gap-3 pt-4">
					<button
						onClick={() => setPage((p) => Math.max(1, p - 1))}
						disabled={page === 1}
						className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed"
					>
						{t('common.previous', 'Previous')}
					</button>
					<span className="text-sm text-neutral-500">{page}</span>
					<button
						onClick={() => setPage((p) => p + 1)}
						disabled={!hasMore}
						className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed"
					>
						{t('common.next', 'Next')}
					</button>
				</div>
			)}
		</div>
	);
}
