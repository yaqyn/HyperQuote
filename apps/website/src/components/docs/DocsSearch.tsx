import { useState, useMemo, useCallback, useRef, useEffect, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import Fuse from 'fuse.js'
import { Search, ArrowRight, CornerDownLeft } from 'lucide-react'
import { WIZARDS, DOC_CATEGORIES, displayName } from '../../content/registry'
import { getAllContent } from '../../content/docs'
import { useChatWidget } from '../../hooks/useChatWidget'

interface SearchItem {
  type: 'guide' | 'article'
  title: string
  category: string
  slug: string
  href: string
  body: string
  /** The h2 heading closest to the match, used for scroll-to */
  matchHeading?: string
}

function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/\n{2,}/g, ' ')
    .replace(/\n/g, ' ')
    .trim()
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

/** Find the closest h2 heading ID to where the query appears in raw markdown */
function findMatchHeading(rawMd: string, query: string): string | null {
  if (!rawMd || !query) return null
  const lower = rawMd.toLowerCase()
  const qLower = query.toLowerCase()
  const matchIdx = lower.indexOf(qLower)
  if (matchIdx === -1) return null

  // Find all h2 headings and their positions
  const headingRegex = /^## (.+)$/gm
  let lastHeading: string | null = null
  let match: RegExpExecArray | null
  while ((match = headingRegex.exec(rawMd)) !== null) {
    if (match.index > matchIdx) break
    lastHeading = match[1]
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim()
  }

  return lastHeading
}

/** Highlight all occurrences of query in text with blue color */
function highlightMatch(text: string, query: string): ReactNode {
  if (!query.trim()) return text
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    regex.test(part) ? (
      <span key={i} className="text-[var(--color-primary)] font-semibold">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

function buildSearchIndex(t: (key: string, opts?: any) => string): { items: SearchItem[]; rawContentMap: Map<string, string> } {
  const items: SearchItem[] = []
  const rawContentMap = new Map<string, string>()

  for (const w of WIZARDS) {
    items.push({
      type: 'guide',
      title: t(w.titleKey, { defaultValue: displayName(w.titleKey) }),
      category: t('docs.guides', { defaultValue: 'Guides' }),
      slug: w.slug,
      href: `/docs/guide/${w.slug}`,
      body: t(w.descriptionKey, { defaultValue: displayName(w.descriptionKey) }),
    })
  }

  const allContent = getAllContent()
  for (const c of allContent) {
    rawContentMap.set(`${c.categorySlug}/${c.articleSlug}`, c.content)
  }

  for (const cat of DOC_CATEGORIES) {
    for (const article of cat.articles) {
      const key = `${cat.slug}/${article.slug}`
      const rawContent = rawContentMap.get(key) ?? ''

      items.push({
        type: 'article',
        title: t(article.titleKey, { defaultValue: displayName(article.titleKey) }),
        category: t(cat.titleKey, { defaultValue: displayName(cat.titleKey) }),
        slug: article.slug,
        href: `/docs/${cat.slug}/${article.slug}`,
        body: stripMarkdown(rawContent),
      })
    }
  }

  return { items, rawContentMap }
}

export function DocsSearch() {
  const { t } = useTranslation('website')
  const navigate = useNavigate()
  const openWithMessage = useChatWidget((s) => s.openWithMessage)
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1) // -1 = none, results.length = Ask Lyon
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const { items, rawContentMap } = useMemo(() => buildSearchIndex(t), [t])
  const fuse = useMemo(
    () =>
      new Fuse(items, {
        threshold: 0.3,
        keys: [
          { name: 'title', weight: 3 },
          { name: 'category', weight: 1 },
          { name: 'body', weight: 2 },
        ],
        minMatchCharLength: 2,
      }),
    [items],
  )

  const results = useMemo(() => {
    if (!query.trim()) return []
    return fuse.search(query).slice(0, 8)
  }, [query, fuse])

  const showResults = focused && query.trim().length > 0

  // Reset active index when results change
  useEffect(() => {
    setActiveIdx(-1)
  }, [results])

  // Scroll active item into view
  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return
    const items = listRef.current.querySelectorAll('[data-search-item]')
    items[activeIdx]?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  const totalItems = results.length + 1 // results + Ask Lyon

  const navigateToResult = useCallback(
    (idx: number) => {
      if (idx >= 0 && idx < results.length) {
        const r = results[idx]
        // Find the heading to scroll to
        const rawKey = r.item.type === 'article'
          ? `${r.item.href.split('/docs/')[1]?.replace(/\//, '/')}`
          : null
        const rawMd = rawKey ? rawContentMap.get(rawKey) : null
        const headingId = rawMd ? findMatchHeading(rawMd, query.trim()) : null

        setQuery('')
        setFocused(false)
        setActiveIdx(-1)

        // Navigate with hash for scroll-to-heading
        if (headingId) {
          navigate({ to: r.item.href, hash: headingId })
        } else {
          navigate({ to: r.item.href })
        }
      } else if (idx === results.length) {
        // Ask Lyon
        openWithMessage(query.trim())
        setQuery('')
        setFocused(false)
        setActiveIdx(-1)
      }
    },
    [results, query, navigate, openWithMessage, rawContentMap],
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
          if (activeIdx >= 0) {
            navigateToResult(activeIdx)
          } else {
            // No selection — send to AI
            openWithMessage(query.trim())
            setQuery('')
            setFocused(false)
          }
          break
        case 'Escape':
          e.preventDefault()
          setFocused(false)
          setActiveIdx(-1)
          inputRef.current?.blur()
          break
      }
    },
    [showResults, activeIdx, totalItems, navigateToResult, openWithMessage, query],
  )

  return (
    <div className="relative max-w-[480px]">
      <div onKeyDown={handleKeyDown}>
        <div className="flex items-center border-b border-[var(--color-text)]/[0.1] pb-3 transition-colors duration-200 focus-within:border-[var(--color-primary)]/40">
          <Search size={16} className="shrink-0 opacity-25" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              // Delay to allow click on results
              setTimeout(() => setFocused(false), 200)
            }}
            placeholder={t('docs.searchPlaceholder', { defaultValue: 'Search documentation...' })}
            className="ms-3 w-full border-0 bg-transparent text-[15px] outline-none placeholder:opacity-30"
            aria-label={t('docs.searchPlaceholder', { defaultValue: 'Search documentation...' })}
            role="combobox"
            aria-expanded={showResults}
            aria-activedescendant={activeIdx >= 0 ? `search-item-${activeIdx}` : undefined}
          />
          {query.trim() && (
            <span className="shrink-0 text-[11px] text-[var(--color-text-subtle)] flex items-center gap-1">
              <CornerDownLeft size={11} />
              {t('docs.search.askLyon', { defaultValue: 'Ask Lyon' })}
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
            className="absolute start-0 top-full z-30 mt-2 w-full min-w-[360px] border border-[var(--color-text)]/[0.08] bg-[var(--color-base)] shadow-[0_16px_48px_rgba(0,0,0,0.1)] max-h-[60vh] overflow-y-auto"
            role="listbox"
          >
            {results.length > 0 ? (
              <>
                {results.map((r, i) => {
                  const snippet = getSnippet(r.item.body, query.trim())
                  const isActive = activeIdx === i
                  return (
                    <button
                      key={r.item.href}
                      id={`search-item-${i}`}
                      data-search-item
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => navigateToResult(i)}
                      onMouseEnter={() => setActiveIdx(i)}
                      className={`group flex w-full items-center justify-between border-b border-[var(--color-text)]/[0.05] px-5 py-4 text-start transition-colors last:border-0 ${
                        isActive ? 'bg-[var(--color-text)]/[0.03]' : 'hover:bg-[var(--color-text)]/[0.02]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-medium tracking-[-0.01em]">
                          {highlightMatch(r.item.title, query.trim())}
                        </div>
                        <div className="mt-0.5 text-[12px] opacity-35">
                          {highlightMatch(r.item.category, query.trim())}
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
                          isActive ? 'opacity-30' : 'opacity-0 group-hover:opacity-30'
                        }`}
                      />
                    </button>
                  )
                })}
                {/* Ask Lyon — last item in the list */}
                <button
                  id={`search-item-${results.length}`}
                  data-search-item
                  type="button"
                  role="option"
                  aria-selected={activeIdx === results.length}
                  onClick={() => navigateToResult(results.length)}
                  onMouseEnter={() => setActiveIdx(results.length)}
                  className={`flex w-full items-center gap-1.5 border-t border-[var(--color-text)]/[0.05] px-5 py-3.5 text-[12px] font-medium transition-colors ${
                    activeIdx === results.length
                      ? 'text-[var(--color-text)] bg-[var(--color-text)]/[0.03]'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {t('docs.askLyon', { defaultValue: 'Ask Lyon' })}
                  <span className="opacity-40">— &ldquo;{query.trim()}&rdquo;</span>
                </button>
              </>
            ) : (
              <>
                <div className="px-5 pt-5 pb-2">
                  <p className="text-[14px] opacity-35">
                    {t('docs.search.noResults', { defaultValue: 'No results found' })}
                  </p>
                </div>
                <button
                  id="search-item-0"
                  data-search-item
                  type="button"
                  role="option"
                  aria-selected={activeIdx === 0}
                  onClick={() => {
                    openWithMessage(query.trim())
                    setQuery('')
                    setFocused(false)
                  }}
                  onMouseEnter={() => setActiveIdx(0)}
                  className={`flex w-full items-center gap-1.5 border-t border-[var(--color-text)]/[0.05] px-5 py-3.5 text-[12px] font-medium transition-colors ${
                    activeIdx === 0
                      ? 'text-[var(--color-text)] bg-[var(--color-text)]/[0.03]'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {t('docs.askLyon', { defaultValue: 'Ask Lyon' })}
                  <span className="opacity-40">— &ldquo;{query.trim()}&rdquo;</span>
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
