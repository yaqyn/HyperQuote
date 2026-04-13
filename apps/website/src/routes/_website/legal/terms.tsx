import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { TERMS_SECTIONS as SECTIONS } from '../../../content/legal'

export const Route = createFileRoute('/_website/legal/terms')({
  head: () => ({
    meta: [
      { title: 'Terms of Service — HyperQuote' },
      {
        name: 'description',
        content:
          'HyperQuote terms of service. Read the conditions for using our B2B building materials platform in Egypt.',
      },
    ],
  }),
  component: TermsPage,
})

const reveal = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  },
}

const viewportOnce = { once: true, margin: '-60px' as const }

function TermsPage() {
  return (
    <div dir="ltr" className="min-h-screen">
      <header className="px-6 pt-24 pb-12 lg:px-12 lg:pt-36 lg:pb-16">
        <div className="mx-auto max-w-[720px]">
          <motion.div initial="hidden" animate="visible" variants={reveal}>
            <h1 className="text-[32px] lg:text-[40px] font-bold tracking-[-0.02em] leading-tight">
              Terms of Service
            </h1>
            <p className="mt-4 font-mono text-[12px] opacity-25 tracking-wide">
              Last updated April 1, 2026
            </p>
          </motion.div>
        </div>
      </header>

      <div className="px-6 pb-24 lg:px-12">
        <div className="mx-auto max-w-[720px]">
          {SECTIONS.map((section, i) => (
            <motion.section
              key={section.number}
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              variants={reveal}
              className={i > 0 ? 'mt-12 pt-12 border-t border-[var(--color-text)]/[0.06]' : ''}
            >
              <h2 className="text-[18px] font-semibold tracking-[-0.01em]">
                {section.title}
              </h2>
              <div className="mt-4 space-y-4">
                {section.content.map((paragraph, j) => (
                  <p
                    key={j}
                    className="text-[15px] leading-[1.8] text-[var(--color-text-muted)]"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </motion.section>
          ))}

          <footer className="mt-16 pt-8 border-t border-[var(--color-text)]/[0.06] flex items-center justify-between">
            <span className="font-mono text-[11px] opacity-20">
              HyperQuote Technologies Ltd. · Cairo, Egypt
            </span>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="font-mono text-[11px] opacity-20 hover:opacity-50 transition-opacity"
            >
              ↑
            </button>
          </footer>
        </div>
      </div>
    </div>
  )
}
