const INTERNAL_ORIGIN = 'https://internal.hyperquote.net'
const INTERNAL_IMAGE = `${INTERNAL_ORIGIN}/pwa/icon-512.png`
const PRIVATE_ROBOTS = 'noindex,nofollow,noarchive'

type AppMeta =
	| { charSet: string }
	| { content: string; media?: string; name: string }
	| { content: string; property: string }
	| { title: string }

interface AppLink {
	href: string
	rel: string
}

interface InternalHeadInput {
	description: string
	path: string
	title: string
}

export function internalHead({ description, path, title }: InternalHeadInput): {
	links: AppLink[]
	meta: AppMeta[]
	title: string
} {
	const url = new URL(path, INTERNAL_ORIGIN).toString()
	return {
		title,
		meta: [
			{ title },
			{ name: 'title', content: title },
			{ name: 'description', content: description },
			{ name: 'robots', content: PRIVATE_ROBOTS },
			{ name: 'application-name', content: 'HyperQuote Internal Ops' },
			{ property: 'og:site_name', content: 'HyperQuote Internal Ops' },
			{ property: 'og:type', content: 'website' },
			{ property: 'og:title', content: title },
			{ property: 'og:description', content: description },
			{ property: 'og:url', content: url },
			{ property: 'og:image', content: INTERNAL_IMAGE },
			{ name: 'twitter:card', content: 'summary' },
			{ name: 'twitter:title', content: title },
			{ name: 'twitter:description', content: description },
		],
		links: [{ rel: 'canonical', href: url }],
	}
}
