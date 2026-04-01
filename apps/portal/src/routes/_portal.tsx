import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { checkPortalAuth } from '../lib/auth'
import { WEBSITE_URL } from '../lib/env'

export const Route = createFileRoute('/_portal')({
  beforeLoad: async ({ location }) => {
    const { auth, isInternalUser } = await checkPortalAuth()

    if (!auth && !isInternalUser) {
      // Cross-app redirect to website login
      const redirectUrl = `${WEBSITE_URL}?login=portal&redirect=${encodeURIComponent(location.href)}`
      throw redirect({ href: redirectUrl })
    }

    return { auth, isInternalUser }
  },
  component: PortalLayout,
})

function PortalLayout() {
  const { auth, isInternalUser } = Route.useRouteContext()
  const { t } = useTranslation('portal')

  if (isInternalUser) {
    return (
      <div className="flex flex-col items-center justify-center h-dvh gap-4">
        <p className="text-lg text-[var(--color-text)]">
          {t('auth.noPortalAccess')}
        </p>
        <a
          href={
            import.meta.env.VITE_INTERNAL_URL ??
            'https://internal.hyperquote.net'
          }
          className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white font-semibold"
        >
          {t('auth.goInternal')}
        </a>
      </div>
    )
  }

  return (
    <div id="main" className="relative h-dvh w-full overflow-hidden">
      <Outlet />
    </div>
  )
}
