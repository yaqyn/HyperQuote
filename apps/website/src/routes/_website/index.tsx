import { createFileRoute } from '@tanstack/react-router'
import { HeroSection } from '../../components/home/HeroSection'
import { HowItWorksSection } from '../../components/home/HowItWorksSection'
import { MarketPreviewSection } from '../../components/home/MarketPreviewSection'
import {
	OrganizationJsonLd,
	WebsiteJsonLd,
} from '../../components/shared/JsonLd'
import { getPublicMarketPreviewCategories } from '../../lib/catalog'
import { websiteHead } from '../../lib/seo'

export const Route = createFileRoute('/_website/')({
	loader: async () => ({
		marketPreviewCategories: await getPublicMarketPreviewCategories({
			data: { limit: 6 },
		}),
	}),
	head: () =>
		websiteHead({
			title: 'HyperQuote — Building Materials, Simplified',
			description:
				"Egypt's digital platform for building materials sourcing. One request, multiple suppliers, transparent quotes, and tracked delivery.",
			path: '/',
		}),
	component: HomePage,
})

function HomePage() {
	const { marketPreviewCategories } = Route.useLoaderData()

	return (
		<>
			<OrganizationJsonLd />
			<WebsiteJsonLd />
			<HeroSection categories={marketPreviewCategories} />
			<HowItWorksSection />
			<MarketPreviewSection categories={marketPreviewCategories} />
		</>
	)
}
