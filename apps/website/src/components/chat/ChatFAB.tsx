import { Button } from 'react-aria-components'
import { MessageSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useChatWidget } from '../../hooks/useChatWidget'

export function ChatFAB() {
  const { t } = useTranslation('website')
  const { toggle, hasSeenPulse } = useChatWidget()

  return (
    <Button
      onPress={toggle}
      aria-label={t('chat.fabLabel')}
      className="fixed bottom-4 end-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#2563EB] text-white shadow-lg hover:scale-105 transition-transform duration-150 cursor-pointer pressed:scale-95"
    >
      <MessageSquare className="h-6 w-6" />
      {!hasSeenPulse && (
        <span className="absolute top-0 end-0 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-[chat-pulse_1s_ease-out_1] rounded-full bg-[#16A34A] opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#16A34A]" />
        </span>
      )}
    </Button>
  )
}
