import { useState } from 'react'
import { createFileRoute, useParams, useNavigate, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Dialog, Modal, ModalOverlay } from 'react-aria-components'
import { motion } from 'motion/react'
import { ArrowRight, Menu } from 'lucide-react'
import { DOC_CATEGORIES } from '../../../../content/registry'
import { DocsSidebar } from '../../../../components/docs/DocsSidebar'

export const Route = createFileRoute('/_website/docs/$categorySlug/')({
  head: ({ params }) => ({
    meta: [
      {
        title: `${params.categorySlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} \u2014 Docs \u2014 HyperQuote`,
      },
    ],
  }),
  component: CategoryIndexPage,
})

const reveal = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] },
  },
}

const viewportOnce = { once: true, margin: '-60px' as const }

function CategoryIndexPage() {
  const { t } = useTranslation('website')
  const { categorySlug } = useParams({ from: '/_website/docs/$categorySlug/' })
  const navigate = useNavigate()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  const category = DOC_CATEGORIES.find((c) => c.slug === categorySlug)

  if (!category) {
    navigate({ to: '/docs' })
    return null
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 lg:px-12 pt-24 pb-20 lg:pt-32 lg:pb-28">
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
          <DocsSidebar activeCategorySlug={categorySlug} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 max-w-[800px]">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[12px] text-[var(--color-text-subtle)] mb-6">
            <Link to="/docs" className="hover:text-[var(--color-text)] transition-colors">
              {t('nav.docs')}
            </Link>
          </div>

          <h1
            className="font-bold tracking-[-0.03em] leading-[1.1] mb-4"
            style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)' }}
          >
            {t(category.titleKey, { defaultValue: categorySlug })}
          </h1>

          <div className="mb-10 h-px bg-[var(--color-text)] opacity-[0.07]" />

          {/* Article list */}
          <ul className="space-y-4">
            {category.articles.map((article, i) => (
              <motion.li
                key={article.slug}
                initial="hidden"
                whileInView="visible"
                viewport={viewportOnce}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1], delay: i * 0.05 },
                  },
                }}
              >
                <Link
                  to="/docs/$categorySlug/$articleSlug"
                  params={{ categorySlug, articleSlug: article.slug }}
                  className="group flex items-center justify-between py-4 border-b border-[var(--color-text)]/[0.05] hover:border-[var(--color-text)]/[0.12] transition-colors"
                >
                  <div>
                    <div className="flex items-baseline gap-2.5">
                      <span className="font-[family-name:var(--font-mono)] text-[12px] text-[var(--color-text-subtle)]">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="text-[16px] font-medium">
                        {t(article.titleKey, { defaultValue: article.slug })}
                      </span>
                    </div>
                    {article.descriptionKey && (
                      <p className="mt-1 ps-8 text-[13px] text-[var(--color-text-muted)] leading-relaxed">
                        {t(article.descriptionKey, { defaultValue: '' })}
                      </p>
                    )}
                  </div>
                  <ArrowRight
                    size={14}
                    className="icon-end shrink-0 opacity-0 group-hover:opacity-40 transition-opacity"
                  />
                </Link>
              </motion.li>
            ))}
          </ul>
        </div>
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
              <DocsSidebar activeCategorySlug={categorySlug} />
            </Dialog>
          </Modal>
        </ModalOverlay>
      )}
    </div>
  )
}
