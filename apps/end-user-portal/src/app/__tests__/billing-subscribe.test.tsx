import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TestWrapper } from '@/test/wrapper';
import SubscribePage from '@/app/billing/subscribe/page';

// UP-60 回归锁（WCAG 2.1.1 键盘）：套餐卡此前是 div[onClick] —— 键盘不可达、选中态无程序化语义。
// 修复后：每卡一枚透明覆盖 button（aria-pressed 选中态 + 可访问名=套餐名），原生 button 即键盘可达；
// 卡内「订阅」CTA 抬到 z-10 之上独立触发（本测试只锁选择，不点击资金类 CTA）。

const h = vi.hoisted(() => ({
	subscribe: vi.fn(),
}));

vi.mock('@autional-cn/shared', () => ({
	useAuth: () => ({ user: { id: 'u1' } }),
}));

vi.mock('@/hooks/use-tenant', () => ({
	useTenant: () => ({ currentTenantId: 'tenant-1' }),
}));

vi.mock('@/hooks/queries', () => ({
	usePublicPlans: vi.fn(),
	useSubscription: vi.fn(),
	useSubscribe: vi.fn(),
}));

import { usePublicPlans, useSubscription, useSubscribe } from '@/hooks/queries';

const PLANS = [
	{
		id: 'p-basic',
		plan: 'basic',
		name: 'Basic',
		description: '基础版',
		monthlyPrice: '99',
		yearlyPrice: '990',
		features: ['基础功能'],
	},
	{
		id: 'p-pro',
		plan: 'pro',
		name: 'Pro',
		description: '专业版',
		monthlyPrice: '499',
		yearlyPrice: '4990',
		features: ['全部功能'],
	},
];

function renderPage() {
	const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(
		<TestWrapper>
			<QueryClientProvider client={qc}>
				<SubscribePage />
			</QueryClientProvider>
		</TestWrapper>,
	);
}

describe('SubscribePage 套餐卡键盘可达（UP-60）', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(usePublicPlans).mockReturnValue({
			data: { items: PLANS },
			isLoading: false,
			error: null,
			refetch: vi.fn(),
		} as any);
		vi.mocked(useSubscription).mockReturnValue({ data: undefined } as any);
		h.subscribe.mockResolvedValue({});
		vi.mocked(useSubscribe).mockReturnValue({
			mutateAsync: h.subscribe,
			isPending: false,
		} as any);
	});

	it('每卡=真 button（原生键盘可达）+ 可访问名=套餐名 + aria-pressed 互斥选中态', async () => {
		renderPage();
		await screen.findByText('选择套餐');

		const proCover = screen.getByRole('button', { name: 'Pro' });
		// 真 button 元素 = Tab 可达 + Enter/Space 激活（此前 div 无 tabindex/键盘事件）
		expect(proCover.tagName).toBe('BUTTON');
		expect(proCover).toHaveAttribute('aria-pressed', 'false');
		const basicCover = screen.getByRole('button', { name: 'Basic' });
		expect(basicCover).toHaveAttribute('aria-pressed', 'false');

		// 选择 Pro：程序化选中态翻转 + CTA 出现；仅选择、零资金调用
		fireEvent.click(proCover);
		expect(proCover).toHaveAttribute('aria-pressed', 'true');
		expect(screen.getByRole('button', { name: '订阅' })).toBeInTheDocument();
		expect(h.subscribe).not.toHaveBeenCalled();

		// 互斥：改选 Basic 后 Pro 回落
		fireEvent.click(basicCover);
		expect(basicCover).toHaveAttribute('aria-pressed', 'true');
		expect(proCover).toHaveAttribute('aria-pressed', 'false');
		expect(h.subscribe).not.toHaveBeenCalled();
	});
});
