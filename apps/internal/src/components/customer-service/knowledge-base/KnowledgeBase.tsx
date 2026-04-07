import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { SearchField, Input, Button } from 'react-aria-components'
import { motion, AnimatePresence } from 'motion/react'
import { getKnowledgeBase } from '../../../lib/server/customer-service'
import type { TicketCategory } from '../../../types/customer-service'

const CATEGORIES: TicketCategory[] = [
  'order',
  'quote',
  'delivery',
  'payment',
  'account',
  'product',
  'platform',
]

/**
 * Knowledge Base — "The Library"
 * Search-first: large search input at top.
 * Results as clean list: article title (bold) + category tag + excerpt (muted). No cards.
 */
export function KnowledgeBase() {
  const { t } = useTranslation('customer-service')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<TicketCategory | null>(null)

  const { data: articles } = useQuery({
    queryKey: ['cs', 'knowledge-base'],
    queryFn: () => getKnowledgeBase(),
    staleTime: 60_000,
  })

  if (!articles) {
    return (
      <div className="p-5 text-center text-[var(--color-text-subtle)]">
        Loading...
      </div>
    )
  }

  const filtered = articles.filter((article) => {
    const matchesSearch = !search
      || article.title.toLowerCase().includes(search.toLowerCase())
      || article.content.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = !selectedCategory || article.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="p-5 space-y-5">
      {/* Search — large, prominent */}
      <SearchField
        aria-label={t('knowledgeBase.search', 'Search articles...')}
        value={search}
        onChange={setSearch}
        className="w-full max-w-xl"
      >
        <Input
          placeholder={t('knowledgeBase.search', 'Search articles...')}
          className="w-full rounded-xl border border-[var(--color-border)] bg-transparent px-5 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none
            focus:ring-1 focus:ring-[var(--color-primary)]/40"
        />
      </SearchField>

      {/* Category pills */}
      <div className="flex items-center gap-1 flex-wrap">
        <Button
          onPress={() => setSelectedCategory(null)}
          className={`rounded-lg px-3 py-1.5 text-[13px] font-medium cursor-pointer transition-all duration-150 outline-none
            ${!selectedCategory
              ? 'text-[var(--color-text)] bg-black/[0.06] dark:bg-white/[0.06]'
              : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text)] hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
            }`}
        >
          {t('whatsapp.all', 'All')}
        </Button>
        {CATEGORIES.map((cat) => (
          <Button
            key={cat}
            onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-medium cursor-pointer transition-all duration-150 outline-none capitalize
              ${selectedCategory === cat
                ? 'text-[var(--color-text)] bg-black/[0.06] dark:bg-white/[0.06]'
                : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text)] hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
              }`}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Article list — clean, no cards */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-[var(--color-text-subtle)]">
          {t('knowledgeBase.noResults', 'No articles match your search')}
        </div>
      ) : (
        <div className="flex flex-col">
          {filtered.map((article) => {
            const isExpanded = expandedId === article.id

            return (
              <div key={article.id} className="border-b border-[var(--color-border)]/50">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : article.id)}
                  className="w-full text-start px-1 py-3 cursor-pointer transition-colors
                    hover:bg-black/[0.02] dark:hover:bg-white/[0.02] flex items-start gap-3"
                >
                  {/* Category tag */}
                  <span className="rounded-md bg-black/[0.04] dark:bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)] uppercase shrink-0 mt-0.5">
                    {article.category}
                  </span>

                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    <div className="text-sm font-medium text-[var(--color-text)]">
                      {article.title}
                    </div>
                    {/* Excerpt */}
                    {!isExpanded && (
                      <div className="text-xs text-[var(--color-text-subtle)] mt-0.5 truncate">
                        {article.content.slice(0, 120)}...
                      </div>
                    )}
                  </div>

                  {/* Chevron */}
                  <svg
                    className={`w-4 h-4 text-[var(--color-text-subtle)] shrink-0 mt-0.5 transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <div className="ps-[calc(theme(spacing.2)+theme(spacing.3)+3ch)] pe-8 pb-4">
                        <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
                          {article.content}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
