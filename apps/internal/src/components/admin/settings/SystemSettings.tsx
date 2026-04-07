import { useState } from 'react'
import { Button, Switch, TextField, Input } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getSystemConfig, updateSystemConfig } from '../../../lib/server/admin'
import type { SystemSetting, SettingCategory } from '../../../types/admin'

/**
 * SystemSettings — "The Config"
 * Key-value pairs in sections. Each setting: label + current value + edit button.
 * Toggle settings as inline switches.
 * Grouped by category with uppercase section headers.
 */

const CATEGORY_ORDER: SettingCategory[] = [
  'company',
  'locale',
  'working_hours',
  'prayer_times',
  'ramadan',
  'notification',
  'payment_terms',
  'quote_validity',
]

const CATEGORY_LABELS: Record<SettingCategory, { key: string; fallback: string }> = {
  company: { key: 'settings.company', fallback: 'Company' },
  locale: { key: 'settings.locale', fallback: 'Locale' },
  working_hours: { key: 'settings.workingHours', fallback: 'Working Hours' },
  payment_terms: { key: 'settings.paymentTerms', fallback: 'Payment Terms' },
  notification: { key: 'settings.notification', fallback: 'Notifications' },
  prayer_times: { key: 'settings.prayerTimes', fallback: 'Prayer Times' },
  ramadan: { key: 'settings.ramadan', fallback: 'Ramadan Mode' },
  quote_validity: { key: 'settings.quoteValidity', fallback: 'Quote Validity' },
}

export function SystemSettings() {
  const { t } = useTranslation('admin')
  const [editedValues, setEditedValues] = useState<Record<string, string>>({})
  const [savedCategories, setSavedCategories] = useState<Set<string>>(new Set())

  const { data: settings } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => getSystemConfig(),
    staleTime: 60_000,
  })

  const groupedSettings = (settings ?? []).reduce(
    (acc, s) => {
      const cat = s.category
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(s)
      return acc
    },
    {} as Record<string, SystemSetting[]>,
  )

  const handleEdit = (key: string, value: string) => {
    setEditedValues((prev: Record<string, string>) => ({ ...prev, [key]: value }))
  }

  const handleSave = async (category: string) => {
    const categorySettings = groupedSettings[category] ?? []
    for (const setting of categorySettings) {
      const newValue = editedValues[setting.key]
      if (newValue !== undefined && newValue !== setting.value) {
        await updateSystemConfig({ data: { key: setting.key, value: newValue } } as any)
      }
    }
    setSavedCategories((prev: Set<string>) => new Set([...prev, category]))
    setTimeout(() => {
      setSavedCategories((prev: Set<string>) => {
        const next = new Set(prev)
        next.delete(category)
        return next
      })
    }, 2000)
  }

  return (
    <div className="p-5 space-y-4">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-black/30 dark:text-white/30">
        {t('settings.title', 'Configuration')}
      </span>

      <div className="space-y-3">
        {CATEGORY_ORDER.map((cat) => {
          const catSettings = groupedSettings[cat]
          if (!catSettings?.length) return null
          const label = CATEGORY_LABELS[cat]

          return (
            <div
              key={cat}
              className="border border-black/6 dark:border-white/6 rounded-lg overflow-hidden"
            >
              {/* Category header */}
              <div className="px-4 py-2 border-b border-black/[0.04] dark:border-white/[0.04]">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-black/30 dark:text-white/30">
                  {t(label.key, label.fallback)}
                </span>
              </div>

              {/* Settings list */}
              <div className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
                {catSettings.map((setting) => (
                  <SettingRow
                    key={setting.key}
                    setting={setting}
                    editedValue={editedValues[setting.key]}
                    onEdit={(val) => handleEdit(setting.key, val)}
                  />
                ))}
              </div>

              {/* Save */}
              <div className="flex justify-end px-4 py-2 border-t border-black/[0.04] dark:border-white/[0.04]">
                <Button
                  onPress={() => handleSave(cat)}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-medium cursor-pointer outline-none transition-colors ${
                    savedCategories.has(cat)
                      ? 'bg-green-600 text-white'
                      : 'bg-[#2563EB] text-white hover:bg-[#2563EB]/90'
                  } data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50`}
                >
                  {savedCategories.has(cat) ? t('settings.saved', 'Saved') : t('settings.save', 'Save')}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Setting Row ─────────────────────────────────────────

function SettingRow({
  setting,
  editedValue,
  onEdit,
}: {
  setting: SystemSetting
  editedValue?: string
  onEdit: (val: string) => void
}) {
  const currentValue = editedValue ?? setting.value

  if (setting.type === 'boolean') {
    return (
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="text-xs">{setting.description}</div>
          <div className="text-[10px] text-black/20 dark:text-white/20 font-[family-name:var(--font-geist-mono)]">{setting.key}</div>
        </div>
        <Switch
          isSelected={currentValue === 'true'}
          onChange={(val) => onEdit(String(val))}
          className="group flex items-center cursor-pointer shrink-0"
        >
          <div className="w-8 h-[18px] rounded-full transition-colors bg-black/15 group-data-[selected]:bg-[#2563EB] dark:bg-white/15">
            <div className="w-3.5 h-3.5 mt-[2px] ms-[2px] rounded-full bg-white shadow transition-transform group-data-[selected]:translate-x-3.5 rtl:group-data-[selected]:-translate-x-3.5" />
          </div>
        </Switch>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="text-xs">{setting.description}</div>
        <div className="text-[10px] text-black/20 dark:text-white/20 font-[family-name:var(--font-geist-mono)]">{setting.key}</div>
      </div>
      <TextField
        value={currentValue}
        onChange={onEdit}
        className="w-44 shrink-0"
      >
        <Input
          className={`w-full rounded border border-black/8 dark:border-white/8 bg-transparent px-2.5 py-1 text-xs outline-none data-[focused]:border-black/20 dark:data-[focused]:border-white/20 ${
            setting.type === 'number' ? 'font-[family-name:var(--font-geist-mono)] tabular-nums' : ''
          }`}
        />
      </TextField>
    </div>
  )
}
