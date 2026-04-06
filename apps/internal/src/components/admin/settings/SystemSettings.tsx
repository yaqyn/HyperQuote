import { useState } from 'react'
import { Button, Switch, TextField, Input } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getSystemConfig, updateSystemConfig } from '../../../lib/server/admin'
import type { SystemSetting, SettingCategory } from '../../../types/admin'

/**
 * System settings grouped by category in collapsible sections.
 * Each section has its own save button. Inline editing for values.
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
  const [expandedCategories, setExpandedCategories] = useState<Set<SettingCategory>>(
    new Set(CATEGORY_ORDER),
  )
  const [editedValues, setEditedValues] = useState<Record<string, string>>({})
  const [savedCategories, setSavedCategories] = useState<Set<string>>(new Set())

  const { data: settings } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => getSystemConfig(),
    staleTime: 60_000,
  })

  const toggleCategory = (cat: SettingCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

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
    setEditedValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async (category: string) => {
    const categorySettings = groupedSettings[category] ?? []
    for (const setting of categorySettings) {
      const newValue = editedValues[setting.key]
      if (newValue !== undefined && newValue !== setting.value) {
        await updateSystemConfig({ data: { key: setting.key, value: newValue } })
      }
    }
    setSavedCategories((prev) => new Set([...prev, category]))
    setTimeout(() => {
      setSavedCategories((prev) => {
        const next = new Set(prev)
        next.delete(category)
        return next
      })
    }, 2000)
  }

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-semibold">{t('settings.title', 'System Settings')}</h2>

      <div className="space-y-3">
        {CATEGORY_ORDER.map((cat) => {
          const catSettings = groupedSettings[cat]
          if (!catSettings?.length) return null
          const isExpanded = expandedCategories.has(cat)
          const label = CATEGORY_LABELS[cat]

          return (
            <div
              key={cat}
              className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm overflow-hidden"
            >
              {/* Category header */}
              <button
                type="button"
                onClick={() => toggleCategory(cat)}
                className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
              >
                <h3 className="text-sm font-semibold">{t(label.key, label.fallback)}</h3>
                <svg
                  className={`w-4 h-4 text-black/40 dark:text-white/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {/* Settings list */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-3">
                  {catSettings.map((setting) => (
                    <SettingRow
                      key={setting.key}
                      setting={setting}
                      editedValue={editedValues[setting.key]}
                      onEdit={(val) => handleEdit(setting.key, val)}
                    />
                  ))}
                  <div className="flex justify-end pt-2">
                    <Button
                      onPress={() => handleSave(cat)}
                      className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]/90 cursor-pointer outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50"
                    >
                      {savedCategories.has(cat)
                        ? t('settings.saved', 'Saved')
                        : t('settings.save', 'Save')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

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
      <div className="flex items-center justify-between py-1">
        <div>
          <div className="text-sm">{setting.description}</div>
          <div className="text-xs text-black/40 dark:text-white/40">{setting.key}</div>
        </div>
        <Switch
          isSelected={currentValue === 'true'}
          onChange={(val) => onEdit(String(val))}
          className="group flex items-center cursor-pointer"
        >
          <div className="w-9 h-5 rounded-full transition-colors bg-black/20 group-data-[selected]:bg-[#2563EB] dark:bg-white/20">
            <div className="w-4 h-4 mt-0.5 ms-0.5 rounded-full bg-white shadow transition-transform group-data-[selected]:translate-x-4 rtl:group-data-[selected]:-translate-x-4" />
          </div>
        </Switch>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="min-w-0 flex-1">
        <div className="text-sm">{setting.description}</div>
        <div className="text-xs text-black/40 dark:text-white/40">{setting.key}</div>
      </div>
      <TextField
        value={currentValue}
        onChange={onEdit}
        className="w-48 shrink-0"
      >
        <Input
          className={`w-full rounded-lg border border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/80 px-3 py-1.5 text-sm outline-none data-[focused]:ring-2 data-[focused]:ring-[#2563EB]/50 ${
            setting.type === 'number' ? 'font-[family-name:var(--font-geist-mono)] tabular-nums' : ''
          }`}
        />
      </TextField>
    </div>
  )
}
