import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { WindowShell } from '../../components/windows/WindowShell'
import { FloatingAIButton } from '../../components/windows/FloatingAIButton'

export const Route = createFileRoute('/_portal/orders')({
  component: OrdersWindow,
})

function OrdersWindow() {
  const { t } = useTranslation('portal')
  return (
    <>
      <WindowShell title={t('nav.orders')}>
        <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
          <p className="text-lg font-semibold text-[var(--color-text)]">
            {t('empty.orders.title')}
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            {t('empty.orders.body')}
          </p>
        </div>
      </WindowShell>
      <FloatingAIButton />
    </>
  )
}
