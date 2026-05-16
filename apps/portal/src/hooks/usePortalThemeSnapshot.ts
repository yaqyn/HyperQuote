import { useEffect, useState } from 'react'
import { getCurrentPortalTheme, type PortalTheme } from '../lib/theme'

export function usePortalThemeSnapshot(): PortalTheme {
	const [theme, setTheme] = useState<PortalTheme>(() => getCurrentPortalTheme())

	useEffect(() => {
		setTheme(getCurrentPortalTheme())

		const observer = new MutationObserver(() => {
			setTheme(getCurrentPortalTheme())
		})
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['data-theme'],
		})

		return () => observer.disconnect()
	}, [])

	return theme
}
