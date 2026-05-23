import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import type { ChatMessage } from '../../lib/chat-types'
import { ChatMarkdown } from './ChatMarkdown'
import { RichMessageList } from './RichMessage'

interface ChatBubbleProps {
	message: ChatMessage
	isStreaming?: boolean
}

export function ChatBubble({ message, isStreaming }: ChatBubbleProps) {
	const { i18n, t } = useTranslation('portal')
	const isUser = message.role === 'user'
	const isArabic = i18n.language === 'ar'
	const hasRichContent = Boolean(message.richContent?.length)

	if (!message.content.trim() && !isStreaming && !hasRichContent) return null

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
								{message.content}
							</p>
						) : (
							<>
								{message.content.trim() || isStreaming ? (
									<ChatMarkdown
										content={message.content}
										isArabic={isArabic}
										isStreaming={isStreaming}
										className={`break-words text-[var(--p-text)] ${
											isArabic
												? 'voice-serif-ar text-[15px] leading-[1.55] sm:text-[17px] sm:leading-[1.68]'
												: 'voice-serif text-[15px] leading-[1.52] sm:text-[18px] sm:leading-[1.58]'
										}`}
									/>
								) : null}

								{hasRichContent && message.richContent ? (
									<div className="mt-2 sm:mt-3">
										<RichMessageList items={message.richContent} />
									</div>
								) : null}
							</>
						)}
					</div>
				</div>
			</article>
		</motion.li>
	)
}
