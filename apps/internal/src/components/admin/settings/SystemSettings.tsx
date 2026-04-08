import { useState, useMemo } from 'react'
import { Input, TextField } from 'react-aria-components'
import { Button } from '../../ui/Button'
import { Toggle } from '../../ui/Toggle'
import { Pill, PillGroup } from '../../ui/Pill'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSystemConfig, updateSystemConfig } from '../../../lib/server/admin'
import type { SystemSetting, SettingCategory } from '../../../types/admin'

// ─── Smart Renderers ─────────────────────────────────────

const ALL_DAYS = [
  { id: 'sun', label: 'Sun' },
  { id: 'mon', label: 'Mon' },
  { id: 'tue', label: 'Tue' },
  { id: 'wed', label: 'Wed' },
  { id: 'thu', label: 'Thu' },
  { id: 'fri', label: 'Fri' },
  { id: 'sat', label: 'Sat' },
]

const CHANNEL_OPTIONS = [
  { id: 'email', label: 'Email' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'portal', label: 'Portal' },
  { id: 'sms', label: 'SMS' },
]

const LANGUAGE_OPTIONS = [
  { id: 'ar', label: 'Arabic' },
  { id: 'en', label: 'English' },
]

const CURRENCY_OPTIONS = [
  { id: 'EGP', label: 'EGP — Egyptian Pound' },
  { id: 'USD', label: 'USD — US Dollar' },
]

// ─── Category Config ─────────────────────────────────────

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

const CATEGORY_LABELS: Record<SettingCategory, string> = {
  company: 'Company',
  locale: 'Locale & Region',
  working_hours: 'Working Hours',
  payment_terms: 'Payment Terms',
  notification: 'Notifications',
  prayer_times: 'Prayer Times',
  ramadan: 'Ramadan Mode',
  quote_validity: 'Quote Validity',
}

const CATEGORY_DESCRIPTIONS: Record<SettingCategory, string> = {
  company: 'Business identity, tax registration, and legal details',
  locale: 'Language, currency, and regional formatting',
  working_hours: 'Standard business hours and work days',
  payment_terms: 'Default payment terms and credit policies',
  notification: 'Communication channels and alert preferences',
  prayer_times: 'Prayer break scheduling adjustments',
  ramadan: 'Ramadan-specific schedule modifications',
  quote_validity: 'Quote expiration and follow-up rules',
}

// TRN (Tax Registration Number) validation for Egyptian format
const TRN_PATTERN = /^\d{3}-\d{3}-\d{3}$/

function validateSetting(key: string, value: string): string | null {
  if (key === 'company.trn' && value && !TRN_PATTERN.test(value)) {
    return 'Format: 123-456-789'
  }
  if (key === 'company.email' && value && !value.includes('@')) {
    return 'Invalid email address'
  }
  if (key === 'company.phone' && value && value.length < 8) {
    return 'Phone number too short'
  }
  return null
}

// ─── Component ───────────────────────────────────────────

export function SystemSettings() {
  const { t } = useTranslation('admin')
  const queryClient = useQueryClient()
  const [editedValues, setEditedValues] = useState<Record<string, string>>({})
  const [savedCategories, setSavedCategories] = useState<Set<string>>(new Set())
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const { data: settings } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => getSystemConfig(),
    staleTime: 60_000,
  })

  const saveMutation = useMutation({
    mutationFn: async (category: string) => {
      const catSettings = groupedSettings[category] ?? []
      for (const setting of catSettings) {
        const newValue = editedValues[setting.key]
        if (newValue !== undefined && newValue !== setting.value) {
          await updateSystemConfig({ data: { key: setting.key, value: newValue } } as any)
        }
      }
    },
    onSuccess: (_data, category) => {
      // Clear edited values for this category
      const catSettings = groupedSettings[category] ?? []
      setEditedValues((prev) => {
        const next = { ...prev }
        for (const s of catSettings) delete next[s.key]
        return next
      })
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] })
      setSavedCategories((prev) => new Set([...prev, category]))
      setTimeout(() => {
        setSavedCategories((prev) => {
          const next = new Set(prev)
          next.delete(category)
          return next
        })
      }, 2000)
    },
  })

  const groupedSettings = (settings ?? []).reduce(
    (acc, s) => {
      if (!acc[s.category]) acc[s.category] = []
      acc[s.category].push(s)
      return acc
    },
    {} as Record<string, SystemSetting[]>,
  )

  const handleEdit = (key: string, value: string) => {
    setEditedValues((prev) => ({ ...prev, [key]: value }))
    // Validate inline
    const error = validateSetting(key, value)
    setValidationErrors((prev) => {
      if (error) return { ...prev, [key]: error }
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const getValue = (setting: SystemSetting) => editedValues[setting.key] ?? setting.value

  // Check if a category has unsaved changes
  const categoryHasChanges = (cat: string): boolean => {
    const catSettings = groupedSettings[cat] ?? []
    return catSettings.some((s) => {
      const edited = editedValues[s.key]
      return edited !== undefined && edited !== s.value
    })
  }

  // Check if a category has validation errors
  const categoryHasErrors = (cat: string): boolean => {
    const catSettings = groupedSettings[cat] ?? []
    return catSettings.some((s) => validationErrors[s.key])
  }

  return (
    <div className="space-y-6 px-6 py-6">
      {CATEGORY_ORDER.map((cat) => {
        const catSettings = groupedSettings[cat]
        if (!catSettings?.length) return null

        const hasChanges = categoryHasChanges(cat)
        const hasErrors = categoryHasErrors(cat)
        const isCompanyForm = cat === 'company'

        return (
          <section key={cat} className="border border-black/6 dark:border-white/6 rounded-lg overflow-hidden">
            {/* Section header */}
            <div className="px-4 py-3 border-b border-black/[0.04] dark:border-white/[0.04]">
              <h3 className="text-[12px] font-medium uppercase tracking-widest text-black/40 dark:text-white/40">
                {CATEGORY_LABELS[cat]}
              </h3>
              <p className="text-[11px] text-black/25 dark:text-white/25 mt-0.5">
                {CATEGORY_DESCRIPTIONS[cat]}
              </p>
              {hasChanges && (
                <span className="text-[10px] font-medium text-[#2563EB] mt-1 inline-block">
                  Unsaved changes
                </span>
              )}
            </div>

            {/* Settings rows — Company gets form-like padding */}
            <div className={isCompanyForm ? 'px-2 py-1 space-y-0' : 'space-y-0'}>
              {catSettings.map((setting) => (
                <SettingRow
                  key={setting.key}
                  setting={setting}
                  value={getValue(setting)}
                  onChange={(val) => handleEdit(setting.key, val)}
                  error={validationErrors[setting.key]}
                  isEdited={editedValues[setting.key] !== undefined && editedValues[setting.key] !== setting.value}
                />
              ))}
            </div>

            {/* Save button — only visible when changes exist */}
            {hasChanges && (
              <div className="px-4 py-2.5 border-t border-black/[0.04] dark:border-white/[0.04] flex items-center justify-end gap-2">
                {savedCategories.has(cat) && (
                  <span className="text-[11px] text-green-600 dark:text-green-400 font-medium">Saved</span>
                )}
                <Button
                  variant="primary"
                  className="!text-[11px] !px-3 !py-1"
                  onPress={() => saveMutation.mutate(cat)}
                  isDisabled={saveMutation.isPending || hasErrors}
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

// ─── Smart Setting Row ───────────────────────────────────

function SettingRow({
  setting,
  value,
  onChange,
  error,
  isEdited,
}: {
  setting: SystemSetting
  value: string
  onChange: (val: string) => void
  error?: string
  isEdited?: boolean
}) {
  const editedHighlight = isEdited ? 'bg-[#2563EB]/[0.05] border-s-2 border-s-[#2563EB]/30' : ''

  // Boolean → Toggle
  if (setting.type === 'boolean') {
    return (
      <div className={`flex items-center justify-between rounded-lg px-4 py-3 transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.015] ${editedHighlight}`}>
        <span className="text-[13px] text-[var(--color-text)]">{setting.description}</span>
        <Toggle
          isSelected={value === 'true'}
          onChange={(v) => onChange(String(v))}
        />
      </div>
    )
  }

  // JSON working days → day picker chips
  if (setting.key === 'locale.working_days') {
    const days: string[] = (() => { try { return JSON.parse(value) } catch { return [] } })()
    const toggle = (dayId: string) => {
      const updated = days.includes(dayId) ? days.filter((d) => d !== dayId) : [...days, dayId]
      onChange(JSON.stringify(updated))
    }
    return (
      <div className={`flex items-center justify-between rounded-lg px-4 py-3 transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.015] ${editedHighlight}`}>
        <span className="text-[13px] text-[var(--color-text)]">{setting.description}</span>
        <div className="flex gap-1">
          {ALL_DAYS.map((day) => (
            <button
              key={day.id}
              type="button"
              onClick={() => toggle(day.id)}
              className={`rounded-full px-2.5 py-1 text-[12px] font-medium outline-none transition-all
                ${days.includes(day.id)
                  ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                  : 'text-black/30 hover:text-black/50 dark:text-white/30 dark:hover:text-white/50'
                }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // JSON notification channels → channel chips
  if (setting.key.includes('notification.')) {
    const channels: string[] = (() => { try { return JSON.parse(value) } catch { return [] } })()
    const toggle = (ch: string) => {
      const updated = channels.includes(ch) ? channels.filter((c) => c !== ch) : [...channels, ch]
      onChange(JSON.stringify(updated))
    }
    return (
      <div className={`flex items-center justify-between rounded-lg px-4 py-3 transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.015] ${editedHighlight}`}>
        <span className="text-[13px] text-[var(--color-text)]">{setting.description}</span>
        <div className="flex gap-1">
          {CHANNEL_OPTIONS.map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => toggle(ch.id)}
              className={`rounded-full px-2.5 py-1 text-[12px] font-medium outline-none transition-all
                ${channels.includes(ch.id)
                  ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                  : 'text-black/30 hover:text-black/50 dark:text-white/30 dark:hover:text-white/50'
                }`}
            >
              {ch.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Language → pill select
  if (setting.key === 'locale.default_language') {
    return (
      <div className={`flex items-center justify-between rounded-lg px-4 py-3 transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.015] ${editedHighlight}`}>
        <span className="text-[13px] text-[var(--color-text)]">{setting.description}</span>
        <PillGroup aria-label="Language" value={value} onChange={onChange}>
          {LANGUAGE_OPTIONS.map((opt) => (
            <Pill key={opt.id} value={opt.id}>{opt.label}</Pill>
          ))}
        </PillGroup>
      </div>
    )
  }

  // Currency → pill select
  if (setting.key === 'locale.currency') {
    return (
      <div className={`flex items-center justify-between rounded-lg px-4 py-3 transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.015] ${editedHighlight}`}>
        <span className="text-[13px] text-[var(--color-text)]">{setting.description}</span>
        <PillGroup aria-label="Currency" value={value} onChange={onChange}>
          {CURRENCY_OPTIONS.map((opt) => (
            <Pill key={opt.id} value={opt.id}>{opt.label}</Pill>
          ))}
        </PillGroup>
      </div>
    )
  }

  // Time inputs (HH:MM)
  if (setting.key.includes('hours.start') || setting.key.includes('hours.end') || setting.key.includes('adjusted_hours')) {
    return (
      <div className={`flex items-center justify-between rounded-lg px-4 py-3 transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.015] ${editedHighlight}`}>
        <span className="text-[13px] text-[var(--color-text)]">{setting.description}</span>
        <input
          type="time"
          value={value.includes('-') ? value.split('-')[0] : value}
          onChange={(e) => {
            if (setting.key.includes('adjusted_hours') && value.includes('-')) {
              onChange(`${e.target.value}-${value.split('-')[1]}`)
            } else {
              onChange(e.target.value)
            }
          }}
          className="rounded-lg bg-black/[0.03] px-3 py-1.5 font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums outline-none focus:ring-1 focus:ring-[var(--color-primary)]/30 dark:bg-white/[0.04]"
        />
      </div>
    )
  }

  // Number → number input
  if (setting.type === 'number') {
    return (
      <div className={`flex items-center justify-between rounded-lg px-4 py-3 transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.015] ${editedHighlight}`}>
        <span className="text-[13px] text-[var(--color-text)]">{setting.description}</span>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 rounded-lg bg-black/[0.03] px-3 py-1.5 text-end font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums outline-none focus:ring-1 focus:ring-[var(--color-primary)]/30 dark:bg-white/[0.04]"
        />
      </div>
    )
  }

  // Default → text input with inline validation
  return (
    <div className={`flex items-center justify-between gap-6 rounded-lg px-4 py-3 transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.015] ${editedHighlight}`}>
      <span className="shrink-0 text-[13px] text-[var(--color-text)]">{setting.description}</span>
      <div className="w-56 shrink-0">
        <TextField value={value} onChange={onChange}>
          <Input
            className={`w-full rounded-lg bg-black/[0.03] px-3 py-1.5 text-[13px] outline-none focus:ring-1 dark:bg-white/[0.04] ${
              error
                ? 'ring-1 ring-red-500/50 focus:ring-red-500/50'
                : 'focus:ring-[var(--color-primary)]/30'
            }`}
          />
        </TextField>
        {error && (
          <p className="mt-1 text-[10px] text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    </div>
  )
}
