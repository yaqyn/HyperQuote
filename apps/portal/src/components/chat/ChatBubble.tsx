import { Check, Copy } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
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
	const [copied, setCopied] = useState(false)
	const isUser = message.role === 'user'
	const isArabic = i18n.language === 'ar'
	const hasRichContent = Boolean(message.richContent?.length)

	if (!message.content.trim() && !isStreaming && !hasRichContent) return null

	const speakerTag = isUser ? t('chat.youLabel') : t('chat.assistantLabel')
	const articleLabel = isUser
		? t('chat.youMessageLabel')
		: t('chat.assistantMessageLabel')
	const time = new Intl.DateTimeFormat(isArabic ? 'ar-EG' : 'en-EG', {
		hour: 'numeric',
		minute: '2-digit',
	}).format(new Date(message.timestamp))
	const copyLabel = copied
		? isArabic
			? 'تم النسخ'
			: 'Copied'
		: isArabic
			? 'نسخ الرد'
			: 'Copy response'

	async function copyResponse() {
		if (!message.content.trim()) return
		try {
			await navigator.clipboard.writeText(message.content)
			setCopied(true)
			window.setTimeout(() => setCopied(false), 1600)
		} catch {
			setCopied(false)
		}
	}

	return (
		<motion.li
			dir="ltr"
			data-chat-message
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
					className={`min-w-0 ${isUser ? 'max-w-[82%] sm:max-w-[560px]' : 'max-w-[720px]'}`}
				>
					<span className="sr-only">{speakerTag}: </span>
					<div
						className={isUser ? 'office-user-entry' : 'group/answer min-w-0'}
					>
						{isUser ? (
							<>
								<div className="mb-1 flex items-center justify-end gap-2 voice-mono text-[9px] uppercase tracking-[0.12em] text-[var(--p-text-faint)]">
									<span>{time}</span>
									<span>{speakerTag}</span>
								</div>
								<p
									className={`whitespace-pre-wrap break-words font-sans text-[14px] leading-[1.45] text-[var(--p-text)] sm:text-[15px] sm:leading-[1.58] ${
										isArabic ? 'font-arabic' : ''
									}`}
								>
									{message.content}
								</p>
							</>
						) : (
							<>
								<header className="mb-2 flex min-h-7 items-center justify-between gap-3">
									<div className="flex min-w-0 items-center gap-2">
										<span className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center">
											{isStreaming ? (
												<span className="absolute h-full w-full animate-ping rounded-full bg-[var(--p-accent)] opacity-35" />
											) : null}
											<span className="relative h-2 w-2 rounded-full bg-[var(--p-accent)]" />
										</span>
										<span className="text-[12px] font-semibold text-[var(--p-text)]">
											Lyon
										</span>
										<span className="voice-mono text-[9px] uppercase tracking-[0.12em] text-[var(--p-text-faint)]">
											{isStreaming
												? isArabic
													? 'يكتب معك'
													: 'working with you'
												: time}
										</span>
									</div>
									{message.content.trim() && !isStreaming ? (
										<button
											type="button"
											onClick={copyResponse}
											className="inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-[10px] font-medium text-[var(--p-text-faint)] opacity-100 transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)] sm:opacity-0 sm:group-hover/answer:opacity-100 sm:focus-visible:opacity-100"
											aria-label={copyLabel}
										>
											{copied ? (
												<Check size={12} strokeWidth={2} />
											) : (
												<Copy size={12} strokeWidth={1.7} />
											)}
											<span>{copyLabel}</span>
										</button>
									) : null}
								</header>

								<div className="min-w-0 border-s-2 border-[color-mix(in_srgb,var(--p-accent)_32%,var(--p-rule))] ps-3 sm:ps-4">
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
										<div className="mt-3 sm:mt-4">
											<RichMessageList items={message.richContent} />
										</div>
									) : null}
								</div>
							</>
						)}
					</div>
				</div>
			</article>
		</motion.li>
	)
}
