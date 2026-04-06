import { createRoute, useNavigate } from '@tanstack/react-router'
import { Route as rootRoute } from './__root'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { useShiftStore, type ShiftStep } from '@/stores/shift'
import { HealthCheck } from '@/components/inspection/HealthCheck'
import { VehicleSelect } from '@/components/inspection/VehicleSelect'
import { DVIRChecklist } from '@/components/inspection/DVIRChecklist'
import { OdometerEntry } from '@/components/inspection/OdometerEntry'
import { GPSConsent } from '@/components/inspection/GPSConsent'
import { SignOff } from '@/components/inspection/SignOff'

const STEPS: ShiftStep[] = [
  'health-check',
  'vehicle-select',
  'inspection',
  'odometer',
  'gps-consent',
  'sign-off',
]

const STEP_LABELS: Record<string, string> = {
  'health-check': 'shift.healthCheck.title',
  'vehicle-select': 'shift.selectVehicle',
  'inspection': 'shift.inspection',
  'odometer': 'shift.odometer',
  'gps-consent': 'shift.gpsConsent',
  'sign-off': 'shift.signOff',
}

function StepComponent({ step }: { step: ShiftStep }) {
  switch (step) {
    case 'health-check': return <HealthCheck />
    case 'vehicle-select': return <VehicleSelect />
    case 'inspection': return <DVIRChecklist />
    case 'odometer': return <OdometerEntry />
    case 'gps-consent': return <GPSConsent />
    case 'sign-off': return <SignOff />
    default: return null
  }
}

function ShiftStartPage() {
  const { t } = useTranslation('driver')
  const navigate = useNavigate()
  const shiftStep = useShiftStore((s) => s.shiftStep)
  const setShiftStep = useShiftStore((s) => s.setShiftStep)

  const currentStepIndex = STEPS.indexOf(shiftStep)
  const stepNumber = currentStepIndex + 1

  // Navigate to home when complete
  useEffect(() => {
    if (shiftStep === 'complete') {
      navigate({ to: '/home' })
    }
  }, [shiftStep, navigate])

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setShiftStep(STEPS[currentStepIndex - 1])
    }
  }

  if (shiftStep === 'complete') return null

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg-primary)]">
      {/* Header with back button */}
      <div className="flex items-center gap-3 px-4 pt-[var(--safe-top)] pb-2">
        {currentStepIndex > 0 && (
          <button
            type="button"
            onClick={handleBack}
            className="flex h-10 w-10 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue)]"
            aria-label={t('common.back')}
          >
            <span className="text-xl">&larr;</span>
          </button>
        )}
        <h1 className="flex-1 text-lg font-semibold">
          {t('shift.startShift')}
        </h1>
        <span className="text-sm text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-mono)' }}>
          {stepNumber}/{STEPS.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mx-4 mb-4 h-1 overflow-hidden rounded-full bg-[var(--bg-secondary)]">
        <div
          className="h-full rounded-full bg-[var(--color-blue)] transition-all duration-500"
          style={{ width: `${(stepNumber / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Step content with animation */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={shiftStep}
            initial={{ x: 50, opacity: 0 }}
            animate={{
              x: 0,
              opacity: 1,
              transition: {
                type: 'spring',
                stiffness: 200,
                damping: 20,
              },
            }}
            exit={{
              x: -50,
              opacity: 0,
              transition: {
                type: 'tween',
                duration: 0.2,
                ease: 'easeIn',
              },
            }}
          >
            <StepComponent step={shiftStep} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/shift-start',
  component: ShiftStartPage,
})
