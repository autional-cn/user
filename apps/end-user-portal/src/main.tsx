import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider, ThemeProvider } from '@autional-cn/ui';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './app/globals.css';
import './i18n';

registerSW({ immediate: true });

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: 1,
			refetchOnWindowFocus: false,
		},
	},
});

const root = document.getElementById('root');
if (root) {
	createRoot(root).render(
		<StrictMode>
			<QueryClientProvider client={queryClient}>
				<ThemeProvider storageKey="end-user-portal-theme">
					<ToastProvider>
						{/* basename 恒为 "/"：所有导航链接经 buildNavHref 带 tenantSlug 绝对路径。
						    早期用 resolvePortalBasename() 动态 basename，SPA 导航后 pathname 变化
						    导致 basename 与链接重算不一致 → 侧边栏 slug 退化 + 双重前缀自锁（P1）。 */}
						<BrowserRouter basename="/">
							<App />
						</BrowserRouter>
					</ToastProvider>
				</ThemeProvider>
			</QueryClientProvider>
		</StrictMode>,
	);
}
