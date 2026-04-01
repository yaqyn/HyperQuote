import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Modal, ModalOverlay } from 'react-aria-components'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useChatWidget } from '../../hooks/useChatWidget'
import type { ChatMessage } from '../../hooks/useAIChat'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'

interface ChatPanelProps {
  messages: ChatMessage[]
  isLoading: boolean
  sendMessage: (content: string) => Promise<void>
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)')
    setIsMobile(mql.matches)
    const handler = (e: MediaQueryListEvent) => { setIsMobile(e.matches) }
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])
  return isMobile
}

function ChatHeader() {
  const { t } = useTranslation('website')
  const close = useChatWidget((s) => s.close)

  return (
    <div className="flex h-12 shrink-0 items-baseline justify-between px-5 pt-5">
      <span className="text-[15px] font-semibold tracking-[-0.02em]">
        {t('chat.header')}
      </span>
      <button
        type="button"
        onClick={close}
        aria-label={t('chat.closeLabel')}
        className="cursor-pointer opacity-20 transition-opacity hover:opacity-50"
      >
        <X size={15} />
      </button>
    </div>
  )
}

function PanelShell({ messages, isLoading, sendMessage }: ChatPanelProps) {
  return (
    <>
      <ChatHeader />
      <div className="min-h-0 flex-1">
        <ChatMessages messages={messages} isLoading={isLoading} />
      </div>
      <ChatInput onSend={sendMessage} isLoading={isLoading} />
    </>
  )
}

const open = { opacity: 0, scale: 0.97 }
const visible = { opacity: 1, scale: 1 }
const closed = { opacity: 0, scale: 0.98 }
const fast = { duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }

function DesktopPanel(props: ChatPanelProps) {
  const isOpen = useChatWidget((s) => s.isOpen)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={open}
          animate={visible}
          exit={closed}
          transition={fast}
          style={{ transformOrigin: 'bottom right' }}
          className="fixed bottom-20 end-4 z-50 flex h-[500px] w-[380px] flex-col overflow-hidden rounded-2xl border border-[var(--color-text)]/[0.08] bg-[var(--color-base)] shadow-[0_24px_80px_rgba(0,0,0,0.12)] dark:shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
        >
          <PanelShell {...props} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function MobilePanel(props: ChatPanelProps) {
  const { isOpen, close } = useChatWidget()

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(o) => { if (!o) close() }}
      isDismissable
      className="fixed inset-0 z-50 flex items-end bg-black/25"
    >
      <Modal className="flex h-[75vh] w-full flex-col rounded-t-2xl border-t border-[var(--color-text)]/[0.08] bg-[var(--color-base)] shadow-[0_-16px_60px_rgba(0,0,0,0.1)] outline-none">
        <PanelShell {...props} />
      </Modal>
    </ModalOverlay>
  )
}

export function ChatPanel(props: ChatPanelProps) {
  const isMobile = useIsMobile()
  return isMobile ? <MobilePanel {...props} /> : <DesktopPanel {...props} />
}
