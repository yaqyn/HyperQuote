import { useState } from 'react'
import { SelectionCopy } from '../components/shared/SelectionCopy'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from 'react-aria-components'
import '../lib/i18n'
import styles from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'title', content: 'HyperQuote' },
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
      { rel: 'stylesheet', href: styles },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600&display=swap',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
      },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Real-time defaults: every query is instantly stale, refetches
            // on mount + window focus, and polls every 3s so writes from
            // any panel show up in every other panel within one tick.
            // Individual queries can still override if they need a longer
            // cadence.
            staleTime: 0,
            gcTime: 5 * 60 * 1000,
            refetchOnMount: 'always',
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            refetchInterval: 3000,
            refetchIntervalInBackground: false,
            retry: 1,
          },
        },
      }),
  )

  return (
    <html lang="en" dir="ltr" data-theme="light">
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){var t=localStorage.getItem("hq-theme")||"light";document.documentElement.setAttribute("data-theme",t);})()',
          }}
        />
      </head>
      <body
        className="bg-[var(--color-surface)] text-[var(--color-text)] font-[var(--font-inter)]"
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            const tag = (e.target as HTMLElement).tagName
            if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !(e.target as HTMLElement).isContentEditable) {
              e.preventDefault()
            }
          }
        }}
      >
        <QueryClientProvider client={queryClient}>
          <I18nProvider locale="en">
            <Outlet />
          </I18nProvider>
        </QueryClientProvider>
        <SelectionCopy />
        <Scripts />
      </body>
    </html>
  )
}
