import { useState, useMemo, useRef } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import Fuse from 'fuse.js'
import { ContactInfo } from '../../components/support/ContactInfo'
import { ContactForm } from '../../components/support/ContactForm'
import { FAQAccordion, FAQ_DATA } from '../../components/support/FAQAccordion'
import { useChatWidget } from '../../hooks/useChatWidget'
import { Search, ArrowRight, Wand2 } from 'lucide-react'
import { SearchField, Label, Input } from 'react-aria-components'

export const Route = createFileRoute('/_website/support')({
  head: () => ({
    meta: [
      { title: 'Support \u2014 HyperQuote' },
      {
        name: 'description',
        content:
          'Get help with HyperQuote. Contact us via WhatsApp, email, or phone. Browse frequently asked questions.',
      },
      { property: 'og:title', content: 'Support \u2014 HyperQuote' },
      {
        property: 'og:description',
        content:
          'Get help with HyperQuote. Contact us via WhatsApp, email, or phone.',
      },
    ],
  }),
  component: SupportPage,
})

const reveal = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  },
}

const viewportOnce = { once: true, margin: '-60px' as const }

function SupportPage() {
  const { t, i18n } = useTranslation('website')
  const isArabic = i18n.language === 'ar'
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [expandFaqId, setExpandFaqId] = useState<string | null>(null)
  const openWithMessage = useChatWidget((s) => s.openWithMessage)
  const searchRef = useRef<HTMLDivElement>(null)

  const fuse = useMemo(
    () =>
      new Fuse(FAQ_DATA, {
        threshold: 0.4,
        keys: ['question', 'question_ar', 'answer', 'answer_ar', 'tag'],
      }),
    [],
  )

  const results = useMemo(() => {
    if (!searchQuery.trim()) return []
    return fuse.search(searchQuery).slice(0, 5)
  }, [searchQuery, fuse])

  const showResults = searchFocused && searchQuery.trim().length > 0

  return (
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={reveal}
        className="px-6 pb-16 pt-24 lg:px-12 lg:pb-24 lg:pt-36"
      >
        <div className="mx-auto max-w-[1200px]">
          <h1
            className="font-semibold leading-[1] tracking-[-0.02em]"
            style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)' }}
          >
            {t('support.heroHeading', {
              defaultValue: 'How can we help?',
            })}
          </h1>
          <p className="mt-4 text-[15px] opacity-35 max-w-[400px] leading-[1.7]">
            {t('support.responseTime')}
          </p>

          {/* Search with results dropdown */}
          <div ref={searchRef} className="relative mt-14 max-w-[480px] ps-6 lg:ps-10">
            {/* Help desk availability hint */}
            <p className="mb-5 font-[family-name:var(--font-mono)] text-[12px] tracking-[0.04em] opacity-30">
              {isArabic
                ? '\u0627\u0644\u0623\u062D\u062F \u2013 \u0627\u0644\u062E\u0645\u064A\u0633 \u060C \u0668:\u0660\u0660 \u0635 \u2013 \u0666:\u0660\u0660 \u0645 \u0628\u062A\u0648\u0642\u064A\u062A \u0627\u0644\u0642\u0627\u0647\u0631\u0629'
                : 'Sun\u2013Thu, 8:00 AM \u2013 6:00 PM Cairo time'}
            </p>
            <SearchField
              aria-label={t('support.searchPlaceholder')}
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={() => {
                if (searchQuery.trim()) {
                  openWithMessage(searchQuery.trim())
                  setSearchQuery('')
                }
              }}
              onFocusChange={setSearchFocused}
              className="w-full"
            >
              <Label className="sr-only">
                {t('support.searchPlaceholder')}
              </Label>
              <div className="flex items-center border-b border-[var(--color-text)]/[0.1] pb-3 transition-colors duration-200 focus-within:border-[var(--color-primary)]/40">
                <Search size={16} className="shrink-0 opacity-25" />
                <Input
                  placeholder={t('support.searchPlaceholder')}
                  className="ms-3 w-full border-0 bg-transparent text-[15px] outline-none placeholder:opacity-30"
                />
              </div>
            </SearchField>

            {/* Results dropdown */}
            <AnimatePresence>
              {showResults && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="absolute start-0 top-full z-30 mt-2 w-full border border-[var(--color-text)]/[0.08] bg-[var(--color-base)] shadow-[0_16px_48px_rgba(0,0,0,0.1)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.4)]"
                >
                  {results.length > 0 ? (
                    <>
                      {results.map((r) => (
                        <button
                          key={r.item.id}
                          type="button"
                          onClick={() => {
                            setSearchQuery('')
                            setSearchFocused(false)
                            setExpandFaqId(r.item.id)
                          }}
                          className="group flex w-full items-center justify-between border-b border-[var(--color-text)]/[0.05] px-5 py-4 text-start transition-colors last:border-0 hover:bg-[var(--color-text)]/[0.02]"
                        >
                          <div>
                            <div className="text-[14px] font-medium tracking-[-0.01em]">
                              {isArabic ? r.item.question_ar : r.item.question}
                            </div>
                            <div className="mt-1 text-[12px] opacity-35">
                              {r.item.tag}
                            </div>
                          </div>
                          <ArrowRight
                            size={14}
                            className="icon-end shrink-0 opacity-0 transition-opacity group-hover:opacity-30"
                          />
                        </button>
                      ))}
                      {/* Ask AI option at bottom */}
                      <button
                        type="button"
                        onClick={() => {
                          openWithMessage(searchQuery.trim())
                          setSearchQuery('')
                          setSearchFocused(false)
                        }}
                        className="flex w-full items-center gap-2 border-t border-[var(--color-text)]/[0.05] px-5 py-3.5 text-[13px] font-medium text-[var(--color-primary)] transition-opacity hover:opacity-70"
                      >
                        <Wand2 size={14} />
                        {t('support.askAI')}
                      </button>
                    </>
                  ) : (
                    <div className="px-5 py-6">
                      <p className="text-[14px] opacity-35">
                        {t('support.faq.noResults')}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          openWithMessage(searchQuery.trim())
                          setSearchQuery('')
                          setSearchFocused(false)
                        }}
                        className="mt-3 flex items-center gap-2 text-[13px] font-medium text-[var(--color-primary)] transition-opacity hover:opacity-70"
                      >
                        <Wand2 size={14} />
                        {t('support.askAI')}
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.section>

      {/* ── Divider ── */}
      <div className="mx-auto max-w-[1200px] px-6 lg:px-12">
        <div className="h-px bg-[var(--color-text)] opacity-[0.07]" />
      </div>

      {/* ── Contact ── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={reveal}
        className="px-6 py-20 lg:px-12 lg:py-28"
      >
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-14 group">
            <span className="block font-[family-name:var(--font-mono)] text-[clamp(2rem,4vw,3rem)] leading-none text-[var(--color-text)] opacity-10 transition-colors duration-200 group-hover:text-[var(--color-primary)] group-hover:opacity-25">
              01
            </span>
            <h2
              className="mt-3 font-bold tracking-[-0.02em]"
              style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}
            >
              {t('support.sectionContact')}
            </h2>
          </div>

          <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-[1fr_1fr] lg:gap-24">
            <ContactForm />
            {/* Mobile divider between stacked form and info */}
            <div className="h-px bg-[var(--color-text)] opacity-[0.07] lg:hidden" />
            <ContactInfo />
          </div>
        </div>
      </motion.section>

      {/* ── Divider ── */}
      <div className="mx-auto max-w-[1200px] px-6 lg:px-12">
        <div className="h-px bg-[var(--color-text)] opacity-[0.07]" />
      </div>

      {/* ── FAQ ── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={reveal}
        className="px-6 py-20 lg:px-12 lg:py-28"
      >
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-14 group">
            <span className="block font-[family-name:var(--font-mono)] text-[clamp(2rem,4vw,3rem)] leading-none text-[var(--color-text)] opacity-10 transition-colors duration-200 group-hover:text-[var(--color-primary)] group-hover:opacity-25">
              02
            </span>
            <h2
              className="mt-3 font-bold tracking-[-0.02em]"
              style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}
            >
              {t('support.faq.heading')}
            </h2>
          </div>
          <FAQAccordion expandId={expandFaqId} />

          {/* Still need help? prompt */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={reveal}
            className="mt-16 border-t border-[var(--color-text)]/[0.07] pt-10 text-center"
          >
            <p className="text-[15px] opacity-40">
              {isArabic ? '\u0644\u0633\u0647 \u0645\u062D\u062A\u0627\u062C \u0645\u0633\u0627\u0639\u062F\u0629\u061F' : 'Still need help?'}
            </p>
            <button
              type="button"
              onClick={() => openWithMessage('')}
              className="mt-3 inline-flex items-center gap-2 text-[14px] font-medium text-[var(--color-primary)] transition-opacity hover:opacity-70"
            >
              <Wand2 size={14} />
              {t('support.askAI')}
            </button>
          </motion.div>
        </div>
      </motion.section>
    </div>
  )
}
