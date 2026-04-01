/**
 * Notification preferences settings section.
 * Per-channel toggles (WhatsApp, Email, Push, SMS).
 * Per-event toggles (6 event types).
 * Grid layout: channels as columns, events as rows.
 * Quiet hours with time pickers.
 * All toggles save immediately on change.
 */
import { useState } from 'react'
import { Switch, Label, TimeField, DateInput, DateSegment } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateNotificationPreferences } from '../../lib/server/settings'
import type { NotificationPreference } from '../../types/settings'

const CHANNELS = ['whatsapp', 'email', 'push', 'sms'] as const
const EVENTS = [
  'quote_ready',
  'order_status',
  'delivery_update',
  'invoice_generated',
  'payment_confirmation',
  'support_response',
] as const

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'settings.notifications.whatsapp',
  email: 'settings.notifications.email',
  push: 'settings.notifications.push',
  sms: 'settings.notifications.sms',
}

const EVENT_LABELS: Record<string, string> = {
  quote_ready: 'settings.notifications.quoteReady',
  order_status: 'settings.notifications.orderStatus',
  delivery_update: 'settings.notifications.deliveryUpdate',
  invoice_generated: 'settings.notifications.invoiceGenerated',
  payment_confirmation: 'settings.notifications.paymentConfirmation',
  support_response: 'settings.notifications.supportResponse',
}

interface NotificationsSectionProps {
  preferences?: NotificationPreference[]
}

export function NotificationsSection({
  preferences: initialPreferences,
}: NotificationsSectionProps) {
  const { t } = useTranslation('portal')
  const queryClient = useQueryClient()

  // Build preference map from initial data or defaults
  const [prefMap, setPrefMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {}
    for (const channel of CHANNELS) {
      for (const event of EVENTS) {
        const key = `${channel}:${event}`
        const existing = initialPreferences?.find(
          (p) => p.channel === channel && p.event === event,
        )
        map[key] = existing?.enabled ?? true
      }
    }
    return map
  })

  const updateMutation = useMutation({
    mutationFn: (prefs: NotificationPreference[]) =>
      updateNotificationPreferences({ data: { preferences: prefs } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['notificationPreferences'],
      })
    },
  })

  function handleToggle(
    channel: (typeof CHANNELS)[number],
    event: (typeof EVENTS)[number],
    enabled: boolean,
  ) {
    const key = `${channel}:${event}`
    const newMap = { ...prefMap, [key]: enabled }
    setPrefMap(newMap)

    // Auto-save immediately
    const prefs: NotificationPreference[] = Object.entries(newMap).map(
      ([k, v]) => {
        const [ch, ev] = k.split(':')
        return {
          channel: ch as NotificationPreference['channel'],
          event: ev as NotificationPreference['event'],
          enabled: v,
        }
      },
    )
    updateMutation.mutate(prefs)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-[var(--color-text)]">
        {t('settings.notifications.title')}
      </h2>

      {/* Toggle grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-start pb-3 text-[var(--color-text-muted)] font-medium">
                {t('settings.notifications.event')}
              </th>
              {CHANNELS.map((channel) => (
                <th
                  key={channel}
                  className="pb-3 text-center text-[var(--color-text-muted)] font-medium px-3"
                >
                  {t(CHANNEL_LABELS[channel])}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EVENTS.map((event) => (
              <tr
                key={event}
                className="border-t border-[var(--color-border)]"
              >
                <td className="py-3 text-[var(--color-text)]">
                  {t(EVENT_LABELS[event])}
                </td>
                {CHANNELS.map((channel) => {
                  const key = `${channel}:${event}`
                  return (
                    <td key={key} className="py-3 text-center">
                      <Switch
                        isSelected={prefMap[key] ?? true}
                        onChange={(val) => handleToggle(channel, event, val)}
                        className="group inline-flex items-center cursor-pointer outline-none"
                        aria-label={`${t(EVENT_LABELS[event])} - ${t(CHANNEL_LABELS[channel])}`}
                      >
                        <span className="w-9 h-5 rounded-full transition-colors bg-[var(--color-border)] group-data-[selected]:bg-[var(--color-primary)] relative">
                          <span className="absolute top-0.5 start-0.5 w-4 h-4 rounded-full bg-white transition-transform group-data-[selected]:translate-x-4 rtl:group-data-[selected]:-translate-x-4 shadow-sm" />
                        </span>
                      </Switch>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quiet Hours */}
      <div className="space-y-3 pt-4 border-t border-[var(--color-border)]">
        <h3 className="text-sm font-medium text-[var(--color-text)]">
          {t('settings.notifications.quietHours')}
        </h3>
        <p className="text-xs text-[var(--color-text-muted)]">
          {t('settings.notifications.quietHoursDesc')}
        </p>
        <div className="flex items-center gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-[var(--color-text-muted)]">
              {t('settings.notifications.from')}
            </Label>
            <TimeField
              aria-label={t('settings.notifications.from')}
              className="flex"
            >
              <DateInput className="flex gap-0.5 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] text-sm text-[var(--color-text)] font-mono">
                {(segment) => (
                  <DateSegment
                    segment={segment}
                    className="px-0.5 rounded outline-none focus:bg-[var(--color-primary)]/10 focus:text-[var(--color-primary)]"
                  />
                )}
              </DateInput>
            </TimeField>
          </div>
          <span className="text-sm text-[var(--color-text-muted)] mt-5">
            {t('settings.notifications.to')}
          </span>
          <div className="space-y-1">
            <Label className="text-xs text-[var(--color-text-muted)]">
              {t('settings.notifications.to')}
            </Label>
            <TimeField
              aria-label={t('settings.notifications.to')}
              className="flex"
            >
              <DateInput className="flex gap-0.5 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] text-sm text-[var(--color-text)] font-mono">
                {(segment) => (
                  <DateSegment
                    segment={segment}
                    className="px-0.5 rounded outline-none focus:bg-[var(--color-primary)]/10 focus:text-[var(--color-primary)]"
                  />
                )}
              </DateInput>
            </TimeField>
          </div>
        </div>
      </div>
    </div>
  )
}
