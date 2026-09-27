import type { Meta, StoryObj } from '@storybook/react';
import { vi } from 'vitest';
import ProfilePage from './page';
import { TestWrapper } from '@/test/wrapper';
import { userEvent, within } from '@storybook/test';

let mockStore: Record<string, any> = {};

vi.mock('@autional-cn/shared', async () => {
	const actual = await vi.importActual<typeof import('@autional-cn/shared')>('@autional-cn/shared');
	return {
		...actual,
		useAuthStore: (selector: any) => selector({ user: { id: 'test-user-001' } }),
		extractApiError: () => ({ message: 'Error occurred' }),
	};
});

vi.mock('@/hooks/queries', async () => {
	const actual = await vi.importActual<typeof import('@/hooks/queries')>('@/hooks/queries');
	return {
		...actual,
		useProfile: () => mockStore.profile ?? { data: undefined, isLoading: true, error: null },
		useUpdateProfile: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
		useUploadAvatar: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
		usePrivacy: () =>
			mockStore.privacy ?? {
				data: { showEmail: true, showPhone: false, profileVisibility: 'private' },
			},
		useUpdatePrivacy: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
	};
});

vi.mock('@/hooks/use-language', () => ({
	useLanguage: () => ({
		current: 'zh-CN',
		setLanguage: vi.fn(),
		languages: [
			{ code: 'zh-CN', label: '简体中文' },
			{ code: 'en-US', label: 'English' },
		],
	}),
}));

vi.mock('@/hooks/use-theme', () => ({
	useTheme: () => ({ isDark: false, theme: 'light', toggle: vi.fn() }),
}));

vi.mock('@/hooks/use-toast', () => ({
	useToast: () => ({
		info: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
		warning: vi.fn(),
	}),
}));

const meta: Meta<typeof ProfilePage> = {
	title: 'Pages/Profile',
	component: ProfilePage,
	decorators: [
		(Story) => (
			<TestWrapper>
				<Story />
			</TestWrapper>
		),
	],
};

export default meta;
type Story = StoryObj<typeof ProfilePage>;

const profileData = {
	id: 'user_001',
	username: 'ZhangSan',
	email: 'zhangsan@example.com',
	phone: '13800138000',
	status: 'active',
	avatarUrl: undefined,
	createdAt: '2026-01-15',
};

const privacyData = {
	showEmail: true,
	showPhone: false,
	profileVisibility: 'private' as const,
};

export const Loading: Story = {
	render: () => {
		mockStore = {};
		return (
			<TestWrapper>
				<ProfilePage />
			</TestWrapper>
		);
	},
};

export const Normal: Story = {
	render: () => {
		mockStore = {
			profile: { data: profileData, isLoading: false, error: null },
			privacy: { data: privacyData },
		};
		return (
			<TestWrapper>
				<ProfilePage />
			</TestWrapper>
		);
	},
};

export const Error: Story = {
	render: () => {
		mockStore = {
			profile: {
				data: undefined,
				isLoading: false,
				error: new globalThis.Error('Failed to load profile'),
			},
		};
		return (
			<TestWrapper>
				<ProfilePage />
			</TestWrapper>
		);
	},
};

export const Editing: Story = {
	render: () => {
		mockStore = {
			profile: { data: profileData, isLoading: false, error: null },
			privacy: { data: privacyData },
		};
		return (
			<TestWrapper>
				<ProfilePage />
			</TestWrapper>
		);
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const button = canvas.getByText('编辑');
		await userEvent.click(button);
	},
};
