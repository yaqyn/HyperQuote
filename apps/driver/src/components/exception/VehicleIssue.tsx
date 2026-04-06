import { RadioGroup, Radio, Label } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useExceptionStore } from '../../stores/exception'
import { capturePhoto } from '../../lib/camera'
import { DriverCard } from '../shared/DriverCard'
import { DriverButton } from '../shared/DriverButton'
import { PhotoGrid } from './PhotoGrid'

const ISSUE_TYPES = [
  'engine_failure',
  'flat_tire',
  'hydraulic_failure',
  'electrical_issue',
  'overheating',
  'other',
] as const

const SEVERITY_OPTIONS = [
  { value: 'can_continue', labelKey: 'exception.vehicleIssue.canContinue' },
  { value: 'cannot_continue', labelKey: 'exception.vehicleIssue.cannotContinue' },
] as const

export function VehicleIssue() {
  const { t } = useTranslation('driver')
  const photos = useExceptionStore((s) => s.photos)
  const details = useExceptionStore((s) => s.details)
  const addPhoto = useExceptionStore((s) => s.addPhoto)
  const removePhoto = useExceptionStore((s) => s.removePhoto)
  const setDetails = useExceptionStore((s) => s.setDetails)
  const nextStep = useExceptionStore((s) => s.nextStep)

  const issueType = details.issueType as string | undefined
  const severity = details.severity as string | undefined

  const handleAddPhoto = async () => {
    const uri = await capturePhoto()
    if (uri) addPhoto(uri)
  }

  const handleSubmit = () => {
    setDetails('resolution', 'vehicle_issue_reported')
    nextStep()
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Safety warning - TOP of component */}
      <div className="rounded-xl bg-[#FEF3C7] border-2 border-[#92400E] px-4 py-3">
        <p className="text-sm font-bold text-[#92400E]">
          {t('exception.vehicleIssue.safetyWarning')}
        </p>
      </div>

      {/* Emergency call dispatch - prominent 56dp red button */}
      <DriverButton
        variant="danger"
        onPress={() => window.open('tel:dispatch')}
        className="min-h-[56px] text-base font-bold"
      >
        {t('exception.vehicleIssue.callDispatch')}
      </DriverButton>

      {/* Issue type */}
      <DriverCard>
        <RadioGroup
          value={issueType ?? ''}
          onChange={(val) => setDetails('issueType', val)}
        >
          <Label className="block text-sm font-medium mb-3">
            {t('exception.vehicleIssue.issueType')}
          </Label>
          <div className="flex flex-col gap-1">
            {ISSUE_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-3 min-h-[56px] cursor-pointer">
                <Radio value={type} className="h-5 w-5 accent-[var(--color-blue)]" />
                <span className="text-sm">{t(`exception.vehicleIssue.issueTypes.${type}`)}</span>
              </label>
            ))}
          </div>
        </RadioGroup>
      </DriverCard>

      {/* Severity */}
      <DriverCard>
        <RadioGroup
          value={severity ?? ''}
          onChange={(val) => setDetails('severity', val)}
        >
          <Label className="block text-sm font-medium mb-3">
            {t('exception.vehicleIssue.severityLabel')}
          </Label>
          <div className="flex flex-col gap-1">
            {SEVERITY_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-3 min-h-[56px] cursor-pointer">
                <Radio value={opt.value} className="h-5 w-5 accent-[var(--color-blue)]" />
                <span className="text-sm">{t(opt.labelKey)}</span>
              </label>
            ))}
          </div>
        </RadioGroup>
      </DriverCard>

      {/* Photos */}
      <DriverCard
        header={
          <span className="text-sm font-medium">
            {t('exception.vehicleIssue.photos')}
          </span>
        }
      >
        <PhotoGrid
          photos={photos}
          onAdd={handleAddPhoto}
          onRemove={removePhoto}
          minRequired={1}
        />
      </DriverCard>

      {/* Emergency section for cannot_continue */}
      {severity === 'cannot_continue' && (
        <div className="flex flex-col gap-2">
          <DriverButton
            variant="danger"
            onPress={() => window.open('tel:123')}
            className="min-h-[56px] text-base font-bold"
          >
            {t('exception.vehicleIssue.emergency123')}
          </DriverButton>
          <DriverButton
            variant="danger"
            onPress={() => window.open('tel:122')}
            className="min-h-[56px] text-base font-bold"
          >
            {t('exception.vehicleIssue.emergency122')}
          </DriverButton>
        </div>
      )}

      {/* Submit */}
      <DriverButton variant="primary" onPress={handleSubmit}>
        {t('exception.vehicleIssue.submitReport')}
      </DriverButton>
    </div>
  )
}
