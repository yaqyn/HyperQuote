import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SpatialCanvas } from '../../components/canvas/SpatialCanvas'
import { Greeting } from '../../components/canvas/Greeting'
import { NavButtons } from '../../components/canvas/NavButtons'
import { GuestClaimBanner } from '../../components/canvas/GuestClaimBanner'
import { checkUnclaimedCustomer } from '../../lib/server/guest-claiming'

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
    />
  )
}
