const PORTAL_ORIGIN = 'https://portal.hyperquote.net'
const PORTAL_IMAGE = `${PORTAL_ORIGIN}/icon-512.png`
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

interface PortalHeadInput {
	description: string
	path: string
	title: string
}

export function portalHead({ description, path, title }: PortalHeadInput): {
	links: AppLink[]
	meta: AppMeta[]
	title: string
} {
	const url = new URL(path, PORTAL_ORIGIN).toString()
	return {
		title,
		meta: [
			{ title },
			{ name: 'title', content: title },
			{ name: 'description', content: description },
			{ name: 'robots', content: PRIVATE_ROBOTS },
			{ name: 'application-name', content: 'HyperQuote Portal' },
			{ property: 'og:site_name', content: 'HyperQuote Portal' },
			{ property: 'og:type', content: 'website' },
			{ property: 'og:title', content: title },
			{ property: 'og:description', content: description },
			{ property: 'og:url', content: url },
			{ property: 'og:image', content: PORTAL_IMAGE },
			{ name: 'twitter:card', content: 'summary' },
			{ name: 'twitter:title', content: title },
			{ name: 'twitter:description', content: description },
		],
		links: [{ rel: 'canonical', href: url }],
	}
}
