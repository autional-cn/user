import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router';
import { ThemeProvider } from '@autional-cn/ui';
import { AntdThemeProvider } from '@autional-cn/ui/antd';
import i18n from '@/i18n';

// 测试中强制使用中文，避免 navigator 语言检测导致断言失败
i18n.changeLanguage('zh-CN');

// 这层包装必须与 src/main.tsx 的 Provider 栈一致。
// 少一层 AntdThemeProvider 的后果实测得到：antd 组件会走**出厂配色**，
// 于是测试与 Storybook 里看到的样子和生产不是同一个东西 ——
// 那种「测试全绿但线上不是一个样」的差距，正是这一层要消灭的。
export function TestWrapper({ children }: { children: React.ReactNode }) {
	return (
		<MemoryRouter>
			<I18nextProvider i18n={i18n}>
				<ThemeProvider storageKey="end-user-portal-test-theme">
					<AntdThemeProvider>{children}</AntdThemeProvider>
				</ThemeProvider>
			</I18nextProvider>
		</MemoryRouter>
	);
}
