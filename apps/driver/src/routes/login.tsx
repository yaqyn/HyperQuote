import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from './__root'
import { useTranslation } from 'react-i18next'

function LoginPage() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">{t('login.welcome')}</h1>
        <p className="mt-2 text-[var(--text-secondary)]">{t('login.enterPhone')}</p>
      </div>
    </div>
  )
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})
