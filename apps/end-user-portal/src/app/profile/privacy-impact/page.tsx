'use client';
import { ROUTES } from '@/lib/routes';
import { buildNavHref } from '@/lib/nav';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { useAuth, useTenantSlug } from '@autional-cn/shared';
import { profilesPrivacyImpactByProfiles } from '@autional-cn/shared/generated/api';
import { LoadingScreen } from '@autional-cn/ui';
import { ErrorState, EmptyState } from '@autional-cn/ui';
import {
	Eye,
	EyeOff,
	Shield,
	AlertTriangle,
	CheckCircle2,
	Info,
	ArrowRight,
	Users,
	Globe,
	Lock,
} from 'lucide-react';

interface PrivacyImpactResponse {
	riskFactors?: number;
	riskLevel?: string;
	riskScore?: number;
	recommendations?: string[];
	userId?: string;
}

async function fetchPrivacyImpact(userId: string): Promise<PrivacyImpactResponse> {
	const res = (await profilesPrivacyImpactByProfiles(userId)) as any;
	return res?.data || res || {};
}

interface FieldExposure {
	field: string;
	label: string;
	visibleTo: string;
	audience: string;
	riskLevel: 'low' | 'medium' | 'high';
}

const RISK_COLORS = {
	low: {
		bg: 'bg-emerald-50',
		text: 'text-emerald-700',
		border: 'border-emerald-200',
		icon: CheckCircle2,
	},
	medium: {
		bg: 'bg-amber-50',
		text: 'text-amber-700',
		border: 'border-amber-200',
		icon: AlertTriangle,
	},
	high: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: AlertTriangle },
};

const RISK_BAR_COLORS = {
	low: 'bg-emerald-500',
	medium: 'bg-amber-500',
	high: 'bg-rose-500',
};

const AUDIENCE_ICONS: Record<string, typeof Globe> = {
	public: Globe,
	contacts: Users,
	private: Lock,
};

export default function PrivacyImpactPage() {
	const tenantSlug = useTenantSlug();

	const { t } = useTranslation();
	const { user } = useAuth();
	const userId = user?.id || '';

	const {
		data: impact,
		isLoading,
		error,
	} = useQuery<PrivacyImpactResponse, Error>({
		queryKey: ['privacy-impact', userId],
		queryFn: () => fetchPrivacyImpact(userId),
		enabled: !!userId,
		retry: 1,
	});

	const fieldExposures: FieldExposure[] = [
		{
			field: 'email',
			label: t('privacyImpact.fields.email'),
			visibleTo: t('privacyImpact.audiences.public'),
			audience: 'public',
			riskLevel: 'medium',
		},
		{
			field: 'phone',
			label: t('privacyImpact.fields.phone'),
			visibleTo: t('privacyImpact.audiences.private'),
			audience: 'private',
			riskLevel: 'low',
		},
		{
			field: 'username',
			label: t('privacyImpact.fields.username'),
			visibleTo: t('privacyImpact.audiences.public'),
			audience: 'public',
			riskLevel: 'low',
		},
		{
			field: 'department',
			label: t('privacyImpact.fields.department'),
			visibleTo: t('privacyImpact.audiences.contacts'),
			audience: 'contacts',
			riskLevel: 'medium',
		},
		{
			field: 'location',
			label: t('privacyImpact.fields.location'),
			visibleTo: t('privacyImpact.audiences.contacts'),
			audience: 'contacts',
			riskLevel: 'high',
		},
	];

	const getRiskBarWidth = (score: number) => Math.min(Math.max(score, 0), 100);

	const getRiskLabel = (level?: string) => {
		const map: Record<string, string> = {
			low: t('privacyImpact.riskLow'),
			medium: t('privacyImpact.riskMedium'),
			high: t('privacyImpact.riskHigh'),
		};
		return map[level || ''] || level || '--';
	};

	// P1-5：userId 未就绪时不等 query（避免无限 loading）
	if (!userId) {
		return (
			<EmptyState
				title={t('privacyImpact.notAvailable', '隐私影响评估暂不可用')}
				description={t('privacyImpact.notAvailableDesc', '暂无法计算隐私影响评分，请稍后重试')}
			/>
		);
	}

	if (isLoading) return <LoadingScreen message={t('privacyImpact.loading')} />;
	if (error) {
		// P1-5：404（资源不存在）→ 空态而非错误态；其他错误 → 错误态
		const status = (error as { response?: { status?: number } })?.response?.status;
		if (status === 404) {
			return (
				<EmptyState
					title={t('privacyImpact.notAvailable', '隐私影响评估暂不可用')}
					description={t('privacyImpact.notAvailableDesc', '暂无法计算隐私影响评分，请稍后重试')}
				/>
			);
		}
		return <ErrorState message={t('privacyImpact.error')} className="min-h-[40vh]" />;
	}

	const riskScore = impact?.riskScore ?? 0;
	const riskLevel = impact?.riskLevel ?? 'low';

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-xl font-bold text-neutral-900">{t('privacyImpact.title')}</h2>
				<p className="mt-1 text-sm text-neutral-500">{t('privacyImpact.subtitle')}</p>
			</div>

			{/* Risk Score Card */}
			<div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
				<div className="flex items-start gap-4">
					<div
						className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md ${RISK_COLORS[riskLevel]?.bg || 'bg-neutral-50'} ${RISK_COLORS[riskLevel]?.text || 'text-neutral-500'}`}
					>
						<Shield size={24} />
					</div>
					<div className="flex-1">
						<h3 className="text-lg font-semibold text-neutral-900">
							{t('privacyImpact.riskScore')}
						</h3>
						<div className="mt-2 flex items-center gap-3">
							<div className="flex-1">
								<div className="h-3 w-full rounded-full bg-neutral-200 overflow-hidden">
									<div
										className={`h-full rounded-full transition-all ${RISK_BAR_COLORS[riskLevel] || 'bg-neutral-400'}`}
										style={{ width: `${getRiskBarWidth(riskScore)}%` }}
									/>
								</div>
							</div>
							<span className="text-lg font-bold text-neutral-900">{riskScore}/100</span>
						</div>
						<p className="mt-1 text-sm">
							<span className={`font-semibold ${RISK_COLORS[riskLevel]?.text || ''}`}>
								{getRiskLabel(riskLevel)}
							</span>
							{impact?.riskFactors ? (
								<span className="ml-2 text-neutral-500">
									{t('privacyImpact.riskFactors', { count: impact.riskFactors })}
								</span>
							) : null}
						</p>
					</div>
				</div>
			</div>

			{/* Field Exposure Table */}
			<div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
				<div className="border-b border-neutral-200 px-6 py-4">
					<h3 className="text-lg font-semibold text-neutral-900">
						{t('privacyImpact.fieldExposure')}
					</h3>
					<p className="mt-1 text-sm text-neutral-500">{t('privacyImpact.fieldExposureDesc')}</p>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead className="border-b border-neutral-100 bg-neutral-50/50">
							<tr>
								<th className="px-6 py-3 text-left font-medium text-neutral-600">
									{t('privacyImpact.field')}
								</th>
								<th className="px-6 py-3 text-left font-medium text-neutral-600">
									{t('privacyImpact.visibleTo')}
								</th>
								<th className="px-6 py-3 text-left font-medium text-neutral-600">
									{t('privacyImpact.riskLevel')}
								</th>
							</tr>
						</thead>
						<tbody>
							{fieldExposures.map((field) => {
								const colors = RISK_COLORS[field.riskLevel];
								const Icon = colors.icon;
								const AudIcon = AUDIENCE_ICONS[field.audience] || Globe;
								return (
									<tr
										key={field.field}
										className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
									>
										<td className="px-6 py-3">
											<div className="flex items-center gap-3">
												{field.riskLevel === 'high' ? (
													<EyeOff size={16} className="text-rose-400" />
												) : (
													<Eye size={16} className="text-neutral-400" />
												)}
												<span className="font-medium text-neutral-900">{field.label}</span>
											</div>
										</td>
										<td className="px-6 py-3">
											<div className="flex items-center gap-2">
												<AudIcon size={14} className="text-neutral-400" />
												<span className="text-neutral-600">{field.visibleTo}</span>
											</div>
										</td>
										<td className="px-6 py-3">
											<span
												className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text} ${colors.border} border`}
											>
												<Icon size={12} />
												{getRiskLabel(field.riskLevel)}
											</span>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>

			{/* Recommendations */}
			{impact?.recommendations && impact.recommendations.length > 0 && (
				<div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
					<div className="flex items-start gap-3">
						<Info size={20} className="text-blue-600 shrink-0 mt-0.5" />
						<div>
							<h3 className="text-sm font-semibold text-blue-800">
								{t('privacyImpact.recommendations')}
							</h3>
							<ul className="mt-2 list-inside list-disc space-y-1">
								{impact.recommendations.map((rec, idx) => (
									<li key={idx} className="text-sm text-blue-700">
										{rec}
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>
			)}

			{/* Link to Privacy Settings */}
			<div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-50 text-primary-700">
							<Shield size={20} />
						</div>
						<div>
							<h3 className="font-semibold text-neutral-900">
								{t('privacyImpact.manageSettings')}
							</h3>
							<p className="text-sm text-neutral-500">{t('privacyImpact.manageSettingsDesc')}</p>
						</div>
					</div>
					<Link
						to={buildNavHref(ROUTES.profile, tenantSlug)}
						className="flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:text-primary-800 transition-colors"
					>
						{t('privacyImpact.goToSettings')}
						<ArrowRight size={14} />
					</Link>
				</div>
			</div>
		</div>
	);
}
