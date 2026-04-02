import type { ReactNode } from 'react'
import { usePortalChat } from '../../hooks/usePortalChat'
import { ChatMessages } from '../chat/ChatMessages'
import { AIChatInput } from './AIChatInput'

interface SpatialCanvasProps {
  greeting?: ReactNode
}

export function SpatialCanvas({ greeting }: SpatialCanvasProps) {
  const chat = usePortalChat()
  const realMessages = chat.messages.filter((m) => m.content.trim().length > 0)
  const hasMessages = realMessages.length > 0 || chat.isLoading

  return (
    <div className="h-dvh w-full flex flex-col items-center bg-[var(--color-base)]">
      {hasMessages ? (
        <ChatMessages messages={realMessages} isLoading={chat.isLoading} />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center">
          {greeting}
        </div>
      )}

      {/* Input: high when idle (greeting visible), low when chatting */}
      <div className={`w-full flex flex-col items-center shrink-0 ${hasMessages ? 'pb-6' : 'pb-[25vh]'}`}>
        <AIChatInput chat={chat} hasMessages={hasMessages} />
      </div>
    </div>
  )
}
