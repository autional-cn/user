'use client';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { FileQuestion } from 'lucide-react';

export default function NotFoundPage() {
	const { t } = useTranslation();
	return (
		<div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
			<div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-50">
				<FileQuestion size={40} className="text-primary-600" />
			</div>
			<h1 className="mt-6 text-4xl font-bold text-neutral-900">404</h1>
			<p className="mt-2 text-lg text-neutral-600">{t('notFound.title')}</p>
			<p className="mt-1 text-sm text-neutral-400">{t('notFound.description')}</p>
			<Link
				to="/"
				className="mt-8 rounded-md bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
			>
				{t('notFound.back')}
			</Link>
		</div>
	);
}
