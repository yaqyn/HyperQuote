import { useState } from 'react'
import type { SearchResultGroup } from '../../types/entity'
import { SearchResultRow } from './SearchResultRow'

interface EntityGroupProps {
	group: SearchResultGroup
	focusedIndex: number | null
	rowStartIndex: number
	onRowFocus: (globalIndex: number) => void
	onArrowUp: (globalIndex: number) => void
	onArrowDown: (globalIndex: number) => void
}

export function EntityGroup({
	group,
	focusedIndex,
	rowStartIndex,
	onRowFocus,
	onArrowUp,
	onArrowDown,
}: EntityGroupProps) {
	const [collapsed, setCollapsed] = useState(false)

	return (
		<div className="flex flex-col gap-1">
			{/* Group header */}
			<h3 aria-level={3} className="m-0">
				<button
					type="button"
					onClick={() => setCollapsed((prev) => !prev)}
					className="flex w-full cursor-pointer items-center justify-between px-3 py-1.5 outline-none focus-visible:bg-[var(--color-surface)] rounded-md"
				>
					<span className="text-sm font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
						{group.label}
					</span>
					{group.total > 3 && (
						<span className="text-sm text-[var(--color-text-muted)]">
							View all ({group.total})
						</span>
					)}
				</button>
			</h3>

			{/* Rows */}
			{!collapsed && (
				<div role="listbox" aria-label={group.label}>
					{group.results.map((result, i) => {
						const globalIndex = rowStartIndex + i
						return (
							<SearchResultRow
								key={result.id}
								result={result}
								isFocused={focusedIndex === globalIndex}
								onFocus={() => onRowFocus(globalIndex)}
								onArrowUp={() => onArrowUp(globalIndex)}
								onArrowDown={() => onArrowDown(globalIndex)}
							/>
						)
					})}
				</div>
			)}
		</div>
	)
}
