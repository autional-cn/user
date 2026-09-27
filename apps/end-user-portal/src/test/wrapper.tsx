import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router';
import i18n from '@/i18n';

// 测试中强制使用中文，避免 navigator 语言检测导致断言失败
i18n.changeLanguage('zh-CN');

export function TestWrapper({ children }: { children: React.ReactNode }) {
	return (
		<MemoryRouter>
			<I18nextProvider i18n={i18n}>{children}</I18nextProvider>
		</MemoryRouter>
	);
}
