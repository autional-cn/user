import { useTheme as useSharedTheme } from '@autional-cn/ui';
import type { Theme } from '@autional-cn/ui';

export type { Theme };

export function useTheme() {
	const { theme, toggle } = useSharedTheme();
	return { isDark: theme === 'dark', theme, toggle };
}
