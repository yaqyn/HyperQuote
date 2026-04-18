import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import type { ChatMessage } from '../../hooks/useAIChat'
import { TypingIndicator } from './TypingIndicator'

interface ChatMessagesProps {
	messages: ChatMessage[]
	isLoading: boolean
}

const enter = {
	initial: { opacity: 0, y: 4 },
	animate: { opacity: 1, y: 0 },
	transition: { duration: 0.2 },
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
	const scrollRef = useRef<HTMLDivElement>(null)
	const lastContent = messages[messages.length - 1]?.content ?? ''

	useEffect(() => {
		const el = scrollRef.current
		if (el) el.scrollTop = el.scrollHeight
		// Re-run on new messages, on streaming-chunk growth of the last message,
		// and when the typing indicator toggles — keeps the view stuck to bottom.
	}, [messages.length, lastContent, isLoading])

	return (
		<div ref={scrollRef} className="h-full overflow-y-auto px-5 py-5">
			<div className="flex flex-col gap-5">
				{messages.map((msg) =>
					msg.role === 'user' ? (
						<motion.div key={msg.id} {...enter} className="flex justify-end">
							<div className="max-w-[80%]">
								<p className="text-[14px] leading-[1.6] text-end font-medium">
									{msg.content}
								</p>
							</div>
						</motion.div>
					) : (
						<motion.div key={msg.id} {...enter} className="max-w-[90%]">
							<p className="text-[14px] leading-[1.7] opacity-60">
								{msg.content}
							</p>
						</motion.div>
					),
				)}
				{isLoading && <TypingIndicator />}
			</div>
		</div>
	)
}
