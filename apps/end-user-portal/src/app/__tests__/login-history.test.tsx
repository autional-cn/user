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

// 三态覆盖：空值（''）/ failed / success 各一行。
const AUDIT_ITEMS = [
	{
		id: 'row-empty',
		timestamp: '2026-10-04T08:00:00+08:00',
		ip: '10.0.0.1',
		userAgent: 'Mozilla/5.0 Chrome',
		status: '',
		reason: '',
		action: 'login',
	},
	{
		id: 'row-failed',
		timestamp: '2026-10-04T09:00:00+08:00',
		ip: '10.0.0.2',
		userAgent: 'Mozilla/5.0 Chrome',
		status: 'failed',
		reason: 'bad password',
		action: 'login',
	},
	{
		id: 'row-success',
		timestamp: '2026-10-04T10:00:00+08:00',
		ip: '10.0.0.3',
		userAgent: 'Mozilla/5.0 Chrome',
		status: 'success',
		reason: '',
		action: 'login',
	},
];

describe('LoginHistoryPage — UP-25 空值三态（AC-02-2/02-3）+ UP-100 位置列退役', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useAuditLogs).mockReturnValue({
			data: { items: AUDIT_ITEMS, total: AUDIT_ITEMS.length },
			isLoading: false,
			error: null,
		} as any);
	});

	it('表格：空 status 为「—」且不落成功/失败分支；位置列已退役（UP-100）', () => {
		render(<LoginHistoryPage />, { wrapper: TestWrapper });

		const table = screen.getByRole('table');
		expect(within(table).getAllByText('—')).toHaveLength(1); // 仅 row-empty 的 status（位置列已退役）
		expect(within(table).getAllByText('失败')).toHaveLength(1); // 仅 row-failed
		expect(within(table).getAllByText('成功')).toHaveLength(1); // 仅 row-success（空值不得计入）
		// UP-100：位置列的服务端数据链不存在（AuditLogResponse 无 location），列整体退役。
		expect(within(table).queryByText('位置')).not.toBeInTheDocument();
		expect(screen.queryByText('未知位置')).not.toBeInTheDocument();
	});

	it('CSV：与表格同值（空值「—」/ 语义值各自成立）；不含位置列', async () => {
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

		expect(csv.match(/"—"/g)).toHaveLength(1); // row-empty：status（与表格同值；位置列已退役）
		expect(csv.match(/"失败"/g)).toHaveLength(1);
		expect(csv.match(/"成功"/g)).toHaveLength(1);
		expect(csv).not.toContain('位置');
		expect(csv).not.toContain('未知位置');

		clickSpy.mockRestore();
	});

	it('UP-26：状态筛选走服务端 statusClass（failed→failure；all 不下发）', async () => {
		render(<LoginHistoryPage />, { wrapper: TestWrapper });

		// 初始 all：查询参数不携带 statusClass（服务端不筛）。
		expect(vi.mocked(useAuditLogs).mock.calls.at(-1)?.[0]).not.toHaveProperty('statusClass');

		// 失败 → status_class=failure（服务端值域），不是把 'failed' 原样丢给后端。
		fireEvent.click(screen.getByRole('button', { name: '失败' }));
		await waitFor(() => {
			expect(vi.mocked(useAuditLogs).mock.calls.at(-1)?.[0]).toMatchObject({
				statusClass: 'failure',
			});
		});

		// 成功 → success。
		fireEvent.click(screen.getByRole('button', { name: '成功' }));
		await waitFor(() => {
			expect(vi.mocked(useAuditLogs).mock.calls.at(-1)?.[0]).toMatchObject({
				statusClass: 'success',
			});
		});

		// 回到全部 → 参数移除。
		fireEvent.click(screen.getByRole('button', { name: '全部' }));
		await waitFor(() => {
			expect(vi.mocked(useAuditLogs).mock.calls.at(-1)?.[0]).not.toHaveProperty('statusClass');
		});
	});

	it('UP-100：关键词防抖后按 keyword 入参（输入中不打接口）', async () => {
		render(<LoginHistoryPage />, { wrapper: TestWrapper });

		const callsBefore = vi.mocked(useAuditLogs).mock.calls.length;
		const input = screen.getByPlaceholderText('搜索 IP / 设备 / 详情');

		fireEvent.change(input, { target: { value: '10.0.0.2' } });
		// 防抖窗口内不产生新查询参数（keyword 未定稿）。
		expect(vi.mocked(useAuditLogs).mock.calls.at(-1)?.[0]).not.toHaveProperty('keyword');

		await waitFor(() => {
			expect(vi.mocked(useAuditLogs).mock.calls.at(-1)?.[0]).toMatchObject({
				keyword: '10.0.0.2',
			});
		});
		expect(vi.mocked(useAuditLogs).mock.calls.length).toBeGreaterThan(callsBefore);
	});
});
