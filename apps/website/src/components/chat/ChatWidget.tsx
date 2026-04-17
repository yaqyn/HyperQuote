import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSharedChat } from '../../hooks/ChatProvider'
import type { ChatMessage } from '../../hooks/useAIChat'
import { useChatWidget } from '../../hooks/useChatWidget'
import { ChatFAB } from './ChatFAB'
import { ChatPanel } from './ChatPanel'

export function ChatWidget() {
	const { t } = useTranslation('website')
	const isOpen = useChatWidget((s) => s.isOpen)
	const pendingMessage = useChatWidget((s) => s.pendingMessage)
	const consumePendingMessage = useChatWidget((s) => s.consumePendingMessage)
	const { messages, sendMessage, isLoading } = useSharedChat()
	const hasInjectedWelcome = useRef(false)
	const hasSentPending = useRef(false)
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

	// Handle pending message from support search — fire once
	useEffect(() => {
		if (isOpen && pendingMessage && !hasSentPending.current) {
			hasSentPending.current = true
			const msg = consumePendingMessage()
			if (msg) sendMessage(msg)
		}
		if (!pendingMessage) {
			hasSentPending.current = false
		}
	}, [isOpen, pendingMessage, consumePendingMessage, sendMessage])

	const allMessages: ChatMessage[] = welcomeMessage
		? [welcomeMessage, ...messages]
		: messages

	return (
		<>
			<ChatFAB />
			<ChatPanel
				messages={allMessages}
				isLoading={isLoading}
				sendMessage={sendMessage}
			/>
		</>
	)
}
