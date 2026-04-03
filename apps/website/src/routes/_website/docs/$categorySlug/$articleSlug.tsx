import { useState, useMemo, useEffect, useRef } from 'react'
import { createFileRoute, useParams, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Dialog, Modal, ModalOverlay } from 'react-aria-components'
import { motion } from 'motion/react'
import { Menu } from 'lucide-react'
import { findArticle, getAdjacentArticles, displayName } from '../../../../content/registry'
import { getContent } from '../../../../content/docs'
import { ArticleRenderer, extractHeadings, type ExtractedHeading } from '../../../../components/docs/ArticleRenderer'
import { DocsSidebar } from '../../../../components/docs/DocsSidebar'

export const Route = createFileRoute('/_website/docs/$categorySlug/$articleSlug')({
  head: ({ params }) => ({
    meta: [
      {
        title: `${params.articleSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} \u2014 Docs \u2014 HyperQuote`,
      },
    ],
  }),
  component: ArticlePage,
})

const reveal = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] },
  },
}

function ArticlePage() {
  const { t, i18n } = useTranslation('website')
  const { categorySlug, articleSlug } = useParams({
    from: '/_website/docs/$categorySlug/$articleSlug',
  })
  const navigate = useNavigate()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  const locale = (i18n.language === 'ar' ? 'ar' : 'en') as 'en' | 'ar'
  const markdown = getContent(categorySlug, articleSlug, locale)

  const match = findArticle(categorySlug, articleSlug)
  if (!match) {
    navigate({ to: '/docs' })
    return null
  }

  const { category, article } = match
  const adjacent = getAdjacentArticles(categorySlug, articleSlug)
  const headings = useMemo(() => extractHeadings(markdown), [markdown])

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-12 pt-24 pb-20 lg:pt-32 lg:pb-28">
      {/* Mobile sidebar trigger */}
      <div className="md:hidden mb-8">
        <button
          type="button"
          onClick={() => setIsMobileSidebarOpen(true)}
          className="flex items-center gap-2 text-[13px] font-medium text-[var(--color-text-muted)]"
        >
          <Menu size={16} />
          {t('docs.browseAll', { defaultValue: 'Browse all topics' })}
        </button>
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={reveal}
        className="flex gap-12 lg:gap-16"
      >
        {/* Sidebar */}
        <div className="hidden md:block">
          <DocsSidebar
            activeCategorySlug={categorySlug}
            activeArticleSlug={articleSlug}
          />
        </div>

        {/* Article */}
        <ArticleRenderer
          markdown={markdown}
          articleTitle={t(article.titleKey, { defaultValue: displayName(article.titleKey) })}
          categorySlug={categorySlug}
          articleSlug={articleSlug}
          prev={adjacent.prev}
          next={adjacent.next}
        />

        {/* TOC */}
        <TableOfContentsRaw headings={headings} />
      </motion.div>

      {/* Mobile sidebar */}
      {isMobileSidebarOpen && (
        <ModalOverlay
          isOpen={isMobileSidebarOpen}
          onOpenChange={(open) => { if (!open) setIsMobileSidebarOpen(false) }}
          isDismissable
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        >
          <Modal className="fixed inset-x-0 bottom-0 z-50">
            <Dialog
              aria-label={t('docs.sidebarMenu', { defaultValue: 'Documentation menu' })}
              className="bg-[var(--color-base)] rounded-t-2xl p-6 max-h-[70vh] overflow-y-auto outline-none"
            >
              <div className="w-12 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-4" />
              <DocsSidebar
                activeCategorySlug={categorySlug}
                activeArticleSlug={articleSlug}
              />
            </Dialog>
          </Modal>
        </ModalOverlay>
      )}
    </div>
  )
}

function TableOfContentsRaw({ headings }: { headings: ExtractedHeading[] }) {
  const { t } = useTranslation('website')
  const [activeId, setActiveId] = useState('')
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (headings.length === 0) return
    observerRef.current?.disconnect()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id)
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 },
    )
    observerRef.current = observer
    for (const h of headings) {
      const el = document.getElementById(h.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [headings])

  if (headings.length === 0) return null

  return (
    <aside className="hidden xl:block w-44 shrink-0 sticky top-24 self-start max-h-[calc(100vh-8rem)] overflow-y-auto">
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-text-subtle)] mb-3">
        {t('docs.toc.label', { defaultValue: 'On this page' })}
      </p>
      <ul className="space-y-0.5">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={`relative block text-[13px] leading-snug py-1 transition-colors duration-150 ${
                h.level === 3 ? 'ps-4' : 'ps-0'
              } ${
                activeId === h.id
                  ? 'text-[var(--color-text)] font-medium'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  )
}
