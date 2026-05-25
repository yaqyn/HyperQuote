export function OrganizationJsonLd() {
	const data = {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: 'HyperQuote',
		url: 'https://www.hyperquote.net',
		logo: 'https://www.hyperquote.net/icon-512.png',
		contactPoint: {
			'@type': 'ContactPoint',
			contactType: 'customer service',
			areaServed: 'EG',
			availableLanguage: ['Arabic', 'English'],
		},
	}

	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
		/>
	)
}

export function WebsiteJsonLd() {
	const data = {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: 'HyperQuote',
		url: 'https://www.hyperquote.net',
		potentialAction: {
			'@type': 'SearchAction',
			target: {
				'@type': 'EntryPoint',
				urlTemplate: 'https://www.hyperquote.net/market?q={search_term_string}',
			},
			'query-input': 'required name=search_term_string',
		},
	}

	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
		/>
	)
}

export function ProductJsonLd({
	description,
	image,
	name,
	priceCurrency = 'EGP',
	priceRangeMax,
	priceRangeMin,
	sku,
	url,
}: {
	description?: string | null
	image?: string | null
	name: string
	priceCurrency?: string
	priceRangeMax?: number | null
	priceRangeMin?: number | null
	sku: string
	url: string
}) {
	const hasPriceRange =
		typeof priceRangeMin === 'number' && typeof priceRangeMax === 'number'
	const data = {
		'@context': 'https://schema.org',
		'@type': 'Product',
		name,
		sku,
		url,
		...(description ? { description } : {}),
		...(image ? { image } : {}),
		offers: hasPriceRange
			? {
					'@type': 'AggregateOffer',
					priceCurrency,
					lowPrice: priceRangeMin,
					highPrice: priceRangeMax,
					offerCount: 1,
					availability: 'https://schema.org/InStock',
				}
			: undefined,
	}

	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
		/>
	)
}

export function ArticleJsonLd({
	description,
	headline,
	url,
}: {
	description: string
	headline: string
	url: string
}) {
	const data = {
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline,
		description,
		url,
		publisher: {
			'@type': 'Organization',
			name: 'HyperQuote',
			logo: 'https://www.hyperquote.net/icon-512.png',
		},
	}

	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
		/>
	)
}
