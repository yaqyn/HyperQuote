import { createFileRoute, useParams, useNavigate, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { ArrowLeft } from 'lucide-react'
import { WIZARDS } from '../../../../content/registry'
import { WizardRenderer } from '../../../../components/docs/WizardRenderer'

// Eagerly import all wizard step data.
// When adding a new wizard, add its import here and to the map.
import { steps as gettingStartedSteps } from '../../../../content/wizards/getting-started'

const WIZARD_STEPS: Record<string, typeof gettingStartedSteps> = {
  'getting-started': gettingStartedSteps,
}

export const Route = createFileRoute('/_website/docs/guide/$guideSlug')({
  head: ({ params }) => ({
    meta: [
      {
        title: `${params.guideSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} \u2014 Docs \u2014 HyperQuote`,
      },
    ],
  }),
  component: WizardGuidePage,
})

const reveal = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] },
  },
}

function WizardGuidePage() {
  const { t } = useTranslation('website')
  const { guideSlug } = useParams({ from: '/_website/docs/guide/$guideSlug' })
  const navigate = useNavigate()

  const wizard = WIZARDS.find((w) => w.slug === guideSlug)
  const steps = WIZARD_STEPS[guideSlug]

  if (!wizard || !steps) {
    navigate({ to: '/docs' })
    return null
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 lg:px-12 pt-24 pb-20 lg:pt-32 lg:pb-28">
      {/* Back to docs */}
      <Link
        to="/docs"
        className="inline-flex items-center gap-2 text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors mb-8"
      >
        <ArrowLeft size={14} className="icon-end" />
        {t('docs.backToDocs', { defaultValue: 'Back to docs' })}
      </Link>

      {/* Guide title */}
      <motion.div initial="hidden" animate="visible" variants={reveal}>
        <h1
          className="font-bold tracking-[-0.03em] leading-[1.1] mb-3"
          style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)' }}
        >
          {t(wizard.titleKey, { defaultValue: guideSlug })}
        </h1>
        <p className="text-[15px] opacity-35 mb-12 max-w-[500px]">
          {t(wizard.descriptionKey, {
            defaultValue: 'Follow along step by step.',
          })}
        </p>
      </motion.div>

      {/* Wizard */}
      <WizardRenderer
        steps={steps}
        guideSlug={guideSlug}
        guideTitleKey={wizard.titleKey}
      />
    </div>
  )
}
