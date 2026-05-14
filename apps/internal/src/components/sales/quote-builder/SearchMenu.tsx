import { Search, X } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Button } from 'react-aria-components'

interface SearchMenuProps {
	isOpen: boolean
	onClose: () => void
	placeholder?: string
	onEnter?: (search: string) => void
	/** Optional side rail rendered to the left of the results. Categories,
	 *  filters, anything the caller needs for a composed browser. */
	sidebar?: ReactNode
	/** Compact controls that belong beside the search input, such as filters. */
	searchTools?: ReactNode
	/** Optional result count or status line shown next to the search input. */
	resultStatus?: ReactNode
	children: (search: string) => ReactNode
}

/**
 * SearchMenu — the shared command/search palette chrome. Keyboard-driven,
 * typographic; the children callback receives the current query and can
 * render grouped / filtered / whatever the caller wants.
 *
 * Contract:
 *   - Every callable row inside `children` must be a `button[type="button"]`
 *     so the arrow-key keyboard flow can discover it. Rows render the
 *     `data-active="true"` attribute when they are the keyboard-focused row.
 *   - Escape closes. `/` (not in an input) focuses the search.
 *   - Enter triggers the active row's click, or `onEnter(query)` as a
 *     fallback for raw-query commits.
 */
export function SearchMenu({
	isOpen,
	onClose,
	placeholder = 'Search…',
	onEnter,
	sidebar,
	searchTools,
	resultStatus,
	children,
}: SearchMenuProps) {
	const reduceMotion = useReducedMotion()
	const [search, setSearch] = useState('')
	const [activeIndex, setActiveIndex] = useState(0)
	const inputRef = useRef<HTMLInputElement>(null)
	const listRef = useRef<HTMLDivElement>(null)
	const shouldScrollActiveRef = useRef(false)

	useEffect(() => {
		if (isOpen) {
			const t = setTimeout(() => inputRef.current?.focus(), 100)
			setSearch('')
			setActiveIndex(0)
			shouldScrollActiveRef.current = false
			return () => clearTimeout(t)
		}
	}, [isOpen])

	const getItems = () =>
		Array.from(
			listRef.current?.querySelectorAll<HTMLButtonElement>(
				'button[data-searchmenu-row="true"]',
			) ?? [],
		)

	// Highlight the keyboard-focused row and keep it in view.
	useEffect(() => {
		const items = getItems()
		items.forEach((btn, i) => {
			btn.dataset.active = i === activeIndex ? 'true' : 'false'
		})
		if (shouldScrollActiveRef.current) {
			items[activeIndex]?.scrollIntoView({ block: 'nearest' })
			shouldScrollActiveRef.current = false
		}
	})

	return (
		<AnimatePresence>
			{isOpen && (
				<>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px]"
						onClick={onClose}
						aria-hidden="true"
					/>
					<motion.div
						role="dialog"
						aria-label={placeholder}
						aria-modal="true"
						initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
						transition={{ type: 'spring', stiffness: 320, damping: 32 }}
						className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-black/[0.08] bg-[var(--color-surface)] shadow-[0_24px_80px_-32px_rgba(0,0,0,0.72)] dark:border-white/[0.1]"
					>
						{/* Search input */}
						<div
							className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-5"
							style={{ borderBottom: '1px solid var(--color-border)' }}
						>
							<Search
								size={15}
								strokeWidth={1.5}
								className="shrink-0 text-[var(--color-text-subtle)]"
								aria-hidden="true"
							/>
							<input
								ref={inputRef}
								type="text"
								value={search}
								onChange={(e) => {
									setSearch(e.target.value)
									setActiveIndex(0)
									shouldScrollActiveRef.current = false
								}}
								onKeyDown={(e) => {
									if (e.key === 'Escape') onClose()
									else if (e.key === 'ArrowDown') {
										e.preventDefault()
										const count = getItems().length
										if (count > 0) {
											shouldScrollActiveRef.current = true
											setActiveIndex((i) => (i + 1) % count)
										}
									} else if (e.key === 'ArrowUp') {
										e.preventDefault()
										const count = getItems().length
										if (count > 0) {
											shouldScrollActiveRef.current = true
											setActiveIndex((i) => (i - 1 + count) % count)
										}
									} else if (e.key === 'Enter') {
										e.preventDefault()
										const items = getItems()
										if (items[activeIndex]) items[activeIndex].click()
										else if (onEnter) onEnter(search)
									}
								}}
								placeholder={placeholder}
								className="min-w-0 flex-1 bg-transparent font-[family-name:var(--font-archivo)] text-[16px] text-[var(--color-text)] outline-none placeholder:italic placeholder:text-[var(--color-text-subtle)]/50 lg:text-[14px]"
								aria-label={placeholder}
							/>
							{searchTools}
							{resultStatus && (
								<span
									className="order-3 w-full shrink-0 text-end font-[family-name:var(--font-archivo)] italic text-[var(--color-text-subtle)] lg:order-none lg:w-auto"
									style={{ fontSize: '11px' }}
									aria-live="polite"
								>
									{resultStatus}
								</span>
							)}
							<Button
								onPress={onClose}
								aria-label="Close search"
								className="group relative inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-[var(--color-text-subtle)] outline-none transition-colors hover:bg-black/[0.05] hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 dark:hover:bg-white/[0.06]"
							>
								<X size={13} strokeWidth={1.5} aria-hidden="true" />
							</Button>
						</div>

						{/* Body: optional sidebar + results */}
						<div className="flex min-h-0 flex-1 flex-col lg:flex-row">
							{sidebar && (
								<aside className="max-h-[42dvh] w-full shrink-0 overflow-y-auto border-b border-[var(--color-border)] py-0 lg:max-h-none lg:w-[172px] lg:border-e lg:border-b-0 lg:py-2">
									{sidebar}
								</aside>
							)}
							<div
								ref={listRef}
								className="flex-1 min-h-0 overflow-y-auto"
								data-module-content
							>
								{children(search)}
							</div>
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	)
}
