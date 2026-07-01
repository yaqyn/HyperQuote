import type { LinkHTMLAttributes } from 'react'

export type AppHeadMeta =
	| { charSet: string }
	| { content: string; media?: string; name: string }

export interface AppHeadLink {
	color?: string
	crossOrigin?: LinkHTMLAttributes<HTMLLinkElement>['crossOrigin']
	href: string
	media?: string
	rel: string
	sizes?: string
	type?: string
}

interface InstallableAppMetaOptions {
	appName: string
	includeApplicationName?: boolean
	themeColor?: string
	tileColor: string
}

interface InstallableAppLinksOptions {
	darkIconHref: string
	extraLinks?: AppHeadLink[]
	lightIconHref: string
	maskColor?: string
	stylesheetHref?: string
}

export function installableAppMeta({
	appName,
	includeApplicationName = true,
	themeColor,
	tileColor,
}: InstallableAppMetaOptions): AppHeadMeta[] {
	return [
		{ charSet: 'utf-8' },
		{
			name: 'viewport',
			content: 'width=device-width, initial-scale=1, viewport-fit=cover',
		},
		{ name: 'mobile-web-app-capable', content: 'yes' },
		{ name: 'apple-mobile-web-app-capable', content: 'yes' },
		{ name: 'apple-mobile-web-app-status-bar-style', content: 'black' },
		{ name: 'apple-mobile-web-app-title', content: appName },
		...(includeApplicationName
			? [{ name: 'application-name', content: appName }]
			: []),
		{ name: 'format-detection', content: 'telephone=no' },
		{ name: 'color-scheme', content: 'light dark' },
		{ name: 'msapplication-TileColor', content: tileColor },
		{ name: 'msapplication-TileImage', content: '/mstile-150x150.png' },
		{ name: 'msapplication-config', content: '/browserconfig.xml' },
		...(themeColor ? [{ name: 'theme-color', content: themeColor }] : []),
	]
}

export function installableAppLinks({
	darkIconHref,
	extraLinks = [],
	lightIconHref,
	maskColor = '#2563EB',
	stylesheetHref,
}: InstallableAppLinksOptions): AppHeadLink[] {
	return [
		{
			rel: 'icon',
			type: 'image/svg+xml',
			href: lightIconHref,
			media: '(prefers-color-scheme: light)',
		},
		{
			rel: 'icon',
			type: 'image/svg+xml',
			href: darkIconHref,
			media: '(prefers-color-scheme: dark)',
		},
		{
			rel: 'apple-touch-icon',
			sizes: '152x152',
			href: '/apple-touch-icon-152x152.png',
		},
		{
			rel: 'apple-touch-icon',
			sizes: '167x167',
			href: '/apple-touch-icon-167x167.png',
		},
		{
			rel: 'apple-touch-icon',
			sizes: '180x180',
			href: '/apple-touch-icon-180x180.png',
		},
		{ rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
		{ rel: 'mask-icon', href: '/favicon.svg', color: maskColor },
		{ rel: 'manifest', href: '/site.webmanifest' },
		...extraLinks,
		...(stylesheetHref ? [{ rel: 'stylesheet', href: stylesheetHref }] : []),
	]
}
