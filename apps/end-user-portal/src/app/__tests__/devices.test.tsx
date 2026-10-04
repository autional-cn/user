import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestWrapper } from '@/test/wrapper';
import DevicesPage from '@/app/devices/page';
import { useThingsList } from '@/hooks/queries';

vi.mock('@/hooks/use-auth-guard', () => ({
	useAuthGuard: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
	useToast: vi.fn(() => ({
		success: vi.fn(),
		error: vi.fn(),
	})),
}));

vi.mock('@/hooks/queries', () => ({
	useThingsList: vi.fn(),
}));

vi.mock('@/components/ui/Skeleton', () => ({
	SkeletonCard: () =>
		React.createElement('div', { className: 'animate-pulse', 'data-testid': 'skeleton-card' }),
}));

const mockThings = [
	{
		id: 'th1',
		name: 'Living Room Camera',
		type: 'camera',
		status: 'online',
		model: 'CamPro X1',
		last_seen: '2026-06-09 10:30:00',
	},
	{
		id: 'th2',
		name: 'Kitchen Sensor',
		type: 'sensor',
		status: 'offline',
		model: 'SenseMax v2',
		last_seen: '2026-06-08 22:15:00',
		online: false,
	},
];

describe('DevicesPage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useThingsList).mockReturnValue({
			data: undefined,
			isLoading: false,
			error: null,
			refetch: vi.fn(),
		} as any);
	});

	it('renders loading state', () => {
		vi.mocked(useThingsList).mockReturnValue({
			data: undefined,
			isLoading: true,
			error: null,
		} as any);

		const { container } = render(<DevicesPage />, { wrapper: TestWrapper });

		expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
	});

	it('renders device list with thing names and pair link', () => {
		vi.mocked(useThingsList).mockReturnValue({
			data: { items: mockThings },
			isLoading: false,
			error: null,
		} as any);

		render(<DevicesPage />, { wrapper: TestWrapper });

		expect(screen.getByText('Living Room Camera')).toBeInTheDocument();
		expect(screen.getByText('Kitchen Sensor')).toBeInTheDocument();
		expect(screen.getByText('配对设备')).toBeInTheDocument();
	});

	it('shows empty state with pair prompt when no things', () => {
		vi.mocked(useThingsList).mockReturnValue({
			data: { items: [] },
			isLoading: false,
			error: null,
		} as any);

		render(<DevicesPage />, { wrapper: TestWrapper });

		expect(screen.getByText('暂无已注册设备')).toBeInTheDocument();
		// UP-43：空态仅保留卡片主按钮入口（头部右上配对入口隐藏，避免同屏两处）
		const pairLinks = screen.getAllByText('配对设备');
		expect(pairLinks).toHaveLength(1);
	});

	it('shows error state on failure', () => {
		vi.mocked(useThingsList).mockReturnValue({
			data: undefined,
			isLoading: false,
			error: new Error('Network error'),
		} as any);

		render(<DevicesPage />, { wrapper: TestWrapper });

		expect(screen.getByText('重试')).toBeInTheDocument();
	});

	it('renders status badges for online and offline things', () => {
		vi.mocked(useThingsList).mockReturnValue({
			data: { items: mockThings },
			isLoading: false,
			error: null,
		} as any);

		render(<DevicesPage />, { wrapper: TestWrapper });

		expect(screen.getByText('在线')).toBeInTheDocument();
		expect(screen.getByText('离线')).toBeInTheDocument();
	});

	it('renders thing type and model info', () => {
		vi.mocked(useThingsList).mockReturnValue({
			data: { items: mockThings },
			isLoading: false,
			error: null,
		} as any);

		render(<DevicesPage />, { wrapper: TestWrapper });

		expect(screen.getByText('camera')).toBeInTheDocument();
		expect(screen.getByText('sensor')).toBeInTheDocument();
		expect(screen.getByText('CamPro X1')).toBeInTheDocument();
		expect(screen.getByText('SenseMax v2')).toBeInTheDocument();
	});

	it('renders family link for each thing', () => {
		vi.mocked(useThingsList).mockReturnValue({
			data: { items: mockThings },
			isLoading: false,
			error: null,
		} as any);

		render(<DevicesPage />, { wrapper: TestWrapper });

		const familyLinks = screen.getAllByText('家庭共享');
		expect(familyLinks).toHaveLength(2);
	});
});
