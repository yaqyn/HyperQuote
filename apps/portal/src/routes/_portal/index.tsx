import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SpatialCanvas } from '../../components/canvas/SpatialCanvas'
import { AIReorderSuggestion } from '../../components/orders/AIReorderSuggestion'
import { getReorderSuggestion } from '../../lib/server/orders'
import { Greeting } from '../../components/canvas/Greeting'
import { AIChatInput } from '../../components/canvas/AIChatInput'
import { NavButtons } from '../../components/canvas/NavButtons'
import { GuestClaimBanner } from '../../components/canvas/GuestClaimBanner'
import { checkUnclaimedCustomer } from '../../lib/server/guest-claiming'
import { useNotificationStore } from '../../stores/notifications'

export const Route = createFileRoute('/_portal/')({
  component: PortalHome,
  head: () => ({
    meta: [
      { name: 'theme-color', content: '#FFFFFF' },
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

  return (
    <SpatialCanvas
      greeting={
        <>
          <Greeting name={userName} urgentCount={0} locale={currentLocale} />

          {/* Guest claim banner */}
          {unclaimedQuery.data?.hasUnclaimed && unclaimedQuery.data.maskedHint && unclaimedQuery.data.unclaimedCustomerId && (
            <div className="w-full max-w-[640px] px-4 mt-6">
              <GuestClaimBanner
                maskedHint={unclaimedQuery.data.maskedHint}
                unclaimedCustomerId={unclaimedQuery.data.unclaimedCustomerId}
              />
            </div>
          )}

          <NavButtons locale={currentLocale} />
        </>
      }
    >
      {/* AI reorder suggestion */}
      <AIReorderSuggestionSlot />
      <AIChatInput />
    </SpatialCanvas>
  )
}

/**
 * Fetches AI reorder suggestion and renders with all required props.
 * Returns null when no suggestion is available.
 */
function AIReorderSuggestionSlot() {
  const navigate = useNavigate()
  const { data } = useQuery({
    queryKey: ['reorder-suggestion'],
    queryFn: () => getReorderSuggestion(),
    staleTime: 5 * 60_000,
  })

  if (!data?.suggestion) return null

  const { productId, productName, daysSinceOrder } = data.suggestion

  return (
    <AIReorderSuggestion
      productId={productId}
      productName={productName}
      daysSinceOrder={daysSinceOrder}
      onReorder={(id) => navigate({ to: '/orders', search: { reorder: id } })}
    />
  )
}
