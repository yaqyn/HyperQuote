import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'

export const Route = createFileRoute('/_website/careers')({
  head: () => ({
    meta: [
      { title: 'Careers — HyperQuote' },
      {
        name: 'description',
        content:
          'Join the HyperQuote team. View open positions in Cairo, Egypt.',
      },
      { property: 'og:title', content: 'Careers — HyperQuote' },
      {
        property: 'og:description',
        content:
          'Join the HyperQuote team. View open positions in Cairo, Egypt.',
      },
    ],
  }),
  component: CareersPage,
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

const JOBS = [
  { title: 'Senior Frontend Engineer', department: 'Engineering', location: 'Cairo', type: 'Full-time' },
  { title: 'Backend Engineer', department: 'Engineering', location: 'Cairo', type: 'Full-time' },
  { title: 'Product Designer', department: 'Design', location: 'Cairo', type: 'Full-time' },
  { title: 'Operations Manager', department: 'Operations', location: 'Cairo', type: 'Full-time' },
  { title: 'Supply Chain Analyst', department: 'Operations', location: 'Cairo', type: 'Full-time' },
  { title: 'Customer Success Lead', department: 'Support', location: 'Cairo', type: 'Full-time' },
]

const STEPS = [
  {
    title: 'Apply',
    body: 'Send your CV and a brief note about why HyperQuote interests you. We review every application within 48 hours.',
  },
  {
    title: 'Interview',
    body: 'A short technical or role-specific conversation followed by a practical exercise. No trick questions, no whiteboard algorithms.',
  },
  {
    title: 'Offer',
    body: 'If it\u2019s a mutual fit, we move fast. You\u2019ll receive a clear offer with compensation, equity, and start date within one week.',
  },
]

function CareersPage() {
  const { t } = useTranslation('website')

  return (
    <div className="min-h-screen">
      {/* Hero — Manifesto statement, not a label */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={reveal}
        className="px-6 pb-20 pt-24 lg:px-12 lg:pb-32 lg:pt-36"
      >
        <div className="mx-auto max-w-[1200px]">
          <p className="font-[family-name:var(--font-mono)] text-[12px] text-[var(--color-text)] opacity-25 tracking-widest uppercase mb-6">
            {t('careers.location', { defaultValue: 'Cairo, Egypt' })}
          </p>
          <h1 className="max-w-[900px]">
            <span
              className="block font-light leading-[1.05] tracking-[-0.03em] text-[var(--color-text-muted)]"
              style={{ fontSize: 'clamp(2.2rem, 5vw, 3.8rem)' }}
            >
              {t('careers.heroLine1', {
                defaultValue: "We\u2019re not hiring for roles.",
              })}
            </span>
            <span
              className="block font-bold leading-[1.05] tracking-[-0.03em] mt-2"
              style={{ fontSize: 'clamp(2.2rem, 5vw, 3.8rem)' }}
            >
              {t('careers.heroLine2', {
                defaultValue: "We\u2019re hiring for Egypt\u2019s construction future.",
              })}
            </span>
          </h1>
          <p className="mt-6 font-[family-name:var(--font-mono)] text-[12px] text-[var(--color-primary)] opacity-70 tracking-wide">
            {t('careers.openCount', { defaultValue: '6 open positions' })}
          </p>
        </div>
      </motion.section>

      {/* Why — Single column with pull-quotes */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={reveal}
        className="px-6 py-20 lg:px-12 lg:py-28"
      >
        <div className="mx-auto max-w-[720px]">
          <p className="text-[15px] leading-[1.85] text-[var(--color-text-muted)]">
            {t('careers.why.p1', {
              defaultValue:
                'Egypt\u2019s construction supply chain is a $40B market still running on phone calls, paper quotes, and personal relationships. We\u2019re not building another SaaS dashboard.',
            })}
          </p>

          <motion.blockquote
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={stagger(0.1)}
            className="my-12 lg:my-16"
          >
            <p
              className="font-bold leading-[1.2] tracking-[-0.02em]"
              style={{ fontSize: 'clamp(1.4rem, 2.8vw, 2rem)' }}
            >
              {t('careers.why.pullquote1', {
                defaultValue:
                  'We\u2019re building the operating system for how materials move from supplier to site.',
              })}
            </p>
          </motion.blockquote>

          <p className="text-[15px] leading-[1.85] text-[var(--color-text-muted)]">
            {t('careers.why.p2', {
              defaultValue:
                'You\u2019ll work directly with the founders on problems that matter: real-time logistics coordination, supplier matching algorithms, and a product designed for how Egyptian business actually works.',
            })}
          </p>

          <motion.blockquote
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={stagger(0.1)}
            className="my-12 lg:my-16"
          >
            <p
              className="font-bold leading-[1.2] tracking-[-0.02em]"
              style={{ fontSize: 'clamp(1.4rem, 2.8vw, 2rem)' }}
            >
              {t('careers.why.pullquote2', {
                defaultValue: 'Small team. High ownership. Shipping weekly.',
              })}
            </p>
          </motion.blockquote>

          <p className="text-[15px] leading-[1.85] text-[var(--color-text-muted)]">
            {t('careers.why.p3', {
              defaultValue:
                'This isn\u2019t a place where you\u2019ll disappear into a feature factory. Every engineer touches the full stack, every designer talks to users, every ops person shapes the logistics network. The problems are hard and the impact is immediate.',
            })}
          </p>
        </div>
      </motion.section>

      {/* Divider */}
      <div className="mx-auto max-w-[1200px] px-6 lg:px-12">
        <div className="h-px bg-[var(--color-text)] opacity-[0.07]" />
      </div>

      {/* Open Positions — spacious vertical blocks */}
      <section className="px-6 py-20 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-[1200px]">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={reveal}
            className="font-bold tracking-[-0.02em] mb-16"
            style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}
          >
            {t('careers.positions.heading', { defaultValue: 'Open positions' })}
          </motion.h2>

          <div className="flex flex-col gap-12 lg:gap-14">
            {JOBS.map((job, i) => (
              <motion.div
                key={job.title}
                initial="hidden"
                whileInView="visible"
                viewport={viewportOnce}
                variants={stagger(i * 0.06)}
                className="group cursor-pointer"
              >
                <span className="font-[family-name:var(--font-mono)] text-[11px] tracking-[0.08em] text-[var(--color-primary)] uppercase block mb-2">
                  {job.department}
                </span>
                <h3
                  className="font-semibold tracking-[-0.01em] group-hover:text-[var(--color-primary)] transition-colors"
                  style={{ fontSize: '18px' }}
                >
                  {job.title}
                </h3>
                <div className="flex items-baseline gap-3 mt-2 text-[13px] text-[var(--color-text-muted)]">
                  <span>{job.location}</span>
                  <span className="opacity-30">\u00b7</span>
                  <span>{job.type}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-[1200px] px-6 lg:px-12">
        <div className="h-px bg-[var(--color-text)] opacity-[0.07]" />
      </div>

      {/* How We Hire — horizontal timeline */}
      <section className="px-6 py-20 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-[1200px]">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={reveal}
            className="font-bold tracking-[-0.02em] mb-16"
            style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}
          >
            {t('careers.process.heading', { defaultValue: 'How we hire' })}
          </motion.h2>

          {/* Timeline: horizontal on md+, vertical on mobile */}
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-0">
            {/* Connecting line — horizontal on md+, vertical on mobile */}
            <div className="hidden md:block absolute top-[14px] inset-x-0 h-px bg-[var(--color-text)] opacity-[0.12]" />
            <div className="md:hidden absolute start-[14px] top-0 bottom-0 w-px bg-[var(--color-text)] opacity-[0.12]" />

            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                initial="hidden"
                whileInView="visible"
                viewport={viewportOnce}
                variants={stagger(i * 0.1)}
                className="relative md:pe-8 last:md:pe-0 ps-10 md:ps-0"
              >
                {/* Dot on the line — mobile: left side, desktop: top */}
                <div className="absolute md:static start-0 top-0 md:mb-6">
                  <div className="w-[28px] h-[28px] flex items-center justify-center">
                    <span className="font-[family-name:var(--font-mono)] text-[13px] font-bold text-[var(--color-primary)]">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                </div>
                <h3 className="text-[16px] font-semibold tracking-[-0.01em] mb-3">
                  {step.title}
                </h3>
                <p className="text-[14px] leading-[1.7] text-[var(--color-text-muted)]">
                  {step.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA — bold and centered */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={reveal}
        className="px-6 py-24 lg:px-12 lg:py-36"
      >
        <div className="mx-auto max-w-[1200px] text-center">
          <p
            className="font-bold tracking-[-0.03em] mb-6"
            style={{ fontSize: 'clamp(2.4rem, 5vw, 4rem)' }}
          >
            {t('careers.cta.headline', { defaultValue: 'Ready?' })}
          </p>
          <a
            href="mailto:careers@hyperquote.com"
            className="inline-flex items-center gap-2 text-[15px] font-medium text-[var(--color-primary)] hover:opacity-70 transition-opacity"
          >
            careers@hyperquote.com
            <ArrowRight size={15} className="icon-end" />
          </a>
        </div>
      </motion.section>
    </div>
  )
}
