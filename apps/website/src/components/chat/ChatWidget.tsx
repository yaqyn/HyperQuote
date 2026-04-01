import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useChatWidget } from '../../hooks/useChatWidget'
import { useAIChat } from '../../hooks/useAIChat'
import type { ChatMessage } from '../../hooks/useAIChat'
import { ChatFAB } from './ChatFAB'
import { ChatPanel } from './ChatPanel'

/**
 * ChatWidget — Orchestrator for FAB + Panel
 *
 * Renders the floating action button on all pages.
 * When opened, renders the ChatPanel with useAIChat hook.
 * Injects welcome message on first open for new visitors.
 */
export function ChatWidget() {
  const { t } = useTranslation('website')
  const isOpen = useChatWidget((s) => s.isOpen)
  const { messages, sendMessage, isLoading, error, clear } = useAIChat()
  const hasInjectedWelcome = useRef(false)
  const [welcomeMessage, setWelcomeMessage] = useState<ChatMessage | null>(null)

  // Inject welcome message on first open
  useEffect(() => {
    if (isOpen && !hasInjectedWelcome.current && messages.length === 0) {
      hasInjectedWelcome.current = true
      setWelcomeMessage({
        id: 'welcome',
        role: 'assistant',
        content: t('chat.welcome'),
      })
    }
  }, [isOpen, messages.length, t])

  // Combine welcome + real messages
  const allMessages: ChatMessage[] = welcomeMessage
    ? [welcomeMessage, ...messages]
    : messages

  return (
    <>
      <ChatFAB />
      {isOpen && (
        <ChatPanel
          messages={allMessages}
          isLoading={isLoading}
          sendMessage={sendMessage}
        />
      )}
    </>
  )
}
