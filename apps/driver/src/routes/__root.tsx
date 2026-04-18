/**
 * Root route — outlet shell. The shell sets <html data-theme/lang/dir> on
 * mount via the cockpit store so reloads come back in the right mode.
 */

import { createRootRoute, Outlet } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../stores/cockpit'

export const Route = createRootRoute({
	component: RootComponent,
})

function RootComponent() {
	const theme = useApp((s) => s.theme)
	const lang = useApp((s) => s.lang)
	const { i18n } = useTranslation()

	useEffect(() => {
		const root = document.documentElement
		root.setAttribute('data-theme', theme)
		root.setAttribute('lang', lang)
		root.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr')
		if (i18n.language !== lang) i18n.changeLanguage(lang)
	}, [theme, lang, i18n])

	return <Outlet />
}
