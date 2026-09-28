'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@autional-cn/shared';
import { ErrorState } from '@autional-cn/ui';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useTenant } from '@/hooks/use-tenant';
import {
	Crown,
	Zap,
	Building2,
	Check,
	Loader2,
	XCircle,
	CheckCircle,
	ArrowRight,
} from 'lucide-react';
import {
	usePublicPlans,
	useSubscription,
	useSubscribe,
	type PublicPlanResponse,
} from '@/hooks/queries';

const CYCLE_DISCOUNT: Record<string, number> = {
	yearly: 0.8,
};

const planIcons: Record<string, React.ReactNode> = {
	free: <Zap className="w-8 h-8 text-gray-400" />,
	basic: <Zap className="w-8 h-8 text-blue-500" />,
	pro: <Crown className="w-8 h-8 text-amber-500" />,
	enterprise: <Building2 className="w-8 h-8 text-purple-500" />,
};

const planColors: Record<string, string> = {
	free: 'border-gray-300',
	basic: 'border-blue-300',
	pro: 'border-amber-300',
	enterprise: 'border-purple-300',
};

const planActiveColors: Record<string, string> = {
	free: 'ring-gray-300 bg-gray-50',
	basic: 'ring-blue-500 bg-blue-50',
	pro: 'ring-amber-500 bg-amber-50',
	enterprise: 'ring-purple-500 bg-purple-50',
};

export default function SubscribePage() {
	const { t } = useTranslation();
	const { user } = useAuth();
	const { currentTenantId } = useTenant();
	const tenantId = currentTenantId || '';
	const {
		data: plansData,
		isLoading: plansLoading,
		error: plansError,
		refetch: refetchPlans,
	} = usePublicPlans();
	const { data: currentSub } = useSubscription(tenantId);
	const subscribe = useSubscribe();

	const [selectedPlan, setSelectedPlan] = useState<PublicPlanResponse | null>(null);
	const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
	const [subscribeStatus, setSubscribeStatus] = useState<
		'idle' | 'submitting' | 'success' | 'error'
	>('idle');
	const [resultMsg, setResultMsg] = useState('');

	const plans = plansData?.items || [];

	const getCycleLabel = (cycle: string) => {
		const labels: Record<string, string> = {
			monthly: t('billing.subscribe.cycle.monthly'),
			yearly: t('billing.subscribe.cycle.yearly'),
		};
		return labels[cycle] || cycle;
	};

	const getPrice = (plan: PublicPlanResponse) => {
		const base = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
		const price = parseFloat(base || '0');
		if (billingCycle === 'yearly' && CYCLE_DISCOUNT.yearly) {
			return (price * CYCLE_DISCOUNT.yearly).toFixed(2);
		}
		return price.toFixed(2);
	};

	const getOriginalPrice = (plan: PublicPlanResponse) => {
		return parseFloat(plan.yearlyPrice || '0').toFixed(2);
	};

	const handleSubscribe = async () => {
		if (!selectedPlan) return;
		setSubscribeStatus('submitting');
		try {
			const res = await subscribe.mutateAsync({
				planId: selectedPlan.plan || selectedPlan.id,
				billingCycle,
				tenantId,
			});
			if (res.paymentUrl) {
				window.open(res.paymentUrl, '_blank');
			}
			setSubscribeStatus('success');
			setResultMsg(
				t('billing.subscribe.successMessage', {
					plan: selectedPlan.name || selectedPlan.plan,
					cycle: getCycleLabel(billingCycle),
				}),
			);
		} catch (e: unknown) {
			setSubscribeStatus('error');
			setResultMsg(e instanceof Error ? e.message : t('billing.subscribe.failedMessage'));
		}
	};

	if (plansLoading)
		return (
			<div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
				<SkeletonCard />
				<SkeletonCard />
				<SkeletonCard />
			</div>
		);

	if (plansError)
		return (
			<ErrorState
				message={t('billing.subscribe.loadPlansError', '套餐列表加载失败')}
				onRetry={() => refetchPlans()}
			/>
		);

	const features = (plan: PublicPlanResponse): string[] => {
		if (Array.isArray(plan.features)) return plan.features;
		return [];
	};

	return (
		<div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
			<div className="text-center space-y-2">
				<h1 className="text-3xl font-bold">{t('billing.subscribe.title')}</h1>
				<p className="text-gray-500">{t('billing.subscribe.subtitle')}</p>
			</div>

			{currentSub?.plan && (
				<div className="text-center">
					<span className="inline-block px-4 py-1.5 rounded-full bg-amber-50 text-amber-700 text-sm font-medium border border-amber-200">
						{t('billing.subscribe.currentPlan')}: {currentSub.plan} (
						{currentSub.billingCycle === 'monthly'
							? getCycleLabel('monthly')
							: getCycleLabel('yearly')}
						)
					</span>
				</div>
			)}

			<div className="flex justify-center gap-2">
				<button
					onClick={() => setBillingCycle('monthly')}
					className={`px-4 py-2 rounded-l-lg border font-medium transition-colors ${
						billingCycle === 'monthly'
							? 'bg-[var(--color-brand)] text-white border-[var(--color-brand)]'
							: 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
					}`}
				>
					{t('billing.subscribe.monthly')}
				</button>
				<button
					onClick={() => setBillingCycle('yearly')}
					className={`px-4 py-2 rounded-r-lg border font-medium transition-colors ${
						billingCycle === 'yearly'
							? 'bg-[var(--color-brand)] text-white border-[var(--color-brand)]'
							: 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
					}`}
				>
					{t('billing.subscribe.yearly', { discount: '8' })}
				</button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				{plans.map((plan) => {
					const isCurrent = currentSub?.plan === plan.plan;
					const isSelected = selectedPlan?.plan === plan.plan;
					const price = getPrice(plan);
					const originalPrice = getOriginalPrice(plan);

					return (
						<div
							key={plan.id || plan.plan}
							onClick={() => setSelectedPlan(plan)}
							className={`relative bg-white rounded-xl border-2 p-6 cursor-pointer transition-all ${
								isSelected
									? `ring-2 ${planActiveColors[plan.plan] || 'ring-primary bg-primary-50'}`
									: planColors[plan.plan] || 'border-gray-200'
							} hover:shadow-lg`}
						>
							{isCurrent && (
								<span className="absolute -top-2.5 right-3 px-3 py-0.5 rounded-full bg-green-500 text-white text-xs font-bold">
									{t('billing.subscribe.currentBadge')}
								</span>
							)}

							<div className="flex flex-col items-center text-center space-y-3">
								<div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
									{planIcons[plan.plan] || <Zap className="w-8 h-8 text-gray-400" />}
								</div>
								<div>
									<h3 className="text-lg font-bold">{plan.name || plan.plan}</h3>
									<p className="text-sm text-gray-500 mt-1">{plan.description}</p>
								</div>
								<div className="text-center">
									<span className="text-3xl font-bold">¥{price}</span>
									{billingCycle === 'yearly' && (
										<div>
											<span className="text-sm text-gray-400 line-through">¥{originalPrice}</span>
											<span className="text-xs text-red-500 ml-1">
												{t('billing.subscribe.yearlyBadge')}
											</span>
										</div>
									)}
									<span className="text-sm text-gray-400"> /{getCycleLabel(billingCycle)}</span>
								</div>

								<ul className="text-left space-y-2 w-full pt-2">
									{features(plan).map((f, i) => (
										<li key={i} className="flex items-start gap-2 text-sm text-gray-600">
											<Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
											{f}
										</li>
									))}
								</ul>

								{isSelected && !isCurrent && (
									<button
										onClick={(e) => {
											e.stopPropagation();
											handleSubscribe();
										}}
										disabled={subscribeStatus === 'submitting'}
										className="w-full py-2.5 rounded-lg bg-[var(--color-brand)] text-white font-medium hover:bg-primary-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 mt-2"
									>
										{subscribeStatus === 'submitting' ? (
											<Loader2 className="w-4 h-4 animate-spin" />
										) : (
											<ArrowRight className="w-4 h-4" />
										)}
										{plan.plan === 'free'
											? t('billing.subscribe.chooseFree')
											: t('billing.subscribe.subscribe')}
									</button>
								)}
							</div>
						</div>
					);
				})}
			</div>

			{subscribeStatus === 'success' && (
				<div className="flex items-center gap-2 p-4 rounded-lg bg-green-50 text-green-700 max-w-md mx-auto">
					<CheckCircle className="w-5 h-5" />
					<span className="font-medium">{resultMsg}</span>
				</div>
			)}

			{subscribeStatus === 'error' && (
				<div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 text-red-700 max-w-md mx-auto">
					<XCircle className="w-5 h-5" />
					<span className="font-medium">{resultMsg}</span>
					<button
						onClick={() => setSubscribeStatus('idle')}
						className="ml-auto text-sm text-[var(--color-brand)] hover:underline"
					>
						{t('common.retry')}
					</button>
				</div>
			)}
		</div>
	);
}
