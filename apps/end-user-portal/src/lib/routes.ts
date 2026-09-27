/**
 * 共享路由常量 — end-user-portal
 *
 * 与 App.tsx 的 <Route path> 完全一致（P1-1 修复：消除 AppLayout 短路径与路由路径不一致）。
 * 值为 React Router 内部路径（不含 basename / tenantSlug 前缀）。
 * AppLayout 组装导航链接时用 buildNavPath() 统一拼接 tenantSlug。
 */
export const ROUTES = {
	dashboard: '/',
	profile: '/profile',
	privacyImpact: '/profile/api/v1/profile/privacy-impact',
	consents: '/profile/api/v1/profile/consents',
	security: '/security',
	loginHistory: '/security/login-history',
	roleActivations: '/security/role-activations',
	linkedAccounts: '/security/linked-accounts',
	activity: '/activity',
	sessions: '/session/api/v1/sessions',
	notifications: '/notification/api/v1/notifications',
	notificationPrefs: '/notification/api/v1/notifications/preferences',
	devices: '/devices',
	devicesPair: '/devices/pair',
	devicesFamily: '/devices/family',
	deviceTransfer: (id: string | number) => `/devices/${id}/transfer`,
	deviceActivity: (id: string | number) => `/devices/${id}/activity`,
	points: '/point/api/v1/points',
	wallet: '/wallet',
	walletRecharge: '/wallet/api/v1/wallet/recharge',
	walletWithdrawals: '/wallet/api/v1/wallet/withdrawals',
	billing: '/billing',
	billingSubscribe: '/billing/api/v1/billing/subscribe',
	billingInvoices: '/billing/api/v1/billing/invoices',
	compliance: '/compliance/api/v1/compliance',
	payments: '/pay/api/v1/payments',
	passkeyRegister: '/security/passkeys/register',
	deleteAccount: '/security/delete-account',
	exportData: '/privacy/export-data',
	recoveryContacts: '/security/recovery-contacts',
	storage: '/storage/api/v1/storage',
	onboarding: '/onboarding',
	communication: '/communication/api/v1/communication',
	communicationSend: '/communication/api/v1/communication/send',
	pushTokens: '/communication/push-tokens',
	announcements: '/notification/api/v1/announcements',
} as const;

export type RouteKey = keyof typeof ROUTES;
