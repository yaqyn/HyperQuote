import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'

export const Route = createFileRoute('/_website/about')({
  head: () => ({
    meta: [
      { title: 'About \u2014 HyperQuote' },
      {
        name: 'description',
        content:
          "Learn about HyperQuote, Egypt's first digital platform for building materials sourcing.",
      },
      { property: 'og:title', content: 'About \u2014 HyperQuote' },
      {
        property: 'og:description',
        content:
          "Learn about HyperQuote, Egypt's first digital platform for building materials sourcing.",
      },
    ],
  }),
  component: AboutPage,
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

const VALUES = [
  {
    title: '4-Hour Quotes',
    body: 'Submit your material list and receive a consolidated quote from multiple suppliers within 4 hours. No more days spent chasing individual prices.',
  },
  {
    title: 'Complete Transparency',
    body: 'Every quote includes unit pricing, delivery timelines, and payment terms. Track your order from confirmation through delivery with live GPS.',
  },
  {
    title: 'Egyptian-Built',
    body: 'Designed for how Egyptian construction actually works. Quote-based pricing, wire and cheque payments, Cairo truck ban compliance, ETA e-invoicing \u2014 all built in.',
  },
]

const TEAM = [
  { name: 'Ahmed Hassan', role: 'CEO & Founder' },
  { name: 'Sarah El-Masry', role: 'CTO' },
  { name: 'Omar Khalil', role: 'Head of Operations' },
  { name: 'Nour Abdel-Rahman', role: 'Head of Product' },
]

function AboutPage() {
  const { t } = useTranslation('website')

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={reveal}
        className="px-6 pb-20 pt-24 lg:px-12 lg:pb-28 lg:pt-36"
      >
        <div className="mx-auto max-w-[1200px]">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="block font-[family-name:var(--font-mono)] text-[12px] tracking-[0.08em] uppercase mb-6"
          >
            Cairo, Egypt — Est. 2026
          </motion.span>
          <h1
            className="leading-[0.95] tracking-[-0.03em]"
            style={{ fontSize: 'clamp(2.8rem, 6vw, 4.5rem)' }}
          >
            <span className="block font-light">
              {t('about.heroLine1', {
                defaultValue: "Egypt\u2019s building materials,",
              })}
            </span>
            <span className="block font-bold mt-1">
              {t('about.heroLine2', {
                defaultValue: 'reimagined',
              })}
            </span>
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="mt-12 text-[15px] max-w-[480px] leading-[1.7]"
          >
            {t('about.heroSubheadline', {
              defaultValue:
                'HyperQuote connects contractors with verified suppliers through a single platform. One quote request, multiple supplier bids, delivered to your site.',
            })}
          </motion.p>
        </div>
      </motion.section>

      {/* Divider */}
      <div className="mx-auto max-w-[1200px] px-6 lg:px-12">
        <div className="h-px bg-[var(--color-text)] opacity-[0.07]" />
      </div>

      {/* Story */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={reveal}
        className="px-6 py-20 lg:px-12 lg:py-28"
      >
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-12 flex items-baseline gap-4">
            <span className="font-[family-name:var(--font-mono)] text-[13px] text-[var(--color-primary)]">
              01
            </span>
            <h2
              className="font-bold tracking-[-0.02em]"
              style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}
            >
              {t('about.story.heading', { defaultValue: 'The problem' })}
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
            <p className="text-[15px] leading-[1.85] text-[var(--color-text-muted)]">
              {t('about.story.p1', {
                defaultValue:
                  "Egyptian construction runs on relationships, phone calls, and handshake deals. Contractors spend days calling suppliers for prices, comparing quotes on paper, and coordinating deliveries with no visibility. There\u2019s no standard platform, no price transparency, and no way to track an order once it\u2019s placed.",
              })}
            </p>
            <p className="text-[15px] leading-[1.85] text-[var(--color-text-muted)]">
              {t('about.story.p2', {
                defaultValue:
                  'HyperQuote replaces that chaos with a structured, transparent system \u2014 without removing the human element that makes Egyptian business work. We source from multiple suppliers, consolidate pricing, handle logistics, and give every stakeholder real-time visibility into the process.',
              })}
            </p>
          </div>
        </div>
      </motion.section>

      {/* Image break */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={reveal}
        className="mx-auto max-w-[1200px] px-6 lg:px-12"
      >
        <div className="aspect-[21/9] overflow-hidden">
          <img
            src="https://websiteassets.hyperquote.net/Images/cairo.webp"
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      </motion.div>

      {/* Values */}
      <section className="px-6 py-20 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-[1200px]">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={reveal}
            className="mb-12 flex items-baseline gap-4"
          >
            <span className="font-[family-name:var(--font-mono)] text-[13px] text-[var(--color-primary)]">
              02
            </span>
            <h2
              className="font-bold tracking-[-0.02em]"
              style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}
            >
              {t('about.mission.heading', { defaultValue: 'What we deliver' })}
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            {VALUES.map((v, i) => (
              <motion.div
                key={v.title}
                initial="hidden"
                whileInView="visible"
                viewport={viewportOnce}
                variants={stagger(i * 0.08)}
                className="relative py-8 md:px-8 first:md:ps-0 last:md:pe-0"
              >
                {i > 0 && (
                  <div className="hidden md:block absolute start-0 top-8 bottom-8 w-px bg-[var(--color-text)] opacity-[0.07]" />
                )}
                {i > 0 && (
                  <div className="md:hidden absolute top-0 inset-x-0 h-px bg-[var(--color-text)] opacity-[0.07]" />
                )}
                <span className="font-[family-name:var(--font-mono)] text-[12px] text-[var(--color-text-subtle)] block mb-3">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="text-[16px] font-semibold tracking-[-0.01em] mb-3">
                  {v.title}
                </h3>
                <p className="text-[14px] leading-[1.7] text-[var(--color-text-muted)]">
                  {v.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-[1200px] px-6 lg:px-12">
        <div className="h-px bg-[var(--color-text)] opacity-[0.07]" />
      </div>

      {/* Team */}
      <section className="px-6 py-20 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-[1200px]">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={reveal}
            className="mb-12 flex items-baseline gap-4"
          >
            <span className="font-[family-name:var(--font-mono)] text-[13px] text-[var(--color-primary)]">
              03
            </span>
            <h2
              className="font-bold tracking-[-0.02em]"
              style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}
            >
              {t('about.team.heading', { defaultValue: 'Team' })}
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-8">
            {TEAM.map((member, i) => (
              <motion.div
                key={member.name}
                initial="hidden"
                whileInView="visible"
                viewport={viewportOnce}
                variants={stagger(i * 0.06)}
              >
                <p className="text-[15px] font-semibold">{member.name}</p>
                <p className="text-[13px] text-[var(--color-text-muted)] mt-1">
                  {member.role}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-[1200px] px-6 lg:px-12">
        <div className="h-px bg-[var(--color-text)] opacity-[0.07]" />
      </div>

      {/* Careers CTA */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={reveal}
        className="px-6 py-20 lg:px-12 lg:py-28"
      >
        <div className="mx-auto max-w-[1200px]">
          <div className="flex items-baseline gap-4 mb-6">
            <span className="font-[family-name:var(--font-mono)] text-[13px] text-[var(--color-primary)]">
              04
            </span>
            <h2
              className="font-bold tracking-[-0.02em]"
              style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}
            >
              {t('about.careers.heading', { defaultValue: 'Join us' })}
            </h2>
          </div>
          <p className="text-[15px] leading-[1.7] text-[var(--color-text-muted)] max-w-[480px] mb-8">
            {t('about.careers.description', {
              defaultValue:
                "We\u2019re building the infrastructure for Egypt\u2019s construction industry. If you want to work on hard problems with real impact, we\u2019d like to hear from you.",
            })}
          </p>
          <Link
            to="/careers"
            className="inline-flex items-center gap-2 text-[14px] font-medium text-[var(--color-primary)] hover:opacity-70 transition-opacity"
          >
            {t('about.careers.cta', { defaultValue: 'View open positions' })}
            <ArrowRight size={15} className="icon-end" />
          </Link>
        </div>
      </motion.section>
    </div>
  )
}
