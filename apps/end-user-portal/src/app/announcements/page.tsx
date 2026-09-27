'use client';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnnouncements } from '@/hooks/queries';
import { formatTime } from '@/lib/format';
import { LoadingScreen } from '@autional-cn/ui';
import { ErrorState } from '@autional-cn/ui';
import { Megaphone, ChevronDown, ChevronRight, ChevronLeft, Eye, X } from 'lucide-react';

export default function AnnouncementsPage() {
	const { t } = useTranslation();
	const [page, setPage] = useState(1);
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [dismissed, setDismissed] = useState<Set<string>>(new Set());
	const pageSize = 10;

	const { data, isLoading, error } = useAnnouncements({
		page,
		pageSize,
		status: 'published',
	});

	const list = (data as any)?.items || [];
	const total = (data as any)?.total || 0;
	const pagination = (data as any)?.pagination;

	const visibleList = list.filter((a: any) => !dismissed.has(a.id));

	const handleDismiss = (id: string) => {
		setDismissed((prev) => new Set(prev).add(id));
		if (expandedId === id) setExpandedId(null);
	};

	if (isLoading) return <LoadingScreen message={t('announcements.loading')} />;
	if (error) return <ErrorState message={t('announcements.error')} className="min-h-[40vh]" />;

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-xl font-bold text-neutral-900">
					{t('announcements.title', 'Announcements')}
				</h2>
				<p className="mt-1 text-sm text-neutral-500">
					{t('announcements.description', 'Stay updated with the latest news and updates')}
				</p>
			</div>

			<div className="space-y-3">
				{visibleList.map((ann: any) => (
					<div
						key={ann.id}
						className="rounded-lg border border-neutral-200 bg-white shadow-sm overflow-hidden transition-shadow hover:shadow-md"
					>
						<button
							onClick={() => setExpandedId(expandedId === ann.id ? null : ann.id)}
							className="flex w-full items-start gap-4 p-5 text-left"
						>
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700">
								<Megaphone size={20} />
							</div>
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2">
									<h3 className="text-base font-semibold text-neutral-900">{ann.title}</h3>
									{ann.views != null && (
										<span className="flex items-center gap-1 text-xs text-neutral-400">
											<Eye size={12} />
											{ann.views}
										</span>
									)}
								</div>
								{expandedId !== ann.id && (
									<p className="mt-1 text-sm text-neutral-500 line-clamp-2">
										{ann.content?.slice(0, 200) ||
											t('announcements.noContentPreview', '(no content)')}
									</p>
								)}
								<div className="mt-2 flex items-center justify-between">
									<span className="text-xs text-neutral-400">
										{ann.publishAt
											? t('announcements.published', { date: formatTime(ann.publishAt) })
											: formatTime(ann.createdAt)}
									</span>
									<div className="flex items-center gap-2">
										<button
											onClick={(e) => {
												e.stopPropagation();
												handleDismiss(ann.id);
											}}
											className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
										>
											<X size={12} />
											{t('announcements.dismiss', 'Dismiss')}
										</button>
										<span className="text-xs text-neutral-400">
											{expandedId === ann.id ? (
												<ChevronDown size={14} className="text-neutral-400" />
											) : (
												<ChevronRight size={14} className="text-neutral-400" />
											)}
										</span>
									</div>
								</div>
							</div>
						</button>

						{expandedId === ann.id && (
							<div className="border-t border-neutral-100 px-5 py-4 bg-neutral-50">
								<div className="prose prose-sm max-w-none text-neutral-700 whitespace-pre-wrap">
									{ann.content || t('announcements.noContent', '(no content)')}
								</div>
								<div className="mt-4 flex flex-wrap items-center gap-2">
									{ann.targetRoles?.map((role: string) => (
										<span
											key={role}
											className="rounded bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-600"
										>
											{role}
										</span>
									))}
									{ann.expireAt && (
										<span className="text-xs text-neutral-400">
											{t('announcements.expiresAt', 'Expires:')} {formatTime(ann.expireAt)}
										</span>
									)}
								</div>
								<button
									onClick={() => handleDismiss(ann.id)}
									className="mt-3 text-sm font-medium text-primary-700 hover:text-primary-800"
								>
									{t('announcements.dismissAndClose', 'Dismiss')}
								</button>
							</div>
						)}
					</div>
				))}

				{visibleList.length === 0 && (
					<div className="flex flex-col items-center justify-center rounded-lg border border-neutral-200 bg-white py-16 text-center">
						<Megaphone size={40} className="text-neutral-300" />
						<p className="mt-4 text-sm text-neutral-500">
							{t('announcements.empty', 'No announcements')}
						</p>
					</div>
				)}
			</div>

			{pagination && pagination.totalPages > 1 && (
				<div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3">
					<span className="text-sm text-neutral-500">
						{t('announcements.pageInfo', {
							page: pagination.page,
							totalPages: pagination.totalPages,
						})}
					</span>
					<div className="flex items-center gap-2">
						<button
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={!pagination.hasPrev}
							className="flex items-center gap-1 rounded-md border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed"
						>
							<ChevronLeft size={14} /> {t('notifications.prev')}
						</button>
						<button
							onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
							disabled={!pagination.hasNext}
							className="flex items-center gap-1 rounded-md border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed"
						>
							{t('notifications.next')}
							<ChevronRight size={14} />
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
