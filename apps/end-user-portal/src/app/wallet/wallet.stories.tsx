import type { Meta, StoryObj } from '@storybook/react';
import { vi } from 'vitest';
import WalletPage from './page';
import { TestWrapper } from '@/test/wrapper';

let mockStore: Record<string, any> = {};

vi.mock('@autional-cn/shared', async () => {
	const actual = await vi.importActual<typeof import('@autional-cn/shared')>('@autional-cn/shared');
	return {
		...actual,
		useAuthStore: (selector: any) => selector({ user: { id: 'test-user-001' } }),
	};
});

vi.mock('@tanstack/react-query', async () => {
	const actual =
		await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
	return {
		...actual,
		useQueries: () => [
			mockStore.balanceQ ?? { data: undefined, isLoading: true, refetch: vi.fn() },
			mockStore.statsQ ?? { data: undefined },
			mockStore.couponsQ ?? { data: undefined },
			mockStore.historyQ ?? { data: undefined },
		],
	};
});

vi.mock('@/hooks/queries', async () => {
	const actual = await vi.importActual<typeof import('@/hooks/queries')>('@/hooks/queries');
	return {
		...actual,
		useWalletTransactions: () => mockStore.transactions ?? {},
		useRedeemCoupon: () => ({
			mutate: vi.fn(),
			isPending: false,
			isSuccess: false,
			isError: false,
		}),
	};
});

const meta: Meta<typeof WalletPage> = {
	title: 'Pages/Wallet',
	component: WalletPage,
	decorators: [
		(Story) => (
			<TestWrapper>
				<Story />
			</TestWrapper>
		),
	],
};

export default meta;
type Story = StoryObj<typeof WalletPage>;

const balanceData = {
	walletId: 'wl_test',
	currency: 'CNY',
	availableBalance: '12580.50',
	frozenBalance: '500.00',
};

const statsData = {
	transactionCount: 156,
	totalDeposits: '45000',
	totalWithdrawals: '32000',
	averageTransaction: '288.46',
};

const couponsData = {
	items: [
		{
			id: 'c1',
			code: 'SAVE20',
			name: '20元优惠券',
			type: 'cash',
			value: '20',
			minAmount: '100',
			status: 'unused',
			validUntil: '2026-12-31T23:59:59Z',
		},
		{
			id: 'c2',
			code: 'HALF50',
			name: '五折券',
			type: 'discount',
			value: '50',
			minAmount: '200',
			status: 'unused',
			validUntil: '2026-08-15T23:59:59Z',
		},
	],
	total: 2,
};

const transactionsData = {
	items: [
		{
			id: 'tx_001',
			type: 'deposit',
			amount: '500.00',
			description: '充值',
			status: 'completed',
			createdAt: '2026-06-01T10:30:00Z',
		},
		{
			id: 'tx_002',
			type: 'withdraw',
			amount: '200.00',
			description: '提现',
			status: 'completed',
			createdAt: '2026-06-02T14:20:00Z',
		},
		{
			id: 'tx_003',
			type: 'transfer_out',
			amount: '300.00',
			description: '转账至用户@lisi',
			status: 'pending',
			createdAt: '2026-06-08T09:15:00Z',
		},
	],
	total: 3,
};

const historyData = {
	items: [
		{
			type: 'deposit',
			amount: '500.00',
			balanceBefore: '1000.00',
			balanceAfter: '1500.00',
			date: '2026-06-01',
			transactionId: 'tx_001',
		},
		{
			type: 'withdraw',
			amount: '-200.00',
			balanceBefore: '1500.00',
			balanceAfter: '1300.00',
			date: '2026-06-02',
			transactionId: 'tx_002',
		},
	],
	total: 2,
};

export const Loading: Story = {
	render: () => {
		mockStore = {};
		return (
			<TestWrapper>
				<WalletPage />
			</TestWrapper>
		);
	},
};

export const Normal: Story = {
	render: () => {
		mockStore = {
			balanceQ: { data: balanceData, isLoading: false },
			statsQ: { data: statsData },
			couponsQ: { data: couponsData },
			historyQ: { data: historyData },
			transactions: transactionsData,
		};
		return (
			<TestWrapper>
				<WalletPage />
			</TestWrapper>
		);
	},
};

export const Error: Story = {
	render: () => {
		mockStore = {
			balanceQ: {
				data: undefined,
				isLoading: false,
				error: new globalThis.Error('Failed to load wallet'),
				refetch: vi.fn(),
			},
		};
		return (
			<TestWrapper>
				<WalletPage />
			</TestWrapper>
		);
	},
};

export const Empty: Story = {
	render: () => {
		mockStore = {
			balanceQ: { data: balanceData, isLoading: false },
			statsQ: {
				data: {
					transactionCount: 0,
					totalDeposits: '0',
					totalWithdrawals: '0',
					averageTransaction: '0',
				},
			},
			couponsQ: { data: { items: [], total: 0 } },
			historyQ: { data: { items: [], total: 0 } },
			transactions: { items: [], total: 0 },
		};
		return (
			<TestWrapper>
				<WalletPage />
			</TestWrapper>
		);
	},
};
