import { useEffect } from 'react'
import { Outlet, createFileRoute } from '@tanstack/react-router'
import { authGuard } from '@hyperquote/auth'
import { IconStrip } from '../components/shell/IconStrip'
import { InternalShortcuts } from '../components/shell/InternalShortcuts'
import { ModuleWindow } from '../components/shell/ModuleWindow'
import { NotificationBell } from '../components/shell/NotificationBell'
import { useInternalStore } from '../stores/internal'
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
      <InternalShortcuts auth={auth} />

      {/* Notification bell -- rendered ONLY here, NOT in _internal/index.tsx */}
      <div className="fixed top-4 end-4 z-40">
        <NotificationBell
          hasUnread={false}
          onPress={() => {
            // TODO: Plan 03 wires the real notification window
            console.log('notifications')
          }}
        />
      </div>

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
