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
	resultStatus,
	children,
}: SearchMenuProps) {
	const reduceMotion = useReducedMotion()
	const [search, setSearch] = useState('')
	const [activeIndex, setActiveIndex] = useState(0)
	const inputRef = useRef<HTMLInputElement>(null)
	const listRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (isOpen) {
			const t = setTimeout(() => inputRef.current?.focus(), 100)
			setSearch('')
			setActiveIndex(0)
			return () => clearTimeout(t)
		}
	}, [isOpen])

	useEffect(() => {
		setActiveIndex(0)
	}, [])

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
			if (i === activeIndex) btn.scrollIntoView({ block: 'nearest' })
		})
	})

	return (
		<AnimatePresence>
			{isOpen && (
				<>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px]"
						onClick={onClose}
						aria-hidden="true"
					/>
					<motion.div
						role="dialog"
						aria-label={placeholder}
						aria-modal="true"
						initial={
							reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }
						}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={
							reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }
						}
						transition={{ type: 'spring', stiffness: 320, damping: 32 }}
						className="fixed left-1/2 top-[15vh] -translate-x-1/2 z-50 flex w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-[var(--color-surface)] max-h-[70vh]"
						style={{
							boxShadow:
								'inset 0 1px 0 rgba(255,255,255,0.72), 0 2px 6px -2px rgba(0,0,0,0.12), 0 24px 56px -12px rgba(0,0,0,0.28)',
						}}
					>
						{/* Search input */}
						<div
							className="shrink-0 flex items-center gap-3 px-5 py-3.5"
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
								onChange={(e) => setSearch(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Escape') onClose()
									else if (e.key === 'ArrowDown') {
										e.preventDefault()
										const count = getItems().length
										if (count > 0) setActiveIndex((i) => (i + 1) % count)
									} else if (e.key === 'ArrowUp') {
										e.preventDefault()
										const count = getItems().length
										if (count > 0)
											setActiveIndex((i) => (i - 1 + count) % count)
									} else if (e.key === 'Enter') {
										e.preventDefault()
										const items = getItems()
										if (items[activeIndex]) items[activeIndex].click()
										else if (onEnter) onEnter(search)
									}
								}}
								placeholder={placeholder}
								className="flex-1 bg-transparent font-[family-name:var(--font-archivo)] text-[var(--color-text)] outline-none placeholder:italic placeholder:text-[var(--color-text-subtle)]/50"
								style={{ fontSize: '14px', letterSpacing: '-0.005em' }}
								aria-label={placeholder}
							/>
							{resultStatus && (
								<span
									className="shrink-0 font-[family-name:var(--font-archivo)] italic text-[var(--color-text-subtle)]"
									style={{ fontSize: '11px' }}
									aria-live="polite"
								>
									{resultStatus}
								</span>
							)}
							<Button
								onPress={onClose}
								aria-label="Close search"
								className="group relative shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-sm text-[var(--color-text-subtle)] hover:text-[var(--color-text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 cursor-pointer transition-colors"
							>
								<X size={13} strokeWidth={1.5} aria-hidden="true" />
							</Button>
						</div>

						{/* Body: optional sidebar + results */}
						<div className="flex min-h-0 flex-1">
							{sidebar && (
								<aside
									className="shrink-0 w-[160px] overflow-y-auto py-2"
									style={{
										borderInlineEnd: '1px solid var(--color-border)',
									}}
								>
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

						{/* Keyboard hint footer */}
						<div
							aria-hidden="true"
							className="shrink-0 flex items-center justify-end gap-4 px-5 py-2 font-[family-name:var(--font-archivo)] italic text-[var(--color-text-subtle)]"
							style={{
								fontSize: '10px',
								borderTop: '1px solid var(--color-border)',
							}}
						>
							<KbdHint keys="↑↓" label="navigate" />
							<KbdHint keys="↵" label="select" />
							<KbdHint keys="esc" label="close" />
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	)
}

function KbdHint({ keys, label }: { keys: string; label: string }) {
	return (
		<span className="inline-flex items-baseline gap-1">
			<kbd
				className="font-[family-name:var(--font-plex-mono)] not-italic text-[var(--color-text-muted)]"
				style={{
					fontSize: '10px',
					letterSpacing: '0.04em',
				}}
			>
				{keys}
			</kbd>
			<span>{label}</span>
		</span>
	)
}
