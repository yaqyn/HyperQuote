import { useState } from 'react'
import {
  Dialog,
  Heading,
  Label,
  Modal,
  ModalOverlay,
  TextField,
  TextArea,
} from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useDeliveryStore } from '../../stores/delivery'
import { capturePhoto } from '../../lib/camera'
import { DriverButton } from '../shared/DriverButton'

interface DamageReportProps {
  itemId: string
  isOpen: boolean
  onClose: () => void
}

export function DamageReport({ itemId, isOpen, onClose }: DamageReportProps) {
  const { t } = useTranslation('driver')
  const flagDamage = useDeliveryStore((s) => s.flagDamage)

  const [notes, setNotes] = useState('')
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(false)

  const canSubmit = notes.trim().length > 0

  async function handleCapture() {
    setCapturing(true)
    try {
      const uri = await capturePhoto()
      if (uri) setPhotoUri(uri)
    } finally {
      setCapturing(false)
    }
  }

  async function handleSubmit() {
    if (!canSubmit) return
    await flagDamage(itemId, notes.trim(), photoUri ?? '')
    handleClose()
  }

  function handleClose() {
    setNotes('')
    setPhotoUri(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <ModalOverlay
      isDismissable
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) handleClose() }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
    >
      <Modal className="w-full max-w-lg rounded-t-2xl bg-[var(--bg-primary)] p-6 shadow-xl">
        <Dialog className="outline-none">
          <Heading slot="title" className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            {t('delivery.flagDamage')}
          </Heading>

          <TextField
            value={notes}
            onChange={setNotes}
            className="mb-4"
          >
            <Label className="block text-sm text-[var(--text-secondary)] mb-1">
              {t('delivery.damageNotes')}
            </Label>
            <TextArea
              className="w-full rounded-xl border border-[var(--border-color)] p-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-blue)] bg-transparent resize-none"
              rows={4}
              placeholder={t('delivery.damageNotes')}
            />
          </TextField>

          <div className="mb-4">
            <Label className="block text-sm text-[var(--text-secondary)] mb-2">
              {t('delivery.damagePhoto')}
            </Label>

            {photoUri ? (
              <div className="relative">
                <img
                  src={photoUri}
                  alt="Damage photo"
                  className="w-full h-48 object-cover rounded-xl border border-[var(--border-color)]"
                />
                <button
                  type="button"
                  onClick={handleCapture}
                  className="absolute bottom-2 end-2 rounded-lg bg-black/60 px-3 py-1 text-xs text-white"
                >
                  {t('shift.inspection.retakePhoto')}
                </button>
              </div>
            ) : (
              <DriverButton
                variant="secondary"
                onPress={handleCapture}
                isLoading={capturing}
              >
                {t('loading.takePhoto')}
              </DriverButton>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <DriverButton variant="secondary" onPress={handleClose} className="flex-1">
              {t('common.cancel')}
            </DriverButton>
            <DriverButton
              variant="primary"
              onPress={handleSubmit}
              isDisabled={!canSubmit}
              className="flex-1"
            >
              {t('common.confirm')}
            </DriverButton>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
