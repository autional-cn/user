import type { Meta, StoryObj } from '@storybook/react';
import { vi } from 'vitest';
import SecurityPage from './page';
import { TestWrapper } from '@/test/wrapper';
import { userEvent, within } from '@storybook/test';

let mockStore: Record<string, any> = {};

vi.mock('@autional-cn/shared', async () => {
	const actual = await vi.importActual<typeof import('@autional-cn/shared')>('@autional-cn/shared');
	return {
		...actual,
		useAuthStore: (selector: any) => selector({ user: { id: 'test-user-001' } }),
		apiClient: {
			get: vi.fn().mockResolvedValue({ data: {} }),
			post: vi.fn().mockResolvedValue({ data: {} }),
			delete: vi.fn().mockResolvedValue({ data: {} }),
		},
		extractApiError: () => ({ message: 'Error occurred' }),
		logout: vi.fn(),
		AUTH_PAGES_URL: '/auth',
		API_BASE_URL: 'http://localhost',
	};
});

vi.mock('@/hooks/queries', async () => {
	const actual = await vi.importActual<typeof import('@/hooks/queries')>('@/hooks/queries');
	return {
		...actual,
		useMFAStatus: () => mockStore.mfaStatus ?? { data: undefined, isLoading: true, error: null },
		usePasskeys: () => mockStore.passkeys ?? { data: undefined, isLoading: true, error: null },
		useChangePassword: () => ({ mutateAsync: vi.fn().mockResolvedValue({}) }),
		useDeletePasskey: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
		useEnableTOTP: () => ({
			mutateAsync: vi.fn().mockResolvedValue({ secret: 'JBSWY3DPEHPK3PXP', qrCodeUrl: '' }),
		}),
		useVerifyTOTP: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
		useDisableTOTP: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
		useGenerateBackupCodes: () => ({
			mutateAsync: vi.fn().mockResolvedValue({ codes: ['11111111', '22222222', '33333333'] }),
		}),
		useOAuthConnections: () =>
			mockStore.oauthConnections ?? { data: undefined, isLoading: true, error: null },
		useUnbindOAuth: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
	};
});

vi.mock('@/hooks/use-toast', () => ({
	useToast: () => ({
		info: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
		warning: vi.fn(),
	}),
}));

const meta: Meta<typeof SecurityPage> = {
	title: 'Pages/Security',
	component: SecurityPage,
	decorators: [
		(Story) => (
			<TestWrapper>
				<Story />
			</TestWrapper>
		),
	],
};

export default meta;
type Story = StoryObj<typeof SecurityPage>;

const mfaStatusData = {
	data: { methods: ['totp', 'passkey'], totpEnabled: true, smsEnabled: false, emailEnabled: false },
	isLoading: false,
	error: null,
};

const passkeysData = {
	data: [
		{
			id: 'pk_001',
			name: 'MacBook Touch ID',
			authenticatorAttachment: 'platform',
			createdAt: '2026-05-01',
			backupState: false,
			userVerified: true,
		},
		{
			id: 'pk_002',
			name: 'YubiKey 5C',
			authenticatorAttachment: 'cross-platform',
			createdAt: '2026-04-15',
			backupState: false,
			userVerified: true,
		},
	],
	isLoading: false,
	error: null,
};

const oauthConnectionsData = {
	data: [
		{
			id: 'oc_001',
			providerId: 'google',
			profileData: { email: 'test@gmail.com' },
			createdAt: '2026-05-15',
		},
		{
			id: 'oc_002',
			providerId: 'github',
			profileData: { email: 'dev@github.com' },
			createdAt: '2026-03-20',
		},
	],
	isLoading: false,
	error: null,
};

function setNormalData() {
	mockStore = {
		mfaStatus: mfaStatusData,
		passkeys: passkeysData,
		oauthConnections: oauthConnectionsData,
	};
}

export const Loading: Story = {
	render: () => {
		mockStore = {};
		return (
			<TestWrapper>
				<SecurityPage />
			</TestWrapper>
		);
	},
};

export const Normal: Story = {
	render: () => {
		setNormalData();
		return (
			<TestWrapper>
				<SecurityPage />
			</TestWrapper>
		);
	},
};

export const PasswordChange: Story = {
	render: () => {
		setNormalData();
		return (
			<TestWrapper>
				<SecurityPage />
			</TestWrapper>
		);
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const button = canvas.getByText('修改密码');
		await userEvent.click(button);
	},
};

export const DeleteAccount: Story = {
	render: () => {
		setNormalData();
		return (
			<TestWrapper>
				<SecurityPage />
			</TestWrapper>
		);
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const button = canvas.getByText('删除账户');
		await userEvent.click(button);
	},
};
