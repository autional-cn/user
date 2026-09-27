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
});
