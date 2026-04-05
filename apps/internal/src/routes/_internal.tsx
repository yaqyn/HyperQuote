import { useState, useEffect, useCallback } from 'react'
import { Outlet, createFileRoute } from '@tanstack/react-router'
import { authGuard } from '@hyperquote/auth'
import { InternalCommandPalette } from '../components/command-palette/InternalCommandPalette'
import { IconStrip } from '../components/shell/IconStrip'
import { InternalShortcuts } from '../components/shell/InternalShortcuts'
import { ModuleWindow } from '../components/shell/ModuleWindow'
import { NotificationBell } from '../components/shell/NotificationBell'
import { NotificationsWindow } from '../components/shell/NotificationsWindow'
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications'
import { useInternalStore } from '../stores/internal'
import { useNotificationStore } from '../stores/notifications'
import { keyboardScopeStore } from '../stores/keyboard-scope'

export const Route = createFileRoute('/_internal')({
  beforeLoad: async () => {
    // Dev mode fallback: skip auth when Supabase is not configured
    if (!import.meta.env.VITE_SUPABASE_URL) {
      return {
        auth: {
          session: null as any,
          user: { user_metadata: { name: 'Dev User' } } as any,
          pool: 'internal' as const,
          roles: ['admin'],
          tenantId: 'dev-tenant',
        },
      }
    }

    const auth = await authGuard({
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      requiredPool: 'internal',
      loginPath: '/login',
    })
    return { auth }
  },
  component: InternalLayout,
})

function InternalLayout() {
  const { auth } = Route.useRouteContext()
  const activeModule = useInternalStore((s) => s.activeModule)
  const setActiveModule = useInternalStore((s) => s.setActiveModule)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  // Notification store
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const isWindowOpen = useNotificationStore((s) => s.isWindowOpen)
  const toggleWindow = useNotificationStore((s) => s.toggleWindow)
  const closeWindow = useNotificationStore((s) => s.closeWindow)

  // Supabase Realtime notifications
  useRealtimeNotifications({
    userId: auth.user?.id ?? 'dev-user',
    enabled: !!import.meta.env.VITE_SUPABASE_URL,
  })

  // Mutual exclusivity: command palette closes module, module closes command palette
  const handleToggleCommandPalette = useCallback(() => {
    setCommandPaletteOpen((prev) => {
      if (!prev) setActiveModule(null)
      return !prev
    })
  }, [setActiveModule])

  const handleCloseCommandPalette = useCallback(() => {
    setCommandPaletteOpen(false)
  }, [])

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
      <IconStrip auth={auth} />
      <InternalShortcuts
        auth={auth}
        commandPaletteOpen={commandPaletteOpen}
        onToggleCommandPalette={handleToggleCommandPalette}
        onCloseCommandPalette={handleCloseCommandPalette}
      />

      {/* Command palette */}
      <InternalCommandPalette
        isOpen={commandPaletteOpen}
        onClose={handleCloseCommandPalette}
        auth={auth}
      />

      {/* Notification bell -- rendered ONLY here, NOT in _internal/index.tsx */}
      <div className="fixed top-4 end-4 z-40">
        <NotificationBell
          hasUnread={unreadCount > 0}
          onPress={toggleWindow}
        />
      </div>

      {/* Notifications window */}
      <NotificationsWindow isOpen={isWindowOpen} onClose={closeWindow} />

      {/* Module window system */}
      {activeModule && (
        <ModuleWindow
          moduleId={activeModule}
          isOpen={!!activeModule}
          onClose={() => setActiveModule(null)}
        />
      )}

      <main className="h-full ps-14 max-md:ps-0">
        <Outlet />
      </main>
    </div>
  )
}
