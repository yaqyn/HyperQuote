import { useTranslation } from 'react-i18next'
import { Button, Dialog, DialogTrigger, Heading, Modal, ModalOverlay } from 'react-aria-components'
import { usePushPermission } from './usePushPermission'

export function PushPermissionPrompt() {
  const { t } = useTranslation('portal')
  const { shouldShowPrompt, requestPermission, dismissPrompt } = usePushPermission()

  if (!shouldShowPrompt) return null

  return (
    <DialogTrigger isOpen={shouldShowPrompt}>
      <Button className="hidden" />
      <ModalOverlay
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm"
        isDismissable={false}
      >
        <Modal className="w-full max-w-sm mx-4">
          <Dialog
            className="rounded-2xl p-6 backdrop-blur-2xl bg-white/90 dark:bg-black/90 border border-black/10 dark:border-white/10 shadow-xl outline-none"
            role="alertdialog"
            isKeyboardDismissDisabled
          >
            <Heading
              slot="title"
              className="text-lg font-semibold text-black dark:text-white mb-2"
            >
              {t('pwa.pushHeading')}
            </Heading>
            <p className="text-sm text-black/60 dark:text-white/60 mb-6">
              {t('pwa.pushBody')}
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                onPress={dismissPrompt}
                className="h-10 px-4 rounded-lg border border-black/20 dark:border-white/20 text-sm font-medium text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 pressed:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-blue)]"
              >
                {t('pwa.notNow')}
              </Button>
              <Button
                onPress={requestPermission}
                className="h-10 px-4 rounded-lg bg-[var(--color-blue)] text-white text-sm font-medium pressed:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-blue)]"
              >
                {t('pwa.allow')}
              </Button>
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  )
}
