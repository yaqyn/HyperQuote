import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { SectionNumber } from '../../components/shared/SectionNumber'

export const Route = createFileRoute('/_website/about')({
  head: () => ({
    meta: [
      { title: 'About — HyperQuote' },
      {
        name: 'description',
        content:
          "HyperQuote connects contractors with verified suppliers across Egypt. One platform for sourcing, quoting, and delivery.",
      },
      { property: 'og:title', content: 'About — HyperQuote' },
      {
        property: 'og:description',
        content:
          "HyperQuote connects contractors with verified suppliers across Egypt.",
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

const VALUE_KEYS = ['value1', 'value2', 'value3'] as const
const TEAM_KEYS = ['member1', 'member2', 'member3', 'member4'] as const

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
            {t('about.established')}
          </motion.span>
          <h1
            className="leading-[0.95] tracking-[-0.03em]"
            style={{ fontSize: 'clamp(2.8rem, 6vw, 4.5rem)' }}
          >
            <span className="block font-light">
              {t('about.heroLine1')}
            </span>
            <span className="block font-bold mt-1">
              {t('about.heroLine2')}
            </span>
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="mt-12 text-[15px] max-w-[480px] leading-[1.7]"
          >
            {t('about.heroSubheadline')}
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
          <div className="mb-14">
            <SectionNumber n={1} />
            <h2
              className="mt-3 font-bold tracking-[-0.02em]"
              style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}
            >
              {t('about.story.heading')}
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
            <p className="text-[15px] leading-[1.85] text-[var(--color-text-muted)]">
              {t('about.story.p1')}
            </p>
            <p className="text-[15px] leading-[1.85] text-[var(--color-text-muted)]">
              {t('about.story.p2')}
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
            width={1200}
            height={514}
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
            className="mb-14"
          >
            <SectionNumber n={2} />
            <h2
              className="mt-3 font-bold tracking-[-0.02em]"
              style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}
            >
              {t('about.mission.heading')}
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            {VALUE_KEYS.map((key, i) => (
              <motion.div
                key={key}
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
                  {t(`about.mission.${key}.title`)}
                </h3>
                <p className="text-[14px] leading-[1.7] text-[var(--color-text-muted)]">
                  {t(`about.mission.${key}.description`)}
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
            className="mb-14"
          >
            <SectionNumber n={3} />
            <h2
              className="mt-3 font-bold tracking-[-0.02em]"
              style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}
            >
              {t('about.team.heading')}
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-8">
            {TEAM_KEYS.map((key, i) => (
              <motion.div
                key={key}
                initial="hidden"
                whileInView="visible"
                viewport={viewportOnce}
                variants={stagger(i * 0.06)}
              >
                <p className="text-[15px] font-semibold">
                  {t(`about.team.${key}.name`)}
                </p>
                <p className="text-[13px] text-[var(--color-text-muted)] mt-1">
                  {t(`about.team.${key}.role`)}
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
          <div className="mb-14">
            <SectionNumber n={4} />
            <h2
              className="mt-3 font-bold tracking-[-0.02em]"
              style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}
            >
              {t('about.careers.heading')}
            </h2>
          </div>
          <p className="text-[15px] leading-[1.7] text-[var(--color-text-muted)] max-w-[480px] mb-8">
            {t('about.careers.description')}
          </p>
          <Link
            to="/careers"
            className="inline-flex items-center gap-2 text-[14px] font-medium text-[var(--color-primary)] hover:opacity-70 transition-opacity"
          >
            {t('about.careers.cta')}
            <ArrowRight size={15} className="icon-end" />
          </Link>
        </div>
      </motion.section>
    </div>
  )
}
