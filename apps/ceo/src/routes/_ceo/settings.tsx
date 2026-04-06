import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { motion } from 'motion/react'
import { X } from 'lucide-react'
import { GlassElevated } from '@hyperquote/ui/glass/GlassElevated'

// ============================================================================
// Route
// ============================================================================

export const Route = createFileRoute('/_ceo/settings')({
  component: SettingsPage,
})

// ============================================================================
// Section component
// ============================================================================

function SettingsSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-[var(--color-border)] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-4 text-base font-medium text-[var(--color-text)] outline-none"
      >
        {title}
        <span className="text-sm text-[var(--color-text-muted)]">
          {open ? '\u2212' : '+'}
        </span>
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  )
}

// ============================================================================
// Toggle switch (black/gray, zero accent)
// ============================================================================

function ToggleSwitch({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-[var(--color-text)]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
          checked
            ? 'bg-[var(--color-text)]'
            : 'bg-[var(--color-border)]'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-[var(--color-bg)] shadow-sm transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}

// ============================================================================
// Radio option (black/gray, zero accent)
// ============================================================================

function RadioOption({
  label,
  selected,
  onSelect,
}: {
  label: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className="flex items-center gap-3 py-1.5 outline-none"
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
          selected
            ? 'border-[var(--color-text)]'
            : 'border-[var(--color-border)]'
        }`}
      >
        {selected && (
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-text)]" />
        )}
      </span>
      <span className="text-sm text-[var(--color-text)]">{label}</span>
    </button>
  )
}

// ============================================================================
// Number threshold field
// ============================================================================

function ThresholdField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  suffix?: string
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-[var(--color-text)]">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-20 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-end font-mono text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-text)]"
          aria-label={label}
        />
        {suffix && (
          <span className="text-sm text-[var(--color-text-muted)]">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Main component
// ============================================================================

function SettingsPage() {
  const router = useRouter()

  // All state is mock / non-persisted for now
  const [notifications, setNotifications] = useState({
    bouncedCheque: true,
    overdueInvoice: true,
    deliveryFailure: true,
    marginAlert: true,
    poRejection: true,
  })
  const [overdueDaysThreshold, setOverdueDaysThreshold] = useState(60)
  const [language, setLanguage] = useState<'en' | 'ar'>('en')
  const [calendar, setCalendar] = useState<'gregorian' | 'hijri'>('gregorian')
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [biometricLock, setBiometricLock] = useState(true)
  const [marginFloor, setMarginFloor] = useState(5)
  const [deliveryFailureAmount, setDeliveryFailureAmount] = useState(1000000)
  const [boardReportFreq, setBoardReportFreq] = useState<'weekly' | 'monthly'>(
    'weekly',
  )
  const [boardReportDelivery, setBoardReportDelivery] = useState<
    'email' | 'whatsapp'
  >('email')
  const [mfa, setMfa] = useState(false)

  function handleClose() {
    router.history.back()
  }

  return (
    <GlassElevated isOpen onClose={handleClose} className="w-full max-w-lg mx-4 max-h-[90dvh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="p-6"
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">
            Settings
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md p-1 text-[var(--color-text-muted)] outline-none transition-colors hover:text-[var(--color-text)] focus-visible:bg-[var(--color-surface)]"
            aria-label="Close settings"
          >
            <X size={20} />
          </button>
        </div>

        {/* Sections */}
        <div className="divide-y divide-[var(--color-border)]">
          {/* Notifications */}
          <SettingsSection title="Notifications" defaultOpen>
            <div className="flex flex-col">
              <ToggleSwitch
                label="Bounced cheque alerts"
                checked={notifications.bouncedCheque}
                onChange={(v) =>
                  setNotifications((n) => ({ ...n, bouncedCheque: v }))
                }
              />
              <ToggleSwitch
                label="Overdue invoice alerts"
                checked={notifications.overdueInvoice}
                onChange={(v) =>
                  setNotifications((n) => ({ ...n, overdueInvoice: v }))
                }
              />
              <ToggleSwitch
                label="Delivery failure alerts"
                checked={notifications.deliveryFailure}
                onChange={(v) =>
                  setNotifications((n) => ({ ...n, deliveryFailure: v }))
                }
              />
              <ToggleSwitch
                label="Margin alerts"
                checked={notifications.marginAlert}
                onChange={(v) =>
                  setNotifications((n) => ({ ...n, marginAlert: v }))
                }
              />
              <ToggleSwitch
                label="PO rejection alerts"
                checked={notifications.poRejection}
                onChange={(v) =>
                  setNotifications((n) => ({ ...n, poRejection: v }))
                }
              />
              <ThresholdField
                label="Alert when AR overdue >"
                value={overdueDaysThreshold}
                onChange={setOverdueDaysThreshold}
                suffix="days"
              />
            </div>
          </SettingsSection>

          {/* Language */}
          <SettingsSection title="Language">
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1" role="radiogroup" aria-label="Language">
                <RadioOption
                  label="English"
                  selected={language === 'en'}
                  onSelect={() => setLanguage('en')}
                />
                <RadioOption
                  label="العربية"
                  selected={language === 'ar'}
                  onSelect={() => setLanguage('ar')}
                />
              </div>
              <div className="mt-3 flex flex-col gap-1" role="radiogroup" aria-label="Calendar">
                <RadioOption
                  label="Gregorian"
                  selected={calendar === 'gregorian'}
                  onSelect={() => setCalendar('gregorian')}
                />
                <RadioOption
                  label="Hijri"
                  selected={calendar === 'hijri'}
                  onSelect={() => setCalendar('hijri')}
                />
              </div>
            </div>
          </SettingsSection>

          {/* Appearance */}
          <SettingsSection title="Appearance">
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1" role="radiogroup" aria-label="Theme">
                <RadioOption
                  label="Light"
                  selected={theme === 'light'}
                  onSelect={() => setTheme('light')}
                />
                <RadioOption
                  label="Dark"
                  selected={theme === 'dark'}
                  onSelect={() => setTheme('dark')}
                />
                <RadioOption
                  label="System"
                  selected={theme === 'system'}
                  onSelect={() => setTheme('system')}
                />
              </div>
              <ToggleSwitch
                label="Biometric lock"
                checked={biometricLock}
                onChange={setBiometricLock}
              />
            </div>
          </SettingsSection>

          {/* Alert Thresholds */}
          <SettingsSection title="Alert Thresholds">
            <div className="flex flex-col">
              <ThresholdField
                label="Margin floor"
                value={marginFloor}
                onChange={setMarginFloor}
                suffix="%"
              />
              <ThresholdField
                label="Delivery failure amount"
                value={deliveryFailureAmount}
                onChange={setDeliveryFailureAmount}
                suffix="EGP"
              />
            </div>
          </SettingsSection>

          {/* Board Reports */}
          <SettingsSection title="Board Reports">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1" role="radiogroup" aria-label="Frequency">
                <span className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                  Frequency
                </span>
                <RadioOption
                  label="Weekly"
                  selected={boardReportFreq === 'weekly'}
                  onSelect={() => setBoardReportFreq('weekly')}
                />
                <RadioOption
                  label="Monthly"
                  selected={boardReportFreq === 'monthly'}
                  onSelect={() => setBoardReportFreq('monthly')}
                />
              </div>
              <div className="flex flex-col gap-1" role="radiogroup" aria-label="Delivery method">
                <span className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                  Delivery Method
                </span>
                <RadioOption
                  label="Email"
                  selected={boardReportDelivery === 'email'}
                  onSelect={() => setBoardReportDelivery('email')}
                />
                <RadioOption
                  label="WhatsApp"
                  selected={boardReportDelivery === 'whatsapp'}
                  onSelect={() => setBoardReportDelivery('whatsapp')}
                />
              </div>
            </div>
          </SettingsSection>

          {/* Account */}
          <SettingsSection title="Account">
            <div className="flex flex-col gap-3">
              <ToggleSwitch
                label="Multi-factor authentication"
                checked={mfa}
                onChange={setMfa}
              />
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                  Active Sessions
                </span>
                <p className="text-sm text-[var(--color-text-muted)]">
                  1 active session (this device)
                </p>
              </div>
              {/* PWA install button -- per CONTEXT.md: "PWA install prompt in settings only" */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                  Install App
                </span>
                <button
                  type="button"
                  className="w-fit rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] outline-none transition-colors hover:bg-[var(--color-surface)] focus-visible:bg-[var(--color-surface)]"
                  onClick={() => {
                    // PWA install prompt -- will be wired to beforeinstallprompt event
                  }}
                >
                  Install PWA
                </button>
                <p className="text-xs text-[var(--color-text-subtle)]">
                  Install the CEO app for offline access and notifications.
                </p>
              </div>
            </div>
          </SettingsSection>
        </div>
      </motion.div>
    </GlassElevated>
  )
}
