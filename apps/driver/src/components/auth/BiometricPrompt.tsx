import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { isBiometricAvailable, enrollBiometric } from '../../lib/biometric'
import { getPinHash } from '../../lib/pin'
import { useAuthStore } from '../../stores/auth'
import { DriverButton } from '../shared/DriverButton'
import { DriverCard } from '../shared/DriverCard'

export function BiometricPrompt() {
  const { t } = useTranslation()
  const { setAuthStep, setHasBiometric } = useAuthStore()
  const [biometryType, setBiometryType] = useState<number>(0)
  const [isEnrolling, setIsEnrolling] = useState(false)

  useEffect(() => {
    isBiometricAvailable().then((result) => {
      setBiometryType(result.biometryType)
    })
  }, [])

  // biometryType: 1 = fingerprint, 2 = face, 3 = iris
  const typeName = biometryType === 2 ? t('login.faceId') : t('login.fingerprint')

  async function handleEnable() {
    setIsEnrolling(true)
    try {
      const phone = sessionStorage.getItem('hq-auth-phone') ?? ''
      const pinHash = await getPinHash()
      if (!pinHash) {
        setAuthStep('authenticated')
        return
      }

      const success = await enrollBiometric(phone, pinHash)
      if (success) {
        setHasBiometric(true)
      }
      setAuthStep('authenticated')
    } catch {
      setAuthStep('authenticated')
    } finally {
      setIsEnrolling(false)
    }
  }

  function handleSkip() {
    setAuthStep('authenticated')
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <DriverCard className="w-full text-center">
        {/* Biometric icon */}
        <div className="mb-4 flex justify-center">
          {biometryType === 2 ? (
            // Face icon
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-blue)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          ) : (
            // Fingerprint icon
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-blue)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4" />
              <path d="M5 19.5C5.5 18 6 15 6 12c0-3.5 2.5-6 6-6a6 6 0 0 1 4.8 2.4" />
              <path d="M10 12c0 4-1 8-3 10" />
              <path d="M9.5 2a16.5 16.5 0 0 1 1.5 10c0 4.5-1.5 8.5-3.5 11.5" />
              <path d="M14 12c0 3-1 6-2.5 9" />
              <path d="M17.5 6.5a13 13 0 0 1 .5 5.5c0 3-1 6.5-2.5 9.5" />
              <path d="M22 12c0 3-1 6.5-3 9.5" />
            </svg>
          )}
        </div>

        <p className="text-lg font-medium text-[var(--text-primary)]">
          {t('login.enableBiometric', { type: typeName })}
        </p>
      </DriverCard>

      <div className="flex w-full flex-col gap-3">
        <DriverButton
          variant="primary"
          isLoading={isEnrolling}
          onPress={handleEnable}
        >
          {t('login.enableButton')}
        </DriverButton>

        <DriverButton
          variant="secondary"
          onPress={handleSkip}
        >
          {t('login.skipButton')}
        </DriverButton>
      </div>
    </div>
  )
}
