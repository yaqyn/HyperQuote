/**
 * UploadHistoryList -- catalog upload history with status badges and clickable cards.
 * Click card -> navigates to /supplier/catalog-upload?uploadId={id} for review.
 * Cards are keyboard-accessible using React Aria Button semantics.
 */

import { StatusBadge } from '@hyperquote/ui'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { FileText } from 'lucide-react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { getSupplierUploadHistory } from '../../lib/server/supplier-catalog'

const STATUS_MAP = {
	processing: { variant: 'neutral' as const, key: 'supplier.processing' },
	completed: { variant: 'success' as const, key: 'supplier.completed' },
	failed: { variant: 'error' as const, key: 'supplier.failed' },
	review_required: {
		variant: 'warning' as const,
		key: 'supplier.reviewRequired',
	},
}

interface UploadHistoryListProps {
	locale: 'ar' | 'en'
}

export default function UploadHistoryList({ locale }: UploadHistoryListProps) {
	const { t } = useTranslation('portal')
	const navigate = useNavigate()

	const { data, isLoading } = useQuery({
		queryKey: ['supplier-upload-history'],
		queryFn: () => getSupplierUploadHistory({ data: { page: 1, limit: 20 } }),
		staleTime: 60_000,
	})

	const dateFormatter = new Intl.DateTimeFormat(
		locale === 'ar' ? 'ar-EG' : 'en-EG',
		{ dateStyle: 'medium' },
	)

	if (isLoading) {
		return (
			<div className="flex flex-col gap-3">
				{[1, 2, 3].map((i) => (
					<div
						key={i}
						className="h-20 rounded-xl bg-[var(--color-surface)] animate-pulse"
					/>
				))}
			</div>
		)
	}

	if (!data?.uploads?.length) {
		return (
			<div className="flex flex-col items-center justify-center py-16">
				<p className="text-sm text-[var(--color-text-muted)]">
					{locale === 'ar'
						? 'لا يوجد سجل رفع كتالوجات'
						: 'No upload history yet'}
				</p>
			</div>
		)
	}

	return (
		<div className="flex flex-col gap-3">
			{data.uploads.map((upload) => {
				const statusInfo = STATUS_MAP[upload.status]
				return (
					<Button
						key={upload.id}
						onPress={() =>
							navigate({
								to: '/supplier/catalog-upload',
								search: { uploadId: upload.id },
							})
						}
						className="flex items-center gap-4 px-4 py-4 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface)] cursor-pointer transition-colors text-start w-full"
					>
						<div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-surface)] shrink-0">
							<FileText size={20} className="text-[var(--color-text-muted)]" />
						</div>
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2">
								<span className="text-sm font-medium text-[var(--color-text)] truncate">
									{upload.filename}
								</span>
								<StatusBadge status={statusInfo.variant}>
									{t(statusInfo.key)}
								</StatusBadge>
							</div>
							<div className="flex items-center gap-3 mt-1">
								<span className="font-mono text-[13px] text-[var(--color-text-muted)]">
									{dateFormatter.format(new Date(upload.uploadedAt))}
								</span>
								<span className="font-mono text-[13px] text-[var(--color-text-muted)]">
									{upload.itemsParsed} {locale === 'ar' ? 'عنصر' : 'items'}
								</span>
							</div>
						</div>
					</Button>
				)
			})}
		</div>
	)
}
