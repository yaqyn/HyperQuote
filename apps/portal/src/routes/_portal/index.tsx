import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SpatialCanvas } from '../../components/canvas/SpatialCanvas'
import { Greeting } from '../../components/canvas/Greeting'
import { AIChatInput } from '../../components/canvas/AIChatInput'
import { NavButtons } from '../../components/canvas/NavButtons'
import { PWAInstallBanner } from '../../components/pwa/PWAInstallBanner'
import { PushPermissionPrompt } from '../../components/pwa/PushPermissionPrompt'
import { GuestClaimBanner } from '../../components/canvas/GuestClaimBanner'
import { usePushPermission } from '../../components/pwa/usePushPermission'
import { checkUnclaimedCustomer } from '../../lib/server/guest-claiming'
import { useNotificationStore } from '../../stores/notifications'

export const Route = createFileRoute('/_portal/')({
  component: PortalHome,
  head: () => ({
    meta: [
      { name: 'theme-color', content: '#2563EB' },
    ],
    links: [
      { rel: 'manifest', href: '/manifest.json' },
    ],
  }),
})

function PortalHome() {
  const { auth } = Route.useRouteContext()
  const { locale } = Route.useRouteContext({ from: '__root__' as any })
  const userName = (auth as any)?.user?.user_metadata?.name ?? ''
  const userPhone = (auth as any)?.user?.phone ?? ''
  const currentLocale: 'ar' | 'en' =
    locale === 'ar' || locale === 'en' ? locale : 'en'

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('[SW] Registration failed:', err)
      })
    }
  }, [])

  // Guest claiming: check for unclaimed customer by phone
  const unclaimedQuery = useQuery({
    queryKey: ['guest-claim', userPhone],
    queryFn: () => checkUnclaimedCustomer({ data: { phone: userPhone } }),
    enabled: !!userPhone,
    staleTime: Infinity,
  })

  // Push permission: trigger on first notification arrival
  const { triggerPrompt } = usePushPermission()
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const previousUnread = useRef(0)

  useEffect(() => {
    // Trigger push permission prompt when unread goes from 0 to >0
    if (previousUnread.current === 0 && unreadCount > 0) {
      triggerPrompt()
    }
    previousUnread.current = unreadCount
  }, [unreadCount, triggerPrompt])

  return (
    <SpatialCanvas
      greeting={
        <>
          <Greeting name={userName} urgentCount={0} locale={currentLocale} />

          {/* Guest claim banner -- shown when unclaimed customer found */}
          {unclaimedQuery.data?.hasUnclaimed && unclaimedQuery.data.maskedHint && unclaimedQuery.data.unclaimedCustomerId && (
            <GuestClaimBanner
              maskedHint={unclaimedQuery.data.maskedHint}
              unclaimedCustomerId={unclaimedQuery.data.unclaimedCustomerId}
            />
          )}

          <NavButtons locale={currentLocale} />
        </>
      }
    >
      {/* AIReorderSuggestion: rendered above chat input when Plan 05 component is available */}
      {/* Import will be wired when AIReorderSuggestion.tsx exists in this worktree */}
      <AIReorderSuggestionSlot />
      <AIChatInput />

      {/* PWA install banner at bottom */}
      <PWAInstallBanner />

      {/* Push permission prompt (triggered on first notification) */}
      <PushPermissionPrompt />
    </SpatialCanvas>
  )
}

/**
 * Lazy slot for AIReorderSuggestion from Plan 05.
 * Uses dynamic import to avoid hard dependency on parallel plan output.
 */
function AIReorderSuggestionSlot() {
  try {
    // Dynamic require -- will resolve when Plan 05 creates the component
    const { AIReorderSuggestion } = require('../../components/orders/AIReorderSuggestion')
    return <AIReorderSuggestion />
  } catch {
    // Component not yet created by Plan 05 -- render nothing
    return null
  }
}
