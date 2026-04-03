import { useState, useMemo, useRef, useCallback, useEffect, type ReactNode } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import Fuse from 'fuse.js'
import { ContactInfo } from '../../components/support/ContactInfo'
import { ContactForm } from '../../components/support/ContactForm'
import { FAQAccordion, FAQ_DATA } from '../../components/support/FAQAccordion'
import { useChatWidget } from '../../hooks/useChatWidget'
import { Search, ArrowRight, CornerDownLeft } from 'lucide-react'
import { SectionNumber } from '../../components/shared/SectionNumber'

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

function getSnippet(text: string, query: string, radius = 50): string | null {
  if (!text || !query) return null
  const lower = text.toLowerCase()
  const qLower = query.toLowerCase()
  const idx = lower.indexOf(qLower)
  if (idx === -1) return null
  const start = Math.max(0, idx - radius)
  const end = Math.min(text.length, idx + query.length + radius)
  let snippet = text.slice(start, end)
  if (start > 0) snippet = `\u2026${snippet}`
  if (end < text.length) snippet = `${snippet}\u2026`
  return snippet
}

function SupportPage() {
  const { t, i18n } = useTranslation('website')
  const isArabic = i18n.language === 'ar'
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [expandFaqId, setExpandFaqId] = useState<string | null>(null)
  const openWithMessage = useChatWidget((s) => s.openWithMessage)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const fuse = useMemo(
    () =>
      new Fuse(FAQ_DATA, {
        threshold: 0.4,
        ignoreFieldNorm: true,
        keys: ['question', 'question_ar', 'answer', 'answer_ar', 'tag'],
      }),
    [],
  )

  const results = useMemo(() => {
    const q = query.trim()
    if (!q) return []

    const fuseResults = fuse.search(q)
    if (fuseResults.length > 0) return fuseResults.slice(0, 6)

    // Exact substring fallback
    const qLower = q.toLowerCase()
    return FAQ_DATA
      .filter(
        (item) =>
          item.question.toLowerCase().includes(qLower) ||
          item.question_ar.includes(q) ||
          item.answer.toLowerCase().includes(qLower) ||
          item.answer_ar.includes(q) ||
          item.tag.toLowerCase().includes(qLower),
      )
      .slice(0, 6)
      .map((item, i) => ({ item, refIndex: i, score: 0 }))
  }, [query, fuse])

  const showResults = focused && query.trim().length > 0
  const totalItems = results.length + 1 // results + Ask Lyon

  useEffect(() => {
    setActiveIdx(-1)
  }, [results])

  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return
    const items = listRef.current.querySelectorAll('[data-search-item]')
    items[activeIdx]?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  const selectResult = useCallback(
    (idx: number) => {
      if (idx >= 0 && idx < results.length) {
        setExpandFaqId(results[idx].item.id)
        setQuery('')
        setFocused(false)
        setActiveIdx(-1)
        // Scroll to FAQ section
        setTimeout(() => {
          document.getElementById(results[idx].item.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
      } else if (idx === results.length) {
        openWithMessage(query.trim())
        setQuery('')
        setFocused(false)
        setActiveIdx(-1)
      }
    },
    [results, query, openWithMessage],
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
            selectResult(activeIdx)
          } else {
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
    [showResults, activeIdx, totalItems, selectResult, openWithMessage, query],
  )

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
            className="font-semibold leading-[1] tracking-[-0.02em]"
            style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)' }}
          >
            {t('support.heroHeading', { defaultValue: 'How can we help?' })}
          </h1>
          <p className="mt-4 text-[15px] opacity-35 max-w-[400px] leading-[1.7]">
            {t('support.responseTime')}
          </p>

          {/* Search */}
          <div className="relative mt-14 max-w-[480px] ps-6 lg:ps-10">
            <p className="mb-5 font-[family-name:var(--font-mono)] text-[12px] tracking-[0.04em] opacity-30">
              {isArabic
                ? '\u0627\u0644\u0623\u062D\u062F \u2013 \u0627\u0644\u062E\u0645\u064A\u0633 \u060C \u0668:\u0660\u0660 \u0635 \u2013 \u0666:\u0660\u0660 \u0645 \u0628\u062A\u0648\u0642\u064A\u062A \u0627\u0644\u0642\u0627\u0647\u0631\u0629'
                : 'Sun\u2013Thu, 8:00 AM \u2013 6:00 PM Cairo time'}
            </p>

            <div onKeyDown={handleKeyDown}>
              <div className="flex items-center border-b border-[var(--color-text)]/[0.1] pb-3 transition-colors duration-200 focus-within:border-[var(--color-primary)]/40">
                <Search size={16} className="shrink-0 opacity-25" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setTimeout(() => setFocused(false), 200)}
                  placeholder={t('support.searchPlaceholder', { defaultValue: 'Search for help...' })}
                  className="ms-3 w-full border-0 bg-transparent text-[15px] outline-none placeholder:opacity-30"
                  aria-label={t('support.searchPlaceholder', { defaultValue: 'Search for help...' })}
                  role="combobox"
                  aria-expanded={showResults}
                  aria-activedescendant={activeIdx >= 0 ? `support-item-${activeIdx}` : undefined}
                />
                {query.trim() && (
                  <span className="shrink-0 text-[11px] text-[var(--color-text-subtle)] flex items-center gap-1">
                    <CornerDownLeft size={11} />
                    {t('support.askAI', { defaultValue: 'Ask Lyon' })}
                  </span>
                )}
              </div>
            </div>

            {/* Results dropdown */}
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
                        const isActive = activeIdx === i
                        const answer = isArabic ? r.item.answer_ar : r.item.answer
                        const snippet = getSnippet(answer, query.trim())
                        return (
                          <button
                            key={r.item.id}
                            id={`support-item-${i}`}
                            data-search-item
                            type="button"
                            role="option"
                            aria-selected={isActive}
                            onClick={() => selectResult(i)}
                            onMouseEnter={() => setActiveIdx(i)}
                            className={`group flex w-full items-center justify-between border-b border-[var(--color-text)]/[0.05] px-5 py-4 text-start transition-colors last:border-0 ${
                              isActive ? 'bg-[var(--color-text)]/[0.03]' : 'hover:bg-[var(--color-text)]/[0.02]'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-[14px] font-medium tracking-[-0.01em]">
                                {isArabic ? r.item.question_ar : r.item.question}
                              </div>
                              <div className="mt-0.5 text-[12px] opacity-35">
                                {highlightMatch(r.item.tag, query.trim())}
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
                      {/* Ask Lyon */}
                      <button
                        id={`support-item-${results.length}`}
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
                        {t('support.askAI', { defaultValue: 'Ask Lyon' })}
                        <span className="opacity-40">&mdash; &ldquo;{query.trim()}&rdquo;</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="px-5 pt-5 pb-2">
                        <p className="text-[14px] opacity-35">
                          {t('support.faq.noResults', { defaultValue: 'No results found' })}
                        </p>
                      </div>
                      <button
                        id="support-item-0"
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
                        {t('support.askAI', { defaultValue: 'Ask Lyon' })}
                        <span className="opacity-40">&mdash; &ldquo;{query.trim()}&rdquo;</span>
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.section>

      {/* Divider */}
      <div className="mx-auto max-w-[1200px] px-6 lg:px-12">
        <div className="h-px bg-[var(--color-text)] opacity-[0.07]" />
      </div>

      {/* Contact */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={reveal}
        className="px-6 py-20 lg:px-12 lg:py-28"
      >
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-14">
            <SectionNumber n={1} />
            <h2
              className="mt-3 font-bold tracking-[-0.02em]"
              style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}
            >
              {t('support.sectionContact')}
            </h2>
          </div>

          <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-[1fr_1fr] lg:gap-24">
            <ContactForm />
            <div className="h-px bg-[var(--color-text)] opacity-[0.07] lg:hidden" />
            <ContactInfo />
          </div>
        </div>
      </motion.section>

      {/* Divider */}
      <div className="mx-auto max-w-[1200px] px-6 lg:px-12">
        <div className="h-px bg-[var(--color-text)] opacity-[0.07]" />
      </div>

      {/* FAQ */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={reveal}
        className="px-6 py-20 lg:px-12 lg:py-28"
      >
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-14">
            <SectionNumber n={2} />
            <h2
              className="mt-3 font-bold tracking-[-0.02em]"
              style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}
            >
              {t('support.faq.heading')}
            </h2>
          </div>
          <FAQAccordion expandId={expandFaqId} />

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
              {t('support.askAI', { defaultValue: 'Ask Lyon' })}
            </button>
          </motion.div>
        </div>
      </motion.section>
    </div>
  )
}
