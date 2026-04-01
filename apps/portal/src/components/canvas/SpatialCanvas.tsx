import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { useMatches, useNavigate } from '@tanstack/react-router'
import { usePortalChat } from '../../hooks/usePortalChat'
import { ChatMessages } from '../chat/ChatMessages'
import { QuickActionChips } from '../chat/QuickActionChips'

const WINDOW_ROUTES = [
  '/orders',
  '/market',
  '/notifications',
  '/documents',
  '/support',
  '/settings',
  '/supplier/stock',
  '/supplier/orders',
]

interface SpatialCanvasProps {
  /** Greeting + NavButtons rendered when no active chat */
  greeting?: ReactNode
  children: ReactNode
}

export function SpatialCanvas({ greeting, children }: SpatialCanvasProps) {
  const matches = useMatches()
  const navigate = useNavigate()
  const chat = usePortalChat()

  const isWindowOpen = matches.some((m) =>
    WINDOW_ROUTES.some((p) => m.pathname.startsWith(p)),
  )

  const handleCanvasClick = () => {
    if (isWindowOpen) {
      navigate({ to: '/' })
    }
  }

  const hasMessages = chat.messages.length > 0 || chat.isLoading

  return (
    <motion.div
      animate={
        isWindowOpen
          ? { scale: 0.96, filter: 'blur(2px)', opacity: 0.5 }
          : { scale: 1, filter: 'blur(0px)', opacity: 1 }
      }
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      onClick={handleCanvasClick}
      className="h-dvh w-full flex flex-col items-center bg-[var(--color-base)]"
    >
      {/* Chat messages fill available space when present, otherwise show greeting */}
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
    </motion.div>
  )
}
