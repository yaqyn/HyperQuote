/**
 * ChatBubble — Dark theme message bubbles.
 * User: right-aligned, subtle card background.
 * AI: left-aligned, no background, just text.
 * Numbers in Geist Mono. Timestamps on hover.
 */

import { motion } from 'motion/react'
import { type ReactElement, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ChatMessage } from '../../lib/chat-types'
import { RichMessageList } from './RichMessage'

const WESTERN_TO_ARABIC_INDIC: Record<string, string> = {
	'0': '\u0660',
	'1': '\u0661',
	'2': '\u0662',
	'3': '\u0663',
	'4': '\u0664',
	'5': '\u0665',
	'6': '\u0666',
	'7': '\u0667',
	'8': '\u0668',
	'9': '\u0669',
}

function toArabicIndic(str: string): string {
	return str.replace(/[0-9]/g, (d) => WESTERN_TO_ARABIC_INDIC[d] ?? d)
}

function processNumbers(
	text: string,
	isArabic: boolean,
): (string | ReactElement)[] {
	const parts: (string | ReactElement)[] = []
	const regex = /\d[\d,.\s]*/g
	let lastIndex = 0
	const matches = Array.from(text.matchAll(regex))

	for (const match of matches) {
		const matchIndex = match.index ?? 0
		if (matchIndex > lastIndex) parts.push(text.slice(lastIndex, matchIndex))
		const display = isArabic ? toArabicIndic(match[0]) : match[0]
		parts.push(
			<span key={matchIndex} className="font-mono">
				{display}
			</span>,
		)
		lastIndex = matchIndex + match[0].length
	}

	if (lastIndex < text.length) parts.push(text.slice(lastIndex))
	return parts.length > 0 ? parts : [text]
}

interface ChatBubbleProps {
	message: ChatMessage
	isStreaming?: boolean
}

export function ChatBubble({ message, isStreaming }: ChatBubbleProps) {
	const { i18n } = useTranslation()
	const isUser = message.role === 'user'
	const isArabic = i18n.language === 'ar'
	const [hovered, setHovered] = useState(false)

	const formattedTime = useMemo(() => {
		const d = new Date(message.timestamp)
		return d.toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US', {
			hour: '2-digit',
			minute: '2-digit',
		})
	}, [message.timestamp, isArabic])

	const processedContent = useMemo(() => {
		if (isUser) return [message.content]
		return processNumbers(message.content, isArabic)
	}, [message.content, isUser, isArabic])

	if (!message.content.trim() && !isStreaming) return null

	return (
		<motion.div
			initial={{ opacity: 0, y: 6 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				type: 'spring',
				stiffness: 300,
				damping: 28,
			}}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			className={`group relative flex flex-col py-2 ${isUser ? 'items-end' : 'items-start'}`}
		>
			{isUser ? (
				<div className="max-w-[75%] px-4 py-2.5 rounded-2xl bg-[var(--p-card)] border border-[var(--p-border)]">
					<p className="text-sm leading-relaxed text-[var(--p-text)] whitespace-pre-wrap">
						{processedContent}
					</p>
				</div>
			) : (
				<div className="max-w-[85%]">
					<p className="text-sm leading-[1.7] text-[var(--p-text-secondary)] whitespace-pre-wrap">
						{processedContent}
						{isStreaming && (
							<span className="inline-block w-[2px] h-[14px] bg-[var(--p-text-secondary)] align-middle ms-1 animate-pulse" />
						)}
					</p>

					{/* Rich content */}
					{message.richContent && message.richContent.length > 0 && (
						<div className="mt-3">
							<RichMessageList items={message.richContent} />
						</div>
					)}
				</div>
			)}

			{/* Timestamp */}
			<span
				className="font-mono text-[13px] text-[var(--p-text-muted)] mt-1 px-1 transition-opacity duration-200"
				style={{ opacity: hovered ? 0.7 : 0 }}
			>
				{formattedTime}
			</span>
		</motion.div>
	)
}
