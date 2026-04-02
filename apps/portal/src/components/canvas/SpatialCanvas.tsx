import type { ReactNode } from 'react'
import { usePortalChat } from '../../hooks/usePortalChat'
import { ChatMessages } from '../chat/ChatMessages'
import { QuickActionChips } from '../chat/QuickActionChips'

interface SpatialCanvasProps {
  /** Greeting + nav rendered when no active chat */
  greeting?: ReactNode
  children: ReactNode
}

export function SpatialCanvas({ greeting, children }: SpatialCanvasProps) {
  const chat = usePortalChat()
  const hasMessages = chat.messages.length > 0 || chat.isLoading

  return (
    <div className="h-dvh w-full flex flex-col items-center bg-[var(--color-base)]">
      {/* Chat messages fill space when present, otherwise show greeting */}
      {hasMessages ? (
        <ChatMessages messages={chat.messages} isLoading={chat.isLoading} />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center">
          {greeting}
        </div>
      )}

      {/* Input area + quick action chips at bottom */}
      <div className="w-full flex flex-col items-center pb-4 shrink-0">
        {children}
        <div className="w-full max-w-[640px] px-4">
          <QuickActionChips sendMessage={chat.sendMessage} />
        </div>
      </div>
    </div>
  )
}
