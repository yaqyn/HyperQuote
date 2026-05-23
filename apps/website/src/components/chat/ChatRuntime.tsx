import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { type ChatMessage, useChatSession } from '../../hooks/chatSession'
import { useAIChat } from '../../hooks/useAIChat'
import { useChatWidget } from '../../hooks/useChatWidget'
import { ChatPanel } from './ChatPanel'

function waitForRuntimeReadyFrame() {
	return new Promise<void>((resolve) => {
		window.setTimeout(resolve, 0)
	})
}

export function ChatRuntime() {
	return (
		<>
			<ChatSessionBridge />
			<FloatingChatPanel />
		</>
	)
}

function ChatSessionBridge() {
	const chat = useAIChat()
	const bindRuntime = useChatSession((state) => state.bindRuntime)
	const consumeQueuedMessages = useChatSession(
		(state) => state.consumeQueuedMessages,
	)
	const queuedMessages = useChatSession((state) => state.queuedMessages)
	const setSnapshot = useChatSession((state) => state.setSnapshot)

	useEffect(() => {
		bindRuntime(async (message) => {
			await waitForRuntimeReadyFrame()
			await chat.sendMessage(message)
		})
	}, [bindRuntime, chat.sendMessage])

	useEffect(() => {
		setSnapshot({
			messages: chat.messages,
			isLoading: chat.isLoading,
			error: chat.error ?? null,
		})
	}, [chat.error, chat.isLoading, chat.messages, setSnapshot])

	useEffect(() => {
		if (queuedMessages.length === 0) return
		const messages = consumeQueuedMessages()
		void (async () => {
			await waitForRuntimeReadyFrame()
			for (const message of messages) {
				await chat.sendMessage(message)
			}
		})()
	}, [chat.sendMessage, consumeQueuedMessages, queuedMessages])

	return null
}

function FloatingChatPanel() {
	const { t } = useTranslation('website')
	const isOpen = useChatWidget((state) => state.isOpen)
	const pendingMessage = useChatWidget((state) => state.pendingMessage)
	const consumePendingMessage = useChatWidget(
		(state) => state.consumePendingMessage,
	)
	const messages = useChatSession((state) => state.messages)
	const sendMessage = useChatSession((state) => state.sendMessage)
	const isLoading = useChatSession((state) => state.isLoading)
	const hasInjectedWelcome = useRef(false)
	const hasSentPending = useRef(false)
	const [welcomeMessage, setWelcomeMessage] = useState<ChatMessage | null>(null)

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

	useEffect(() => {
		if (isOpen && pendingMessage && !hasSentPending.current) {
			hasSentPending.current = true
			const message = consumePendingMessage()
			if (message) void sendMessage(message)
		}
		if (!pendingMessage) {
			hasSentPending.current = false
		}
	}, [isOpen, pendingMessage, consumePendingMessage, sendMessage])

	const allMessages: ChatMessage[] = welcomeMessage
		? [welcomeMessage, ...messages]
		: messages

	return (
		<ChatPanel
			messages={allMessages}
			isLoading={isLoading}
			sendMessage={sendMessage}
		/>
	)
}
