/**
 * ChatMessages — the ledger body.
 *
 * Entries stack vertically, each is a LedgerEntry (ChatBubble).
 * No bubbles. Uniform left margin for the speaker tag, body beside it.
 * Scroll anchored to the bottom; jump-back glyph appears if scrolled up.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../../lib/chat-types'
import { ChatBubble } from './ChatBubble'
import { ScrollToBottom } from './ScrollToBottom'
import { TypingIndicator } from './TypingIndicator'

interface ChatMessagesProps {
	messages: ChatMessage[]
	isLoading: boolean
	customerTag?: string
}

const BOTTOM_THRESHOLD = 120

export function ChatMessages({
	messages,
	isLoading,
	customerTag,
}: ChatMessagesProps) {
	const scrollRef = useRef<HTMLDivElement>(null)
	const bottomRef = useRef<HTMLDivElement>(null)
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

	// Auto-scroll on new messages and on streaming token growth — unless the
	// user has scrolled up, in which case we hold position and let the jump
	// glyph reveal itself. The dep list references the signals whose *change*
	// should trigger the scroll; they're not read inside the body.
	const lastContent = lastMessage?.content ?? ''
	useEffect(() => {
		void [messages.length, lastContent, isLoading]
		if (userScrolledRef.current) return
		const el = bottomRef.current
		if (!el) return
		el.scrollIntoView({
			behavior: messages.length <= 1 ? 'auto' : 'smooth',
			block: 'end',
		})
	}, [messages.length, lastContent, isLoading])

	const scrollToBottom = useCallback(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
		userScrolledRef.current = false
		setShowScrollBtn(false)
	}, [])

	if (messages.length === 0 && !isLoading) return null

	return (
		<div className="relative flex min-h-0 flex-1 flex-col">
			<div
				ref={scrollRef}
				onScroll={handleScroll}
				className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-6 sm:pb-6 lg:px-10"
			>
				<ul
					className="mt-3 flex flex-col sm:mt-4"
					role="log"
					aria-live="polite"
					aria-relevant="additions"
				>
					{messages.map((msg, idx) => (
						<ChatBubble
							key={msg.id}
							message={msg}
							isStreaming={isStreaming && idx === messages.length - 1}
							customerTag={customerTag}
						/>
					))}

					{showTyping && <TypingIndicator />}

					<div ref={bottomRef} aria-hidden />
				</ul>
			</div>

			{/* Margin glyph — jump to latest */}
			<div className="pointer-events-none absolute inset-x-0 bottom-3 z-[3] flex justify-end pe-4 sm:pe-6 lg:pe-10">
				<div className="pointer-events-auto">
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
