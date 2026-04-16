import { useEffect, useState } from 'react'
import { Outlet, createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { InternalShortcuts } from '../components/shell/InternalShortcuts'
import { ModuleWindow } from '../components/shell/ModuleWindow'
import { NotificationsWindow } from '../components/shell/NotificationsWindow'
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications'
import { useInternalStore } from '../stores/internal'
import { useNotificationStore } from '../stores/notifications'
import { keyboardScopeStore } from '../stores/keyboard-scope'

const getAuthSession = createServerFn({ method: 'GET' }).handler(async () => {
  if (!process.env.VITE_SUPABASE_URL) {
    return {
      session: null as any,
      user: { user_metadata: { name: 'Dev User' } } as any,
      pool: 'internal' as const,
      roles: ['admin'],
      tenantId: 'dev-tenant',
    }
  }

  const { authGuard } = await import('@hyperquote/auth')
  return authGuard({
    supabaseUrl: process.env.VITE_SUPABASE_URL!,
    supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY!,
    requiredPool: 'internal',
    loginPath: '/login',
  })
})

export const Route = createFileRoute('/_internal')({
  beforeLoad: async () => {
    const auth = await getAuthSession()
    return { auth }
  },
  component: InternalLayout,
})

function InternalLayout() {
  const { auth } = Route.useRouteContext()
  const activeModule = useInternalStore((s) => s.activeModule)
  const setActiveModule = useInternalStore((s) => s.setActiveModule)

  // Keep the most recently opened module id around during the exit fade
  // so ModuleWindow still has content to render while it animates out.
  // Without this, ModuleWindow would be unmounted before AnimatePresence
  // can play the exit.
  const [lastOpenedModule, setLastOpenedModule] = useState<string | null>(null)
  useEffect(() => {
    if (activeModule) setLastOpenedModule(activeModule)
  }, [activeModule])

  // Notification store
  const isWindowOpen = useNotificationStore((s) => s.isWindowOpen)
  const toggleWindow = useNotificationStore((s) => s.toggleWindow)
  const closeWindow = useNotificationStore((s) => s.closeWindow)

  // Supabase Realtime notifications
  useRealtimeNotifications({
    userId: auth.user?.id ?? 'dev-user',
    enabled: !!import.meta.env.VITE_SUPABASE_URL,
  })


  // Focus/blur event delegation for keyboard scope
  useEffect(() => {
    function handleFocus(e: FocusEvent) {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.hasAttribute('contenteditable')
      ) {
        keyboardScopeStore.send({ type: 'focusInput' })
      }
    }

    function handleBlur(e: FocusEvent) {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.hasAttribute('contenteditable')
      ) {
        keyboardScopeStore.send({ type: 'blurInput' })
      }
    }

    document.addEventListener('focus', handleFocus, { capture: true })
    document.addEventListener('blur', handleBlur, { capture: true })

    return () => {
      document.removeEventListener('focus', handleFocus, { capture: true })
      document.removeEventListener('blur', handleBlur, { capture: true })
    }
  }, [])

  return (
    <div id="main" className="relative h-dvh w-full overflow-hidden">
      <InternalShortcuts
        auth={auth}
        commandPaletteOpen={false}
        onToggleCommandPalette={() => {}}
        onCloseCommandPalette={() => {}}
      />

      {/* Notifications window */}
      <NotificationsWindow isOpen={isWindowOpen} onClose={closeWindow} />

      {/* Module window system — always mounted so GlassWindow can run its
          open/close fade. `isOpen` drives visibility; `moduleId` falls back
          to the last opened module so content stays stable during the
          exit animation. */}
      {(activeModule || lastOpenedModule) && (
        <ModuleWindow
          moduleId={activeModule ?? lastOpenedModule ?? ''}
          isOpen={!!activeModule}
          onClose={() => setActiveModule(null)}
        />
      )}

      <main className="h-full">
        <Outlet />
      </main>
    </div>
  )
}
