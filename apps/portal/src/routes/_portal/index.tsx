import { createFileRoute } from '@tanstack/react-router'
import { ChatView } from '../../components/chat/ChatView'

export const Route = createFileRoute('/_portal/')({
  component: PortalHome,
  head: () => ({
    meta: [{ name: 'theme-color', content: '#060606' }],
    links: [{ rel: 'manifest', href: '/manifest.json' }],
  }),
})

function PortalHome() {
  const { auth } = Route.useRouteContext()
  const { locale } = Route.useRouteContext({ from: '__root__' as any })
  const userName = (auth as any)?.user?.user_metadata?.name ?? ''
  const currentLocale: 'ar' | 'en' =
    locale === 'ar' || locale === 'en' ? locale : 'en'

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      <ChatView userName={userName} locale={currentLocale} />
    </div>
  )
}
