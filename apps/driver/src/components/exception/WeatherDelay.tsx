import { RadioGroup, Radio, Label } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useExceptionStore } from '../../stores/exception'
import { capturePhoto } from '../../lib/camera'
import { DriverCard } from '../shared/DriverCard'
import { DriverButton } from '../shared/DriverButton'
import { PhotoGrid } from './PhotoGrid'

const CONDITIONS = ['heavy_rain', 'sandstorm_khamsin', 'extreme_heat', 'high_wind'] as const
const IMPACTS = ['cannot_drive', 'cannot_unload', 'materials_at_risk'] as const

export function WeatherDelay() {
  const { t } = useTranslation('driver')
  const photos = useExceptionStore((s) => s.photos)
  const details = useExceptionStore((s) => s.details)
  const addPhoto = useExceptionStore((s) => s.addPhoto)
  const removePhoto = useExceptionStore((s) => s.removePhoto)
  const setDetails = useExceptionStore((s) => s.setDetails)
  const nextStep = useExceptionStore((s) => s.nextStep)

  const condition = details.condition as string | undefined
  const impact = details.impact as string | undefined

  const showKhamsinWarning =
    condition === 'sandstorm_khamsin' || condition === 'high_wind'

  const handleAddPhoto = async () => {
    const uri = await capturePhoto()
    if (uri) addPhoto(uri)
  }

  const handleResolution = (resolution: 'wait' | 'skip' | 'failed') => {
    setDetails('resolution', resolution)
    nextStep()
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Condition */}
      <DriverCard>
        <RadioGroup
          value={condition ?? ''}
          onChange={(val) => setDetails('condition', val)}
        >
          <Label className="block text-sm font-medium mb-3">
            {t('exception.weatherDelay.condition')}
          </Label>
          <div className="flex flex-col gap-1">
            {CONDITIONS.map((cond) => (
              <label key={cond} className="flex items-center gap-3 min-h-[56px] cursor-pointer">
                <Radio value={cond} className="h-5 w-5 accent-[var(--color-blue)]" />
                <span className="text-sm">{t(`exception.weatherDelay.conditions.${cond}`)}</span>
              </label>
            ))}
          </div>
        </RadioGroup>
      </DriverCard>

      {/* Khamsin/wind warning banner */}
      {showKhamsinWarning && (
        <div className="rounded-xl bg-[#FEF3C7] border border-[#F59E0B] px-4 py-3">
          <p className="text-sm font-medium text-[#92400E]">
            {t('exception.weatherDelay.khamsinWarning')}
          </p>
        </div>
      )}

      {/* Impact */}
      <DriverCard>
        <RadioGroup
          value={impact ?? ''}
          onChange={(val) => setDetails('impact', val)}
        >
          <Label className="block text-sm font-medium mb-3">
            {t('exception.weatherDelay.impact')}
          </Label>
          <div className="flex flex-col gap-1">
            {IMPACTS.map((imp) => (
              <label key={imp} className="flex items-center gap-3 min-h-[56px] cursor-pointer">
                <Radio value={imp} className="h-5 w-5 accent-[var(--color-blue)]" />
                <span className="text-sm">{t(`exception.weatherDelay.impacts.${imp}`)}</span>
              </label>
            ))}
          </div>
        </RadioGroup>
      </DriverCard>

      {/* Photo of conditions */}
      <DriverCard
        header={
          <span className="text-sm font-medium">
            {t('exception.weatherDelay.photoConditions')}
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

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <DriverButton
          variant="secondary"
          onPress={() => handleResolution('wait')}
        >
          {t('exception.weatherDelay.waitForConditions')}
        </DriverButton>
        <DriverButton
          variant="secondary"
          onPress={() => handleResolution('skip')}
        >
          {t('exception.actions.skip')}
        </DriverButton>
        <DriverButton
          variant="danger"
          onPress={() => handleResolution('failed')}
        >
          {t('exception.actions.markFailed')}
        </DriverButton>
      </div>
    </div>
  )
}
