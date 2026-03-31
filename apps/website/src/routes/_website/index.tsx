import { createFileRoute } from '@tanstack/react-router'
import { OrganizationJsonLd, WebsiteJsonLd } from '../../components/shared/JsonLd'
import { HeroSection } from '../../components/home/HeroSection'
import { HowItWorksSection } from '../../components/home/HowItWorksSection'
import { ValuePropsSection } from '../../components/home/ValuePropsSection'
import { MarketPreviewSection } from '../../components/home/MarketPreviewSection'
import { CTASection } from '../../components/home/CTASection'

export const Route = createFileRoute('/_website/')({
	head: () => ({
		meta: [
			{ title: 'HyperQuote — Building Materials, Simplified' },
			{
				name: 'description',
				content:
					"Egypt's first digital platform for building materials sourcing. Get quotes in 4 hours.",
			},
			{
				property: 'og:title',
				content: 'HyperQuote — Building Materials, Simplified',
			},
			{
				property: 'og:description',
				content:
					"Egypt's first digital platform for building materials sourcing.",
			},
			{ property: 'og:type', content: 'website' },
		],
	}),
	component: HomePage,
})

function HomePage() {
	return (
		<>
			<OrganizationJsonLd />
			<WebsiteJsonLd />
			<HeroSection />
			<HowItWorksSection />
			<ValuePropsSection />
			<MarketPreviewSection />
			<CTASection />
		</>
	)
}
