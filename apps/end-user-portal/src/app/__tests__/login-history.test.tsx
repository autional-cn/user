import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestWrapper } from '@/test/wrapper';
import LoginHistoryPage from '@/app/security/login-history/page';
import { useAuditLogs } from '@/hooks/queries';

vi.mock('@/hooks/use-toast', () => ({
	useToast: vi.fn(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() })),
}));

vi.mock('@/hooks/queries', () => ({
	useAuditLogs: vi.fn(),
}));

// 三态覆盖：空值（''）/ failed / success 各一行；空值行 location 也为空。
const AUDIT_ITEMS = [
	{
		id: 'row-empty',
		timestamp: '2026-10-04T08:00:00+08:00',
		ip: '10.0.0.1',
		userAgent: 'Mozilla/5.0 Chrome',
		location: '',
		status: '',
		reason: '',
		action: 'login',
	},
	{
		id: 'row-failed',
		timestamp: '2026-10-04T09:00:00+08:00',
		ip: '10.0.0.2',
		userAgent: 'Mozilla/5.0 Chrome',
		location: 'CN-Beijing',
		status: 'failed',
		reason: 'bad password',
		action: 'login',
	},
	{
		id: 'row-success',
		timestamp: '2026-10-04T10:00:00+08:00',
		ip: '10.0.0.3',
		userAgent: 'Mozilla/5.0 Chrome',
		location: 'CN-Shanghai',
		status: 'success',
		reason: '',
		action: 'login',
	},
];

describe('LoginHistoryPage — UP-25 location「—」+ 空值三态（AC-02-2/02-3）', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useAuditLogs).mockReturnValue({
			data: { items: AUDIT_ITEMS, total: AUDIT_ITEMS.length },
			isLoading: false,
			error: null,
		} as any);
	});

	it('表格：空 location/status 均为「—」，空值不落成功/失败分支', () => {
		render(<LoginHistoryPage />, { wrapper: TestWrapper });

		const table = screen.getByRole('table');
		expect(within(table).getAllByText('—')).toHaveLength(2); // row-empty 的 location + status
		expect(within(table).getAllByText('失败')).toHaveLength(1); // 仅 row-failed
		expect(within(table).getAllByText('成功')).toHaveLength(1); // 仅 row-success（空值不得计入）
		expect(screen.queryByText('未知位置')).not.toBeInTheDocument(); // 旧文案退役
	});

	it('CSV：与表格同值（空值「—」/ 语义值各自成立）', async () => {
		const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:test');
		Object.defineProperty(URL, 'createObjectURL', {
			value: createObjectURL,
			configurable: true,
			writable: true,
		});
		Object.defineProperty(URL, 'revokeObjectURL', {
			value: vi.fn(),
			configurable: true,
			writable: true,
		});
		const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

		render(<LoginHistoryPage />, { wrapper: TestWrapper });
		fireEvent.click(screen.getByRole('button', { name: /导出/ }));

		await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1));
		const blob = createObjectURL.mock.calls[0][0];
		const csv = await blob.text();

		expect(csv.match(/"—"/g)).toHaveLength(2); // row-empty：location + status（与表格同值）
		expect(csv.match(/"失败"/g)).toHaveLength(1);
		expect(csv.match(/"成功"/g)).toHaveLength(1);
		expect(csv).not.toContain('未知位置');
		expect(csv).toContain('CN-Beijing');
		expect(csv).toContain('CN-Shanghai');

		clickSpy.mockRestore();
	});
});
