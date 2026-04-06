import { useState, useCallback } from 'react'
import { Button as AriaButton } from 'react-aria-components'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { useTranslation } from 'react-i18next'
import { hashPin, verifyPin, storePinHash, getPinHash } from '../../lib/pin'
import { useAuthStore } from '../../stores/auth'
import { isBiometricAvailable } from '../../lib/biometric'

const PIN_LENGTH = 6
const MAX_ATTEMPTS = 3

interface PINPadProps {
  mode: 'setup' | 'verify'
}

export function PINPad({ mode }: PINPadProps) {
  const { t } = useTranslation()
  const { setAuthStep, setHasPin } = useAuthStore()

  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)

  const currentPin = isConfirming ? confirmPin : pin
  const title = mode === 'setup'
    ? isConfirming
      ? t('login.confirmPin')
      : t('login.setupPin')
    : t('login.enterPin')

  const handleComplete = useCallback(
    async (enteredPin: string) => {
      if (mode === 'setup') {
        if (!isConfirming) {
          // First entry -- move to confirm
          setIsConfirming(true)
          setConfirmPin('')
          return
        }

        // Confirm entry
        if (enteredPin !== pin) {
          setError(t('login.pinMismatch'))
          setPin('')
          setConfirmPin('')
          setIsConfirming(false)
          return
        }

        // PINs match -- hash and store
        const hash = await hashPin(enteredPin)
        await storePinHash(hash)
        setHasPin(true)

        // Check if biometric is available for enrollment prompt
        const bio = await isBiometricAvailable()
        if (bio.isAvailable) {
          setAuthStep('biometric-prompt')
        } else {
          setAuthStep('authenticated')
        }
      } else {
        // Verify mode
        const storedHash = await getPinHash()
        if (!storedHash) {
          setAuthStep('phone')
          return
        }

        const isValid = await verifyPin(enteredPin, storedHash)
        if (isValid) {
          setAuthStep('authenticated')
        } else {
          const newAttempts = attempts + 1
          setAttempts(newAttempts)

          if (newAttempts >= MAX_ATTEMPTS) {
            // Fallback to OTP after 3 failed attempts
            setAuthStep('phone')
          } else {
            setError(
              t('login.pinWrong', { remaining: MAX_ATTEMPTS - newAttempts }),
            )
            setPin('')
            setConfirmPin('')
          }
        }
      }
    },
    [mode, isConfirming, pin, attempts, setAuthStep, setHasPin, t],
  )

  async function handleDigit(digit: string) {
    try {
      await Haptics.impact({ style: ImpactStyle.Light })
    } catch {
      // Web fallback
    }

    setError(null)
    const current = isConfirming ? confirmPin : pin
    if (current.length >= PIN_LENGTH) return

    const next = current + digit
    if (isConfirming) {
      setConfirmPin(next)
    } else {
      setPin(next)
    }

    if (next.length === PIN_LENGTH) {
      handleComplete(next)
    }
  }

  function handleBackspace() {
    setError(null)
    if (isConfirming) {
      setConfirmPin((prev) => prev.slice(0, -1))
    } else {
      setPin((prev) => prev.slice(0, -1))
    }
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back']

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <p className="text-lg font-medium text-[var(--text-primary)]">
        {title}
      </p>

      {/* PIN dots */}
      <div className="flex gap-3" dir="ltr">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={`h-4 w-4 rounded-full transition-colors duration-150 ${
              i < currentPin.length
                ? 'bg-[var(--color-blue)]'
                : 'border-2 border-[var(--border-color)] bg-transparent'
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-sm text-[var(--color-danger)]" role="alert">
          {error}
        </p>
      )}

      {/* Numeric keypad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
        {keys.map((key, i) => {
          if (key === '') {
            return <div key={i} />
          }

          if (key === 'back') {
            return (
              <AriaButton
                key={i}
                onPress={handleBackspace}
                aria-label="Backspace"
                className="flex min-h-[var(--touch-min)] items-center justify-center rounded-xl text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue)] pressed:bg-[var(--bg-secondary)]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                  <line x1="18" y1="9" x2="12" y2="15" />
                  <line x1="12" y1="9" x2="18" y2="15" />
                </svg>
              </AriaButton>
            )
          }

          return (
            <AriaButton
              key={i}
              onPress={() => handleDigit(key)}
              className="flex min-h-[var(--touch-min)] items-center justify-center rounded-xl bg-[var(--bg-secondary)] text-2xl font-[var(--font-mono)] text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue)] pressed:bg-[var(--border-color)]"
              data-numeric
            >
              {key}
            </AriaButton>
          )
        })}
      </div>

      {/* Back to phone for verify mode */}
      {mode === 'verify' && (
        <AriaButton
          onPress={() => setAuthStep('phone')}
          className="text-sm text-[var(--color-blue)] outline-none focus-visible:underline"
        >
          {t('login.sendCode')}
        </AriaButton>
      )}
    </div>
  )
}
