import { lazy, Suspense } from 'react';
import { Routes, Route, Outlet, useParams } from 'react-router';
import {
	RequireAuth,
	OAuthCallbackPage,
	TenantIndexGuard,
	TenantSlugProvider,
	useTenantSlugFromUrl,
} from '@autional-cn/shared';
import { LoadingScreen } from '@autional-cn/ui';
import { ErrorBoundary } from './components/ErrorBoundary';
import AppLayout from './components/layout/AppLayout';

const DashboardPage = lazy(() => import('./app/page'));
const ProfilePage = lazy(() => import('./app/profile/page'));
const PrivacyImpactPage = lazy(() => import('./app/profile/privacy-impact/page'));
const ConsentsPage = lazy(() => import('./app/profile/consents/page'));
const SecurityPage = lazy(() => import('./app/security/page'));
const LoginHistoryPage = lazy(() => import('./app/security/login-history/page'));
const RoleActivationsPage = lazy(() => import('./app/security/role-activations/page'));
const LinkedAccountsPage = lazy(() => import('./app/security/linked-accounts/page'));
const ActivityPage = lazy(() => import('./app/activity/page'));
const SessionsPage = lazy(() => import('./app/sessions/page'));
const NotificationsPage = lazy(() => import('./app/notifications/page'));
const NotifPrefsPage = lazy(() => import('./app/notifications/preferences/page'));
const DevicesPage = lazy(() => import('./app/devices/page'));
const PointsPage = lazy(() => import('./app/points/page'));
const WalletPage = lazy(() => import('./app/wallet/page'));
const WalletRechargePage = lazy(() => import('./app/wallet/recharge/page'));
const WalletWithdrawalsPage = lazy(() => import('./app/wallet/withdrawals/page'));
const BillingPage = lazy(() => import('./app/billing/page'));
const CompliancePage = lazy(() => import('./app/compliance/page'));
const StoragePage = lazy(() => import('./app/storage/page'));
const OnboardingPage = lazy(() => import('./app/onboarding/page'));
const CommunicationHistoryPage = lazy(() => import('./app/communication/page'));
const CommunicationSendPage = lazy(() => import('./app/communication/send/page'));
const PushTokensPage = lazy(() => import('./app/communication/push-tokens/page'));
const AnnouncementsPage = lazy(() => import('./app/announcements/page'));
const DevicesPairPage = lazy(() => import('./app/devices/pair/page'));
const DevicesFamilyPage = lazy(() => import('./app/devices/family/page'));
const DeviceTransferPage = lazy(() => import('./app/devices/[id]/transfer/page'));
const DeviceActivityPage = lazy(() => import('./app/devices/[id]/activity/page'));
const BillingSubscribePage = lazy(() => import('./app/billing/subscribe/page'));
const BillingInvoicesPage = lazy(() => import('./app/billing/invoices/page'));
const PaymentsPage = lazy(() => import('./app/payments/page'));
const PasskeyRegisterPage = lazy(() => import('./app/security/passkeys/register/page'));
const DeleteAccountPage = lazy(() => import('./app/security/delete-account/page'));
const ExportDataPage = lazy(() => import('./app/privacy/export-data/page'));
const RecoveryContactsPage = lazy(() => import('./app/security/recovery-contacts/page'));
const NotFoundPage = lazy(() => import('./app/not-found/page'));

function LayoutWrapper() {
	const { tenantSlug } = useParams();
	// basename 已剥离 URL 首段（真实 tenant slug）时，内部 tenantSlug 是路由段而非租户。
	// TenantSlugProvider 必须用完整 URL 首段（真实租户 slug）供 AppLayout 的 useTenant() 匹配。
	const urlSlug = useTenantSlugFromUrl();
	return (
		<TenantSlugProvider value={urlSlug ?? tenantSlug}>
			<AppLayout />
		</TenantSlugProvider>
	);
}

export default function App() {
	return (
		<ErrorBoundary>
			<Suspense fallback={<LoadingScreen message="加载中…" />}>
				<Routes>
					<Route path="/oauth/callback" element={<OAuthCallbackPage />} />

					<Route
						path="/:tenantSlug"
						element={
							<RequireAuth>
								<Suspense fallback={<LoadingScreen message="加载中…" />}>
									<LayoutWrapper />
								</Suspense>
							</RequireAuth>
						}
					>
						{appRoutes()}
					</Route>

					<Route path="*" element={<NotFoundPage />} />
				</Routes>
			</Suspense>
		</ErrorBoundary>
	);
}

function appRoutes() {
	return (
		<>
			<Route
				index
				element={
					<TenantIndexGuard notFound={<NotFoundPage />}>
						<DashboardPage />
					</TenantIndexGuard>
				}
			/>
			<Route path="profile" element={<ProfilePage />} />
			<Route path="profile/api/v1/profile/privacy-impact" element={<PrivacyImpactPage />} />
			<Route path="profile/api/v1/profile/consents" element={<ConsentsPage />} />
			<Route path="security" element={<SecurityPage />} />
			<Route path="security/login-history" element={<LoginHistoryPage />} />
			<Route path="security/role-activations" element={<RoleActivationsPage />} />
			<Route path="security/linked-accounts" element={<LinkedAccountsPage />} />
			<Route path="activity" element={<ActivityPage />} />
			<Route path="session/api/v1/sessions" element={<SessionsPage />} />
			<Route path="notification/api/v1/notifications" element={<NotificationsPage />} />
			<Route path="notification/api/v1/notifications/preferences" element={<NotifPrefsPage />} />
			<Route path="devices" element={<DevicesPage />} />
			<Route path="devices/pair" element={<DevicesPairPage />} />
			<Route path="devices/family" element={<DevicesFamilyPage />} />
			<Route path="devices/:id/transfer" element={<DeviceTransferPage />} />
			<Route path="devices/:id/activity" element={<DeviceActivityPage />} />
			<Route path="point/api/v1/points" element={<PointsPage />} />
			<Route path="wallet" element={<WalletPage />} />
			<Route path="wallet/api/v1/wallet/recharge" element={<WalletRechargePage />} />
			<Route path="wallet/api/v1/wallet/withdrawals" element={<WalletWithdrawalsPage />} />
			<Route path="billing" element={<BillingPage />} />
			<Route path="billing/api/v1/billing/subscribe" element={<BillingSubscribePage />} />
			<Route path="billing/api/v1/billing/invoices" element={<BillingInvoicesPage />} />
			<Route path="compliance/api/v1/compliance" element={<CompliancePage />} />
			<Route path="pay/api/v1/payments" element={<PaymentsPage />} />
			<Route path="security/passkeys/register" element={<PasskeyRegisterPage />} />
			<Route path="security/delete-account" element={<DeleteAccountPage />} />
			<Route path="privacy/export-data" element={<ExportDataPage />} />
			<Route path="security/recovery-contacts" element={<RecoveryContactsPage />} />
			<Route path="storage/api/v1/storage" element={<StoragePage />} />
			<Route path="onboarding" element={<OnboardingPage />} />
			<Route path="communication/api/v1/communication" element={<CommunicationHistoryPage />} />
			<Route path="communication/api/v1/communication/send" element={<CommunicationSendPage />} />
			<Route path="communication/push-tokens" element={<PushTokensPage />} />
			<Route path="notification/api/v1/announcements" element={<AnnouncementsPage />} />
			<Route path="*" element={<NotFoundPage />} />
		</>
	);
}
