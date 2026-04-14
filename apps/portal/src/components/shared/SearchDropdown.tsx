import { useState, useMemo, useCallback, useRef, useEffect, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import Fuse from 'fuse.js'
import { Search, ArrowRight, CornerDownLeft } from 'lucide-react'

// ── Types ──

export interface SearchEntry {
  id: string
  title: string
  subtitle: string
  body: string
  href?: string
}

export interface SearchDropdownProps {
  items: SearchEntry[]
  keys?: Fuse.FuseOptionKey<SearchEntry>[]
  placeholder?: string
  askLyonLabel?: string
  onSelect: (item: SearchEntry, query: string) => void
  onAskLyon?: (query: string) => void
  maxResults?: number
  className?: string
  idPrefix?: string
  noResultsLabel?: string
}

// ── Utilities ──

export function highlightMatch(text: string, query: string): ReactNode {
  if (!query.trim()) return text
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    regex.test(part) ? (
      <span key={i} className="text-[var(--p-text)] font-semibold">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

export function getSnippet(body: string, query: string, radius = 60): string | null {
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
  askLyonLabel = 'Ask Lyon',
  onSelect,
  onAskLyon,
  maxResults = 8,
  className = '',
  idPrefix = 'search',
  noResultsLabel = 'No results found',
}: SearchDropdownProps) {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => { setActiveIdx(-1) }, [results])

  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return
    listRef.current.querySelectorAll('[data-search-item]')[activeIdx]?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  const handleAskLyon = useCallback(() => {
    const q = query.trim()
    if (onAskLyon) onAskLyon(q)
    setQuery('')
    setFocused(false)
    setActiveIdx(-1)
  }, [query, onAskLyon])

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
          if (activeIdx >= 0) selectResult(activeIdx)
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
    [showResults, activeIdx, totalItems, selectResult, handleAskLyon],
  )

  return (
    <div className={`relative ${className}`}>
      <div onKeyDown={handleKeyDown}>
        <div className="flex items-center border-b border-[var(--p-border)] pb-3 transition-colors duration-200 focus-within:border-[var(--p-border-strong)]">
          <Search size={16} className="shrink-0 opacity-25" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            placeholder={placeholder}
            spellCheck={false}
            autoComplete="off"
            className="ms-3 w-full border-0 bg-transparent text-[15px] outline-none placeholder:opacity-30"
            aria-label={placeholder}
            role="combobox"
            aria-expanded={showResults}
            aria-activedescendant={activeIdx >= 0 ? `${idPrefix}-item-${activeIdx}` : undefined}
          />
          {query.trim() && (
            <span className="shrink-0 text-[13px] text-[var(--p-text-muted)] flex items-center gap-1">
              <CornerDownLeft size={11} />
              {askLyonLabel}
            </span>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showResults && (
          <motion.div
            ref={listRef}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute start-0 top-full z-30 mt-2 w-full min-w-[360px] border border-[var(--p-border)] bg-[var(--p-bg)] shadow-[0_16px_48px_rgba(0,0,0,0.1)] max-h-[60vh] overflow-y-auto"
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
                      className={`group flex w-full items-center justify-between border-b border-[var(--p-border)] px-5 py-4 text-start transition-colors last:border-0 ${
                        isActive ? 'bg-[var(--p-surface)]' : 'hover:bg-[var(--p-surface)]/50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-medium tracking-[-0.01em]">
                          {r.item.title}
                        </div>
                        <div className="mt-0.5 text-[13px] opacity-35">
                          {highlightMatch(r.item.subtitle, query.trim())}
                        </div>
                        {snippet && (
                          <p className="mt-1.5 text-[13px] leading-[1.5] text-[var(--p-text-muted)] line-clamp-2">
                            {highlightMatch(snippet, query.trim())}
                          </p>
                        )}
                      </div>
                      <ArrowRight
                        size={14}
                        className={`icon-end shrink-0 ms-3 transition-opacity ${
                          isActive ? 'opacity-30' : 'opacity-0 group-hover:opacity-30'
                        }`}
                      />
                    </button>
                  )
                })}
                {onAskLyon && (
                  <button
                    id={`${idPrefix}-item-${results.length}`}
                    data-search-item
                    type="button"
                    role="option"
                    aria-selected={activeIdx === results.length}
                    onClick={() => selectResult(results.length)}
                    onMouseEnter={() => setActiveIdx(results.length)}
                    className={`flex w-full items-center gap-1.5 border-t border-[var(--p-border)] px-5 py-3.5 text-[13px] font-medium transition-colors ${
                      activeIdx === results.length
                        ? 'text-[var(--p-text)] bg-[var(--p-surface)]'
                        : 'text-[var(--p-text-muted)] hover:text-[var(--p-text)]'
                    }`}
                  >
                    {askLyonLabel}
                    <span className="opacity-40">&mdash; &ldquo;{query.trim()}&rdquo;</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="px-5 pt-5 pb-2">
                  <p className="text-[14px] opacity-35">{noResultsLabel}</p>
                </div>
                {onAskLyon && (
                  <button
                    id={`${idPrefix}-item-0`}
                    data-search-item
                    type="button"
                    role="option"
                    aria-selected={activeIdx === 0}
                    onClick={handleAskLyon}
                    onMouseEnter={() => setActiveIdx(0)}
                    className={`flex w-full items-center gap-1.5 border-t border-[var(--p-border)] px-5 py-3.5 text-[13px] font-medium transition-colors ${
                      activeIdx === 0
                        ? 'text-[var(--p-text)] bg-[var(--p-surface)]'
                        : 'text-[var(--p-text-muted)] hover:text-[var(--p-text)]'
                    }`}
                  >
                    {askLyonLabel}
                    <span className="opacity-40">&mdash; &ldquo;{query.trim()}&rdquo;</span>
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
