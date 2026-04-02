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
            {t('careers.heroHeadline', { defaultValue: 'Careers' })}
          </h1>
          <p className="mt-6 text-[15px] opacity-35 max-w-[480px] leading-[1.7]">
            {t('careers.heroSubheadline', {
              defaultValue:
                'We\u2019re building the infrastructure behind Egypt\u2019s construction industry. Join a small team solving hard logistics problems with real impact.',
            })}
          </p>
        </div>
      </motion.section>

      {/* Divider */}
      <div className="mx-auto max-w-[1200px] px-6 lg:px-12">
        <div className="h-px bg-[var(--color-text)] opacity-[0.07]" />
      </div>

      {/* 01: Why HyperQuote */}
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
              {t('careers.why.heading', { defaultValue: 'Why HyperQuote' })}
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
            <p className="text-[15px] leading-[1.85] text-[var(--color-text-muted)]">
              {t('careers.why.p1', {
                defaultValue:
                  'Egypt\u2019s construction supply chain is a $40B market still running on phone calls, paper quotes, and personal relationships. We\u2019re not building another SaaS dashboard \u2014 we\u2019re building the operating system for how materials move from supplier to site.',
              })}
            </p>
            <p className="text-[15px] leading-[1.85] text-[var(--color-text-muted)]">
              {t('careers.why.p2', {
                defaultValue:
                  'You\u2019ll work directly with the founders on problems that matter: real-time logistics coordination, supplier matching algorithms, and a product designed for how Egyptian business actually works. Small team, high ownership, shipping weekly.',
              })}
            </p>
          </div>
        </div>
      </motion.section>

      {/* Divider */}
      <div className="mx-auto max-w-[1200px] px-6 lg:px-12">
        <div className="h-px bg-[var(--color-text)] opacity-[0.07]" />
      </div>

      {/* 02: Open Positions */}
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
              {t('careers.positions.heading', { defaultValue: 'Open positions' })}
            </h2>
          </motion.div>

          <div>
            {JOBS.map((job, i) => (
              <motion.div
                key={job.title}
                initial="hidden"
                whileInView="visible"
                viewport={viewportOnce}
                variants={stagger(i * 0.06)}
                className="group cursor-pointer border-b border-[var(--color-text)]/[0.07] py-5 first:border-t"
              >
                <div className="flex items-baseline gap-5">
                  <span className="font-[family-name:var(--font-mono)] text-[12px] text-[var(--color-text-subtle)] shrink-0 w-6">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between flex-1 gap-1 sm:gap-8">
                    <h3 className="text-[15px] font-semibold tracking-[-0.01em] group-hover:text-[var(--color-primary)] transition-colors">
                      {job.title}
                    </h3>
                    <div className="flex items-baseline gap-4 text-[13px] text-[var(--color-text-muted)] shrink-0">
                      <span>{job.department}</span>
                      <span className="opacity-30">/</span>
                      <span>{job.location}</span>
                      <span className="opacity-30">/</span>
                      <span>{job.type}</span>
                    </div>
                  </div>
                  <ArrowRight
                    size={14}
                    className="icon-end shrink-0 text-[var(--color-text-subtle)] opacity-0 group-hover:opacity-100 transition-opacity"
                  />
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

      {/* 03: How We Hire */}
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
              {t('careers.process.heading', { defaultValue: 'How we hire' })}
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
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

      {/* Divider */}
      <div className="mx-auto max-w-[1200px] px-6 lg:px-12">
        <div className="h-px bg-[var(--color-text)] opacity-[0.07]" />
      </div>

      {/* Email CTA */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={reveal}
        className="px-6 py-20 lg:px-12 lg:py-28"
      >
        <div className="mx-auto max-w-[1200px]">
          <p className="text-[15px] leading-[1.7] text-[var(--color-text-muted)] max-w-[480px] mb-6">
            {t('careers.cta.body', {
              defaultValue:
                'Don\u2019t see a role that fits? We\u2019re always looking for exceptional people. Send us your CV and tell us what you\u2019d build.',
            })}
          </p>
          <a
            href="mailto:careers@hyperquote.com"
            className="inline-flex items-center gap-2 text-[14px] font-medium text-[var(--color-primary)] hover:opacity-70 transition-opacity"
          >
            careers@hyperquote.com
            <ArrowRight size={15} className="icon-end" />
          </a>
        </div>
      </motion.section>
    </div>
  )
}
