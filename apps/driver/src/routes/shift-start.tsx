import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from './__root'
import { useTranslation } from 'react-i18next'

function ShiftStartPage() {
  const { t } = useTranslation()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">{t('shift.startShift')}</h1>
      <p className="mt-2 text-[var(--text-secondary)]">{t('shift.selectVehicle')}</p>
    </div>
  )
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/shift-start',
  component: ShiftStartPage,
})
