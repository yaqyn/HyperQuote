import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/auth'
import { getPinHash } from '../../lib/pin'
import { DriverButton } from '../shared/DriverButton'

const OTP_LENGTH = 6
const WHATSAPP_RESEND_SEC = 30
const SMS_RESEND_SEC = 60

export function OTPInput() {
  const { t } = useTranslation()
  const setAuthStep = useAuthStore((s) => s.setAuthStep)
  const setSession = useAuthStore((s) => s.setSession)
  const setHasPin = useAuthStore((s) => s.setHasPin)

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [error, setError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const phone = sessionStorage.getItem('hq-auth-phone') ?? ''

  // Timer for resend options
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const verifyOTP = useCallback(
    async (code: string) => {
      setError(null)
      setIsVerifying(true)

      try {
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          phone: `+20${phone}`,
          token: code,
          type: 'sms',
        })

        if (verifyError) {
          setError(t('login.wrongCode'))
          setDigits(Array(OTP_LENGTH).fill(''))
          inputRefs.current[0]?.focus()
          return
        }

        if (data.session) {
          setSession(data.session)

          // Check if user already has a PIN
          const existingPin = await getPinHash()
          if (existingPin) {
            setHasPin(true)
            setAuthStep('authenticated')
          } else {
            setAuthStep('pin-setup')
          }
        }
      } catch {
        setError(t('login.networkError'))
      } finally {
        setIsVerifying(false)
      }
    },
    [phone, setAuthStep, setSession, setHasPin, t],
  )

  function handleDigitChange(index: number, value: string) {
    // Only allow single digit
    const digit = value.replace(/\D/g, '').slice(-1)
    const newDigits = [...digits]
    newDigits[index] = digit
    setDigits(newDigits)
    setError(null)

    if (digit && index < OTP_LENGTH - 1) {
      // Auto-advance to next box
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all filled
    if (digit && index === OTP_LENGTH - 1) {
      const code = newDigits.join('')
      if (code.length === OTP_LENGTH) {
        verifyOTP(code)
      }
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      // Move to previous box on backspace when current is empty
      const newDigits = [...digits]
      newDigits[index - 1] = ''
      setDigits(newDigits)
      inputRefs.current[index - 1]?.focus()
    }
  }

  async function handleResend(channel: 'whatsapp' | 'sms') {
    setError(null)
    setElapsed(0)
    try {
      await supabase.auth.signInWithOtp({
        phone: `+20${phone}`,
        options: { channel },
      })
    } catch {
      setError(t('login.networkError'))
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <p className="text-sm text-[var(--text-secondary)]">
        {t('login.otp')}
      </p>

      {/* OTP boxes */}
      <div className="flex gap-2" dir="ltr">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el }}
            type="tel"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleDigitChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            disabled={isVerifying}
            className="h-12 w-12 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-center text-xl font-[var(--font-mono)] text-[var(--text-primary)] outline-none focus:border-[var(--color-blue)] focus:ring-2 focus:ring-[var(--color-blue)]/20 disabled:opacity-50"
            data-numeric
            aria-label={`Digit ${i + 1}`}
          />
        ))}
      </div>

      {error && (
        <p className="text-sm text-[var(--color-danger)]" role="alert">
          {error}
        </p>
      )}

      {isVerifying && (
        <div
          className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-blue)] border-t-transparent"
          role="status"
          aria-label="Verifying"
        />
      )}

      {/* Resend options with timer cascade */}
      <div className="flex flex-col gap-2 w-full">
        {elapsed >= WHATSAPP_RESEND_SEC && (
          <DriverButton
            variant="secondary"
            onPress={() => handleResend('whatsapp')}
          >
            {t('login.resendWhatsApp')}
          </DriverButton>
        )}
        {elapsed >= SMS_RESEND_SEC && (
          <DriverButton
            variant="secondary"
            onPress={() => handleResend('sms')}
          >
            {t('login.resendSMS')}
          </DriverButton>
        )}
      </div>

      <DriverButton
        variant="secondary"
        onPress={() => useAuthStore.getState().setAuthStep('phone')}
      >
        {t('common.back')}
      </DriverButton>
    </div>
  )
}
