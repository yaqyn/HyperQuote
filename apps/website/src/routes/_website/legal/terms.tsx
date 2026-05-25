import { createFileRoute } from '@tanstack/react-router'
import { LegalDocumentPage } from '../../../components/legal/LegalDocumentPage'
import { TERMS_SECTIONS as SECTIONS } from '../../../content/legal'
import { websiteHead } from '../../../lib/seo'

export const Route = createFileRoute('/_website/legal/terms')({
	head: () =>
		websiteHead({
			title: 'Terms of Service — HyperQuote',
			description:
				'Read the HyperQuote terms of service for using the B2B building materials platform in Egypt.',
			path: '/legal/terms',
		}),
	component: TermsPage,
})

function TermsPage() {
	return (
		<LegalDocumentPage
			title="Terms of Service"
			effectiveDate="Last updated April 1, 2026"
			sections={SECTIONS}
		/>
	)
}
