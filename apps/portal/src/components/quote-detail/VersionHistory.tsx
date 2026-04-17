import { CurrencyDisplay, DateDisplay, StatusBadge } from '@hyperquote/ui'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { QuoteItem, QuoteVersion } from '../../types/quote'

interface VersionHistoryProps {
	versions: QuoteVersion[]
	onCompare: () => void
}

function getStatusVariant(
	status: string,
): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
	switch (status) {
		case 'accepted':
			return 'success'
		case 'sent':
		case 'viewed':
			return 'info'
		case 'negotiating':
		case 'revised':
			return 'warning'
		case 'declined':
		case 'expired':
		case 'cancelled':
			return 'error'
		default:
			return 'neutral'
	}
}

/** Compare two versions and find item diffs */
function diffItems(
	prev: QuoteItem[] | undefined,
	current: QuoteItem[],
): Array<{
	item: QuoteItem
	change: 'added' | 'removed' | 'modified' | 'unchanged'
	oldPrice?: number
	oldQty?: number
}> {
	if (!prev) {
		return current.map((item) => ({ item, change: 'unchanged' as const }))
	}

	const prevMap = new Map(prev.map((i) => [i.productId, i]))
	const currentMap = new Map(current.map((i) => [i.productId, i]))
	const result: Array<{
		item: QuoteItem
		change: 'added' | 'removed' | 'modified' | 'unchanged'
		oldPrice?: number
		oldQty?: number
	}> = []

	for (const item of current) {
		const old = prevMap.get(item.productId)
		if (!old) {
			result.push({ item, change: 'added' })
		} else if (
			old.unitPrice !== item.unitPrice ||
			old.quantity !== item.quantity
		) {
			result.push({
				item,
				change: 'modified',
				oldPrice: old.unitPrice,
				oldQty: old.quantity,
			})
		} else {
			result.push({ item, change: 'unchanged' })
		}
	}

	for (const old of prev) {
		if (!currentMap.has(old.productId)) {
			result.push({ item: old, change: 'removed' })
		}
	}

	return result
}

export function VersionHistory({ versions, onCompare }: VersionHistoryProps) {
	const { t, i18n } = useTranslation('portal')
	const isArabic = i18n.language === 'ar'
	const [expandedVersion, setExpandedVersion] = useState<string | null>(null)

	if (versions.length <= 1) return null

	const sortedVersions = [...versions].sort(
		(a, b) => b.versionNumber - a.versionNumber,
	)

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold text-[var(--color-text)]">
					{t('quoteDetail.versionHistory')}
				</h3>
				<button
					type="button"
					onClick={onCompare}
					className="text-sm text-[var(--color-primary)] font-medium hover:underline cursor-pointer"
				>
					{t('quoteDetail.compareVersions')}
				</button>
			</div>

			{sortedVersions.map((version, idx) => {
				const isExpanded = expandedVersion === version.id
				const prevVersion = sortedVersions[idx + 1]
				const diffs = isExpanded
					? diffItems(prevVersion?.items, version.items)
					: []

				return (
					<div
						key={version.id}
						className="border border-[var(--color-border)] rounded-xl overflow-hidden"
					>
						<button
							type="button"
							onClick={() => setExpandedVersion(isExpanded ? null : version.id)}
							className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[var(--color-surface)] transition-colors"
						>
							<div className="flex items-center gap-3">
								<span className="text-sm font-medium text-[var(--color-text)]">
									{t('quoteDetail.version', { number: version.versionNumber })}
								</span>
								<DateDisplay date={version.createdAt} format="short" />
								<StatusBadge status={getStatusVariant(version.status)}>
									{version.status}
								</StatusBadge>
							</div>
							{isExpanded ? (
								<ChevronUp
									size={16}
									className="text-[var(--color-text-muted)]"
								/>
							) : (
								<ChevronDown
									size={16}
									className="text-[var(--color-text-muted)]"
								/>
							)}
						</button>

						{isExpanded && (
							<div className="border-t border-[var(--color-border)] px-4 py-3">
								{version.notes && (
									<p className="text-[13px] text-[var(--color-text-muted)] mb-3">
										{version.notes}
									</p>
								)}
								<div className="flex flex-col gap-2">
									{diffs.map((diff) => (
										<div
											key={diff.item.id}
											className={[
												'flex items-center justify-between px-3 py-2 rounded-lg text-sm',
												diff.change === 'added'
													? 'bg-green-50 dark:bg-green-950/20'
													: diff.change === 'removed'
														? 'bg-red-50 dark:bg-red-950/20'
														: diff.change === 'modified'
															? 'bg-amber-50 dark:bg-amber-950/20'
															: '',
											].join(' ')}
										>
											<span
												className={[
													'text-[var(--color-text)]',
													diff.change === 'removed' ? 'line-through' : '',
												].join(' ')}
											>
												{isArabic
													? diff.item.productNameAr
													: diff.item.productName}
											</span>
											<span className="font-mono text-[var(--color-text)]">
												{diff.change === 'modified' &&
													diff.oldPrice !== undefined && (
														<span className="text-[var(--color-text-muted)] line-through me-2 font-mono">
															<CurrencyDisplay value={diff.oldPrice} />
														</span>
													)}
												<CurrencyDisplay value={diff.item.unitPrice} />
											</span>
										</div>
									))}
								</div>
								<div className="mt-3 flex justify-end">
									<span className="font-mono font-semibold text-sm text-[var(--color-text)]">
										{t('quoteDetail.total')}:{' '}
										<CurrencyDisplay value={version.total} />
									</span>
								</div>
							</div>
						)}
					</div>
				)
			})}
		</div>
	)
}
