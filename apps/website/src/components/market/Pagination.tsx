import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
	total: number
	page: number
	limit: number
	onPageChange: (page: number) => void
}

export function Pagination({ total, page, limit, onPageChange }: PaginationProps) {
	const { i18n } = useTranslation()
	const totalPages = Math.ceil(total / limit)

	// Don't render for single page
	if (totalPages <= 1) return null

	const isRTL = i18n.dir() === 'rtl'

	// Generate page numbers to show
	const pages = generatePageNumbers(page, totalPages)

	return (
		<nav
			aria-label="Pagination"
			className="flex items-center justify-center gap-1 mt-8"
		>
			{/* Previous button */}
			<button
				type="button"
				onClick={() => onPageChange(page - 1)}
				disabled={page <= 1}
				className="p-2 rounded-lg text-[var(--color-text)] hover:bg-[var(--color-surface)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
				aria-label="Previous page"
			>
				{isRTL ? (
					<ChevronRight size={18} aria-hidden="true" />
				) : (
					<ChevronLeft size={18} aria-hidden="true" />
				)}
			</button>

			{/* Page numbers (hidden on mobile, show prev/next only) */}
			<div className="hidden md:flex items-center gap-1">
				{pages.map((p, i) =>
					p === '...' ? (
						<span
							key={`ellipsis-${i}`}
							className="w-8 h-8 flex items-center justify-center text-sm text-[var(--color-text-muted)]"
						>
							...
						</span>
					) : (
						<button
							key={p}
							type="button"
							onClick={() => onPageChange(p as number)}
							className={`w-8 h-8 rounded-lg font-mono text-sm font-semibold transition-colors ${
								p === page
									? 'bg-[var(--color-primary)] text-white'
									: 'text-[var(--color-text)] hover:bg-[var(--color-surface)]'
							}`}
							aria-current={p === page ? 'page' : undefined}
						>
							{p}
						</button>
					),
				)}
			</div>

			{/* Mobile page indicator */}
			<span className="md:hidden font-mono text-sm text-[var(--color-text-muted)]">
				{page} / {totalPages}
			</span>

			{/* Next button */}
			<button
				type="button"
				onClick={() => onPageChange(page + 1)}
				disabled={page >= totalPages}
				className="p-2 rounded-lg text-[var(--color-text)] hover:bg-[var(--color-surface)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
				aria-label="Next page"
			>
				{isRTL ? (
					<ChevronLeft size={18} aria-hidden="true" />
				) : (
					<ChevronRight size={18} aria-hidden="true" />
				)}
			</button>
		</nav>
	)
}

function generatePageNumbers(
	current: number,
	total: number,
): (number | '...')[] {
	if (total <= 7) {
		return Array.from({ length: total }, (_, i) => i + 1)
	}

	const pages: (number | '...')[] = [1]

	if (current > 3) {
		pages.push('...')
	}

	const start = Math.max(2, current - 1)
	const end = Math.min(total - 1, current + 1)

	for (let i = start; i <= end; i++) {
		pages.push(i)
	}

	if (current < total - 2) {
		pages.push('...')
	}

	pages.push(total)

	return pages
}
