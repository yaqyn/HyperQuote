import { createRootRoute, Outlet } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'
import { useThemeStore } from '@/stores/theme'

function RootLayout() {
  const { i18n } = useTranslation()
  const initTheme = useThemeStore((s) => s.init)

  useEffect(() => {
    const dir = i18n.language === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.setAttribute('dir', dir)
    document.documentElement.setAttribute('lang', i18n.language)
  }, [i18n.language])

  useEffect(() => {
    initTheme()
  }, [initTheme])

  return (
    <div className="min-h-dvh">
      <Outlet />
    </div>
  )
}

export const Route = createRootRoute({
  component: RootLayout,
})
