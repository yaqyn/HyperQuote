import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Dialog, Modal, ModalOverlay } from 'react-aria-components'
import { motion } from 'motion/react'
import { ArrowRight, Menu } from 'lucide-react'
import { WIZARDS, DOC_CATEGORIES, displayName } from '../../../content/registry'
import { DocsSearch } from '../../../components/docs/DocsSearch'
import { DocsSidebar } from '../../../components/docs/DocsSidebar'

export const Route = createFileRoute('/_website/docs/')({
  head: () => ({
    meta: [
      { title: 'Docs \u2014 HyperQuote' },
      {
        name: 'description',
        content:
          'HyperQuote documentation. Learn how to source building materials, manage quotes, and track deliveries.',
      },
    ],
  }),
  component: DocsIndexPage,
})

const reveal = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  },
}

const stagger = (delay: number) => ({
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1], delay },
  },
})

const viewportOnce = { once: true, margin: '-60px' as const }

function DocsIndexPage() {
  const { t } = useTranslation('website')
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={reveal}
        className="px-6 pb-16 pt-24 lg:px-12 lg:pb-24 lg:pt-36"
      >
        <div className="mx-auto max-w-[1200px]">
          <h1
            className="font-bold leading-[0.95] tracking-[-0.03em]"
            style={{ fontSize: 'clamp(2.8rem, 6vw, 4.5rem)' }}
          >
            {t('docs.heading', { defaultValue: 'Documentation' })}
          </h1>

          <div className="mt-6 h-px w-16 bg-[var(--color-text)] opacity-10" />

          <p className="mt-6 text-[15px] opacity-35 max-w-[440px] leading-relaxed">
            {t('docs.subheading', {
              defaultValue:
                'Everything you need to source materials, manage quotes, and track deliveries on HyperQuote.',
            })}
          </p>
          <p className="mt-3 font-[family-name:var(--font-mono)] text-[12px] text-[var(--color-text)] opacity-25 tracking-wide">
            {t('docs.articleCount', { defaultValue: '34 articles \u00b7 4 guides' })}
          </p>

          {/* Search */}
          <div className="mt-10">
            <DocsSearch />
          </div>
        </div>
      </motion.section>

      {/* Divider */}
      <div className="mx-auto max-w-[1200px] px-6 lg:px-12">
        <div className="h-px bg-[var(--color-text)] opacity-[0.07]" />
      </div>

      {/* Mobile sidebar trigger */}
      <div className="md:hidden px-6 pt-8">
        <button
          type="button"
          onClick={() => setIsMobileSidebarOpen(true)}
          className="flex items-center gap-2 text-[13px] font-medium text-[var(--color-text-muted)]"
          aria-label={t('docs.openSidebar', { defaultValue: 'Open documentation menu' })}
        >
          <Menu size={16} />
          {t('docs.browseAll', { defaultValue: 'Browse all topics' })}
        </button>
      </div>

      {/* Wizard Guides */}
      <section className="px-6 py-20 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-[1200px]">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={reveal}
            className="mb-14 group"
          >
            <span className="block font-[family-name:var(--font-mono)] text-[clamp(2rem,4vw,3rem)] leading-none text-[var(--color-text)] opacity-10 transition-colors duration-200 group-hover:text-[var(--color-primary)] group-hover:opacity-25">
              01
            </span>
            <h2
              className="mt-3 font-bold tracking-[-0.02em]"
              style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}
            >
              {t('docs.guidesHeading', { defaultValue: 'Guides' })}
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {WIZARDS.map((w, i) => (
              <motion.div
                key={w.slug}
                initial="hidden"
                whileInView="visible"
                viewport={viewportOnce}
                variants={stagger(i * 0.08)}
              >
                <Link
                  to="/docs/guide/$guideSlug"
                  params={{ guideSlug: w.slug }}
                  className="group block p-6 border border-[var(--color-text)]/[0.06] hover:border-[var(--color-text)]/[0.12] transition-colors"
                >
                  <span className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-text-subtle)]">
                    {t('docs.wizard.guide', { defaultValue: 'Guide' })}
                  </span>
                  <h3 className="mt-2 text-[16px] font-semibold tracking-[-0.01em]">
                    {t(w.titleKey, { defaultValue: displayName(w.titleKey) })}
                  </h3>
                  <p className="mt-2 text-[13px] text-[var(--color-text-muted)] leading-relaxed line-clamp-2">
                    {t(w.descriptionKey, { defaultValue: displayName(w.descriptionKey) })}
                  </p>
                  <div className="mt-4 flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                    {t('docs.startGuide', { defaultValue: 'Start guide' })}
                    <ArrowRight size={13} className="icon-end" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-[1200px] px-6 lg:px-12">
        <div className="h-px bg-[var(--color-text)] opacity-[0.07]" />
      </div>

      {/* Documentation Categories */}
      <section className="px-6 py-20 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-[1200px]">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={reveal}
            className="mb-14 group"
          >
            <span className="block font-[family-name:var(--font-mono)] text-[clamp(2rem,4vw,3rem)] leading-none text-[var(--color-text)] opacity-10 transition-colors duration-200 group-hover:text-[var(--color-primary)] group-hover:opacity-25">
              02
            </span>
            <h2
              className="mt-3 font-bold tracking-[-0.02em]"
              style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}
            >
              {t('docs.docsHeading', { defaultValue: 'Documentation' })}
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
            {DOC_CATEGORIES.map((cat, catIdx) => (
              <motion.div
                key={cat.slug}
                initial="hidden"
                whileInView="visible"
                viewport={viewportOnce}
                variants={stagger(catIdx * 0.06)}
                className="relative py-8 md:px-8 first:md:ps-0 last:md:pe-0"
              >
                {/* Vertical divider (desktop) */}
                {catIdx % 3 !== 0 && (
                  <div className="hidden md:block absolute start-0 top-8 bottom-8 w-px bg-[var(--color-text)] opacity-[0.07]" />
                )}
                {/* Horizontal divider (mobile) */}
                {catIdx > 0 && (
                  <div className="md:hidden absolute top-0 inset-x-0 h-px bg-[var(--color-text)] opacity-[0.07]" />
                )}

                <div className="flex items-baseline gap-2.5 mb-5">
                  <span className="font-[family-name:var(--font-mono)] text-[12px] text-[var(--color-text-subtle)]">
                    {String(catIdx + 1).padStart(2, '0')}
                  </span>
                  <Link
                    to="/docs/$categorySlug"
                    params={{ categorySlug: cat.slug }}
                    className="text-[16px] font-semibold tracking-[-0.01em] hover:text-[var(--color-primary)] transition-colors"
                  >
                    {t(cat.titleKey, { defaultValue: displayName(cat.titleKey) })}
                  </Link>
                </div>

                <ul className="space-y-2">
                  {cat.articles.map((article) => (
                    <li key={article.slug}>
                      <Link
                        to="/docs/$categorySlug/$articleSlug"
                        params={{ categorySlug: cat.slug, articleSlug: article.slug }}
                        className="group flex items-center justify-between py-1.5 text-[14px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                      >
                        <span>{t(article.titleKey, { defaultValue: displayName(article.titleKey) })}</span>
                        <ArrowRight
                          size={13}
                          className="icon-end shrink-0 opacity-0 group-hover:opacity-40 transition-opacity"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile sidebar bottom sheet */}
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
              <DocsSidebar />
            </Dialog>
          </Modal>
        </ModalOverlay>
      )}
    </div>
  )
}
