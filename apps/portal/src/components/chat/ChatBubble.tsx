/**
 * ChatBubble — a LedgerEntry in Lyon's order book.
 *
 * No bubbles, no rounded cards. Just a speaker tag in the left margin
 * and body text on the page. Lyon speaks in serif italic (or Tajawal
 * Light for AR); the customer in Geist Mono. Numbers always mono,
 * and converted to Arabic-Indic when the locale is AR.
 *
 * Timestamps appear on hover, drawn tiny in the right margin.
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

// Wraps runs of digits in voice-mono so numbers always read as ledger
// entries regardless of the surrounding prose.
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
			<span key={matchIndex} className="voice-mono">
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
	customerTag?: string
}

export function ChatBubble({
	message,
	isStreaming,
	customerTag,
}: ChatBubbleProps) {
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

	const speakerTag = isUser
		? (customerTag ?? (isArabic ? 'أ.' : 'You'))
		: isArabic
			? 'ليون'
			: 'Lyon'

	return (
		<motion.li
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.35, ease: 'easeOut' }}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			className="group relative list-none"
		>
			{/* Hairline above every entry (except the very first — the ledger
			    already has a top rule) */}
			<div
				aria-hidden
				className="office-rule mb-4 first:hidden"
				style={{ opacity: 0.6 }}
			/>

			<article
				className="grid grid-cols-[60px_1fr] items-baseline gap-x-6 pb-4"
				aria-label={isUser ? 'You' : 'Lyon'}
			>
				<span className="office-tag">{speakerTag}</span>

				<div className="max-w-[640px]">
					{isUser ? (
						<p
							className="voice-mono whitespace-pre-wrap text-[13.5px] leading-[1.65] text-[var(--p-text)]"
							style={{ letterSpacing: '0.01em' }}
						>
							{processedContent}
						</p>
					) : (
						<>
							<p
								className={`whitespace-pre-wrap text-[var(--p-text)] ${
									isArabic
										? 'voice-serif-ar text-[16px] leading-[1.75]'
										: 'voice-serif text-[18px] leading-[1.55]'
								}`}
							>
								{processedContent}
								{isStreaming && (
									<span className="office-pen-nib ms-1" aria-hidden />
								)}
							</p>

							{message.richContent && message.richContent.length > 0 && (
								<div className="mt-3">
									<RichMessageList items={message.richContent} />
								</div>
							)}
						</>
					)}

					{/* Timestamp — appears on hover, small mono */}
					<span
						className="voice-mono mt-2 block text-[10px] tabular-nums text-[var(--p-text-faint)] transition-opacity duration-200"
						style={{ opacity: hovered ? 0.85 : 0, letterSpacing: '0.14em' }}
					>
						{formattedTime}
					</span>
				</div>
			</article>
		</motion.li>
	)
}
