import { createFileRoute } from '@tanstack/react-router'
import { SpatialCanvas } from '../../components/canvas/SpatialCanvas'
import { Greeting } from '../../components/canvas/Greeting'
import { AIChatInput } from '../../components/canvas/AIChatInput'
import { NavButtons } from '../../components/canvas/NavButtons'

export const Route = createFileRoute('/_portal/')({
  component: PortalHome,
})

function PortalHome() {
  const { auth } = Route.useRouteContext()
  const { locale } = Route.useRouteContext({ from: '__root__' as any })
  const userName = (auth as any)?.user?.user_metadata?.name ?? ''
  const currentLocale: 'ar' | 'en' =
    locale === 'ar' || locale === 'en' ? locale : 'en'

  return (
    <SpatialCanvas
      greeting={
        <>
          <Greeting name={userName} urgentCount={0} locale={currentLocale} />
          <NavButtons locale={currentLocale} />
        </>
      }
    >
      <AIChatInput />
    </SpatialCanvas>
  )
}
