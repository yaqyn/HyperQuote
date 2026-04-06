import { useState } from 'react'
import { TextField, Input, Label } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/auth'
import { DriverButton } from '../shared/DriverButton'

export function PhoneInput() {
  const { t } = useTranslation()
  const setAuthStep = useAuthStore((s) => s.setAuthStep)
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isOffline, setIsOffline] = useState(false)

  function formatPhone(value: string): string {
    // Strip leading 0 if user types 01xxxxxxxxx
    let cleaned = value.replace(/\D/g, '')
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.slice(1)
    }
    return cleaned.slice(0, 10)
  }

  function isValidPhone(value: string): boolean {
    // Egyptian mobile: 10 or 11 digits starting with 1
    return /^1[0-9]{8,9}$/.test(value)
  }

  async function handleSendOTP() {
    if (!isValidPhone(phone)) {
      setError(t('login.invalidPhone'))
      return
    }

    setError(null)
    setIsLoading(true)
    setIsOffline(false)

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: `+20${phone}`,
      })

      if (otpError) {
        setError(otpError.message)
        return
      }

      // Store phone for OTP verification step
      sessionStorage.setItem('hq-auth-phone', phone)
      setAuthStep('otp')
    } catch {
      if (!navigator.onLine) {
        setIsOffline(true)
      } else {
        setError(t('login.networkError'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {isOffline && (
        <div className="rounded-xl bg-[var(--color-warning)]/10 p-4 text-center text-sm text-[var(--color-warning)]">
          {t('common.noConnection')}
        </div>
      )}

      <TextField
        aria-label={t('login.phone')}
        isInvalid={!!error}
        value={phone}
        onChange={(v) => {
          setPhone(formatPhone(v))
          setError(null)
        }}
      >
        <Label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
          {t('login.phone')}
        </Label>
        <div className="flex items-stretch gap-2">
          <div
            className="flex items-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 font-[var(--font-mono)]"
            data-numeric
          >
            +20
          </div>
          <Input
            className="min-h-[var(--touch-min)] flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 text-lg font-[var(--font-mono)] text-[var(--text-primary)] outline-none focus:border-[var(--color-blue)] focus:ring-2 focus:ring-[var(--color-blue)]/20"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="1XXXXXXXXX"
            data-numeric
          />
        </div>
      </TextField>

      {error && (
        <p className="text-sm text-[var(--color-danger)]" role="alert">
          {error}
        </p>
      )}

      <DriverButton
        variant="primary"
        isLoading={isLoading}
        onPress={handleSendOTP}
      >
        {t('login.sendCode')}
      </DriverButton>

      {isOffline && (
        <DriverButton
          variant="secondary"
          onPress={() => {
            setIsOffline(false)
            handleSendOTP()
          }}
        >
          {t('common.retry')}
        </DriverButton>
      )}
    </div>
  )
}
