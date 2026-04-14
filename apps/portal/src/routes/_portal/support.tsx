/**
 * Support — premium bento grid.
 * Section 1: 4 tall service cards with icon showcase + text below
 * Section 2: Wide resource cards for address, docs, FAQ
 */
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { Mail, MessageCircle, TicketPlus, Phone, MapPin, FileText, HelpCircle, ExternalLink } from 'lucide-react'

export const Route = createFileRoute('/_portal/support')({
  component: SupportPage,
})

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay: 0.05 + i * 0.06, ease: [0.22, 1, 0.36, 1] },
})

function SupportPage() {
  const { t } = useTranslation('portal')

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-auto">
      <div className="w-full max-w-[960px] mx-auto px-6 max-md:px-4 py-8 max-md:py-5">

        {/* Header */}
        <motion.div {...stagger(0)} className="mb-10">
          <h1
            className="text-[22px] font-semibold tracking-tight"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.25) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {t('support.pageTitle')}
          </h1>
        </motion.div>

        {/* Service Grid — 4 tall cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <ServiceCard
            index={0}
            icon={Mail}
            labelKey="support.contactUs"
            descKey="support.contactDesc"
            href="mailto:support@hyperquote.net"
          />
          <ServiceCard
            index={1}
            icon={MessageCircle}
            labelKey="support.liveChat"
            descKey="support.liveChatDesc"
            href="https://wa.me/201000000000"
          />
          <ServiceCard
            index={2}
            icon={TicketPlus}
            labelKey="support.submitTicket"
            descKey="support.ticketDesc"
          />
          <ServiceCard
            index={3}
            icon={Phone}
            labelKey="support.directCall"
            descKey="support.callDesc"
            href="tel:+201000000000"
          />
        </div>

        {/* Resources — wide cards */}
        <motion.div {...stagger(5)} className="mb-10">
          <h2 className="text-[13px] uppercase tracking-[0.15em] text-[var(--p-text-muted)] mb-4">
            {t('support.resources')}
          </h2>

          {/* Two-column row for docs + faq */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <ResourceCard
              index={6}
              icon={FileText}
              labelKey="support.docs"
              descKey="support.docsDesc"
              href="https://www.hyperquote.net/docs"
            />
            <ResourceCard
              index={7}
              icon={HelpCircle}
              labelKey="support.faq"
              descKey="support.faqDesc"
              href="https://www.hyperquote.net/support#faq"
            />
          </div>

          {/* Full-width address card */}
          <motion.a
            {...stagger(8)}
            href="https://maps.google.com/?q=Arkan+Plaza+Sheikh+Zayed+Egypt"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-5 rounded-xl bg-[var(--p-card)] border border-[var(--p-border)] p-5 hover:border-[var(--p-border-strong)] hover:bg-[var(--p-elevated)] transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-[var(--p-elevated)] border border-[var(--p-border)] flex items-center justify-center shrink-0">
              <MapPin size={20} strokeWidth={1.5} className="text-[var(--p-text-muted)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--p-text)]">{t('support.address')}</p>
              <p className="text-[13px] text-[var(--p-text-muted)] mt-0.5">{t('support.addressValue')}</p>
            </div>
            <ExternalLink size={14} strokeWidth={1.5} className="text-[var(--p-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </motion.a>
        </motion.div>
      </div>
    </div>
  )
}

// ============================================================================
// Service Card — tall with icon showcase
// ============================================================================

function ServiceCard({
  index,
  icon: Icon,
  labelKey,
  descKey,
  href,
}: {
  index: number
  icon: typeof Mail
  labelKey: string
  descKey: string
  href?: string
}) {
  const { t } = useTranslation('portal')

  const content = (
    <>
      {/* Top glow */}
      <div
        className="absolute inset-x-0 top-0 h-px rounded-t-xl"
        style={{
          background: 'linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.06) 50%, transparent 90%)',
        }}
      />

      {/* Icon */}
      <div className="flex items-center justify-center h-28 mb-4">
        <Icon
          size={38}
          strokeWidth={1}
          className="text-[var(--p-text-secondary)] group-hover:text-[var(--p-text)] transition-all duration-500 ease-out group-hover:scale-110"
        />
      </div>

      {/* Text */}
      <h3 className="text-[14px] font-medium text-[var(--p-text)] mb-1.5">{t(labelKey)}</h3>
      <p className="text-[13px] text-[var(--p-text-muted)] leading-relaxed">{t(descKey)}</p>
    </>
  )

  const className = "group relative flex flex-col rounded-xl bg-[var(--p-card)] border border-[var(--p-border)] p-5 pb-6 transition-all duration-500 ease-out hover:bg-[var(--p-elevated)] hover:border-[var(--p-border-strong)] cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-[var(--p-accent)]"

  if (href) {
    return (
      <motion.a
        {...stagger(1 + index)}
        href={href}
        target={href.startsWith('http') ? '_blank' : undefined}
        rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
        className={className}
      >
        {content}
      </motion.a>
    )
  }

  return (
    <motion.button
      {...stagger(1 + index)}
      type="button"
      className={`${className} text-start`}
    >
      {content}
    </motion.button>
  )
}

// ============================================================================
// Resource Card
// ============================================================================

function ResourceCard({
  index,
  icon: Icon,
  labelKey,
  descKey,
  href,
}: {
  index: number
  icon: typeof FileText
  labelKey: string
  descKey: string
  href: string
}) {
  const { t } = useTranslation('portal')

  return (
    <motion.a
      {...stagger(index)}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-4 rounded-xl bg-[var(--p-card)] border border-[var(--p-border)] p-5 hover:border-[var(--p-border-strong)] hover:bg-[var(--p-elevated)] transition-all group"
    >
      <div className="w-10 h-10 rounded-lg bg-[var(--p-elevated)] border border-[var(--p-border)] flex items-center justify-center shrink-0">
        <Icon size={16} strokeWidth={1.5} className="text-[var(--p-text-muted)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--p-text)]">{t(labelKey)}</p>
        <p className="text-[13px] text-[var(--p-text-muted)] mt-0.5">{t(descKey)}</p>
      </div>
      <ExternalLink size={14} strokeWidth={1.5} className="text-[var(--p-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </motion.a>
  )
}
