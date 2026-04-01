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
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return isMobile
}

function ChatHeader() {
  const { t } = useTranslation('website')
  const close = useChatWidget((s) => s.close)

  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#2563EB]">
          <span className="text-xs font-bold text-white">H</span>
        </div>
        <span className="text-sm font-semibold text-[var(--color-text)]">
          {t('chat.header')}
        </span>
      </div>
      <button
        type="button"
        onClick={close}
        aria-label={t('chat.closeLabel')}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] cursor-pointer transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

function PanelContent({ messages, isLoading, sendMessage }: ChatPanelProps) {
  return (
    <div className="flex h-full flex-col">
      <ChatHeader />
      <ChatMessages messages={messages} isLoading={isLoading} />
      <ChatInput onSend={sendMessage} isLoading={isLoading} />
    </div>
  )
}

function DesktopPanel({ messages, isLoading, sendMessage }: ChatPanelProps) {
  const isOpen = useChatWidget((s) => s.isOpen)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 25,
          }}
          className="fixed bottom-20 end-4 z-40 flex w-[380px] max-h-[520px] flex-col overflow-hidden rounded-2xl bg-[var(--color-card)] shadow-2xl border border-[var(--color-border)]"
        >
          <PanelContent
            messages={messages}
            isLoading={isLoading}
            sendMessage={sendMessage}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function MobilePanel({ messages, isLoading, sendMessage }: ChatPanelProps) {
  const { isOpen, close } = useChatWidget()

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) close()
      }}
      isDismissable
      className="fixed inset-0 z-50 flex items-end bg-black/50 backdrop-blur-sm"
    >
      <Modal className="w-full h-[70vh] rounded-t-2xl bg-[var(--color-card)] shadow-2xl outline-none">
        <PanelContent
          messages={messages}
          isLoading={isLoading}
          sendMessage={sendMessage}
        />
      </Modal>
    </ModalOverlay>
  )
}

export function ChatPanel(props: ChatPanelProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <MobilePanel {...props} />
  }

  return <DesktopPanel {...props} />
}
