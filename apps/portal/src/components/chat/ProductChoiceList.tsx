import { PackageSearch } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ProductChoiceListData } from '../../lib/chat-types'
import { toArabicIndic } from '../../lib/localized-digits'
import { ActionButton } from './ActionButton'

interface ProductChoiceListProps {
	data: ProductChoiceListData
}

export function ProductChoiceList({ data }: ProductChoiceListProps) {
	const { i18n } = useTranslation('portal')
	const isArabic = i18n.language === 'ar'

	return (
		<section className="mt-3 w-full max-w-[660px] border border-[var(--p-rule)] bg-[var(--p-surface-subtle)] px-3 py-3">
			<div className="flex items-start gap-3 border-b border-[var(--p-rule)] pb-3">
				<span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--p-border)] bg-[var(--p-card)] text-[var(--p-text)]">
					<PackageSearch size={15} strokeWidth={1.8} />
				</span>
				<div className="min-w-0">
					<h3 className="text-[14px] font-semibold text-[var(--p-text)]">
						{data.title}
					</h3>
					<p className="mt-1 text-[12px] leading-5 text-[var(--p-text-muted)]">
						{data.description}
					</p>
				</div>
			</div>

			<div className="mt-3 grid gap-3">
				{data.groups.map((group) => (
					<div
						key={group.pendingChoiceId}
						className="border border-[var(--p-rule)] bg-[var(--p-card)] px-2.5 py-2.5"
					>
						<div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2">
							<p className="min-w-0 text-[12px] font-semibold text-[var(--p-text)]">
								{group.title}
							</p>
							<p className="voice-mono text-[11px] text-[var(--p-text-muted)]">
								{isArabic
									? toArabicIndic(String(group.quantity))
									: group.quantity}{' '}
								{group.query}
							</p>
						</div>
						<div className="mt-2 grid gap-1.5">
							{group.options.map((option) => {
								const name = isArabic
									? (option.nameAr ?? option.name)
									: option.name
								const unit = isArabic
									? (option.unitAr ?? option.unit)
									: option.unit
								const subtitle = [
									option.category,
									option.subcategory,
									unit,
									option.priceRange,
								]
									.filter(Boolean)
									.join(' · ')
								return (
									<div
										key={option.productId}
										className="grid min-w-0 grid-cols-1 gap-2 border border-[var(--p-rule)] bg-[var(--p-surface-subtle)] px-2.5 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
									>
										<div className="min-w-0">
											<p className="break-words text-[12px] font-semibold text-[var(--p-text)]">
												{name}
											</p>
											<p className="mt-1 break-words text-[11px] leading-4 text-[var(--p-text-muted)]">
												{subtitle}
											</p>
										</div>
										<ActionButton data={option.action} />
									</div>
								)
							})}
						</div>
					</div>
				))}
			</div>
		</section>
	)
}
