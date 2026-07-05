import { useSpeechInput } from '@hyperquote/ui/voice/useSpeechInput'
import Fuse, { type FuseOptionKey } from 'fuse.js'
import {
	ArrowRight,
	CornerDownLeft,
	Mic,
	Search,
	Square,
	X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { useChatWidget } from '../../hooks/useChatWidget'

// ── Types ──

export interface SearchEntry {
	id: string
	title: string
	subtitle: string
	body: string
	href?: string
}

interface SearchDropdownProps {
	/** Items to index and search through */
	items: SearchEntry[]
	/** Fuse.js keys to search (defaults to title, subtitle, body) */
	keys?: FuseOptionKey<SearchEntry>[]
	/** Input placeholder */
	placeholder?: string
	/** Initial input value, useful when search state lives in the URL. */
	initialQuery?: string
	/** Label for the Ask Lyon action */
	askLyonLabel?: string
	/** Called when a result is selected. Return value is ignored. */
	onSelect: (item: SearchEntry, query: string) => void
	/** Called when Ask Lyon is triggered (Enter with no selection, or explicit click) */
	onAskLyon?: (query: string) => void
	/** Called whenever the input value changes. */
	onQueryChange?: (query: string) => void
	/** Enables browser speech recognition for this input. */
	enableVoice?: boolean
	/** Locale used as the first speech-recognition probe. */
	voiceLocale?: string
	/** Enter can either select/submit from the menu or just close it. */
	enterKeyBehavior?: 'select-or-submit' | 'close'
	/** Turns comma-separated terms into chips inside the input. */
	tokenizeOnComma?: boolean
	/** Max results to show */
	maxResults?: number
	/** Additional className for the container */
	className?: string
	/** Unique ID prefix for ARIA (avoid collisions if multiple on page) */
	idPrefix?: string
	/** Label shown when no results match */
	noResultsLabel?: string
}

// ── Utilities ──

function highlightMatch(text: string, query: string): ReactNode {
	const needle = query.trim()
	if (!needle) return text

	const lowerText = text.toLowerCase()
	const lowerNeedle = needle.toLowerCase()
	const parts: Array<{ value: string; match: boolean }> = []
	let cursor = 0

	while (cursor < text.length) {
		const matchAt = lowerText.indexOf(lowerNeedle, cursor)
		if (matchAt === -1) {
			parts.push({ value: text.slice(cursor), match: false })
			break
		}
		if (matchAt > cursor) {
			parts.push({ value: text.slice(cursor, matchAt), match: false })
		}
		parts.push({
			value: text.slice(matchAt, matchAt + needle.length),
			match: true,
		})
		cursor = matchAt + needle.length
	}

	if (!parts.some((part) => part.match)) return text
	return parts.map((part, index) => {
		const key = `${index}:${part.value}`
		return part.match ? (
			<span key={key} className="text-[var(--color-primary)] font-semibold">
				{part.value}
			</span>
		) : (
			<span key={key}>{part.value}</span>
		)
	})
}

function getSnippet(body: string, query: string, radius = 60): string | null {
	if (!body || !query) return null
	const lower = body.toLowerCase()
	const qLower = query.toLowerCase()
	const idx = lower.indexOf(qLower)
	if (idx === -1) return null
	const start = Math.max(0, idx - radius)
	const end = Math.min(body.length, idx + query.length + radius)
	let snippet = body.slice(start, end)
	if (start > 0) snippet = `\u2026${snippet}`
	if (end < body.length) snippet = `${snippet}\u2026`
	return snippet
}

// ── Component ──

export function SearchDropdown({
	items,
	keys,
	placeholder = 'Search...',
	initialQuery = '',
	askLyonLabel = 'Ask Lyon',
	onSelect,
	onAskLyon,
	onQueryChange,
	enableVoice = false,
	voiceLocale,
	enterKeyBehavior = 'select-or-submit',
	tokenizeOnComma = false,
	maxResults = 8,
	className = '',
	idPrefix = 'search',
	noResultsLabel = 'No results found',
}: SearchDropdownProps) {
	const openWithMessage = useChatWidget((s) => s.openWithMessage)
	const [query, setQuery] = useState(initialQuery)
	const [tokens, setTokens] = useState<string[]>([])
	const [focused, setFocused] = useState(false)
	const [activeIdx, setActiveIdx] = useState(-1)
	const inputRef = useRef<HTMLInputElement>(null)
	const listRef = useRef<HTMLDivElement>(null)

	const composeSearchValue = useCallback(
		(nextTokens: string[], nextQuery: string) => {
			const queryTerm = nextQuery.trim()
			if (!queryTerm && nextTokens.length > 0)
				return `${nextTokens.join(', ')},`
			return [...nextTokens, queryTerm].filter(Boolean).join(', ')
		},
		[],
	)

	const setTokenizedValue = useCallback(
		(nextTokens: string[], nextQuery: string) => {
			setTokens(nextTokens)
			setQuery(nextQuery)
			onQueryChange?.(composeSearchValue(nextTokens, nextQuery))
		},
		[composeSearchValue, onQueryChange],
	)

	const applyQueryInput = useCallback(
		(rawValue: string) => {
			if (!tokenizeOnComma || !rawValue.includes(',')) {
				setQuery(rawValue)
				onQueryChange?.(composeSearchValue(tokens, rawValue))
				return
			}
			const parts = rawValue.split(',')
			const completed = parts
				.slice(0, -1)
				.map((part) => part.trim())
				.filter(Boolean)
			setTokenizedValue(
				[...tokens, ...completed],
				parts.at(-1)?.trimStart() ?? '',
			)
		},
		[
			composeSearchValue,
			onQueryChange,
			setTokenizedValue,
			tokenizeOnComma,
			tokens,
		],
	)

	const speech = useSpeechInput({
		locale: voiceLocale,
		onTranscript: applyQueryInput,
	})

	const fuse = useMemo(
		() =>
			new Fuse(items, {
				threshold: 0.4,
				ignoreFieldNorm: true,
				keys: keys ?? [
					{ name: 'title', weight: 3 },
					{ name: 'subtitle', weight: 1 },
					{ name: 'body', weight: 2 },
				],
				minMatchCharLength: 2,
			}),
		[items, keys],
	)

	const results = useMemo(() => {
		const q = query.trim()
		if (!q) return []

		const fuseResults = fuse.search(q)
		if (fuseResults.length > 0) return fuseResults.slice(0, maxResults)

		// Exact substring fallback
		const qLower = q.toLowerCase()
		return items
			.filter(
				(item) =>
					item.title.toLowerCase().includes(qLower) ||
					item.subtitle.toLowerCase().includes(qLower) ||
					item.body.toLowerCase().includes(qLower),
			)
			.slice(0, maxResults)
			.map((item, i) => ({ item, refIndex: i, score: 0 }))
	}, [query, fuse, items, maxResults])

	const showResults = focused && query.trim().length > 0
	const totalItems = results.length + (onAskLyon ? 1 : 0)
	const hasSearchValue = tokens.length > 0 || query.trim().length > 0

	useEffect(() => {
		setActiveIdx(-1)
	}, [])

	useEffect(() => {
		if (focused) return
		if (!tokenizeOnComma || !initialQuery.includes(',')) {
			setTokens([])
			setQuery(initialQuery)
			return
		}
		const parts = initialQuery.split(',')
		const completed = parts
			.slice(0, -1)
			.map((part) => part.trim())
			.filter(Boolean)
		setTokens(completed)
		setQuery(parts.at(-1)?.trimStart() ?? '')
	}, [focused, initialQuery, tokenizeOnComma])

	function removeToken(index: number) {
		const nextTokens = tokens.filter((_, tokenIndex) => tokenIndex !== index)
		setTokenizedValue(nextTokens, query)
		inputRef.current?.focus()
	}

	const clearSearch = useCallback(() => {
		setTokenizedValue([], '')
		setFocused(false)
		setActiveIdx(-1)
		inputRef.current?.focus()
	}, [setTokenizedValue])

	useEffect(() => {
		if (activeIdx < 0 || !listRef.current) return
		listRef.current
			.querySelectorAll('[data-search-item]')
			[activeIdx]?.scrollIntoView({ block: 'nearest' })
	}, [activeIdx])

	const handleAskLyon = useCallback(() => {
		const q = query.trim()
		if (onAskLyon) {
			onAskLyon(q)
		} else {
			openWithMessage(q)
		}
		setQuery('')
		setFocused(false)
		setActiveIdx(-1)
	}, [query, onAskLyon, openWithMessage])

	const selectResult = useCallback(
		(idx: number) => {
			if (idx >= 0 && idx < results.length) {
				onSelect(results[idx].item, query.trim())
				setQuery('')
				setFocused(false)
				setActiveIdx(-1)
			} else if (idx === results.length) {
				handleAskLyon()
			}
		},
		[results, query, onSelect, handleAskLyon],
	)

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
				const selectedText =
					inputRef.current &&
					inputRef.current.selectionStart !== inputRef.current.selectionEnd
				if (!selectedText && hasSearchValue) {
					e.preventDefault()
					clearSearch()
				}
				return
			}
			if (tokenizeOnComma && e.key === ',') {
				e.preventDefault()
				const nextToken = query.trim()
				if (nextToken) setTokenizedValue([...tokens, nextToken], '')
				return
			}
			if (
				tokenizeOnComma &&
				e.key === 'Backspace' &&
				!query &&
				tokens.length > 0
			) {
				e.preventDefault()
				setTokenizedValue(tokens.slice(0, -1), '')
				return
			}
			if (!showResults) return
			switch (e.key) {
				case 'ArrowDown':
					e.preventDefault()
					setActiveIdx((prev) => (prev < totalItems - 1 ? prev + 1 : 0))
					break
				case 'ArrowUp':
					e.preventDefault()
					setActiveIdx((prev) => (prev > 0 ? prev - 1 : totalItems - 1))
					break
				case 'Enter':
					e.preventDefault()
					if (enterKeyBehavior === 'close') {
						setFocused(false)
						setActiveIdx(-1)
						inputRef.current?.blur()
					} else if (activeIdx >= 0) selectResult(activeIdx)
					else handleAskLyon()
					break
				case 'Escape':
					e.preventDefault()
					setFocused(false)
					setActiveIdx(-1)
					inputRef.current?.blur()
					break
			}
		},
		[
			showResults,
			activeIdx,
			totalItems,
			selectResult,
			handleAskLyon,
			enterKeyBehavior,
			query,
			tokens,
			tokenizeOnComma,
			setTokenizedValue,
			hasSearchValue,
			clearSearch,
		],
	)

	return (
		<div className={`relative ${className}`}>
			<div className="flex h-11 min-w-0 items-center gap-2 border-b border-[var(--color-text)]/[0.1] pb-2 transition-colors duration-200 focus-within:border-[var(--color-primary)]/40">
				<Search size={16} className="shrink-0 opacity-25" />
				<div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
					{tokens.map((token, index) => (
						<span
							key={token}
							className="inline-flex h-7 max-w-[160px] shrink-0 items-center gap-1.5 rounded-full border border-[#2563eb]/20 bg-[#2563eb]/[0.08] ps-2.5 pe-1 text-[12px] font-semibold text-[#2563eb]"
						>
							<span className="min-w-0 truncate">{token}</span>
							<button
								type="button"
								onClick={() => removeToken(index)}
								className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[#2563eb]/10"
								aria-label={`Remove ${token}`}
							>
								<X size={11} strokeWidth={2} />
							</button>
						</span>
					))}
					<input
						ref={inputRef}
						type="text"
						value={query}
						onChange={(e) => applyQueryInput(e.target.value)}
						onFocus={() => setFocused(true)}
						onBlur={() => setTimeout(() => setFocused(false), 200)}
						onKeyDown={handleKeyDown}
						placeholder={tokens.length > 0 ? '' : placeholder}
						className="min-w-[120px] flex-1 border-0 bg-transparent text-[15px] outline-none placeholder:opacity-30"
						aria-label={placeholder}
						role="combobox"
						aria-expanded={showResults}
						aria-activedescendant={
							activeIdx >= 0 ? `${idPrefix}-item-${activeIdx}` : undefined
						}
						aria-describedby={`${idPrefix}-token-status`}
					/>
				</div>
				<span
					id={`${idPrefix}-token-status`}
					className="sr-only"
					aria-live="polite"
				>
					{tokens.length > 0
						? `${tokens.length} search ${tokens.length === 1 ? 'term' : 'terms'} selected. Press Backspace in the empty field to remove the last term.`
						: 'No search terms selected.'}
				</span>
				{enableVoice && speech.isSupported && (
					<button
						type="button"
						onClick={() =>
							speech.isListening ? speech.stop() : speech.start()
						}
						className="ms-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)]"
						aria-label={
							speech.isListening ? 'Stop voice search' : 'Voice search'
						}
						aria-pressed={speech.isListening}
					>
						{speech.isListening ? (
							<Square size={12} strokeWidth={1.8} />
						) : (
							<Mic size={15} strokeWidth={1.8} />
						)}
					</button>
				)}
				<button
					type="button"
					onClick={clearSearch}
					disabled={!hasSearchValue}
					tabIndex={hasSearchValue ? 0 : -1}
					className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-text)]/[0.06] hover:text-[var(--color-text)] ${
						hasSearchValue ? 'opacity-100' : 'pointer-events-none opacity-0'
					}`}
					aria-label="Clear search"
					aria-hidden={!hasSearchValue}
				>
					<X size={14} strokeWidth={1.8} />
				</button>
				{query.trim() && enterKeyBehavior !== 'close' && (
					<span className="hidden shrink-0 items-center gap-1 text-[11px] text-[var(--color-text-subtle)] sm:flex">
						<CornerDownLeft size={11} />
						{askLyonLabel}
					</span>
				)}
			</div>

			<AnimatePresence>
				{showResults && (
					<motion.div
						ref={listRef}
						initial={{ opacity: 0, y: 4 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.12 }}
						className="absolute start-0 top-full z-30 mt-2 max-h-[60vh] w-full max-w-[calc(100vw-2rem)] overflow-y-auto border border-[var(--color-text)]/[0.08] bg-[var(--color-base)] shadow-[0_16px_48px_rgba(0,0,0,0.1)] sm:max-w-none sm:min-w-[360px]"
						role="listbox"
					>
						{results.length > 0 ? (
							<>
								{results.map((r, i) => {
									const isActive = activeIdx === i
									const snippet = getSnippet(r.item.body, query.trim())
									return (
										<button
											key={r.item.id}
											id={`${idPrefix}-item-${i}`}
											data-search-item
											type="button"
											role="option"
											aria-selected={isActive}
											onClick={() => selectResult(i)}
											onMouseEnter={() => setActiveIdx(i)}
											className={`group flex w-full items-center justify-between border-b border-[var(--color-text)]/[0.05] px-5 py-4 text-start transition-colors last:border-0 ${
												isActive
													? 'bg-[var(--color-text)]/[0.03]'
													: 'hover:bg-[var(--color-text)]/[0.02]'
											}`}
										>
											<div className="min-w-0 flex-1">
												<div className="text-[14px] font-medium tracking-normal">
													{r.item.title}
												</div>
												<div className="mt-0.5 text-[12px] opacity-35">
													{highlightMatch(r.item.subtitle, query.trim())}
												</div>
												{snippet && (
													<p className="mt-1.5 text-[12px] leading-[1.5] text-[var(--color-text-muted)] line-clamp-2">
														{highlightMatch(snippet, query.trim())}
													</p>
												)}
											</div>
											<ArrowRight
												size={14}
												className={`icon-end shrink-0 ms-3 transition-opacity ${
													isActive
														? 'opacity-30'
														: 'opacity-0 group-hover:opacity-30'
												}`}
											/>
										</button>
									)
								})}
								{onAskLyon && enterKeyBehavior !== 'close' && (
									<button
										id={`${idPrefix}-item-${results.length}`}
										data-search-item
										type="button"
										role="option"
										aria-selected={activeIdx === results.length}
										onClick={() => selectResult(results.length)}
										onMouseEnter={() => setActiveIdx(results.length)}
										className={`flex w-full items-center gap-1.5 border-t border-[var(--color-text)]/[0.05] px-5 py-3.5 text-[12px] font-medium transition-colors ${
											activeIdx === results.length
												? 'text-[var(--color-text)] bg-[var(--color-text)]/[0.03]'
												: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
										}`}
									>
										{askLyonLabel}
										<span className="opacity-40">
											&mdash; &ldquo;{query.trim()}&rdquo;
										</span>
									</button>
								)}
							</>
						) : (
							<>
								<div className="px-5 pt-5 pb-2">
									<p className="text-[14px] opacity-35">{noResultsLabel}</p>
								</div>
								{onAskLyon && enterKeyBehavior !== 'close' && (
									<button
										id={`${idPrefix}-item-0`}
										data-search-item
										type="button"
										role="option"
										aria-selected={activeIdx === 0}
										onClick={handleAskLyon}
										onMouseEnter={() => setActiveIdx(0)}
										className={`flex w-full items-center gap-1.5 border-t border-[var(--color-text)]/[0.05] px-5 py-3.5 text-[12px] font-medium transition-colors ${
											activeIdx === 0
												? 'text-[var(--color-text)] bg-[var(--color-text)]/[0.03]'
												: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
										}`}
									>
										{askLyonLabel}
										<span className="opacity-40">
											&mdash; &ldquo;{query.trim()}&rdquo;
										</span>
									</button>
								)}
							</>
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}
