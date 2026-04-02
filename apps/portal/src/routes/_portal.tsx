import { Outlet, createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { checkPortalAuth } from '../lib/auth'
import { PortalHeader } from '../components/shell/PortalHeader'
import { useShortcut } from '../hooks/useShortcut'
import { usePortalStore } from '../stores/portal'

export const Route = createFileRoute('/_portal')({
  beforeLoad: async ({ location }) => {
    const { auth, isInternalUser } = await checkPortalAuth()

    if (!auth && !isInternalUser) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
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

  const userName = auth?.user?.user_metadata?.name ?? ''
  const companyName = auth?.user?.user_metadata?.company_name ?? undefined
  const roles: string[] = auth?.user?.user_metadata?.roles ?? []
  const hasSupplierRole = roles.includes('supplier')

  return (
    <div id="main" className="relative h-dvh w-full overflow-hidden">
      <PortalHeader
        userName={userName}
        companyName={companyName}
        hasSupplierRole={hasSupplierRole}
      />
      <PortalShortcuts />
      <Outlet />
    </div>
  )
}

/** Layout-level keyboard shortcuts: O/M/N open windows, / focuses chat, S/P/A for supplier */
function PortalShortcuts() {
  const navigate = useNavigate()
  const activeRole = usePortalStore((s) => s.activeRole)

  // Customer shortcuts (only active when customer mode)
  useShortcut('o', () => navigate({ to: '/orders' }), { enabled: activeRole === 'customer' })
  useShortcut('m', () => navigate({ to: '/market' }), { enabled: activeRole === 'customer' })

  // Supplier shortcuts (only active when supplier mode)
  useShortcut('s', () => navigate({ to: '/supplier/stock' }), { enabled: activeRole === 'supplier' })
  useShortcut('p', () => navigate({ to: '/supplier/orders' }), { enabled: activeRole === 'supplier' })
  useShortcut('a', () => navigate({ to: '/supplier/analytics' }), { enabled: activeRole === 'supplier' })

  // Universal shortcuts
  useShortcut('n', () => navigate({ to: '/notifications' }))
  useShortcut('/', () => {
    const el = document.querySelector<HTMLInputElement>('[data-chat-input]')
    el?.focus()
  })

  return null
}
