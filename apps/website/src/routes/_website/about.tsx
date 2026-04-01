import { createFileRoute } from '@tanstack/react-router'
import { AboutHero } from '../../components/about/AboutHero'
import { CompanyStory } from '../../components/about/CompanyStory'

import { TeamGrid } from '../../components/about/TeamGrid'
import { CareersCTA } from '../../components/about/CareersCTA'

export const Route = createFileRoute('/_website/about')({
	head: () => ({
		meta: [
			{ title: 'About \u2014 HyperQuote' },
			{
				name: 'description',
				content:
					"Learn about HyperQuote, Egypt's first digital platform for building materials sourcing.",
			},
			{ property: 'og:title', content: 'About \u2014 HyperQuote' },
			{
				property: 'og:description',
				content:
					"Learn about HyperQuote, Egypt's first digital platform for building materials sourcing.",
			},
		],
	}),
	component: AboutPage,
})

function AboutPage() {
	return (
		<>
			<AboutHero />
			<CompanyStory />
			<TeamGrid />
			<CareersCTA />
		</>
	)
}
