import { motion } from 'motion/react'
import { type ReactElement, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { ChatMessage } from '../../lib/chat-types'
import { toArabicIndic } from '../../lib/localized-digits'
import { RichMessageList } from './RichMessage'

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
}

export function ChatBubble({ message, isStreaming }: ChatBubbleProps) {
	const { i18n, t } = useTranslation('portal')
	const isUser = message.role === 'user'
	const isArabic = i18n.language === 'ar'

	const processedContent = useMemo(() => {
		if (isUser) return [message.content]
		return processNumbers(message.content, isArabic)
	}, [message.content, isUser, isArabic])

	if (!message.content.trim() && !isStreaming) return null

	const speakerTag = isUser ? t('chat.youLabel') : t('chat.assistantLabel')
	const articleLabel = isUser
		? t('chat.youMessageLabel')
		: t('chat.assistantMessageLabel')

	return (
		<motion.li
			dir="ltr"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.24, ease: 'easeOut' }}
			className={`list-none ${isUser ? 'flex justify-end' : 'block'}`}
		>
			<article
				className={`w-full ${isUser ? 'flex justify-end text-end' : ''}`}
				aria-label={articleLabel}
			>
				<div
					dir="auto"
					className={`min-w-0 ${isUser ? 'max-w-[82%] sm:max-w-[560px]' : 'max-w-[660px]'}`}
				>
					<span className="sr-only">{speakerTag}: </span>
					<div className={isUser ? 'office-user-entry' : undefined}>
						{isUser ? (
							<p
								className={`whitespace-pre-wrap break-words font-sans text-[14px] leading-[1.45] text-[var(--p-text)] sm:text-[15px] sm:leading-[1.58] ${
									isArabic ? 'font-arabic' : ''
								}`}
							>
								{processedContent}
							</p>
						) : (
							<>
								<p
									className={`whitespace-pre-wrap break-words text-[var(--p-text)] ${
										isArabic
											? 'voice-serif-ar text-[15px] leading-[1.55] sm:text-[17px] sm:leading-[1.68]'
											: 'voice-serif text-[15px] leading-[1.52] sm:text-[18px] sm:leading-[1.58]'
									}`}
								>
									{processedContent}
									{isStreaming && (
										<span className="office-pen-nib ms-1" aria-hidden />
									)}
								</p>

								{message.richContent && message.richContent.length > 0 && (
									<div className="mt-2 sm:mt-3">
										<RichMessageList items={message.richContent} />
									</div>
								)}
							</>
						)}
					</div>
				</div>
			</article>
		</motion.li>
	)
}
