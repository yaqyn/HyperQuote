/**
 * Language & Appearance settings section.
 * Language: RadioGroup (Arabic/English) - changes immediately.
 * Theme: RadioGroup (Light/Dark/System) - changes immediately.
 * Number format: Switch (Arabic-Indic/Western) - only when Arabic locale selected.
 * Date format: RadioGroup (Gregorian/Hijri).
 */
import { Radio, RadioGroup, Switch, Label } from 'react-aria-components'
import { useTranslation } from 'react-i18next'

interface AppearanceSectionProps {
  currentLocale: string
  currentTheme: string
  numberFormat: 'arabic' | 'western'
  dateFormat: 'gregorian' | 'hijri'
  onLocaleChange: (locale: string) => void
  onThemeChange: (theme: string) => void
  onNumberFormatChange: (format: 'arabic' | 'western') => void
  onDateFormatChange: (format: 'gregorian' | 'hijri') => void
}

export function AppearanceSection({
  currentLocale,
  currentTheme,
  numberFormat,
  dateFormat,
  onLocaleChange,
  onThemeChange,
  onNumberFormatChange,
  onDateFormatChange,
}: AppearanceSectionProps) {
  const { t, i18n } = useTranslation('portal')

  function handleLanguageChange(value: string) {
    i18n.changeLanguage(value)
    onLocaleChange(value)
  }

  function handleThemeChange(value: string) {
    document.documentElement.setAttribute('data-theme', value === 'system' ? '' : value)
    onThemeChange(value)
  }

  const isArabic = currentLocale === 'ar'

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-[var(--color-text)]">
        {t('settings.appearance.title')}
      </h2>

      {/* Language */}
      <div className="space-y-3">
        <RadioGroup
          value={currentLocale}
          onChange={handleLanguageChange}
          aria-label={t('settings.appearance.language')}
          className="space-y-2"
        >
          <Label className="text-sm font-medium text-[var(--color-text)]">
            {t('settings.appearance.language')}
          </Label>
          <div className="flex gap-3">
            <Radio
              value="ar"
              className="group flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--color-border)] cursor-pointer outline-none data-[selected]:border-[var(--color-primary)] data-[selected]:bg-[var(--color-primary)]/5 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              <span className="w-4 h-4 rounded-full border-2 border-[var(--color-border)] group-data-[selected]:border-[var(--color-primary)] group-data-[selected]:bg-[var(--color-primary)] relative">
                <span className="absolute inset-1 rounded-full bg-white opacity-0 group-data-[selected]:opacity-100" />
              </span>
              <span className="text-sm text-[var(--color-text)]">
                {t('settings.appearance.arabic')}
              </span>
            </Radio>
            <Radio
              value="en"
              className="group flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--color-border)] cursor-pointer outline-none data-[selected]:border-[var(--color-primary)] data-[selected]:bg-[var(--color-primary)]/5 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              <span className="w-4 h-4 rounded-full border-2 border-[var(--color-border)] group-data-[selected]:border-[var(--color-primary)] group-data-[selected]:bg-[var(--color-primary)] relative">
                <span className="absolute inset-1 rounded-full bg-white opacity-0 group-data-[selected]:opacity-100" />
              </span>
              <span className="text-sm text-[var(--color-text)]">
                {t('settings.appearance.english')}
              </span>
            </Radio>
          </div>
        </RadioGroup>
      </div>

      {/* Theme */}
      <div className="space-y-3">
        <RadioGroup
          value={currentTheme}
          onChange={handleThemeChange}
          aria-label={t('settings.appearance.theme')}
          className="space-y-2"
        >
          <Label className="text-sm font-medium text-[var(--color-text)]">
            {t('settings.appearance.theme')}
          </Label>
          <div className="flex gap-3">
            {(['light', 'dark', 'system'] as const).map((theme) => (
              <Radio
                key={theme}
                value={theme}
                className="group flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--color-border)] cursor-pointer outline-none data-[selected]:border-[var(--color-primary)] data-[selected]:bg-[var(--color-primary)]/5 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              >
                <span className="w-4 h-4 rounded-full border-2 border-[var(--color-border)] group-data-[selected]:border-[var(--color-primary)] group-data-[selected]:bg-[var(--color-primary)] relative">
                  <span className="absolute inset-1 rounded-full bg-white opacity-0 group-data-[selected]:opacity-100" />
                </span>
                <span className="text-sm text-[var(--color-text)]">
                  {t(`settings.appearance.${theme}`)}
                </span>
              </Radio>
            ))}
          </div>
        </RadioGroup>
      </div>

      {/* Number format - only shown when Arabic locale selected */}
      {isArabic && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[var(--color-text)]">
            {t('settings.appearance.numberFormat')}
          </Label>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--color-text-muted)]">
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
              <span className="w-9 h-5 rounded-full transition-colors bg-[var(--color-border)] group-data-[selected]:bg-[var(--color-primary)] relative">
                <span className="absolute top-0.5 start-0.5 w-4 h-4 rounded-full bg-white transition-transform group-data-[selected]:translate-x-4 rtl:group-data-[selected]:-translate-x-4 shadow-sm" />
              </span>
            </Switch>
            <span className="text-sm text-[var(--color-text-muted)]">
              {t('settings.appearance.arabicNumbers')}
            </span>
          </div>
        </div>
      )}

      {/* Date format */}
      <div className="space-y-3">
        <RadioGroup
          value={dateFormat}
          onChange={(val) =>
            onDateFormatChange(val as 'gregorian' | 'hijri')
          }
          aria-label={t('settings.appearance.dateFormat')}
          className="space-y-2"
        >
          <Label className="text-sm font-medium text-[var(--color-text)]">
            {t('settings.appearance.dateFormat')}
          </Label>
          <div className="flex gap-3">
            <Radio
              value="gregorian"
              className="group flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--color-border)] cursor-pointer outline-none data-[selected]:border-[var(--color-primary)] data-[selected]:bg-[var(--color-primary)]/5 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              <span className="w-4 h-4 rounded-full border-2 border-[var(--color-border)] group-data-[selected]:border-[var(--color-primary)] group-data-[selected]:bg-[var(--color-primary)] relative">
                <span className="absolute inset-1 rounded-full bg-white opacity-0 group-data-[selected]:opacity-100" />
              </span>
              <span className="text-sm text-[var(--color-text)]">
                {t('settings.appearance.gregorian')}
              </span>
            </Radio>
            <Radio
              value="hijri"
              className="group flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--color-border)] cursor-pointer outline-none data-[selected]:border-[var(--color-primary)] data-[selected]:bg-[var(--color-primary)]/5 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              <span className="w-4 h-4 rounded-full border-2 border-[var(--color-border)] group-data-[selected]:border-[var(--color-primary)] group-data-[selected]:bg-[var(--color-primary)] relative">
                <span className="absolute inset-1 rounded-full bg-white opacity-0 group-data-[selected]:opacity-100" />
              </span>
              <span className="text-sm text-[var(--color-text)]">
                {t('settings.appearance.hijri')}
              </span>
            </Radio>
          </div>
        </RadioGroup>
      </div>
    </div>
  )
}
