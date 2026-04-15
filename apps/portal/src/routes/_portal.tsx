import { Outlet, createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { checkPortalAuth } from '../lib/auth'
import { ChatSidebar } from '../components/sidebar/ChatSidebar'
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
      <div className="flex flex-col items-center justify-center h-dvh gap-4 bg-[var(--p-bg)]">
        <p className="text-base text-[var(--p-text-secondary)]">
          {t('auth.noPortalAccess')}
        </p>
        <a
          href={
            import.meta.env.VITE_INTERNAL_URL ??
            'https://internal.hyperquote.net'
          }
          className="px-5 py-2.5 rounded-xl bg-[var(--p-accent)] text-white text-sm font-medium"
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

  const isSigningOut = usePortalStore((s) => s.isSigningOut)

  return (
    <div id="main" className="relative h-dvh w-full flex overflow-hidden bg-[var(--p-bg)] p-2">
      {/* Glass shell — fades in on mount, collapses on sign-out */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={isSigningOut
          ? { opacity: 0, scale: 0.96 }
          : { opacity: 1, scale: 1 }
        }
        transition={isSigningOut
          ? { duration: 0.7, ease: [0.36, 0, 0.66, -0.2] }
          : { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
        }
        className="relative flex flex-1 rounded-2xl border border-[var(--p-border)] bg-[var(--p-bg)] shadow-[0_0_80px_-20px_rgba(255,255,255,0.03)] overflow-hidden"
      >
        {/* Top-left light reflection */}
        <div
          className="absolute inset-0 pointer-events-none z-[1]"
          style={{
            background: 'radial-gradient(ellipse 50% 40% at 10% 0%, rgba(255,255,255,0.06) 0%, transparent 70%)',
          }}
        />
        {/* Sidebar — slides in from inline-start */}
        <motion.div
          initial={{ opacity: 0, x: 'calc(var(--sidebar-dir, -1) * 24px)' }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="h-full"
          style={{
            ['--sidebar-dir' as string]: 'var(--_rtl-flip, -1)',
          }}
        >
          <ChatSidebar
            userName={userName}
            companyName={companyName}
            hasSupplierRole={hasSupplierRole}
          />
        </motion.div>
        {/* Main content — fades in after sidebar */}
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.45, ease: 'easeOut' }}
          className="flex-1 flex flex-col min-w-0"
          style={{ viewTransitionName: 'lang-content' }}
        >
          <Outlet />
        </motion.main>
      </motion.div>
      <PortalShortcuts />
    </div>
  )
}

function PortalShortcuts() {
  const navigate = useNavigate()
  const activeRole = usePortalStore((s) => s.activeRole)

  useShortcut('o', () => navigate({ to: '/orders' }), { enabled: activeRole === 'customer' })
  useShortcut('m', () => navigate({ to: '/market' }), { enabled: activeRole === 'customer' })
  useShortcut('s', () => navigate({ to: '/supplier/stock' }), { enabled: activeRole === 'supplier' })
  useShortcut('p', () => navigate({ to: '/supplier/orders' }), { enabled: activeRole === 'supplier' })
  useShortcut('a', () => navigate({ to: '/supplier/analytics' }), { enabled: activeRole === 'supplier' })
  useShortcut('n', () => navigate({ to: '/notifications' }))
  useShortcut('/', () => {
    const el = document.querySelector<HTMLTextAreaElement>('[data-chat-input]')
    el?.focus()
  })

  return null
}
