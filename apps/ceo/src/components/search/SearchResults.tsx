import { useMemo, useState } from 'react'
import type { SearchResultGroup } from '../../types/entity'
import { EntityGroup } from './EntityGroup'

interface SearchResultsProps {
	groups: SearchResultGroup[]
	query: string
}

export function SearchResults({ groups, query }: SearchResultsProps) {
	const [focusedIndex, setFocusedIndex] = useState<number | null>(null)

	// Build a flat index mapping for arrow key navigation
	const totalRows = useMemo(
		() => groups.reduce((sum, g) => sum + g.results.length, 0),
		[groups],
	)

	if (groups.length === 0) {
		return (
			<div className="flex flex-col items-center gap-3 px-6 py-12">
				<p className="text-base text-[var(--color-text-muted)]">
					No results found for &lsquo;{query}&rsquo;
				</p>
				<p className="text-sm text-[var(--color-text-subtle)]">
					Try asking the AI assistant instead
				</p>
			</div>
		)
	}

	function handleArrowUp(globalIndex: number) {
		if (globalIndex > 0) {
			setFocusedIndex(globalIndex - 1)
		}
	}

	function handleArrowDown(globalIndex: number) {
		if (globalIndex < totalRows - 1) {
			setFocusedIndex(globalIndex + 1)
		}
	}

	let rowOffset = 0

	return (
		<div className="flex flex-col gap-4">
			{groups.map((group) => {
				const startIndex = rowOffset
				rowOffset += group.results.length
				return (
					<EntityGroup
						key={group.type}
						group={group}
						focusedIndex={focusedIndex}
						rowStartIndex={startIndex}
						onRowFocus={setFocusedIndex}
						onArrowUp={handleArrowUp}
						onArrowDown={handleArrowDown}
					/>
				)
			})}
		</div>
	)
}
