const WEBSITE_ORIGIN = 'https://www.hyperquote.net'
const DEFAULT_IMAGE_PATH = '/icon-512.png'

type SeoMeta =
	| { charSet: string }
	| { content: string; media?: string; name: string }
	| { content: string; property: string }
	| { title: string }

interface SeoLink {
	href: string
	hreflang?: string
	rel: string
}

interface WebsiteHeadInput {
	description: string
	imagePath?: string
	path: string
	robots?: string
	title: string
	type?: 'article' | 'product' | 'profile' | 'website'
}

export function absoluteWebsiteUrl(path = '/') {
	return new URL(path, WEBSITE_ORIGIN).toString()
}

export function websiteHead({
	description,
	imagePath = DEFAULT_IMAGE_PATH,
	path,
	robots = 'index,follow',
	title,
	type = 'website',
}: WebsiteHeadInput): {
	links: SeoLink[]
	meta: SeoMeta[]
	title: string
} {
	const url = absoluteWebsiteUrl(path)
	const image = imagePath.startsWith('http')
		? imagePath
		: absoluteWebsiteUrl(imagePath)

	return {
		title,
		meta: [
			{ title },
			{ name: 'title', content: title },
			{ name: 'description', content: description },
			{ name: 'robots', content: robots },
			{ name: 'application-name', content: 'HyperQuote' },
			{ property: 'og:site_name', content: 'HyperQuote' },
			{ property: 'og:type', content: type },
			{ property: 'og:title', content: title },
			{ property: 'og:description', content: description },
			{ property: 'og:url', content: url },
			{ property: 'og:image', content: image },
			{ property: 'og:image:width', content: '512' },
			{ property: 'og:image:height', content: '512' },
			{ name: 'twitter:card', content: 'summary_large_image' },
			{ name: 'twitter:title', content: title },
			{ name: 'twitter:description', content: description },
			{ name: 'twitter:image', content: image },
		],
		links: [
			{ rel: 'canonical', href: url },
			{ rel: 'alternate', hreflang: 'x-default', href: url },
		],
	}
}

export function titleCaseSlug(slug: string) {
	return slug
		.split('-')
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ')
}
