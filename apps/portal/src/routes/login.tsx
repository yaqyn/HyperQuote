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
//
// "Data is the design" — the interface elements ARE the aesthetic.
// No cards, no containers, no elevation. Content emerges from the surface.
// Blue (#2563EB) as the sole accent. Text in soft charcoal, not hard black.
// Every pixel is intentional.
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
    <div className="flex min-h-dvh bg-[var(--color-base)]">
      <div className="flex w-full flex-col px-6 py-10 sm:px-12 md:mx-auto md:max-w-[480px] md:px-0 lg:mx-0 lg:ms-[16vw]">
        {/* Wordmark — part of the surface, not a header */}
        <div className="mb-auto">
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--color-text-subtle)]">
            HyperQuote
          </span>
        </div>

        {/* Form — vertically centered in remaining space */}
        <div className="my-auto">
          <AnimatePresence mode="wait">
            {step === 'phone' && (
              <StepMotion key="phone">
                <PhoneStep
                  phone={phone}
                  setPhone={setPhone}
                  onNext={() => setStep('otp')}
                />
              </StepMotion>
            )}
            {step === 'otp' && (
              <StepMotion key="otp">
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
              </StepMotion>
            )}
            {step === 'create' && (
              <StepMotion key="create">
                <AccountCreationStep
                  phone={phone}
                  onComplete={() => handleAuthComplete()}
                />
              </StepMotion>
            )}
            {step === 'claiming' && (
              <StepMotion key="claiming">
                <AccountClaimingStep
                  phone={phone}
                  claimableCompany={claimableCompany}
                  onComplete={() => handleAuthComplete()}
                  onCreateNew={() => setStep('create')}
                />
              </StepMotion>
            )}
          </AnimatePresence>
        </div>

        {/* Legal — whisper-quiet at the bottom */}
        <div className="mt-auto pt-8">
          <p className="text-[10px] leading-relaxed text-[var(--color-text-subtle)]">
            {t('login.legalPrefix', 'By continuing you agree to our')}{' '}
            <a href="/legal/terms" className="underline decoration-[var(--color-text-subtle)]/40 underline-offset-2 transition-colors hover:text-[var(--color-text-muted)]">
              {t('login.termsLink', 'Terms')}
            </a>
            {' '}{t('login.and', '&')}{' '}
            <a href="/legal/privacy" className="underline decoration-[var(--color-text-subtle)]/40 underline-offset-2 transition-colors hover:text-[var(--color-text-muted)]">
              {t('login.privacyLink', 'Privacy')}
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Step transition — gentle, no overshoot
// ============================================================================

function StepMotion({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 20,
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
  const [sendingMethod, setSendingMethod] = useState<'whatsapp' | 'sms' | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Delay focus slightly so the spring animation settles
    const id = setTimeout(() => inputRef.current?.focus(), 100)
    return () => clearTimeout(id)
  }, [])

  const phoneRegex = /^(10|11|12|15)\d{8}$/

  function validatePhone(value: string): boolean {
    if (!value) {
      setError(t('login.phoneRequired', 'Phone number is required'))
      return false
    }
    if (!phoneRegex.test(value)) {
      setError(t('login.phoneInvalid', 'Enter a valid Egyptian mobile number'))
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
        setError(
          result.error === 'rate_limited'
            ? t('login.rateLimit', 'Too many attempts. Wait a moment.')
            : t('login.sendFailed', 'Could not send code. Try again.'),
        )
        return
      }
      onNext()
    } catch {
      setError(t('login.sendFailed', 'Could not send code. Try again.'))
    } finally {
      setLoading(false)
      setSendingMethod(null)
    }
  }

  return (
    <div className="flex flex-col">
      {/* Heading — light weight, not aggressive */}
      <h1 className="text-[clamp(1.375rem,3.5vw,1.75rem)] font-normal leading-snug text-[var(--color-text)]">
        {t('login.step1.heading', 'Sign in to your account')}
      </h1>

      {/* Phone input — underline, part of the surface */}
      <div className="mt-12">
        <TextField
          isInvalid={!!error}
          value={phone}
          onChange={(value) => {
            const digits = value.replace(/\D/g, '').slice(0, 10)
            setPhone(digits)
            if (error) setError(null)
          }}
        >
          <Label className="mb-3 block text-[11px] font-medium uppercase tracking-[0.15em] text-[var(--color-text-subtle)]">
            {t('login.phoneLabel', 'Phone')}
          </Label>
          <div className="flex items-baseline gap-2.5 border-b border-[var(--color-border)] pb-2.5 transition-colors duration-200 focus-within:border-[var(--color-primary)]">
            <span className="font-mono text-[var(--text-lg)] font-normal text-[var(--color-text-subtle)]">
              +20
            </span>
            <Input
              ref={inputRef}
              type="tel"
              inputMode="numeric"
              placeholder="10 xxxx xxxx"
              className="w-full bg-transparent font-mono text-[var(--text-lg)] text-[var(--color-text)] outline-none placeholder:text-[var(--color-border)]"
            />
          </div>
          {error && (
            <FieldError className="mt-2.5 text-[var(--text-xs)] text-[var(--color-error)]">
              {error}
            </FieldError>
          )}
        </TextField>
      </div>

      {/* CTA — blue accent, the only color on the page */}
      <div className="mt-10 flex flex-col gap-2">
        <Button
          onPress={() => handleSend('whatsapp')}
          isDisabled={loading}
          className="flex h-11 w-full items-center justify-center rounded-lg bg-[#0F172A] text-[var(--text-sm)] font-medium text-white transition-opacity duration-150 hover:opacity-80 pressed:opacity-70 disabled:opacity-40 dark:bg-[#FAFAFA] dark:text-[#09090B]"
        >
          {loading && sendingMethod === 'whatsapp' ? (
            <Spinner />
          ) : (
            t('login.whatsappCTA', 'Continue with WhatsApp')
          )}
        </Button>
        <button
          type="button"
          onClick={() => handleSend('sms')}
          disabled={loading}
          className="flex h-9 items-center justify-center text-[var(--text-xs)] text-[var(--color-text-muted)] transition-colors duration-150 hover:text-[var(--color-text)] disabled:opacity-40"
        >
          {loading && sendingMethod === 'sms' ? (
            <Spinner accent />
          ) : (
            t('login.smsFallback', 'Send via SMS instead')
          )}
        </button>
      </div>
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
    const id = setTimeout(() => inputRefs.current[0]?.focus(), 100)
    return () => clearTimeout(id)
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
          setError(
            result.error === 'rate_limited'
              ? t('login.rateLimit', 'Too many attempts. Wait a moment.')
              : t('login.wrongCode', 'Incorrect code'),
          )
          setShaking(true)
          setTimeout(() => {
            setShaking(false)
            setCode(Array(OTP_LENGTH).fill(''))
            inputRefs.current[0]?.focus()
          }, 400)
          return
        }

        onVerified({
          needsAccount: result.needsAccount ?? false,
          claimableCompany: result.claimableCompany ?? null,
        })
      } catch {
        setError(t('login.wrongCode', 'Incorrect code'))
        setShaking(true)
        setTimeout(() => {
          setShaking(false)
          setCode(Array(OTP_LENGTH).fill(''))
          inputRefs.current[0]?.focus()
        }, 400)
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
    if (!pasted.length) return

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
      setError(t('login.sendFailed', 'Could not resend code.'))
    }
  }

  return (
    <div className="flex flex-col">
      {/* Heading */}
      <h1 className="text-[clamp(1.375rem,3.5vw,1.75rem)] font-normal leading-snug text-[var(--color-text)]">
        {t('login.step2.heading', 'Enter the code')}
      </h1>
      <p className="mt-2 text-[var(--text-sm)] text-[var(--color-text-muted)]">
        {t('login.codeSent', 'Sent to')}{' '}
        <span className="font-mono text-[var(--color-text)]">+20 {phone}</span>
      </p>

      {/* OTP digits — clean underlines, generous spacing */}
      <motion.div
        dir="ltr"
        className="mt-12 flex gap-2.5 sm:gap-3.5"
        animate={shaking ? { x: [0, -5, 5, -5, 5, 0] } : { x: 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
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
            className="w-full border-b border-[var(--color-border)] bg-transparent pb-2.5 text-center font-mono text-[clamp(1.25rem,4vw,1.75rem)] text-[var(--color-text)] outline-none transition-colors duration-200 focus:border-[var(--color-primary)] disabled:opacity-40"
          />
        ))}
      </motion.div>

      {/* Error */}
      {error && (
        <p className="mt-4 text-[var(--text-xs)] text-[var(--color-error)]">{error}</p>
      )}

      {/* Loading */}
      {loading && (
        <div className="mt-4">
          <Spinner accent />
        </div>
      )}

      {/* Footer actions — spaced apart, quiet */}
      <div className="mt-10 flex items-center justify-between text-[var(--text-xs)]">
        <button
          type="button"
          onClick={onBack}
          className="text-[var(--color-text-subtle)] transition-colors duration-150 hover:text-[var(--color-text-muted)]"
        >
          {t('login.changePhone', 'Change number')}
        </button>
        {resendCountdown > 0 ? (
          <span className="font-mono tabular-nums text-[var(--color-text-subtle)]">
            {String(resendCountdown).padStart(2, '0')}
          </span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            className="text-[var(--color-primary)] transition-colors duration-150 hover:text-[var(--color-primary-hover)]"
          >
            {t('login.resend', 'Resend code')}
          </button>
        )}
      </div>
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

  const _companyName = useWatch({ control, name: 'companyName' })
  const _fullName = useWatch({ control, name: 'fullName' })

  async function onSubmit(data: AccountFormData) {
    setLoading(true)
    setServerError(null)

    try {
      const result = await createAccount({
        data: { phone, companyName: data.companyName, fullName: data.fullName },
      })

      if (!result.success) {
        setServerError(t('login.createFailed', 'Could not create account. Try again.'))
        return
      }
      onComplete()
    } catch {
      setServerError(t('login.createFailed', 'Could not create account. Try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col">
      <h1 className="text-[clamp(1.375rem,3.5vw,1.75rem)] font-normal leading-snug text-[var(--color-text)]">
        {t('login.step3.heading', 'Create your account')}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-12 flex flex-col gap-10" noValidate>
        {/* Company */}
        <TextField isInvalid={!!errors.companyName}>
          <Label className="mb-3 block text-[11px] font-medium uppercase tracking-[0.15em] text-[var(--color-text-subtle)]">
            {t('login.companyName', 'Company')}
          </Label>
          <Input
            {...register('companyName')}
            className="w-full border-b border-[var(--color-border)] bg-transparent pb-2.5 text-[var(--text-lg)] text-[var(--color-text)] outline-none transition-colors duration-200 focus:border-[var(--color-primary)]"
          />
          {errors.companyName && (
            <FieldError className="mt-2 text-[var(--text-xs)] text-[var(--color-error)]">
              {errors.companyName.message}
            </FieldError>
          )}
        </TextField>

        {/* Name */}
        <TextField isInvalid={!!errors.fullName}>
          <Label className="mb-3 block text-[11px] font-medium uppercase tracking-[0.15em] text-[var(--color-text-subtle)]">
            {t('login.fullName', 'Your name')}
          </Label>
          <Input
            {...register('fullName')}
            className="w-full border-b border-[var(--color-border)] bg-transparent pb-2.5 text-[var(--text-lg)] text-[var(--color-text)] outline-none transition-colors duration-200 focus:border-[var(--color-primary)]"
          />
          {errors.fullName && (
            <FieldError className="mt-2 text-[var(--text-xs)] text-[var(--color-error)]">
              {errors.fullName.message}
            </FieldError>
          )}
        </TextField>

        {serverError && (
          <p className="text-[var(--text-xs)] text-[var(--color-error)]">{serverError}</p>
        )}

        <Button
          type="submit"
          isDisabled={loading}
          className="flex h-11 w-full items-center justify-center rounded-lg bg-[#0F172A] text-[var(--text-sm)] font-medium text-white transition-opacity duration-150 hover:opacity-80 pressed:opacity-70 disabled:opacity-40 dark:bg-[#FAFAFA] dark:text-[#09090B]"
        >
          {loading ? <Spinner /> : t('login.createButton', 'Continue')}
        </Button>
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
      return word[0] + '\u2022'.repeat(Math.min(word.length - 1, 6))
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
    : '\u2022\u2022\u2022\u2022'

  async function handleClaim() {
    setLoading(true)
    setError(null)

    try {
      const result = await claimAccount({ data: { phone } })
      if (!result.success) {
        setError(t('login.claimFailed', 'Could not claim account. Try again.'))
        return
      }
      onComplete()
    } catch {
      setError(t('login.claimFailed', 'Could not claim account. Try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col">
      <h1 className="text-[clamp(1.375rem,3.5vw,1.75rem)] font-normal leading-snug text-[var(--color-text)]">
        {t('login.claiming.heading', 'Is this you?')}
      </h1>
      <p className="mt-2 text-[var(--text-sm)] text-[var(--color-text-muted)]">
        {t('login.claiming.sub', 'We found an existing account for this number')}
      </p>

      {/* Masked company — monospace, the data speaks */}
      <div className="mt-12 border-b border-[var(--color-border)] pb-3">
        <p className="font-mono text-[clamp(1.125rem,3vw,1.5rem)] tracking-wider text-[var(--color-text)]">
          {maskedCompany}
        </p>
      </div>

      {error && (
        <p className="mt-4 text-[var(--text-xs)] text-[var(--color-error)]">{error}</p>
      )}

      <div className="mt-10 flex flex-col gap-2">
        <Button
          onPress={handleClaim}
          isDisabled={loading}
          className="flex h-11 w-full items-center justify-center rounded-lg bg-[#0F172A] text-[var(--text-sm)] font-medium text-white transition-opacity duration-150 hover:opacity-80 pressed:opacity-70 disabled:opacity-40 dark:bg-[#FAFAFA] dark:text-[#09090B]"
        >
          {loading ? <Spinner /> : t('login.claiming.confirm', "Yes, that's me")}
        </Button>
        <button
          type="button"
          onClick={onCreateNew}
          disabled={loading}
          className="flex h-9 items-center justify-center text-[var(--text-xs)] text-[var(--color-text-muted)] transition-colors duration-150 hover:text-[var(--color-text)] disabled:opacity-40"
        >
          {t('login.claiming.deny', 'No, create a new account')}
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Spinner
// ============================================================================

function Spinner({ accent }: { accent?: boolean }) {
  const color = accent
    ? 'border-[var(--color-primary)]/20 border-t-[var(--color-primary)]'
    : 'border-white/30 border-t-white'
  return (
    <span
      className={`inline-block h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] ${color}`}
    />
  )
}
