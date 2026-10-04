import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { TestWrapper } from '@/test/wrapper';
import PasskeyRegisterPage from '@/app/security/passkeys/register/page';

// UP-91-A 回归锁（AC-701/702/703）：WebAuthn begin 的 user_name 仅作凭据 label（服务端身份取自 JWT），
// 无 username 账号回退 email；两者皆空 → 不发请求 + 明确提示（否则后端 required 校验恒 400）。

const h = vi.hoisted(() => ({
	user: {} as { id?: string; username?: string; email?: string },
	begin: vi.fn(),
	complete: vi.fn(),
	authConfig: vi.fn(),
}));

vi.mock('@autional-cn/shared', () => ({
	useAuth: () => ({ user: h.user, userId: h.user?.id || '' }),
	useAuthStore: { getState: () => ({ currentTenantId: 'tenant-1' }) },
	extractApiError: (err: any, fallback: string) => ({ message: err?.message || fallback }),
	processPasswordForTransmission: (password: string) => ({
		password,
		passwordTransmission: 'plain',
	}),
	useTenantSlug: () => 'acme-corp',
	logout: vi.fn(),
	getAUTH_PAGES_URL: () => '/auth',
}));

vi.mock('@autional-cn/shared/generated/api', () => ({
	authWebauthnRegisterBeginPost: h.begin,
	authWebauthnRegisterCompletePost: h.complete,
	PublicAuthConfigByAuthConfig: h.authConfig,
}));

vi.mock('@/hooks/use-toast', () => ({
	useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

beforeAll(() => {
	// jsdom 无 WebAuthn：仅需通过 `!window.PublicKeyCredential` 支持性检查，
	// 后续 navigator.credentials 缺失会走 catch（不影响 begin 请求体断言）。
	Object.defineProperty(window, 'PublicKeyCredential', {
		configurable: true,
		writable: true,
		value: class PublicKeyCredentialStub {},
	});
});

async function startAndSubmitPassword() {
	render(<PasskeyRegisterPage />, { wrapper: TestWrapper });
	fireEvent.click(screen.getByText('开始注册'));
	const input = await screen.findByPlaceholderText('请输入当前密码');
	fireEvent.change(input, { target: { value: 'mypassword' } });
	fireEvent.click(screen.getByText('继续'));
}

describe('PasskeyRegisterPage begin 身份字段（UP-91-A / AC-701, AC-702, AC-703）', () => {
	beforeEach(() => {
		h.begin.mockReset();
		h.begin.mockResolvedValue({ challenge: 'AAAA' });
		h.complete.mockReset();
		h.authConfig.mockReset();
		h.authConfig.mockResolvedValue({ passwordPolicy: { passwordTransmission: 'plain' } });
	});

	it('AC-701：无 username → user_name/display_name 均回退 email', async () => {
		h.user = { id: 'u1', email: 'demo@example.com' };
		await startAndSubmitPassword();

		await waitFor(() => expect(h.begin).toHaveBeenCalledTimes(1));
		const body = h.begin.mock.calls[0][0];
		expect(body.user_name).toBe('demo@example.com');
		expect(body.display_name).toBe('demo@example.com');
		expect(body.password).toBe('mypassword');
		expect(body.password_transmission).toBe('plain');
	});

	it('AC-702：有 username → 仍优先取 username（优先级不回归）', async () => {
		h.user = { id: 'u1', username: 'alice', email: 'alice@example.com' };
		await startAndSubmitPassword();

		await waitFor(() => expect(h.begin).toHaveBeenCalledTimes(1));
		const body = h.begin.mock.calls[0][0];
		expect(body.user_name).toBe('alice');
		expect(body.display_name).toBe('alice');
	});

	it('AC-703：username/email 皆空 → 零请求 + 明确错误提示（不静默）', async () => {
		h.user = { id: 'u1' };
		await startAndSubmitPassword();

		await screen.findByText('无法获取用户名或邮箱，请先完善账号信息');
		expect(h.begin).not.toHaveBeenCalled();
		// 守卫在 auth-config 拉取之前短路，彻底不发任何网络请求
		expect(h.authConfig).not.toHaveBeenCalled();
	});
});
