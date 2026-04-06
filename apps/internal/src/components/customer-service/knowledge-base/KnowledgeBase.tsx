import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { SearchField, Input, Button } from 'react-aria-components'
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

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  order: 'Order',
  quote: 'Quote',
  delivery: 'Delivery',
  payment: 'Payment',
  account: 'Account',
  product: 'Product',
  platform: 'Platform',
}

/**
 * Knowledge Base — searchable article list with 7 categories.
 * Click article to expand inline (accordion pattern).
 * Uses React Aria SearchField for the search input.
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
      <div className="p-6 text-center text-black/40 dark:text-white/40">
        Loading...
      </div>
    )
  }

  // Filter by search + category
  const filtered = articles.filter((article) => {
    const matchesSearch = !search
      || article.title.toLowerCase().includes(search.toLowerCase())
      || article.content.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = !selectedCategory || article.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="p-6 space-y-4">
      {/* Search */}
      <SearchField
        aria-label={t('knowledgeBase.search', 'Search articles...')}
        value={search}
        onChange={setSearch}
        className="w-full max-w-md"
      >
        <Input
          placeholder={t('knowledgeBase.search', 'Search articles...')}
          className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2563EB]/50"
        />
      </SearchField>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          onPress={() => setSelectedCategory(null)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
            !selectedCategory
              ? 'bg-[#2563EB] text-white'
              : 'bg-black/5 text-black/60 dark:bg-white/5 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10'
          }`}
        >
          {t('whatsapp.all', 'All')}
        </Button>
        {CATEGORIES.map((cat) => (
          <Button
            key={cat}
            onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
              selectedCategory === cat
                ? 'bg-[#2563EB] text-white'
                : 'bg-black/5 text-black/60 dark:bg-white/5 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10'
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </Button>
        ))}
      </div>

      {/* Articles list */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-black/40 dark:text-white/40">
          {t('knowledgeBase.noResults', 'No articles match your search')}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((article) => {
            const isExpanded = expandedId === article.id

            return (
              <div
                key={article.id}
                className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : article.id)}
                  className="w-full text-start px-4 py-3 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-[#2563EB]/10 px-2 py-0.5 text-[10px] font-medium text-[#2563EB] uppercase">
                      {article.category}
                    </span>
                    <span className="text-sm font-medium">{article.title}</span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-black/40 dark:text-white/40 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-black/5 dark:border-white/5">
                    <p className="text-sm leading-relaxed text-black/70 dark:text-white/70 pt-3">
                      {article.content}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
