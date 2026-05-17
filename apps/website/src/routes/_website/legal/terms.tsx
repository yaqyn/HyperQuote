import { createFileRoute } from '@tanstack/react-router'
import { LegalDocumentPage } from '../../../components/legal/LegalDocumentPage'
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

function TermsPage() {
	return (
		<LegalDocumentPage
			title="Terms of Service"
			effectiveDate="Last updated April 1, 2026"
			sections={SECTIONS}
		/>
	)
}
