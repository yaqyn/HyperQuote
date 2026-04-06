import { RadioGroup, Radio, Label } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useExceptionStore } from '../../stores/exception'
import { capturePhoto } from '../../lib/camera'
import { DriverCard } from '../shared/DriverCard'
import { DriverButton } from '../shared/DriverButton'
import { PhotoGrid } from './PhotoGrid'

const BLOCKAGE_TYPES = [
  'gate_locked',
  'construction_barrier',
  'road_closure',
  'flooding',
  'other',
] as const

export function SiteBlocked() {
  const { t } = useTranslation('driver')
  const photos = useExceptionStore((s) => s.photos)
  const details = useExceptionStore((s) => s.details)
  const addPhoto = useExceptionStore((s) => s.addPhoto)
  const removePhoto = useExceptionStore((s) => s.removePhoto)
  const setDetails = useExceptionStore((s) => s.setDetails)
  const nextStep = useExceptionStore((s) => s.nextStep)

  const blockageType = details.blockageType as string | undefined
  const calledContact = details.calledContact as string | undefined

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
      {/* Photo of obstruction */}
      <DriverCard
        header={
          <span className="text-sm font-medium">
            {t('exception.siteBlocked.photoObstruction')}
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

      {/* Type of blockage */}
      <DriverCard>
        <RadioGroup
          value={blockageType ?? ''}
          onChange={(val) => setDetails('blockageType', val)}
        >
          <Label className="block text-sm font-medium mb-3">
            {t('exception.siteBlocked.blockageType')}
          </Label>
          <div className="flex flex-col gap-1">
            {BLOCKAGE_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-3 min-h-[56px] cursor-pointer">
                <Radio value={type} className="h-5 w-5 accent-[var(--color-blue)]" />
                <span className="text-sm">{t(`exception.siteBlocked.${type}`)}</span>
              </label>
            ))}
          </div>
        </RadioGroup>
      </DriverCard>

      {/* Called site contact? */}
      <DriverCard>
        <RadioGroup
          value={calledContact ?? ''}
          onChange={(val) => setDetails('calledContact', val)}
        >
          <Label className="block text-sm font-medium mb-2">
            {t('exception.siteBlocked.calledContact')}
          </Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 min-h-[56px] cursor-pointer">
              <Radio value="yes" className="h-5 w-5 accent-[var(--color-blue)]" />
              <span className="text-sm">{t('common.yes')}</span>
            </label>
            <label className="flex items-center gap-2 min-h-[56px] cursor-pointer">
              <Radio value="no" className="h-5 w-5 accent-[var(--color-blue)]" />
              <span className="text-sm">{t('common.no')}</span>
            </label>
          </div>
        </RadioGroup>
      </DriverCard>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <DriverButton
          variant="secondary"
          onPress={() => handleResolution('wait')}
        >
          {t('exception.actions.wait')}
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
