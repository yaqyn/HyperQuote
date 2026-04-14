import { useState } from 'react'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import styles from '../styles.css?url'
import { setupI18n } from '../lib/i18n'

function detectLocale(request?: Request): 'ar' | 'en' {
  if (!request) {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('hq-locale')
      if (stored === 'ar' || stored === 'en') return stored
    }
    return 'en'
  }

  const cookieHeader = request.headers.get('cookie') ?? ''
  const match = cookieHeader.match(/hq-locale=(ar|en)/)
  if (match) return match[1] as 'ar' | 'en'

  return 'en'
}

export const Route = createRootRoute({
  beforeLoad: async ({ context }) => {
    const request = (context as Record<string, unknown>).request as
      | Request
      | undefined
    const locale = detectLocale(request)
    await setupI18n(locale)
    return { locale }
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'title', content: 'HyperQuote' },
      { name: 'theme-color', content: '#060606' },
    ],
    links: [{ rel: 'stylesheet', href: styles }],
  }),
  component: RootComponent,
})

function RootComponent() {
  const { t } = useTranslation('portal')
  const routeContext = Route.useRouteContext() as { locale?: 'ar' | 'en' }
  const locale = routeContext.locale ?? 'en'
  const [queryClient] = useState(() => new QueryClient())

  return (
    <html lang={locale} dir="ltr" data-theme="dark">
      <head>
        <HeadContent />
      </head>
      <body className={`bg-[var(--p-bg)] text-[var(--p-text)] antialiased ${locale === 'ar' ? 'font-arabic' : 'font-sans'}`}>
        <QueryClientProvider client={queryClient}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-[var(--p-accent)] focus:text-white"
          >
            {t('a11y.skipToContent')}
          </a>
          <I18nProvider locale={locale}>
            <Outlet />
          </I18nProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  )
}
