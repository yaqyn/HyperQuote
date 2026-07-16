import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../../lib/chat-types'
import { ChatBubble } from './ChatBubble'
import { ScrollToBottom } from './ScrollToBottom'
import { TypingIndicator } from './TypingIndicator'

interface ChatMessagesProps {
	messages: ChatMessage[]
	isLoading: boolean
}

const BOTTOM_THRESHOLD = 120

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
	const scrollRef = useRef<HTMLDivElement>(null)
	const listRef = useRef<HTMLUListElement>(null)
	const [showScrollBtn, setShowScrollBtn] = useState(false)
	const userScrolledRef = useRef(false)

	const lastMessage = messages[messages.length - 1]
	const showTyping =
		isLoading && messages.length > 0 && lastMessage?.role === 'user'
	const isStreaming =
		isLoading && messages.length > 0 && lastMessage?.role === 'assistant'

	const handleScroll = useCallback(() => {
		const el = scrollRef.current
		if (!el) return
		const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
		const scrolledUp = distanceFromBottom > BOTTOM_THRESHOLD
		setShowScrollBtn(scrolledUp)
		// Returning to the bottom re-sticks; scrolling up unsticks.
		userScrolledRef.current = scrolledUp
	}, [])

	const scrollMessagesToBottom = useCallback((behavior: ScrollBehavior) => {
		const el = scrollRef.current
		if (!el) return
		el.scrollTo({
			behavior,
			top: el.scrollHeight,
		})
	}, [])

	// Auto-scroll on new messages and on streaming token growth — unless the
	// user has scrolled up, in which case we hold position and let the jump
	// glyph reveal itself. The dep list references the signals whose *change*
	// should trigger the scroll; they're not read inside the body.
	const lastContent = lastMessage?.content ?? ''
	const lastRole = lastMessage?.role
	const lastRichContentCount = lastMessage?.richContent?.length ?? 0
	useEffect(() => {
		void [
			messages.length,
			lastContent,
			isLoading,
			lastRole,
			lastRichContentCount,
		]
		if (userScrolledRef.current) return
		if (lastRole === 'assistant' && lastRichContentCount > 0 && !isLoading) {
			const scroller = scrollRef.current
			const entries = listRef.current?.querySelectorAll<HTMLElement>(
				'[data-chat-message]',
			)
			const entry = entries?.[entries.length - 1]
			if (scroller && entry) {
				scroller.scrollTo({ behavior: 'smooth', top: entry.offsetTop - 20 })
				return
			}
		}
		scrollMessagesToBottom(messages.length <= 1 ? 'auto' : 'smooth')
	}, [
		messages.length,
		lastContent,
		isLoading,
		lastRole,
		lastRichContentCount,
		scrollMessagesToBottom,
	])

	const scrollToBottom = useCallback(() => {
		scrollMessagesToBottom('auto')
		userScrolledRef.current = false
		setShowScrollBtn(false)
	}, [scrollMessagesToBottom])

	if (messages.length === 0 && !isLoading) return null

	return (
		<div className="relative flex min-h-0 flex-1 flex-col">
			<div
				ref={scrollRef}
				onScroll={handleScroll}
				className="flex-1 touch-pan-y overflow-y-auto overscroll-contain px-5 pb-4 pt-6 [-webkit-overflow-scrolling:touch] sm:px-8 sm:pb-7 sm:pt-7 lg:px-12"
			>
				<ul
					ref={listRef}
					className="mx-auto flex w-full max-w-[820px] flex-col gap-4 sm:gap-6"
					role="log"
					aria-live="polite"
					aria-relevant="additions"
				>
					{messages.map((msg, idx) => (
						<ChatBubble
							key={msg.id}
							message={msg}
							isStreaming={isStreaming && idx === messages.length - 1}
						/>
					))}

					{showTyping && <TypingIndicator />}
				</ul>
			</div>

			{/* Margin glyph — jump to latest */}
			<div className="pointer-events-none absolute inset-x-0 bottom-3 z-[3] flex justify-center px-4 sm:px-6 lg:px-10">
				<div className="pointer-events-auto flex w-full max-w-[820px] justify-end">
					<ScrollToBottom show={showScrollBtn} onClick={scrollToBottom} />
				</div>
			</div>

			{/* Screen reader only — last assistant message announcement */}
			<div aria-live="polite" className="sr-only">
				{lastMessage?.role === 'assistant' ? lastMessage.content : null}
			</div>
		</div>
	)
}
