/**
 * Notification preferences — not a table. Each event is its own row
 * with channel toggles listed horizontally as small labeled switches.
 * Feels personal, not corporate.
 */
import { useState } from 'react'
import { Switch } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateNotificationPreferences } from '../../lib/server/settings'
import type { NotificationPreference } from '../../types/settings'

const CHANNELS = ['whatsapp', 'email', 'push'] as const
const EVENTS = [
  'quote_ready',
  'order_status',
  'delivery_update',
  'invoice_generated',
  'payment_confirmation',
  'support_response',
] as const

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  push: 'Push',
}

const EVENT_LABELS: Record<string, string> = {
  quote_ready: 'settings.notifications.quoteReady',
  order_status: 'settings.notifications.orderStatus',
  delivery_update: 'settings.notifications.deliveryUpdate',
  invoice_generated: 'settings.notifications.invoiceGenerated',
  payment_confirmation: 'settings.notifications.paymentConfirmation',
  support_response: 'settings.notifications.supportResponse',
}

export function NotificationsSection({
  preferences: initialPreferences,
}: { preferences?: NotificationPreference[] }) {
  const { t } = useTranslation('portal')
  const queryClient = useQueryClient()

  const [prefMap, setPrefMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {}
    for (const channel of CHANNELS) {
      for (const event of EVENTS) {
        const existing = initialPreferences?.find(
          (p) => p.channel === channel && p.event === event,
        )
        map[`${channel}:${event}`] = existing?.enabled ?? true
      }
    }
    return map
  })

  const updateMutation = useMutation({
    mutationFn: (prefs: NotificationPreference[]) =>
      updateNotificationPreferences({ data: { preferences: prefs } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] })
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

    const prefs: NotificationPreference[] = Object.entries(newMap).map(([k, v]) => {
      const [ch, ev] = k.split(':')
      return {
        channel: ch as NotificationPreference['channel'],
        event: ev as NotificationPreference['event'],
        enabled: v,
      }
    })
    updateMutation.mutate(prefs)
  }

  return (
    <div className="flex flex-col gap-6">
      {EVENTS.map((event) => (
        <div key={event} className="flex flex-col gap-3 pb-6 border-b border-[var(--color-border)] last:border-0 last:pb-0">
          {/* Event name */}
          <span className="text-sm text-[var(--color-text)]">
            {t(EVENT_LABELS[event])}
          </span>

          {/* Channel toggles — horizontal, compact */}
          <div className="flex items-center gap-6">
            {CHANNELS.map((channel) => {
              const key = `${channel}:${event}`
              const isOn = prefMap[key] ?? true
              return (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    isSelected={isOn}
                    onChange={(val) => handleToggle(channel, event, val)}
                    className="group inline-flex items-center cursor-pointer outline-none"
                    aria-label={`${t(EVENT_LABELS[event])} ${CHANNEL_LABELS[channel]}`}
                  >
                    <span className="w-7 h-4 rounded-full transition-colors bg-[var(--color-border)] group-data-[selected]:bg-[#0F172A] dark:group-data-[selected]:bg-[#FAFAFA] relative">
                      <span className="absolute top-[2px] start-[2px] w-3 h-3 rounded-full bg-white dark:bg-[#09090B] transition-transform group-data-[selected]:translate-x-3 rtl:group-data-[selected]:-translate-x-3" />
                    </span>
                  </Switch>
                  <span className="text-[13px] text-[var(--color-text-subtle)]">
                    {CHANNEL_LABELS[channel]}
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
