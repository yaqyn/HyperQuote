/**
 * ChatView — The full chat experience.
 *
 * Both states stacked via absolute positioning — no DOM swap.
 * Transition: pure opacity crossfade, no positional transforms.
 */

import { RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePortalChat } from '../../hooks/usePortalChat'
import { ChatInput } from './ChatInput'
import { ChatMessages } from './ChatMessages'
import { SuggestionChips } from './SuggestionChips'

interface ChatViewProps {
	userName: string
	locale: 'ar' | 'en'
}

export function ChatView({ userName, locale }: ChatViewProps) {
	const { t, i18n } = useTranslation('portal')
	const chat = usePortalChat()
	const realMessages = chat.messages.filter((m) => m.content.trim().length > 0)
	const hasMessages = realMessages.length > 0 || chat.isLoading

	const currentLocale = (i18n.language === 'ar' ? 'ar' : 'en') as 'ar' | 'en'
	const greeting = getGreeting(currentLocale)
	const firstName = userName.split(/\s+/)[0] ?? ''

	return (
		<div className="flex-1 flex flex-col h-full min-h-0">
			{/* Top bar — only show reset button when in active chat */}
			<div
				className="flex items-center justify-end px-5 py-3 shrink-0"
				style={{
					opacity: hasMessages ? 1 : 0,
					pointerEvents: hasMessages ? 'auto' : 'none',
					transition: hasMessages ? 'opacity 0.4s ease-out 0.6s' : 'none',
				}}
			>
				<button
					type="button"
					onClick={() => chat.clear()}
					className="w-8 h-8 flex items-center justify-center rounded-xl border border-[var(--p-border)] hover:bg-[var(--p-hover)] transition-colors"
					title={t('sidebar.newChat')}
				>
					<RotateCcw
						size={14}
						strokeWidth={1.5}
						className="text-[var(--p-text-muted)]"
					/>
				</button>
			</div>

			{/* Both states stacked — pure opacity crossfade, zero positional transforms */}
			<div className="flex-1 relative min-h-0">
				{/* Empty state */}
				<div
					className="absolute inset-0 flex flex-col items-center justify-center px-4 transition-opacity duration-300"
					style={{
						opacity: hasMessages ? 0 : 1,
						pointerEvents: hasMessages ? 'none' : 'auto',
					}}
				>
					<div className="text-center mb-8 max-w-[560px]">
						<h1
							className="text-[28px] font-semibold tracking-tight leading-snug mb-2"
							style={{
								background:
									'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.25) 100%)',
								WebkitBackgroundClip: 'text',
								WebkitTextFillColor: 'transparent',
								backgroundClip: 'text',
							}}
						>
							{greeting}
							{firstName && <>, {firstName}</>}
						</h1>
						<p className="text-[14px] text-[var(--p-text-muted)] leading-relaxed">
							{t('chat.emptySubtitle')}
						</p>
					</div>

					<div className="w-full max-w-[640px] mb-8">
						<ChatInput chat={chat} hasMessages={false} />
					</div>

					<SuggestionChips
						onSelect={(text) => chat.sendMessage(text)}
						locale={locale}
					/>
				</div>

				{/* Active state — instant hide on clear, fade in on activate */}
				<div
					className="absolute inset-0 flex flex-col min-h-0"
					style={{
						opacity: hasMessages ? 1 : 0,
						pointerEvents: hasMessages ? 'auto' : 'none',
						transition: hasMessages ? 'opacity 0.4s ease-out 0.15s' : 'none',
					}}
				>
					<ChatMessages messages={realMessages} isLoading={chat.isLoading} />
					<div className="shrink-0 px-4 pb-5 pt-2">
						<div className="max-w-[720px] mx-auto">
							<ChatInput chat={chat} hasMessages />
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

function getGreeting(locale: 'ar' | 'en'): string {
	const hour = new Date().getHours()
	if (locale === 'ar') {
		if (hour < 12)
			return '\u0635\u0628\u0627\u062D \u0627\u0644\u062E\u064A\u0631'
		return '\u0645\u0633\u0627\u0621 \u0627\u0644\u062E\u064A\u0631'
	}
	if (hour < 12) return 'Good morning'
	if (hour < 18) return 'Good afternoon'
	return 'Good evening'
}
