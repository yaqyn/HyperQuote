import { motion } from 'motion/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { usePortalChat } from '../../hooks/usePortalChat'
import { PortalTitleRow } from '../shell/PortalTitleRow'
import { ChatInput } from './ChatInput'
import { ChatMessages } from './ChatMessages'
import { SuggestionChips } from './SuggestionChips'

interface ChatViewProps {
	locale: 'ar' | 'en'
}

export function ChatView({ locale }: ChatViewProps) {
	const { t } = useTranslation('portal')
	const chat = usePortalChat()

	const realMessages = useMemo(
		() => chat.messages.filter((m) => m.content.trim().length > 0),
		[chat.messages],
	)
	const hasMessages = realMessages.length > 0 || chat.isLoading

	const isArabic = locale === 'ar'
	const newPageLabel = t('chat.newPage', 'New page')

	return (
		<div className="office-paper relative flex min-h-0 flex-1 flex-col">
			<header className="relative z-[2] shrink-0 px-5 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-8 sm:pt-5 lg:px-12">
				<PortalTitleRow
					title={t('chat.writingPlaceholder')}
					className="mx-auto w-full max-w-[820px]"
					action={
						hasMessages ? (
							<button
								type="button"
								onClick={() => chat.clear()}
								className="office-quiet"
								aria-label={newPageLabel}
							>
								{newPageLabel}
							</button>
						) : null
					}
				/>
			</header>
			<div className="office-rule mx-5 sm:mx-8 lg:mx-12" />

			{hasMessages ? (
				<ActiveLedger messages={realMessages} isLoading={chat.isLoading} />
			) : (
				<EmptyDesk
					heading={t('chat.newProject')}
					isArabic={isArabic}
					onSuggest={(text) => chat.sendMessage(text)}
					locale={locale}
				/>
			)}

			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{
					duration: 0.5,
					delay: hasMessages ? 0.2 : 1.6,
					ease: 'easeOut',
				}}
				className="relative z-[2] shrink-0"
			>
				<div className="px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 sm:px-8 sm:pb-7 sm:pt-5 lg:px-12">
					<div className="mx-auto w-full max-w-[820px]">
						<ChatInput chat={chat} />
					</div>
				</div>
			</motion.div>
		</div>
	)
}

// ============================================================================
// EmptyDesk — the impressive first view when there are no messages yet.
// ============================================================================

function EmptyDesk({
	heading,
	isArabic,
	onSuggest,
	locale,
}: {
	heading: string
	isArabic: boolean
	onSuggest: (text: string) => void
	locale: 'ar' | 'en'
}) {
	return (
		<div className="relative z-[2] flex flex-1 items-center justify-center overflow-hidden px-4 py-[calc(env(safe-area-inset-top)+3rem)] sm:px-6 lg:px-10 lg:py-0">
			<DataGridBackdrop />

			<div className="relative z-[2] flex w-full max-w-[720px] flex-col items-center text-center">
				<motion.h1
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.55, delay: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
					className={`mt-4 text-[var(--p-text)] ${
						isArabic
							? 'voice-serif-ar text-[30px] font-semibold leading-[1.2] sm:text-[44px]'
							: 'voice-display text-[30px] leading-[1.1] sm:text-[44px]'
					}`}
				>
					{heading}
				</motion.h1>

				<motion.div
					initial={{ opacity: 0, scaleX: 0 }}
					animate={{ opacity: 1, scaleX: 1 }}
					transition={{ duration: 0.5, delay: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
					className="mt-5 h-px w-20 origin-center bg-[var(--p-rule-strong)] sm:w-24"
					aria-hidden
				/>

				<motion.div
					initial={{ opacity: 0, y: 4 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
					className="mt-6 w-full max-w-[700px] sm:mt-8"
				>
					<div className="office-rule mb-2 opacity-70" />
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4">
						<SuggestionChips onSelect={onSuggest} locale={locale} />
					</div>
					<div className="office-rule mt-2 opacity-70" />
				</motion.div>
			</div>
		</div>
	)
}

// Ambient depth — static radial lift behind the content.
function DataGridBackdrop() {
	return (
		<div
			aria-hidden
			className="pointer-events-none absolute inset-0"
			style={{
				background:
					'radial-gradient(ellipse 70% 50% at 50% 0%, var(--p-desk-depth-top), transparent 70%), radial-gradient(ellipse 100% 80% at 50% 100%, var(--p-desk-depth-bottom), transparent 65%)',
			}}
		/>
	)
}

// ============================================================================
// ActiveLedger — header, greeting as first entry, conversation, then writing.
// ============================================================================

function ActiveLedger({
	messages,
	isLoading,
}: {
	messages: ReturnType<typeof usePortalChat>['messages']
	isLoading: boolean
}) {
	return (
		<div className="relative flex min-h-0 flex-1 flex-col">
			<div className="office-ledger flex min-h-0 flex-1 flex-col">
				<ChatMessages messages={messages} isLoading={isLoading} />
			</div>
		</div>
	)
}
