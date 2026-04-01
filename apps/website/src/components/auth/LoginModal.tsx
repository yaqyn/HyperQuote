import { Modal, ModalOverlay, Dialog } from 'react-aria-components'
import { AnimatePresence, motion } from 'motion/react'
import { useLoginModal } from '../../hooks/useLoginModal'
import { PhoneStep } from './PhoneStep'
import { OTPStep } from './OTPStep'
import { AccountCreation } from './AccountCreation'
import { AccountClaiming } from './AccountClaiming'

export function LoginModal() {
  const { isOpen, step, close } = useLoginModal()

  return (
    <AnimatePresence>
      {isOpen && (
        <ModalOverlay
          isDismissable
          isOpen={isOpen}
          onOpenChange={(open) => {
            if (!open) close()
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[4px]"
        >
          <Modal className="outline-none">
            <Dialog className="outline-none">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 260,
                  damping: 20,
                  opacity: { duration: 0.15, ease: 'easeOut' },
                }}
                className="w-full max-w-[440px] rounded-2xl bg-[var(--color-card)] p-8 shadow-xl mx-4 max-[480px]:rounded-xl max-[480px]:max-w-full"
              >
                {step === 'phone' && <PhoneStep />}
                {step === 'otp' && <OTPStep />}
                {step === 'create' && <AccountCreation />}
                {step === 'claiming' && <AccountClaiming />}
              </motion.div>
            </Dialog>
          </Modal>
        </ModalOverlay>
      )}
    </AnimatePresence>
  )
}
