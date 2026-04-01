import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import { WindowShell } from '../../components/windows/WindowShell'
import { FloatingAIButton } from '../../components/windows/FloatingAIButton'

export const Route = createFileRoute('/_portal/orders')({
  component: OrdersWindow,
})

function OrdersWindow() {
  const { t } = useTranslation('portal')
  const navigate = useNavigate()
  return (
    <>
      <WindowShell title={t('nav.orders')}>
        <div className="flex flex-col gap-4 p-6">
          {/* New Quote Request button */}
          <Button
            onPress={() => navigate({ to: '/orders/new' })}
            className="flex items-center justify-center h-11 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold px-6 cursor-pointer hover:opacity-90 transition-opacity self-start"
          >
            {t('quoteBuilder.newQuoteRequest')}
          </Button>

          {/* Empty state */}
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <p className="text-lg font-semibold text-[var(--color-text)]">
              {t('empty.orders.title')}
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">
              {t('empty.orders.body')}
            </p>
          </div>
        </div>
      </WindowShell>
      <FloatingAIButton />
    </>
  )
}
