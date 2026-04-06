import { createRoute, useNavigate } from '@tanstack/react-router'
import { Route as rootRoute } from './__root'
import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-client'
import { useAuthStore, type AuthStep } from '../stores/auth'
import { verifyBiometric } from '../lib/biometric'
import { PhoneInput } from '../components/auth/PhoneInput'
import { OTPInput } from '../components/auth/OTPInput'
import { PINPad } from '../components/auth/PINPad'
import { BiometricPrompt } from '../components/auth/BiometricPrompt'

const springEnter = {
  type: 'spring' as const,
  stiffness: 200,
  damping: 20,
}

const tweenExit = {
  type: 'tween' as const,
  duration: 0.2,
  ease: 'easeIn' as const,
}

function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const authStep = useAuthStore((s) => s.authStep)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const setAuthStep = useAuthStore((s) => s.setAuthStep)

  // Redirect to home when authenticated
  useEffect(() => {
    if (isAuthenticated && authStep === 'authenticated') {
      navigate({ to: '/home' })
    }
  }, [isAuthenticated, authStep, navigate])

  // Auto-trigger biometric verification for returning users
  useEffect(() => {
    if (authStep === 'biometric-verify') {
      handleBiometricVerify()
    }
  }, [authStep])

  async function handleBiometricVerify() {
    const result = await verifyBiometric()
    if (result) {
      // Biometric succeeded -- proceed to authenticated
      setAuthStep('authenticated')
    } else {
      // Biometric failed -- fall back to PIN
      setAuthStep('pin-verify')
    }
  }

  function renderStep(step: AuthStep) {
    switch (step) {
      case 'phone':
        return <PhoneInput />
      case 'otp':
        return <OTPInput />
      case 'pin-setup':
        return <PINPad mode="setup" />
      case 'pin-verify':
        return <PINPad mode="verify" />
      case 'biometric-prompt':
        return <BiometricPrompt />
      case 'biometric-verify':
        return (
          <div className="flex flex-col items-center gap-4">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-blue)] border-t-transparent"
              role="status"
              aria-label={t('common.loading')}
            />
            <p className="text-sm text-[var(--text-secondary)]">
              {t('login.biometric')}
            </p>
          </div>
        )
      case 'authenticated':
        return null
      default:
        return <PhoneInput />
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center px-6 pb-8 pt-[max(env(safe-area-inset-top,0px),2rem)]">
      {/* Logo area -- top center */}
      <div className="mb-8 mt-8 text-center">
        <h1 className="text-2xl font-bold text-[var(--color-blue)]">
          HyperQuote
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {t('login.driver')}
        </p>
      </div>

      {/* Welcome text */}
      <div className="mb-8 text-center">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          {t('login.welcome')}
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {t('login.enterPhone')}
        </p>
      </div>

      {/* Auth step content -- bottom 40% of screen */}
      <div className="flex w-full max-w-sm flex-1 flex-col justify-end">
        <AnimatePresence mode="wait">
          <m.div
            key={authStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: springEnter,
            }}
            exit={{
              opacity: 0,
              y: -10,
              transition: tweenExit,
            }}
          >
            {renderStep(authStep)}
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})
