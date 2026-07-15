import {
	createFileRoute,
	Link,
	useNavigate,
	useParams,
} from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DocsPageShell } from '../../../../components/docs/DocsPageShell'
import { WizardRenderer } from '../../../../components/docs/WizardRenderer'
import { displayName, WIZARDS } from '../../../../content/registry'
import { steps as forCustomersSteps } from '../../../../content/wizards/for-customers'
import { steps as forDriversSteps } from '../../../../content/wizards/for-drivers'
// Eagerly import all wizard step data.
// When adding a new wizard, add its import here and to the map.
import { steps as gettingStartedSteps } from '../../../../content/wizards/getting-started'
import { titleCaseSlug, websiteHead } from '../../../../lib/seo'

const WIZARD_STEPS: Record<string, typeof gettingStartedSteps> = {
	'getting-started': gettingStartedSteps,
	'for-customers': forCustomersSteps,
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
		<DocsPageShell activeGuideSlug={guideSlug} maxWidth="article">
			<div className="min-w-0 max-w-[760px] flex-1">
				<Link
					to="/docs"
					className="mb-6 flex w-fit items-center gap-2 text-[12px] text-[var(--color-text-subtle)] transition-colors hover:text-[var(--color-text)]"
				>
					<ArrowLeft size={14} className="icon-end" />
					{t('docs.backToDocs', { defaultValue: 'Back to docs' })}
				</Link>

				<div className="mb-8 border-b border-[var(--site-rule)] pb-8 sm:mb-10">
					<p className="hq-kicker mb-4 text-[var(--color-primary)]">
						{t('docs.wizard.guide', { defaultValue: 'Guide' })}
					</p>
					<h1 className="hq-display hq-title-record font-bold text-[var(--color-text)]">
						{t(wizard.titleKey, {
							defaultValue: displayName(wizard.titleKey),
						})}
					</h1>
					<p className="mt-5 max-w-[580px] text-start text-[15px] leading-7 text-[var(--color-text-muted)]">
						{t(wizard.descriptionKey, {
							defaultValue: displayName(wizard.descriptionKey),
						})}
					</p>
				</div>

				<WizardRenderer
					steps={steps}
					guideSlug={guideSlug}
					guideTitleKey={wizard.titleKey}
				/>
			</div>
		</DocsPageShell>
	)
}
