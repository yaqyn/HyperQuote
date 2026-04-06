import { RadioGroup, Radio, Label, TextField, TextArea } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useExceptionStore } from '../../stores/exception'
import { capturePhoto } from '../../lib/camera'
import { DriverCard } from '../shared/DriverCard'
import { DriverButton } from '../shared/DriverButton'
import { PhotoGrid } from './PhotoGrid'

export function WrongAddress() {
  const { t } = useTranslation('driver')
  const photos = useExceptionStore((s) => s.photos)
  const details = useExceptionStore((s) => s.details)
  const addPhoto = useExceptionStore((s) => s.addPhoto)
  const removePhoto = useExceptionStore((s) => s.removePhoto)
  const setDetails = useExceptionStore((s) => s.setDetails)
  const nextStep = useExceptionStore((s) => s.nextStep)

  const locationDescription = (details.locationDescription as string) ?? ''
  const calledCustomer = details.calledCustomer as string | undefined
  const newAddress = (details.newAddress as string) ?? ''

  const handleAddPhoto = async () => {
    const uri = await capturePhoto()
    if (uri) addPhoto(uri)
  }

  const handleNavigateNew = () => {
    setDetails('resolution', 'navigate_new')
    nextStep()
  }

  const handleSkip = () => {
    setDetails('resolution', 'skip_too_far')
    nextStep()
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Photo of location */}
      <DriverCard
        header={
          <span className="text-sm font-medium">
            {t('exception.wrongAddress.photoLocation')}
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

      {/* What is at this location? */}
      <DriverCard>
        <TextField
          value={locationDescription}
          onChange={(val) => setDetails('locationDescription', val)}
        >
          <Label className="block text-sm font-medium mb-2">
            {t('exception.wrongAddress.whatIsHere')}
          </Label>
          <TextArea
            className="w-full rounded-xl border border-[var(--border-color)] p-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-blue)] bg-transparent resize-none"
            rows={3}
            placeholder={t('exception.wrongAddress.descriptionPlaceholder')}
          />
        </TextField>
      </DriverCard>

      {/* Called customer for correct address? */}
      <DriverCard>
        <RadioGroup
          value={calledCustomer ?? ''}
          onChange={(val) => setDetails('calledCustomer', val)}
        >
          <Label className="block text-sm font-medium mb-2">
            {t('exception.wrongAddress.calledCustomer')}
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

      {/* New address field (if customer called and provided) */}
      {calledCustomer === 'yes' && (
        <DriverCard>
          <TextField
            value={newAddress}
            onChange={(val) => setDetails('newAddress', val)}
          >
            <Label className="block text-sm font-medium mb-2">
              {t('exception.wrongAddress.newAddress')}
            </Label>
            <TextArea
              className="w-full rounded-xl border border-[var(--border-color)] p-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-blue)] bg-transparent resize-none"
              rows={2}
              placeholder={t('exception.wrongAddress.newAddressPlaceholder')}
            />
          </TextField>
          <p className="mt-2 text-xs text-[var(--text-tertiary)]">
            {t('exception.wrongAddress.routeRecalculation')}
          </p>
        </DriverCard>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2">
        {newAddress.trim().length > 0 && (
          <DriverButton variant="primary" onPress={handleNavigateNew}>
            {t('exception.wrongAddress.navigateNew')}
          </DriverButton>
        )}
        <DriverButton variant="secondary" onPress={handleSkip}>
          {t('exception.wrongAddress.skipTooFar')}
        </DriverButton>
      </div>
    </div>
  )
}
