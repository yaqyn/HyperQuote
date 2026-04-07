import { useState, useEffect, useCallback } from 'react'
import { Outlet, createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { InternalShortcuts } from '../components/shell/InternalShortcuts'
import { ModuleWindow } from '../components/shell/ModuleWindow'
import { NotificationsWindow } from '../components/shell/NotificationsWindow'
import { ToolsPanel } from '../components/tools/ToolsPanel'
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
  const [toolsOpen, setToolsOpen] = useState(false)

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
        onToggleCommandPalette={() => setToolsOpen((p) => !p)}
        onCloseCommandPalette={() => setToolsOpen(false)}
      />

      {/* Notifications window */}
      <NotificationsWindow isOpen={isWindowOpen} onClose={closeWindow} />

      {/* Tools panel — right side, hover trigger */}
      <ToolsPanel isOpen={toolsOpen} onClose={() => setToolsOpen(false)} />

      {/* Left-edge hover trigger for tools */}
      <div className="fixed top-0 left-0 bottom-0 z-40 w-2">
        <button
          type="button"
          onClick={() => setToolsOpen(true)}
          className="absolute top-1/2 -translate-y-1/2 left-0 w-6 h-12 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300 cursor-pointer"
          aria-label="Open tools"
        >
          <div className="w-1 h-8 rounded-full bg-black/15 dark:bg-white/15" />
        </button>
      </div>

      {/* Module window system */}
      {activeModule && (
        <ModuleWindow
          moduleId={activeModule}
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
