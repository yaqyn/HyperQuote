import { Button } from 'react-aria-components/Button'
import { Switch } from 'react-aria-components/Switch'
import { useTranslation } from 'react-i18next'
import { type PortalTheme, setPortalTheme } from '../../lib/theme'

interface AppearanceSectionProps {
	currentLocale: string
	currentTheme: PortalTheme
	numberFormat: 'arabic' | 'western'
	dateFormat: 'gregorian' | 'hijri'
	onLocaleChange: (locale: string) => void
	onNumberFormatChange: (format: 'arabic' | 'western') => void
	onDateFormatChange: (format: 'gregorian' | 'hijri') => void
}

const labelClass =
	'text-[13px] uppercase tracking-[0.15em] text-[var(--color-text-subtle)]'

export function AppearanceSection({
	currentLocale,
	currentTheme,
	numberFormat,
	dateFormat,
	onLocaleChange,
	onNumberFormatChange,
	onDateFormatChange,
}: AppearanceSectionProps) {
	const { t, i18n } = useTranslation('portal')

	function handleLanguageChange(value: string) {
		i18n.changeLanguage(value)
		onLocaleChange(value)
	}

	function handleThemeChange(value: PortalTheme) {
		setPortalTheme(value)
	}

	const isArabic = currentLocale === 'ar'

	return (
		<div className="space-y-8">
			{/* Language */}
			<div className="space-y-2">
				<span className={labelClass}>{t('settings.appearance.language')}</span>
				<div className="flex items-center gap-4">
					<TextToggle
						active={currentLocale === 'ar'}
						onPress={() => handleLanguageChange('ar')}
						label={t('settings.appearance.arabic')}
					/>
					<TextToggle
						active={currentLocale === 'en'}
						onPress={() => handleLanguageChange('en')}
						label={t('settings.appearance.english')}
					/>
				</div>
			</div>

			{/* Theme */}
			<div className="space-y-2">
				<span className={labelClass}>{t('settings.appearance.theme')}</span>
				<div className="flex items-center gap-4">
					{(['light', 'dark'] as const).map((theme) => (
						<TextToggle
							key={theme}
							active={currentTheme === theme}
							onPress={() => handleThemeChange(theme)}
							label={t(`settings.appearance.${theme}`)}
						/>
					))}
				</div>
			</div>

			{/* Number format — only when Arabic */}
			{isArabic && (
				<div className="space-y-2">
					<span className={labelClass}>
						{t('settings.appearance.numberFormat')}
					</span>
					<div className="flex items-center gap-3">
						<span className="text-sm text-[var(--color-text-subtle)]">
							{t('settings.appearance.westernNumbers')}
						</span>
						<Switch
							isSelected={numberFormat === 'arabic'}
							onChange={(val) =>
								onNumberFormatChange(val ? 'arabic' : 'western')
							}
							className="group inline-flex items-center cursor-pointer outline-none"
							aria-label={t('settings.appearance.numberFormat')}
						>
							<span className="w-8 h-[18px] rounded-full transition-colors bg-[var(--color-border)] group-data-[selected]:bg-[#0F172A] dark:group-data-[selected]:bg-[#FAFAFA] relative">
								<span className="absolute top-[3px] start-[3px] w-3 h-3 rounded-full bg-white dark:bg-[#09090B] transition-transform group-data-[selected]:translate-x-[14px] rtl:group-data-[selected]:-translate-x-[14px]" />
							</span>
						</Switch>
						<span className="text-sm text-[var(--color-text-subtle)]">
							{t('settings.appearance.arabicNumbers')}
						</span>
					</div>
				</div>
			)}

			{/* Date format */}
			<div className="space-y-2">
				<span className={labelClass}>
					{t('settings.appearance.dateFormat')}
				</span>
				<div className="flex items-center gap-4">
					<TextToggle
						active={dateFormat === 'gregorian'}
						onPress={() => onDateFormatChange('gregorian')}
						label={t('settings.appearance.gregorian')}
					/>
					<TextToggle
						active={dateFormat === 'hijri'}
						onPress={() => onDateFormatChange('hijri')}
						label={t('settings.appearance.hijri')}
					/>
				</div>
			</div>
		</div>
	)
}

// ============================================================================
// Text toggle button — active state = underline
// ============================================================================

function TextToggle({
	active,
	onPress,
	label,
}: {
	active: boolean
	onPress: () => void
	label: string
}) {
	return (
		<Button
			onPress={onPress}
			className={`text-sm cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--p-focus-ring)] rounded pb-0.5 transition-colors ${
				active
					? 'text-[var(--color-text)] border-b border-[var(--color-text)]'
					: 'text-[var(--color-text-subtle)] hover:text-[var(--color-text)]'
			}`}
		>
			{label}
		</Button>
	)
}
