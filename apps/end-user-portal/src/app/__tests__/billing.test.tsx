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
