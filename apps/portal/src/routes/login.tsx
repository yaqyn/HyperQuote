import { useState, useRef, useEffect, useCallback } from 'react'
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { useWatch } from 'react-hook-form'
import { z } from 'zod'
import { standardSchemaResolver } from '@hyperquote/forms'
import {
  TextField,
  Input,
  Label,
  FieldError,
  Button,
} from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import {
  sendOTP,
  verifyOTP,
  createAccount,
  claimAccount,
  checkSession,
} from '../lib/auth'

// ============================================================================
// Route
// ============================================================================

export const Route = createFileRoute('/login')({
  validateSearch: z.object({
    redirect: z.string().optional(),
  }),
  beforeLoad: async () => {
    const result = await checkSession()
    if (result.authenticated) {
      throw new Response(null, {
        status: 302,
        headers: { Location: '/' },
      })
    }
  },
  component: LoginPage,
})

// ============================================================================
// Types
// ============================================================================

type AuthStep = 'phone' | 'otp' | 'create' | 'claiming'

// ============================================================================
// Login Page
// ============================================================================

function LoginPage() {
  const { t } = useTranslation('portal')
  const navigate = useNavigate()
  const search = useSearch({ from: '/login' })
  const [step, setStep] = useState<AuthStep>('phone')
  const [phone, setPhone] = useState('')
  const [claimableCompany, setClaimableCompany] = useState<string | null>(null)

  function handleAuthComplete(redirectPath?: string) {
    const target = search.redirect ?? redirectPath ?? '/'
    navigate({ to: target })
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--color-base)] p-4">
      {/* Glass card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="w-full max-w-[420px] rounded-2xl border border-[var(--color-border)] bg-white/80 p-8 shadow-xl backdrop-blur-xl dark:bg-black/80"
      >
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            HyperQuote
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {t('login.subtitle', 'Supplier Portal')}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'phone' && (
            <StepWrapper key="phone">
              <PhoneStep
                phone={phone}
                setPhone={setPhone}
                onNext={() => setStep('otp')}
              />
            </StepWrapper>
          )}
          {step === 'otp' && (
            <StepWrapper key="otp">
              <OTPStep
                phone={phone}
                onVerified={(result) => {
                  if (result.claimableCompany) {
                    setClaimableCompany(result.claimableCompany)
                    setStep('claiming')
                  } else if (result.needsAccount) {
                    setStep('create')
                  } else {
                    handleAuthComplete()
                  }
                }}
                onBack={() => setStep('phone')}
              />
            </StepWrapper>
          )}
          {step === 'create' && (
            <StepWrapper key="create">
              <AccountCreationStep
                phone={phone}
                onComplete={() => handleAuthComplete()}
              />
            </StepWrapper>
          )}
          {step === 'claiming' && (
            <StepWrapper key="claiming">
              <AccountClaimingStep
                phone={phone}
                claimableCompany={claimableCompany}
                onComplete={() => handleAuthComplete()}
                onCreateNew={() => setStep('create')}
              />
            </StepWrapper>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

// ============================================================================
// Step Wrapper (animation)
// ============================================================================

function StepWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{
        enter: { type: 'spring', stiffness: 200, damping: 20 },
        exit: { duration: 0.2, ease: 'easeIn' },
      }}
    >
      {children}
    </motion.div>
  )
}

// ============================================================================
// Phone Step
// ============================================================================

function PhoneStep({
  phone,
  setPhone,
  onNext,
}: {
  phone: string
  setPhone: (v: string) => void
  onNext: () => void
}) {
  const { t } = useTranslation('portal')
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
          setError(
            t('login.rateLimit', 'Too many attempts. Please wait and try again.'),
          )
        } else {
          setError(
            t('login.sendFailed', 'Failed to send code. Please try again.'),
          )
        }
        return
      }

      onNext()
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
      <h2 className="text-[24px] font-bold leading-[1.2]">
        {t('login.step1.heading', 'Sign in to your account')}
      </h2>

      <TextField
        isInvalid={!!error}
        value={phone}
        onChange={(value) => {
          const digits = value.replace(/\D/g, '').slice(0, 10)
          setPhone(digits)
          if (error) setError(null)
        }}
      >
        <Label className="mb-1.5 block text-sm text-[var(--color-text-muted)]">
          {t('login.phoneLabel', 'Phone Number')}
        </Label>
        <div className="flex items-center gap-2">
          <span className="flex h-11 items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-muted)]">
            <span aria-hidden="true">&#x1F1EA;&#x1F1EC;</span>
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
          t('login.whatsappCTA', 'Continue with WhatsApp')
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
          t('login.smsFallback', 'Send code via SMS instead')
        )}
      </button>
    </div>
  )
}

// ============================================================================
// OTP Step
// ============================================================================

const OTP_LENGTH = 6
const RESEND_COOLDOWN = 30

interface VerifyResult {
  needsAccount: boolean
  claimableCompany: string | null
}

function OTPStep({
  phone,
  onVerified,
  onBack,
}: {
  phone: string
  onVerified: (result: VerifyResult) => void
  onBack: () => void
}) {
  const { t } = useTranslation('portal')
  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [shaking, setShaking] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(RESEND_COOLDOWN)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (resendCountdown <= 0) return
    const timer = setInterval(() => {
      setResendCountdown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCountdown])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const submitCode = useCallback(
    async (digits: string[]) => {
      const fullCode = digits.join('')
      if (fullCode.length !== OTP_LENGTH) return

      setLoading(true)
      setError(null)

      try {
        const result = await verifyOTP({ data: { phone, code: fullCode } })

        if (!result.success) {
          if (result.error === 'rate_limited') {
            setError(
              t(
                'login.rateLimit',
                'Too many attempts. Please wait and try again.',
              ),
            )
          } else {
            setError(t('login.wrongCode', 'Wrong code. Please try again.'))
          }
          setShaking(true)
          setTimeout(() => {
            setShaking(false)
            setCode(Array(OTP_LENGTH).fill(''))
            inputRefs.current[0]?.focus()
          }, 300)
          return
        }

        onVerified({
          needsAccount: result.needsAccount ?? false,
          claimableCompany: result.claimableCompany ?? null,
        })
      } catch {
        setError(t('login.wrongCode', 'Wrong code. Please try again.'))
        setShaking(true)
        setTimeout(() => {
          setShaking(false)
          setCode(Array(OTP_LENGTH).fill(''))
          inputRefs.current[0]?.focus()
        }, 300)
      } finally {
        setLoading(false)
      }
    },
    [phone, t, onVerified],
  )

  function handleInput(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const newCode = [...code]
    newCode[index] = digit
    setCode(newCode)

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    if (digit && newCode.every((d) => d !== '')) {
      submitCode(newCode)
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '')
    if (pasted.length === 0) return

    const chars = pasted.slice(0, OTP_LENGTH).split('')
    const newCode = [...code]
    for (let i = 0; i < chars.length; i++) {
      newCode[i] = chars[i]
    }
    setCode(newCode)

    const nextEmpty = newCode.findIndex((d) => !d)
    if (nextEmpty >= 0) {
      inputRefs.current[nextEmpty]?.focus()
    } else {
      inputRefs.current[OTP_LENGTH - 1]?.focus()
      submitCode(newCode)
    }
  }

  async function handleResend() {
    setError(null)
    setResendCountdown(RESEND_COOLDOWN)
    try {
      await sendOTP({ data: { phone, method: 'whatsapp' } })
    } catch {
      setError(
        t('login.sendFailed', 'Failed to resend code. Please try again.'),
      )
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-[24px] font-bold leading-[1.2]">
          {t('login.step2.heading', 'Enter verification code')}
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          {t('login.codeSent', 'Code sent to')}
          <span className="ms-1 font-[family-name:var(--font-geist-mono)]">
            +20{phone}
          </span>
        </p>
      </div>

      {/* OTP Input Boxes -- ALWAYS LTR */}
      <motion.div
        dir="ltr"
        className="flex justify-center gap-2"
        animate={shaking ? { x: [0, -4, 4, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.15 }}
        onPaste={handlePaste}
      >
        {Array.from({ length: OTP_LENGTH }).map((_, i) => (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el
            }}
            type="tel"
            inputMode="numeric"
            maxLength={1}
            value={code[i]}
            onChange={(e) => handleInput(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            disabled={loading}
            aria-label={`Digit ${i + 1}`}
            className="h-12 w-12 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-center font-[family-name:var(--font-geist-mono)] text-base outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-50"
          />
        ))}
      </motion.div>

      {error && (
        <p className="text-center text-sm text-[var(--color-error)]">{error}</p>
      )}

      {loading && (
        <div className="flex justify-center">
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)]" />
        </div>
      )}

      <div className="text-center text-sm">
        {resendCountdown > 0 ? (
          <span className="text-[var(--color-text-muted)]">
            {t('login.resendIn', 'Resend in')}{' '}
            <span className="font-[family-name:var(--font-geist-mono)]">
              {resendCountdown}s
            </span>
          </span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            className="text-[var(--color-primary)] hover:underline"
          >
            {t('login.resend', 'Resend code')}
          </button>
        )}
      </div>

      {/* Back to phone step */}
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-[var(--color-text-muted)] hover:underline"
      >
        {t('login.changePhone', 'Change phone number')}
      </button>
    </div>
  )
}

// ============================================================================
// Account Creation Step
// ============================================================================

const accountSchema = z.object({
  companyName: z.string().min(1).max(200),
  fullName: z.string().min(1).max(100),
})

type AccountFormData = z.infer<typeof accountSchema>

function AccountCreationStep({
  phone,
  onComplete,
}: {
  phone: string
  onComplete: () => void
}) {
  const { t } = useTranslation('portal')
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<AccountFormData>({
    resolver: standardSchemaResolver(accountSchema),
    defaultValues: { companyName: '', fullName: '' },
  })

  // Use useWatch (NEVER watch()) per CLAUDE.md
  const _companyName = useWatch({ control, name: 'companyName' })
  const _fullName = useWatch({ control, name: 'fullName' })

  async function onSubmit(data: AccountFormData) {
    setLoading(true)
    setServerError(null)

    try {
      const result = await createAccount({
        data: {
          phone,
          companyName: data.companyName,
          fullName: data.fullName,
        },
      })

      if (!result.success) {
        setServerError(
          t(
            'login.createFailed',
            'Failed to create account. Please try again.',
          ),
        )
        return
      }

      onComplete()
    } catch {
      setServerError(
        t(
          'login.createFailed',
          'Failed to create account. Please try again.',
        ),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-[24px] font-bold leading-[1.2]">
        {t('login.step3.heading', 'Create your account')}
      </h2>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <TextField isInvalid={!!errors.companyName}>
          <Label className="mb-1.5 block text-sm text-[var(--color-text-muted)]">
            {t('login.companyName', 'Company Name')}
          </Label>
          <Input
            {...register('companyName')}
            className="h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
          {errors.companyName && (
            <FieldError className="mt-1 text-sm text-[var(--color-error)]">
              {errors.companyName.message}
            </FieldError>
          )}
        </TextField>

        <TextField isInvalid={!!errors.fullName}>
          <Label className="mb-1.5 block text-sm text-[var(--color-text-muted)]">
            {t('login.fullName', 'Full Name')}
          </Label>
          <Input
            {...register('fullName')}
            className="h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
          {errors.fullName && (
            <FieldError className="mt-1 text-sm text-[var(--color-error)]">
              {errors.fullName.message}
            </FieldError>
          )}
        </TextField>

        {serverError && (
          <p className="text-sm text-[var(--color-error)]">{serverError}</p>
        )}

        <Button
          type="submit"
          isDisabled={loading}
          className="flex h-12 w-full items-center justify-center rounded-lg bg-[var(--color-primary)] font-semibold text-white transition-opacity hover:opacity-90 pressed:opacity-80 disabled:opacity-50"
        >
          {loading ? (
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            t('login.createButton', 'Create Account')
          )}
        </Button>

        <p className="text-center text-xs text-[var(--color-text-muted)]">
          {t('login.legalPrefix', 'By creating an account, you agree to our')}{' '}
          <a
            href="/legal/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-primary)] hover:underline"
          >
            {t('login.termsLink', 'Terms of Use')}
          </a>{' '}
          {t('login.and', 'and')}{' '}
          <a
            href="/legal/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-primary)] hover:underline"
          >
            {t('login.privacyLink', 'Privacy Policy')}
          </a>
          .
        </p>
      </form>
    </div>
  )
}

// ============================================================================
// Account Claiming Step
// ============================================================================

function maskCompanyName(name: string): string {
  return name
    .split(' ')
    .map((word) => {
      if (word.length <= 1) return word
      return word[0] + '*'.repeat(word.length - 1)
    })
    .join(' ')
}

function AccountClaimingStep({
  phone,
  claimableCompany,
  onComplete,
  onCreateNew,
}: {
  phone: string
  claimableCompany: string | null
  onComplete: () => void
  onCreateNew: () => void
}) {
  const { t } = useTranslation('portal')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const maskedCompany = claimableCompany
    ? maskCompanyName(claimableCompany)
    : '****'

  async function handleClaim() {
    setLoading(true)
    setError(null)

    try {
      const result = await claimAccount({ data: { phone } })

      if (!result.success) {
        setError(
          t('login.claimFailed', 'Failed to claim account. Please try again.'),
        )
        return
      }

      onComplete()
    } catch {
      setError(
        t('login.claimFailed', 'Failed to claim account. Please try again.'),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-[24px] font-bold leading-[1.2]">
        {t('login.claiming.heading', 'We found your account')}
      </h2>

      <div className="rounded-lg bg-[var(--color-surface)] p-4 text-center">
        <p className="font-[family-name:var(--font-geist-mono)] text-lg">
          {maskedCompany}
        </p>
      </div>

      {error && (
        <p className="text-center text-sm text-[var(--color-error)]">{error}</p>
      )}

      <Button
        onPress={handleClaim}
        isDisabled={loading}
        className="flex h-12 w-full items-center justify-center rounded-lg bg-[var(--color-primary)] font-semibold text-white transition-opacity hover:opacity-90 pressed:opacity-80 disabled:opacity-50"
      >
        {loading ? (
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          t('login.claiming.confirm', "Yes, that's me")
        )}
      </Button>

      <Button
        onPress={onCreateNew}
        isDisabled={loading}
        className="flex h-12 w-full items-center justify-center rounded-lg border border-[var(--color-border)] font-semibold text-[var(--color-text)] transition-opacity hover:bg-[var(--color-surface)] pressed:opacity-80 disabled:opacity-50"
      >
        {t('login.claiming.deny', 'No, create a new account')}
      </Button>
    </div>
  )
}
