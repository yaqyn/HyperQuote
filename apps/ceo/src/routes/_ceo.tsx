import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { checkCEOAuth } from '../lib/auth'

export const Route = createFileRoute('/_ceo')({
  beforeLoad: async ({ location }) => {
    const { auth, roles, name } = await checkCEOAuth()

    if (!auth || !roles.includes('ceo')) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }

    return { auth, roles, name }
  },
  component: CEOLayout,
})

function CEOLayout() {
  return (
    <div className="h-dvh w-full overflow-hidden bg-[var(--color-bg)]">
      <Outlet />
    </div>
  )
}
