import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestWrapper } from '@/test/wrapper';
import ProfilePage from '@/app/profile/page';
import {
	useProfile,
	useUpdateProfile,
	useUploadAvatar,
	usePrivacy,
	useUpdatePrivacy,
	useSendVerificationEmail,
	useVerifyEmailChange,
} from '@/hooks/queries';

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
	useProfile: vi.fn(),
	useUpdateProfile: vi.fn(),
	useUploadAvatar: vi.fn(),
	usePrivacy: vi.fn(),
	useUpdatePrivacy: vi.fn(),
	useSendVerificationEmail: vi.fn(),
	useVerifyEmailChange: vi.fn(),
}));

function createMockMutation() {
	return {
		mutateAsync: vi.fn().mockResolvedValue({}),
		isPending: false,
	};
}

const mockProfile = {
	id: 'u1',
	username: 'Alice',
	email: 'alice@example.com',
	phone: '13800138000',
	status: 'active',
	createdAt: '2025-01-15',
};

describe('ProfilePage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useUpdateProfile).mockReturnValue(createMockMutation() as any);
		vi.mocked(useUploadAvatar).mockReturnValue(createMockMutation() as any);
		vi.mocked(useUpdatePrivacy).mockReturnValue(createMockMutation() as any);
		vi.mocked(useSendVerificationEmail).mockReturnValue(createMockMutation() as any);
		vi.mocked(useVerifyEmailChange).mockReturnValue(createMockMutation() as any);
	});

	function mockProfileLoaded() {
		vi.mocked(useProfile).mockReturnValue({
			data: mockProfile,
			isLoading: false,
			error: null,
		} as any);
		vi.mocked(usePrivacy).mockReturnValue({
			data: { showEmail: true, showPhone: false, profileVisibility: 'private' as const },
			isLoading: false,
			error: null,
		} as any);
	}

	it('renders profile edit form with basic info', () => {
		mockProfileLoaded();

		render(<ProfilePage />, { wrapper: TestWrapper });

		expect(screen.getByText('个人资料')).toBeInTheDocument();
		expect(screen.getAllByText('Alice').length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByText('alice@example.com').length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText('编辑')).toBeInTheDocument();
	});

	it('renders privacy tab and switches to it', () => {
		mockProfileLoaded();

		render(<ProfilePage />, { wrapper: TestWrapper });

		const privacyTab = screen.getByRole('button', { name: '隐私设置' });
		fireEvent.click(privacyTab);

		expect(screen.getAllByText('隐私设置').length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText('邮箱可见')).toBeInTheDocument();
		expect(screen.getByText('手机号可见')).toBeInTheDocument();
		expect(screen.getByText('个人资料公开')).toBeInTheDocument();
	});

	it('renders privacy toggles with descriptions', () => {
		mockProfileLoaded();

		render(<ProfilePage />, { wrapper: TestWrapper });

		fireEvent.click(screen.getByRole('button', { name: '隐私设置' }));

		expect(screen.getByText('允许其他用户看到你的邮箱地址')).toBeInTheDocument();
		expect(screen.getByText('允许其他用户看到你的手机号')).toBeInTheDocument();
		expect(screen.getByText('允许其他用户查看你的个人资料页面')).toBeInTheDocument();
	});

	it('enters edit mode with save button, cancels back to view', () => {
		mockProfileLoaded();

		render(<ProfilePage />, { wrapper: TestWrapper });

		fireEvent.click(screen.getByText('编辑'));

		expect(screen.getByText('保存')).toBeInTheDocument();
		expect(screen.getByText('取消')).toBeInTheDocument();

		fireEvent.click(screen.getByText('取消'));

		expect(screen.getByText('编辑')).toBeInTheDocument();
	});

	it('UP-03：隐私开关 role=switch + aria-checked + 可访问名=行标签；编辑/偏好表单 label 关联', () => {
		mockProfileLoaded();
		const updatePrivacy = createMockMutation();
		vi.mocked(useUpdatePrivacy).mockReturnValue(updatePrivacy as any);

		render(<ProfilePage />, { wrapper: TestWrapper });

		// 编辑态：用户名 label → input 程序化关联（htmlFor/id）
		fireEvent.click(screen.getByText('编辑'));
		const usernameInput = screen.getByLabelText('用户名');
		expect(usernameInput.tagName).toBe('INPUT');
		expect(usernameInput).toHaveValue('Alice');
		fireEvent.click(screen.getByText('取消'));

		// 隐私开关：可访问名 + 程序化选中态（此前裸 button 无 role/aria）
		fireEvent.click(screen.getByRole('button', { name: '隐私设置' }));
		const emailSw = screen.getByRole('switch', { name: '邮箱可见' });
		expect(emailSw).toHaveAttribute('aria-checked', 'true');
		expect(screen.getByRole('switch', { name: '手机号可见' })).toHaveAttribute(
			'aria-checked',
			'false',
		);
		// 点击 = 发变更（选中态翻转由服务端回读驱动；mock 固定数据下锁调用载荷）
		fireEvent.click(emailSw);
		expect(updatePrivacy.mutateAsync).toHaveBeenCalledWith({ showEmail: false });

		// 偏好页：语言 select label 关联 + 主题开关语义
		fireEvent.click(screen.getByRole('button', { name: '偏好设置' }));
		expect(screen.getByLabelText('语言').tagName).toBe('SELECT');
		expect(screen.getByRole('switch', { name: '主题' })).toHaveAttribute('aria-checked');
	});
});
