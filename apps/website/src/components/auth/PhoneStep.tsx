import { useState } from 'react'
import { TextField, Input, Label, FieldError } from 'react-aria-components'
import { Button } from 'react-aria-components'
import { MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLoginModal } from '../../hooks/useLoginModal'
import { sendOTP } from '../../lib/auth'

export function PhoneStep() {
  const { t } = useTranslation('website')
  const { phone, setPhone, setStep } = useLoginModal()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sendingMethod, setSendingMethod] = useState<'whatsapp' | 'sms' | null>(
    null,
  )

  const phoneRegex = /^(10|11|12|15)\d{8}$/

  function validatePhone(value: string): boolean {
    if (!value) {
      setError(t('login.phoneRequired', 'Phone number is required'))
      return false
    }
    if (!phoneRegex.test(value)) {
      setError(
        t(
          'login.phoneInvalid',
          'Enter a valid Egyptian mobile number (10 digits)',
        ),
      )
      return false
    }
    setError(null)
    return true
  }

  async function handleSend(method: 'whatsapp' | 'sms') {
    if (!validatePhone(phone)) return

    setLoading(true)
    setSendingMethod(method)
    setError(null)

    try {
      const result = await sendOTP({ data: { phone, method } })

      if (!result.success) {
        if (result.error === 'rate_limited') {
          setError(t('login.rateLimit'))
        } else {
          setError(
            t('login.sendFailed', 'Failed to send code. Please try again.'),
          )
        }
        return
      }

      setStep('otp')
    } catch {
      setError(
        t('login.sendFailed', 'Failed to send code. Please try again.'),
      )
    } finally {
      setLoading(false)
      setSendingMethod(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Heading */}
      <h2 className="text-[30px] font-bold leading-[1.2]">
        {t('login.step1.heading')}
      </h2>

      {/* Phone input with +20 prefix */}
      <TextField
        isInvalid={!!error}
        value={phone}
        onChange={(value) => {
          // Strip non-digits
          const digits = value.replace(/\D/g, '').slice(0, 10)
          setPhone(digits)
          if (error) setError(null)
        }}
      >
        <Label className="text-sm text-[var(--color-text-muted)] mb-1.5 block">
          {t('login.phoneLabel', 'Phone Number')}
        </Label>
        <div className="flex items-center gap-2">
          <span className="flex h-11 items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-muted)]">
            <span aria-hidden="true">🇪🇬</span>
            <span className="font-[family-name:var(--font-geist-mono)]">
              +20
            </span>
          </span>
          <Input
            type="tel"
            inputMode="numeric"
            placeholder="10xxxxxxxx"
            className="h-11 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 font-[family-name:var(--font-geist-mono)] text-base outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
        </div>
        {error && (
          <FieldError className="mt-1.5 text-sm text-[var(--color-error)]">
            {error}
          </FieldError>
        )}
      </TextField>

      {/* Continue with WhatsApp */}
      <Button
        onPress={() => handleSend('whatsapp')}
        isDisabled={loading}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] font-semibold text-white transition-opacity hover:opacity-90 pressed:opacity-80 disabled:opacity-50"
      >
        {loading && sendingMethod === 'whatsapp' ? (
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <>
            <MessageCircle size={20} />
            {t('login.whatsappCTA')}
          </>
        )}
      </Button>

      {/* SMS fallback */}
      <button
        type="button"
        onClick={() => handleSend('sms')}
        disabled={loading}
        className="text-sm text-[var(--color-primary)] transition-opacity hover:underline disabled:opacity-50"
      >
        {loading && sendingMethod === 'sms' ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)]" />
        ) : (
          t('login.smsFallback')
        )}
      </button>
    </div>
  )
}
