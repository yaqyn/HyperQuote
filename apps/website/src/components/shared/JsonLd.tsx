export function OrganizationJsonLd() {
	const data = {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: 'HyperQuote',
		url: 'https://hyperquote.net',
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
		url: 'https://hyperquote.net',
		potentialAction: {
			'@type': 'SearchAction',
			target: {
				'@type': 'EntryPoint',
				urlTemplate:
					'https://hyperquote.net/market?q={search_term_string}',
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
