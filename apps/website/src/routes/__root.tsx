import {
	HeadContent,
	Outlet,
	Scripts,
	createRootRoute,
} from '@tanstack/react-router'
import { I18nProvider } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import styles from '../styles.css?url'
import { setupI18n } from '../lib/i18n'

export const Route = createRootRoute({
	beforeLoad: async () => {
		await setupI18n()
	},
	head: () => ({
		meta: [
			{ charSet: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
		],
		links: [{ rel: 'stylesheet', href: styles }],
	}),
	component: RootComponent,
})

function RootComponent() {
	const { i18n } = useTranslation()
	const locale = i18n.language === 'ar' ? 'ar' : 'en'
	const dir = locale === 'ar' ? 'rtl' : 'ltr'

	return (
		<html lang={locale} dir={dir}>
			<head>
				<HeadContent />
			</head>
			<body>
				<I18nProvider locale={locale}>
					<Outlet />
				</I18nProvider>
				<Scripts />
			</body>
		</html>
	)
}
