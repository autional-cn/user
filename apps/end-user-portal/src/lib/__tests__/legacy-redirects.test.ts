/**
 * 旧路径重定向守卫 — 2026-10-03 URL 统一改造的回归锁。
 *
 * 1. App.tsx 必须保留全部旧 API 形态路径的 LegacyRedirect（书签、跨站深链、登录回跳都指向它们）；
 * 2. ROUTES 常量不得再出现 /api/v1 形态（改造前的问题类）；
 * 3. 旧路径首段必须登记在 non-tenant-segments.ts（否则会被当租户 slug 发品牌查询）。
 *
 * 直接读源码文本断言；与 ui 仓 scripts/check-non-tenant.mjs 互补——那份是跨仓路由/名单比对闸门，
 * 本测试是本仓的重定向回归锁（checker 不检查 redirect 目标）。
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

function read(rel: string): string {
	return readFileSync(new URL(rel, import.meta.url), 'utf8');
}

const APP_TSX = read('../../App.tsx');
const ROUTES_TS = read('../routes.ts');
const NON_TENANT_TS = read('../../non-tenant-segments.ts');

const LEGACY_REDIRECTS: Array<{ legacy: string; target: keyof typeof import('../routes').ROUTES }> = [
	{ legacy: 'profile/api/v1/profile/privacy-impact', target: 'privacyImpact' },
	{ legacy: 'profile/api/v1/profile/consents', target: 'consents' },
	{ legacy: 'session/api/v1/sessions', target: 'sessions' },
	{ legacy: 'notification/api/v1/notifications', target: 'notifications' },
	{ legacy: 'notification/api/v1/notifications/preferences', target: 'notificationPrefs' },
	{ legacy: 'point/api/v1/points', target: 'points' },
	{ legacy: 'wallet/api/v1/wallet/recharge', target: 'walletRecharge' },
	{ legacy: 'wallet/api/v1/wallet/withdrawals', target: 'walletWithdrawals' },
	{ legacy: 'billing/api/v1/billing/subscribe', target: 'billingSubscribe' },
	{ legacy: 'billing/api/v1/billing/invoices', target: 'billingInvoices' },
	{ legacy: 'compliance/api/v1/compliance', target: 'compliance' },
	{ legacy: 'pay/api/v1/payments', target: 'payments' },
	{ legacy: 'storage/api/v1/storage', target: 'storage' },
	{ legacy: 'communication/api/v1/communication', target: 'communication' },
	// 发送消息页已移除（属平台/开发者能力，非普通用户职能），旧地址回落通信记录
	{ legacy: 'communication/api/v1/communication/send', target: 'communication' },
	{ legacy: 'notification/api/v1/announcements', target: 'announcements' },
];

describe('legacy redirects', () => {
	it('keeps every legacy API-shaped path redirected to its clean target', () => {
		for (const { legacy, target } of LEGACY_REDIRECTS) {
			const line = APP_TSX.split('\n').find((l) => l.includes(`path="${legacy}"`));
			expect(line, `App.tsx 缺少旧路径路由: ${legacy}`).toBeDefined();
			expect(line, `旧路径 ${legacy} 的 redirect 目标应为 ROUTES.${target}`).toContain(
				`<LegacyRedirect to={ROUTES.${target}} />`,
			);
		}
	});

	it('ROUTES constants contain no API-shaped values', () => {
		const values = [...ROUTES_TS.matchAll(/'(\/[^']*)'/g)].map((m) => m[1]);
		expect(values.length).toBeGreaterThan(20);
		for (const v of values) {
			expect(v, `ROUTES 值不得含 /api/v1: ${v}`).not.toContain('/api/v1');
		}
		expect(ROUTES_TS).not.toContain('communicationSend');
	});

	it('registers the first segment of every legacy path as non-tenant', () => {
		const segments = (NON_TENANT_TS.match(/'[a-z-]+'/g) ?? []).map((s) => s.slice(1, -1));
		for (const { legacy } of LEGACY_REDIRECTS) {
			const head = legacy.split('/')[0];
			expect(segments, `旧路径首段未登记为非租户: ${head}`).toContain(head);
		}
	});
});
