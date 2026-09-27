import { ErrorBoundary as SharedErrorBoundary } from '@autional-cn/ui';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
	children: ReactNode;
}

export function ErrorBoundary({ children }: Props) {
	const { t } = useTranslation();
	return (
		<SharedErrorBoundary
			title={t('errorBoundary.title')}
			message={t('errorBoundary.description')}
			retryLabel={t('errorBoundary.reload')}
			devMode={import.meta.env.DEV}
		>
			{children}
		</SharedErrorBoundary>
	);
}
