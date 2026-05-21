import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ToggleButton } from 'react-aria-components/ToggleButton'
import { useTranslation } from 'react-i18next'
import { persistTheme } from '../../lib/theme'

export function ThemeToggle() {
	const { t } = useTranslation('website')
	const [isDark, setIsDark] = useState(false)

	useEffect(() => {
		const stored = localStorage.getItem('hq-theme')
		setIsDark(stored === 'dark')
	}, [])

	function handleChange(isSelected: boolean) {
		setIsDark(isSelected)
		persistTheme(isSelected ? 'dark' : 'light')
	}

	return (
		<ToggleButton
			isSelected={isDark}
			onChange={handleChange}
			aria-label={isDark ? t('a11y.toggleLightMode') : t('a11y.toggleDarkMode')}
			className="p-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
		>
			{isDark ? (
				<Sun size={18} className="text-[var(--color-text-muted)]" />
			) : (
				<Moon size={18} className="text-[var(--color-text-muted)]" />
			)}
		</ToggleButton>
	)
}
