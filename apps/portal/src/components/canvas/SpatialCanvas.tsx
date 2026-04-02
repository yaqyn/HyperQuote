import type { ReactNode } from 'react'
import { usePortalChat } from '../../hooks/usePortalChat'
import { ChatMessages } from '../chat/ChatMessages'
import { QuickActionChips } from '../chat/QuickActionChips'
import { AIChatInput } from './AIChatInput'

interface SpatialCanvasProps {
  /** Greeting + nav rendered when no active chat */
  greeting?: ReactNode
}

export function SpatialCanvas({ greeting }: SpatialCanvasProps) {
  const chat = usePortalChat()
  const realMessages = chat.messages.filter((m) => m.content.trim().length > 0)
  const hasMessages = realMessages.length > 0 || chat.isLoading

  // Debug: log raw message structure
  if (chat.messages.length > 0) {
    console.log('[SpatialCanvas] messages:', chat.messages.length, 'real:', realMessages.length, 'isLoading:', chat.isLoading, JSON.stringify(chat.messages[0], null, 2))
  }

  return (
    <div className="h-dvh w-full flex flex-col items-center bg-[var(--color-base)]">
      {hasMessages ? (
        <ChatMessages messages={realMessages} isLoading={chat.isLoading} />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center">
          {greeting}
        </div>
      )}

      <div className="w-full flex flex-col items-center pb-[25vh] shrink-0">
        <AIChatInput chat={chat} />
        <div className="w-full max-w-[520px] px-4">
          <QuickActionChips sendMessage={chat.sendMessage} />
        </div>
      </div>
    </div>
  )
}
