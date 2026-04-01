import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { WindowShell } from '../../components/windows/WindowShell'
import { FloatingAIButton } from '../../components/windows/FloatingAIButton'

export const Route = createFileRoute('/_portal/notifications')({
  component: NotificationsWindow,
})

function NotificationsWindow() {
  const { t } = useTranslation('portal')
  return (
    <>
      <WindowShell title={t('bell.label')}>
        <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
          <p className="text-lg font-semibold text-[var(--color-text)]">
            {t('empty.notifications.title')}
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            {t('empty.notifications.body')}
          </p>
        </div>
      </WindowShell>
      <FloatingAIButton />
    </>
  )
}
