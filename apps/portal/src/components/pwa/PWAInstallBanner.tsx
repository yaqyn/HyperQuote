import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import { animate } from 'motion'
import { useRef, useEffect } from 'react'
import { useInstallPrompt } from './useInstallPrompt'

export function PWAInstallBanner() {
  const { t } = useTranslation('portal')
  const { canInstall, install, dismiss } = useInstallPrompt()
  const bannerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (canInstall && bannerRef.current) {
      animate(
        bannerRef.current,
        { transform: ['translateY(100%)', 'translateY(0)'], opacity: [0, 1] },
        { duration: 0.2, easing: 'ease-out' }
      )
    }
  }, [canInstall])

  if (!canInstall) return null

  const handleInstall = async () => {
    await install()
  }

  const handleDismiss = () => {
    if (bannerRef.current) {
      animate(
        bannerRef.current,
        { transform: 'translateY(100%)', opacity: 0 },
        { duration: 0.2, easing: 'ease-in' }
      ).then(() => {
        dismiss()
      })
    } else {
      dismiss()
    }
  }

  return (
    <div
      ref={bannerRef}
      className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-between gap-3 px-4 py-3 backdrop-blur-xl bg-white/90 dark:bg-black/90 border-t border-black/10 dark:border-white/10"
    >
      <p className="text-sm text-black/70 dark:text-white/70">
        {t('pwa.installBanner')}
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          onPress={handleInstall}
          className="h-8 px-4 rounded-lg bg-[var(--color-blue)] text-white text-sm font-medium pressed:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-blue)]"
        >
          {t('pwa.installButton')}
        </Button>
        <Button
          onPress={handleDismiss}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white pressed:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-blue)]"
          aria-label={t('window.close')}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </Button>
      </div>
    </div>
  )
}
