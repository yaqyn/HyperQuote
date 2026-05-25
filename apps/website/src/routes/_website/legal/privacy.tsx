import { createFileRoute } from '@tanstack/react-router'
import { LegalDocumentPage } from '../../../components/legal/LegalDocumentPage'
import { PRIVACY_SECTIONS as SECTIONS } from '../../../content/legal'
import { websiteHead } from '../../../lib/seo'

export const Route = createFileRoute('/_website/legal/privacy')({
	head: () =>
		websiteHead({
			title: 'Privacy Policy — HyperQuote',
			description:
				'Learn how HyperQuote collects, uses, stores, and protects customer, supplier, and platform data.',
			path: '/legal/privacy',
		}),
	component: PrivacyPage,
})

function PrivacyPage() {
	return (
		<LegalDocumentPage
			title="Privacy Policy"
			effectiveDate="Effective January 2026"
			sections={SECTIONS}
		/>
	)
}
