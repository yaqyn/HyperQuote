/**
 * Saved list card for Drafts tab.
 * Shows list name, item count, last used date, Reorder button, Edit link, Delete.
 * Geist Mono for item count and dates.
 */

import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import type { SavedList } from '../../types/order'

interface SavedListCardProps {
	list: SavedList
	onReorder: () => void
	onEdit: () => void
	onDelete: () => void
}

export function SavedListCard({
	list,
	onReorder,
	onEdit,
	onDelete,
}: SavedListCardProps) {
	const { t } = useTranslation('portal')
	const [confirmDelete, setConfirmDelete] = useState(false)

	const formattedDate = new Date(list.lastUsedAt).toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	})

	return (
		<div className="flex items-center justify-between bg-[var(--color-base)] rounded-xl p-4 border border-[var(--color-border)]">
			{/* Left: Info */}
			<div className="flex flex-col gap-1 min-w-0 flex-1">
				<span className="text-sm font-medium text-[var(--color-text)] truncate">
					{list.name}
				</span>
				<span className="font-mono text-[13px] text-[var(--color-text-muted)]">
					{list.items.length} {t('orders.items')}
				</span>
				<span className="font-mono text-[13px] text-[var(--color-text-subtle)]">
					{t('orders.lastUsed', { date: formattedDate })}
				</span>
			</div>

			{/* Right: Actions */}
			<div className="flex items-center gap-2 shrink-0">
				<Button
					onPress={onReorder}
					className="h-9 px-4 rounded-lg border border-[var(--color-primary)] text-[13px] text-[var(--color-primary)] font-medium hover:bg-[var(--color-primary)]/5 cursor-pointer transition-colors"
				>
					{t('orders.reorder')}
				</Button>

				<Button
					onPress={onEdit}
					className="text-[13px] text-[var(--color-primary)] cursor-pointer hover:underline"
				>
					{t('orders.edit')}
				</Button>

				{confirmDelete ? (
					<div className="flex items-center gap-1">
						<Button
							onPress={() => {
								onDelete()
								setConfirmDelete(false)
							}}
							className="h-8 px-2 rounded-lg text-[13px] text-[var(--color-error)] cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
						>
							{t('orders.confirmDelete')}
						</Button>
						<Button
							onPress={() => setConfirmDelete(false)}
							className="h-8 px-2 rounded-lg text-[13px] text-[var(--color-text-muted)] cursor-pointer"
						>
							{t('orders.cancel')}
						</Button>
					</div>
				) : (
					<Button
						onPress={() => setConfirmDelete(true)}
						className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-error)] cursor-pointer transition-colors"
						aria-label={t('orders.savedListDelete', { name: list.name })}
					>
						<Trash2 size={16} />
					</Button>
				)}
			</div>
		</div>
	)
}
