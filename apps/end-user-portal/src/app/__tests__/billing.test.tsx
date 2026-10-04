import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TestWrapper } from '@/test/wrapper';
import BillingPage from '@/app/billing/page';
import {
	useBillingSubscription,
	useBillingUsage,
	useBillingStatistics,
	useBillingRecords,
	usePublicPlans,
} from '@/hooks/queries';

// UP-56 回归锁：后端 decimal 序列化金额可能是字符串（"499"）。
// 旧实现 (v ?? 0).toLocaleString(…) 作用在字符串上时**忽略选项参数**，原样输出 "499"；
// 本测试喂字符串金额与数值金额各一条，锁「两位小数一律格式化」。
// 页面读数据在 hooks 层（本页不换算）→ mock hooks 边界，锁页面渲染口径。

vi.mock('@/hooks/use-tenant', () => ({
	useTenant: () => ({ currentTenantId: 'tenant-1' }),
}));

vi.mock('@/hooks/queries', () => ({
	useBillingSubscription: vi.fn(),
	useBillingUsage: vi.fn(),
	useBillingStatistics: vi.fn(),
	useBillingRecords: vi.fn(),
	usePublicPlans: vi.fn(),
}));

function renderPage() {
	const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(
		<TestWrapper>
			<QueryClientProvider client={qc}>
				<BillingPage />
			</QueryClientProvider>
		</TestWrapper>,
	);
}

describe('BillingPage 金额格式化（UP-56 / decimal 字符串形态）', () => {
	beforeEach(() => {
		vi.mocked(useBillingSubscription).mockReturnValue({
			data: {
				planId: 'pro',
				status: 'active',
				billingCycle: 'monthly',
				amount: 499,
				currency: 'CNY',
				currentPeriodStart: '2026-10-01T00:00:00Z',
				currentPeriodEnd: '2026-11-01T00:00:00Z',
			},
			isLoading: false,
			error: null,
			refetch: vi.fn(),
		} as any);
		vi.mocked(useBillingUsage).mockReturnValue({ data: undefined } as any);
		vi.mocked(useBillingStatistics).mockReturnValue({ data: undefined } as any);
		vi.mocked(usePublicPlans).mockReturnValue({ data: undefined } as any);
		vi.mocked(useBillingRecords).mockReturnValue({
			data: {
				items: [
					{
						recordId: 'r1',
						invoiceNumber: 'INV-DEMO-0001',
						type: 'subscription',
						status: 'paid',
						amount: '499', // 字符串 = 后端 decimal 序列化形态
						currency: 'CNY',
						description: 'Demo Pro plan',
						createdAt: '2026-10-01T08:00:00Z',
					},
					{
						recordId: 'r2',
						invoiceNumber: 'INV-DEMO-0002',
						type: 'usage',
						status: 'pending',
						amount: 7.5, // 数值形态同口径
						currency: 'CNY',
						description: 'Overage',
						createdAt: '2026-10-02T08:00:00Z',
					},
				],
				total: 2,
			},
		} as any);
	});

	it('字符串金额 "499" 渲染为 ¥499.00（旧实现会原样输出 "¥499"）', async () => {
		renderPage();
		// 小数分隔符在不同 locale 可能为 ","，正则两者都收
		expect(await screen.findByText(/^¥499[.,]00$/)).toBeInTheDocument();
	});

	it('数值金额 7.5 渲染为 ¥7.50（同口径两位小数）', async () => {
		renderPage();
		expect(await screen.findByText(/^¥7[.,]50$/)).toBeInTheDocument();
	});
});

// UP-53/UP-54 回归锁：「未实现」与「真实 0」必须可区分 ——
// 统计字段缺失渲染「暂不可用」（而非假 0）；套餐配额缺失不画无分母进度条。
describe('BillingPage 三态分离（UP-53 / UP-54）', () => {
	it('统计未实现 + 配额缺失 → 「暂不可用」×3 + 提示行 + 「未设置配额上限」×3，零假 0', async () => {
		vi.mocked(useBillingStatistics).mockReturnValue({
			data: { tenantId: 'tenant-1', activeUsers: 3 },
		} as any);
		vi.mocked(usePublicPlans).mockReturnValue({ data: undefined } as any);
		renderPage();
		const unavailable = await screen.findAllByText('暂不可用');
		expect(unavailable.length).toBeGreaterThanOrEqual(3);
		expect(screen.getByText('「暂不可用」项待计费服务提供数据后开放')).toBeInTheDocument();
		expect(screen.queryByText(/^¥0[.,]00$/)).not.toBeInTheDocument();
		expect(screen.getAllByText('未设置配额上限')).toHaveLength(3);
	});

	it('套餐含真实 quotas + 用量超 80% → 真实分母百分比 + 警示文案（UP-54）', async () => {
		vi.mocked(usePublicPlans).mockReturnValue({
			data: {
				items: [
					{
						id: 'p1',
						plan: 'pro',
						planId: 'pro',
						name: 'Pro',
						description: '',
						monthlyPrice: '499',
						yearlyPrice: '4990',
						features: [],
						quotas: { maxUsers: 500, maxStorageGb: 10, maxApiRequests: 100000 },
					},
				],
			},
		} as any);
		vi.mocked(useBillingUsage).mockReturnValue({
			data: { apiCallsToday: 85001, storageGb: 9, users: 40 },
		} as any);
		renderPage();
		// api 85001/100000=85.0%、storage 9/10=90.0% 均超 80% → 两条警示
		expect(await screen.findByText('85.0%', { exact: false })).toBeInTheDocument();
		expect(screen.getByText('90.0%', { exact: false })).toBeInTheDocument();
		expect(screen.getAllByText('用量已达配额的 80% 以上，请留意扩容')).toHaveLength(2);
		// users 40/500=8.0%，未超阈值 → 无警示
		expect(screen.getByText('40 / 500 (8.0%)')).toBeInTheDocument();
	});
});
