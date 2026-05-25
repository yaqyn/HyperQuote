import {
	createFileRoute,
	Link,
	useNavigate,
	useParams,
} from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { cubicBezier, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { WizardRenderer } from '../../../../components/docs/WizardRenderer'
import { displayName, WIZARDS } from '../../../../content/registry'
import { steps as forCustomersSteps } from '../../../../content/wizards/for-customers'
import { steps as forDriversSteps } from '../../../../content/wizards/for-drivers'
import { steps as forSuppliersSteps } from '../../../../content/wizards/for-suppliers'
// Eagerly import all wizard step data.
// When adding a new wizard, add its import here and to the map.
import { steps as gettingStartedSteps } from '../../../../content/wizards/getting-started'
import { titleCaseSlug, websiteHead } from '../../../../lib/seo'

const WIZARD_STEPS: Record<string, typeof gettingStartedSteps> = {
	'getting-started': gettingStartedSteps,
	'for-customers': forCustomersSteps,
	'for-suppliers': forSuppliersSteps,
	'for-drivers': forDriversSteps,
}

export const Route = createFileRoute('/_website/docs/guide/$guideSlug')({
	head: ({ params }) => {
		const wizard = WIZARDS.find((item) => item.slug === params.guideSlug)
		const title = wizard
			? displayName(wizard.titleKey)
			: titleCaseSlug(params.guideSlug)
		const description = wizard
			? displayName(wizard.descriptionKey)
			: 'HyperQuote step-by-step guide.'
		return websiteHead({
			title: `${title} — Guide — HyperQuote`,
			description,
			path: `/docs/guide/${params.guideSlug}`,
			robots: wizard ? 'index,follow' : 'noindex,nofollow',
			type: 'article',
		})
	},
	component: WizardGuidePage,
})

const reveal = {
	hidden: { opacity: 0, y: 12 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.35, ease: cubicBezier(0.25, 0.1, 0.25, 1) },
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
		<div className="mx-auto max-w-[1200px] px-4 pb-16 pt-24 sm:px-6 md:px-8 lg:px-12 lg:pb-24 lg:pt-32">
			{/* Back to docs */}
			<Link
				to="/docs"
				className="mx-auto mb-8 flex w-fit items-center gap-2 text-[13px] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)] lg:mx-0"
			>
				<ArrowLeft size={14} className="icon-end" />
				{t('docs.backToDocs', { defaultValue: 'Back to docs' })}
			</Link>

			{/* Guide title */}
			<motion.div
				initial="hidden"
				animate="visible"
				variants={reveal}
				className="text-center lg:text-start"
			>
				<h1 className="mb-3 text-[1.85rem] font-bold leading-[1.1] tracking-normal sm:text-[2.1rem] lg:text-[2.25rem]">
					{t(wizard.titleKey, { defaultValue: displayName(wizard.titleKey) })}
				</h1>
				<p className="mx-auto mb-8 max-w-[500px] text-start text-[15px] leading-relaxed text-[var(--color-text-muted)] sm:mb-12 lg:mx-0">
					{t(wizard.descriptionKey, {
						defaultValue: displayName(wizard.descriptionKey),
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
