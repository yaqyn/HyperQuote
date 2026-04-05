import { Outlet, createFileRoute } from '@tanstack/react-router'
import { authGuard } from '@hyperquote/auth'

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
  return (
    <div id="main" className="relative h-dvh w-full overflow-hidden">
      <Outlet />
    </div>
  )
}
