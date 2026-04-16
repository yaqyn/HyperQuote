import { useEffect } from 'react'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { I18nProvider } from 'react-aria-components'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { registerServiceWorker } from '../lib/registerSW'
import '../styles.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
})

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      { name: 'apple-mobile-web-app-title', content: 'HyperQuote' },
      { name: 'theme-color', content: '#ffffff', media: '(prefers-color-scheme: light)' },
      { name: 'theme-color', content: '#0A0A0A', media: '(prefers-color-scheme: dark)' },
    ],
    links: [
      { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/favicon-96x96.png' },
      { rel: 'icon', type: 'image/svg+xml', sizes: 'any', href: '/favicon.svg' },
      { rel: 'icon', href: '/favicon.ico' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/site.webmanifest' },
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&family=Inter:wght@400;500;600&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap',
      },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  useEffect(() => {
    registerServiceWorker()
  }, [])

  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body className="bg-[var(--color-bg)] text-[var(--color-text)] antialiased">
        <QueryClientProvider client={queryClient}>
          <I18nProvider locale="ar-EG">
            <Outlet />
          </I18nProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  )
}
