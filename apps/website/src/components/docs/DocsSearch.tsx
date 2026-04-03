import { useState, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import Fuse from 'fuse.js'
import { Search, ArrowRight } from 'lucide-react'
import { SearchField, Label, Input } from 'react-aria-components'
import { WIZARDS, DOC_CATEGORIES, displayName } from '../../content/registry'
import { getAllContent } from '../../content/docs'
import { AskLyonPill } from './AskLyonPill'

interface SearchItem {
  type: 'guide' | 'article'
  title: string
  category: string
  slug: string
  href: string
  /** Markdown body text for full-text search */
  body: string
}

/** Strip markdown syntax to get plain text for indexing */
function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')    // headings
    .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
    .replace(/\*([^*]+)\*/g, '$1')     // italic
    .replace(/`([^`]+)`/g, '$1')       // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/^[-*+]\s+/gm, '')        // list items
    .replace(/\n{2,}/g, ' ')           // collapse newlines
    .trim()
}

function buildSearchIndex(t: (key: string, opts?: any) => string): SearchItem[] {
  const items: SearchItem[] = []

  // Index wizard guides (title + description only, no markdown body)
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

  // Index all articles with full markdown content
  const allContent = getAllContent()
  const contentMap = new Map(allContent.map((c) => [`${c.categorySlug}/${c.articleSlug}`, c.content]))

  for (const cat of DOC_CATEGORIES) {
    for (const article of cat.articles) {
      const key = `${cat.slug}/${article.slug}`
      const rawContent = contentMap.get(key) ?? ''

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

  return items
}

export function DocsSearch() {
  const { t } = useTranslation('website')
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)

  const items = useMemo(() => buildSearchIndex(t), [t])
  const fuse = useMemo(
    () =>
      new Fuse(items, {
        threshold: 0.3,
        keys: [
          { name: 'title', weight: 3 },
          { name: 'category', weight: 1 },
          { name: 'body', weight: 2 },
        ],
        includeMatches: true,
        minMatchCharLength: 2,
      }),
    [items],
  )

  const results = useMemo(() => {
    if (!query.trim()) return []
    return fuse.search(query).slice(0, 8)
  }, [query, fuse])

  const showResults = focused && query.trim().length > 0

  return (
    <div className="relative max-w-[480px]">
      <SearchField
        aria-label={t('docs.searchPlaceholder', { defaultValue: 'Search documentation...' })}
        value={query}
        onChange={setQuery}
        onFocusChange={setFocused}
        className="w-full"
      >
        <Label className="sr-only">
          {t('docs.searchPlaceholder', { defaultValue: 'Search documentation...' })}
        </Label>
        <div className="flex items-center border-b border-[var(--color-text)]/[0.1] pb-3 transition-colors duration-200 focus-within:border-[var(--color-primary)]/40">
          <Search size={16} className="shrink-0 opacity-25" />
          <Input
            placeholder={t('docs.searchPlaceholder', { defaultValue: 'Search documentation...' })}
            className="ms-3 w-full border-0 bg-transparent text-[15px] outline-none placeholder:opacity-30"
          />
        </div>
      </SearchField>

      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute start-0 top-full z-30 mt-2 w-full border border-[var(--color-text)]/[0.08] bg-[var(--color-base)] shadow-[0_16px_48px_rgba(0,0,0,0.1)]"
          >
            {results.length > 0 ? (
              <>
                {results.map((r) => (
                  <Link
                    key={r.item.href}
                    to={r.item.href}
                    onClick={() => { setQuery(''); setFocused(false) }}
                    className="group flex w-full items-center justify-between border-b border-[var(--color-text)]/[0.05] px-5 py-4 text-start transition-colors last:border-0 hover:bg-[var(--color-text)]/[0.02]"
                  >
                    <div>
                      <div className="text-[14px] font-medium tracking-[-0.01em]">
                        {r.item.title}
                      </div>
                      <div className="mt-1 text-[12px] opacity-35">
                        {r.item.category}
                      </div>
                    </div>
                    <ArrowRight
                      size={14}
                      className="icon-end shrink-0 opacity-0 transition-opacity group-hover:opacity-30"
                    />
                  </Link>
                ))}
                {/* Ask Lyon option */}
                <div className="border-t border-[var(--color-text)]/[0.05] px-5 py-3.5">
                  <AskLyonPill context={query.trim()} />
                </div>
              </>
            ) : (
              <div className="px-5 py-6">
                <p className="text-[14px] opacity-35">
                  {t('docs.search.noResults', { defaultValue: 'No results found' })}
                </p>
                <div className="mt-3">
                  <AskLyonPill context={query.trim()} />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
