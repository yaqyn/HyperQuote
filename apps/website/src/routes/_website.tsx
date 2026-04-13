import { Outlet, createFileRoute } from '@tanstack/react-router'
import { WebsiteHeader } from '../components/layout/WebsiteHeader'
import { WebsiteFooter } from '../components/layout/WebsiteFooter'

export const Route = createFileRoute('/_website')({
  component: WebsiteLayout,
})

function WebsiteLayout() {
  return (
    <>
      <WebsiteHeader />
      <main id="main" className="relative z-10 bg-[var(--color-base)] shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
        <Outlet />
      </main>
      <WebsiteFooter />
    </>
  )
}
