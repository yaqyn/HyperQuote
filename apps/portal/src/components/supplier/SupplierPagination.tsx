import { Button } from 'react-aria-components'

interface SupplierPaginationProps {
	page: number
	totalPages: number
	previousLabel: string
	nextLabel: string
	onPageChange: (page: number) => void
}

export function SupplierPagination({
	page,
	totalPages,
	previousLabel,
	nextLabel,
	onPageChange,
}: SupplierPaginationProps) {
	if (totalPages <= 1) return null

	return (
		<div className="flex items-center justify-center gap-4 py-2">
			<Button
				isDisabled={page <= 1}
				onPress={() => onPageChange(page - 1)}
				className="h-9 px-4 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)] cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-default"
			>
				{previousLabel}
			</Button>
			<span className="font-mono text-sm text-[var(--color-text-muted)]">
				{page} / {totalPages}
			</span>
			<Button
				isDisabled={page >= totalPages}
				onPress={() => onPageChange(page + 1)}
				className="h-9 px-4 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)] cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-default"
			>
				{nextLabel}
			</Button>
		</div>
	)
}
