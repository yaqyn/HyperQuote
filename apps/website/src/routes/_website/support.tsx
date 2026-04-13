import { useState, useMemo, useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { ContactInfo } from '../../components/support/ContactInfo'
import { ContactForm } from '../../components/support/ContactForm'
import { FAQAccordion, FAQ_DATA } from '../../components/support/FAQAccordion'
import { useChatWidget } from '../../hooks/useChatWidget'
import { SearchDropdown, type SearchEntry } from '../../components/shared/SearchDropdown'
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

function SupportPage() {
  const { t, i18n } = useTranslation('website')
  const isArabic = i18n.language === 'ar'
  const [expandFaqId, setExpandFaqId] = useState<string | null>(null)
  const openWithMessage = useChatWidget((s) => s.openWithMessage)

  const faqItems: SearchEntry[] = useMemo(
    () =>
      FAQ_DATA.map((faq) => ({
        id: faq.id,
        title: t(faq.questionKey),
        subtitle: t(`support.faq.tags.${t(faq.tagKey)}`),
        body: t(faq.answerKey),
      })),
    [t],
  )

  const handleSelect = useCallback(
    (item: SearchEntry) => {
      setExpandFaqId(item.id)
      setTimeout(() => {
        document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    },
    [],
  )

  const handleAskLyon = useCallback(
    (q: string) => {
      openWithMessage(q)
    },
    [openWithMessage],
  )

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={reveal}
        className="px-6 lg:px-12 min-h-[70vh] flex items-center justify-center"
      >
        <div className="mx-auto max-w-[1200px] text-center">
          <h1
            className="font-extrabold leading-[1] tracking-[-0.03em]"
            style={{ fontSize: 'clamp(2.8rem, 6vw, 4.5rem)' }}
          >
            {t('support.heading')}
          </h1>
          <p className="mt-5 text-[15px] opacity-35 mx-auto max-w-[400px] leading-[1.7]">
            {t('support.responseTime')}
          </p>
          <p className="mt-2 font-[family-name:var(--font-mono)] text-[12px] tracking-[0.04em] opacity-25">
            {isArabic
              ? '\u0627\u0644\u0623\u062D\u062F \u2013 \u0627\u0644\u062E\u0645\u064A\u0633 \u060C \u0668:\u0660\u0660 \u0635 \u2013 \u0666:\u0660\u0660 \u0645 \u0628\u062A\u0648\u0642\u064A\u062A \u0627\u0644\u0642\u0627\u0647\u0631\u0629'
              : 'Sun\u2013Thu, 8:00 AM \u2013 6:00 PM Cairo time'}
          </p>

          {/* Search */}
          <div className="mt-10 flex justify-center">
            <SearchDropdown
              items={faqItems}
              placeholder={t('support.searchPlaceholder', { defaultValue: 'Search for help...' })}
              askLyonLabel={t('support.askAI', { defaultValue: 'Ask Lyon' })}
              onSelect={handleSelect}
              onAskLyon={handleAskLyon}
              className="max-w-[480px] w-full"
              idPrefix="support-search"
            />
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
        id="faq"
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
