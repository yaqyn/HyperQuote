/**
 * ChatView — Lyon's desk.
 *
 * Two states, same page.
 *
 * Empty: a large time-aware greeting, a day-note beneath, a drawn divider,
 * and three quiet commands to start from. Feels like opening the page for
 * the day.
 *
 * Active: the fresh-page header at top, a small greeting as the first
 * entry, then the rolling ledger of exchanges. Writing line at bottom.
 */

import { motion } from 'motion/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { usePortalChat } from '../../hooks/usePortalChat'
import { ChatInput } from './ChatInput'
import { ChatMessages } from './ChatMessages'
import { SuggestionChips } from './SuggestionChips'

interface ChatViewProps {
	userName: string
	locale: 'ar' | 'en'
}

const DATE_FORMATTER_EN = new Intl.DateTimeFormat('en-GB', {
	day: '2-digit',
	month: 'short',
	year: 'numeric',
})
const DATE_FORMATTER_AR = new Intl.DateTimeFormat('ar-EG', {
	day: 'numeric',
	month: 'long',
	year: 'numeric',
})
const WEEKDAY_FORMATTER_EN = new Intl.DateTimeFormat('en-US', {
	weekday: 'long',
})
const WEEKDAY_FORMATTER_AR = new Intl.DateTimeFormat('ar-EG', {
	weekday: 'long',
})

function formatToday(locale: 'ar' | 'en'): string {
	const fmt = locale === 'ar' ? DATE_FORMATTER_AR : DATE_FORMATTER_EN
	return fmt.format(new Date()).toUpperCase()
}

// Lyon's quiet opening aside. Rotates by day-of-year so the same greeting
// persists across a day but changes the next morning. Cheap charm without
// real market data — later we wire to the materials index.
const NOTES_EN = [
	'cement prices are steady',
	'rebar has firmed this week',
	'the ports ran slow this morning',
	'tile shipments are on time',
	'trucking is tight cross-country',
	'the market opened quiet',
	"it's been a busy morning",
	'sand is plentiful today',
]
const NOTES_AR = [
	'أسعار الأسمنت مستقرة',
	'الحديد ارتفع قليلاً هذا الأسبوع',
	'الموانئ كانت بطيئة صباحاً',
	'شحنات البلاط تصل في موعدها',
	'النقل الطويل مزدحم اليوم',
	'السوق افتتح هادئاً',
	'صباح مزدحم قليلاً',
	'الرمل متوفر بكثرة اليوم',
]

function dayOfYear(d = new Date()): number {
	const start = new Date(d.getFullYear(), 0, 0)
	const diff =
		d.getTime() -
		start.getTime() +
		(start.getTimezoneOffset() - d.getTimezoneOffset()) * 60 * 1000
	return Math.floor(diff / 86_400_000)
}

function pickNote(isArabic: boolean): string {
	const pool = isArabic ? NOTES_AR : NOTES_EN
	return pool[dayOfYear() % pool.length] ?? pool[0] ?? ''
}

function greetingFor(
	hour: number,
	isArabic: boolean,
	firstName: string,
): string {
	if (isArabic) {
		const base =
			hour < 12 ? 'صباح الخير' : hour < 18 ? 'مساء الخير' : 'مساء الخير'
		return firstName ? `${base}، يا ${firstName}.` : `${base}.`
	}
	const base =
		hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
	return firstName ? `${base}, ${firstName}.` : `${base}.`
}

export function ChatView({ userName, locale }: ChatViewProps) {
	const { t } = useTranslation('portal')
	const chat = usePortalChat()

	const realMessages = useMemo(
		() => chat.messages.filter((m) => m.content.trim().length > 0),
		[chat.messages],
	)
	const hasMessages = realMessages.length > 0 || chat.isLoading

	const firstName = userName.split(/\s+/)[0] ?? ''
	const isArabic = locale === 'ar'
	const today = formatToday(locale)
	const customerTag = useMemo(
		() => (firstName ? `${firstName.charAt(0).toUpperCase()}.` : undefined),
		[firstName],
	)

	const hour = new Date().getHours()
	const weekday = useMemo(() => {
		const fmt = isArabic ? WEEKDAY_FORMATTER_AR : WEEKDAY_FORMATTER_EN
		return fmt.format(new Date())
	}, [isArabic])
	const greeting = useMemo(
		() => greetingFor(hour, isArabic, firstName),
		[hour, isArabic, firstName],
	)
	const dayNote = useMemo(() => pickNote(isArabic), [isArabic])

	const greetingForHeader = useMemo(() => {
		if (isArabic) {
			return firstName
				? `أهلاً يا ${firstName}. ما الذي نُعدّه اليوم؟`
				: 'أهلاً بك. ما الذي نُعدّه اليوم؟'
		}
		return firstName
			? `Welcome, ${firstName}. What are we preparing today?`
			: 'Welcome. What are we preparing today?'
	}, [firstName, isArabic])

	return (
		<div className="office-paper relative flex min-h-0 flex-1 flex-col">
			{hasMessages ? (
				<ActiveLedger
					today={today}
					onNewPage={() => chat.clear()}
					newPageLabel={t('chat.newPage', 'New page')}
					greeting={greetingForHeader}
					isArabic={isArabic}
					messages={realMessages}
					isLoading={chat.isLoading}
					customerTag={customerTag}
				/>
			) : (
				<EmptyDesk
					greeting={greeting}
					weekday={weekday}
					dayNote={dayNote}
					isArabic={isArabic}
					onSuggest={(text) => chat.sendMessage(text)}
					locale={locale}
				/>
			)}

			{/* Writing line — present in both states */}
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
				<div className="office-rule mx-10" />
				<div className="px-10 pb-6 pt-4">
					<ChatInput chat={chat} hasMessages={hasMessages} />
				</div>
			</motion.div>
		</div>
	)
}

// ============================================================================
// EmptyDesk — the impressive first view when there are no messages yet.
// ============================================================================

function EmptyDesk({
	isArabic,
	onSuggest,
	locale,
}: {
	greeting: string
	weekday: string
	dayNote: string
	isArabic: boolean
	onSuggest: (text: string) => void
	locale: 'ar' | 'en'
}) {
	return (
		<div className="relative z-[2] flex flex-1 items-center justify-center overflow-hidden px-10">
			{/* Ambient data grid — subtle, institutional */}
			<DataGridBackdrop />

			<div className="relative z-[2] flex w-full max-w-[760px] flex-col items-center text-center">
				<motion.p
					initial={{ opacity: 0, y: 4 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
					className="voice-mono text-[10px] uppercase tracking-[0.32em] text-[var(--p-text-faint)]"
				>
					HyperQuote · Customer Portal
				</motion.p>

				<motion.h1
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.7, delay: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
					className={`mt-4 text-[var(--p-text)] ${
						isArabic
							? 'voice-serif-ar text-[46px] leading-[1.1]'
							: 'voice-display text-[56px] leading-[1] tracking-[-0.015em]'
					}`}
					style={isArabic ? undefined : { fontWeight: 300 }}
				>
					{isArabic ? 'مشروع جديد؟' : 'New Project?'}
				</motion.h1>

				<motion.div
					initial={{ opacity: 0, scaleX: 0 }}
					animate={{ opacity: 1, scaleX: 1 }}
					transition={{ duration: 0.6, delay: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
					className="mt-6 h-px w-24 origin-center bg-[var(--p-rule-strong)]"
					aria-hidden
				/>

				<motion.div
					initial={{ opacity: 0, y: 4 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 1, ease: [0.2, 0.8, 0.2, 1] }}
					className="mt-10 grid w-full grid-cols-1 gap-3 sm:grid-cols-3"
				>
					<SuggestionChips onSelect={onSuggest} locale={locale} />
				</motion.div>
			</div>
		</div>
	)
}

// Ambient depth — soft radial lift behind the content, a sparse dot-matrix
// at very low opacity, and a single concentric ring expanding out from center.
// Reads as "the system is quietly alive", not decoration.
function DataGridBackdrop() {
	return (
		<>
			{/* Depth — dark floor, tiny light shed from above, heavy corners */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0"
				style={{
					background:
						'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(255,255,255,0.025), transparent 70%), radial-gradient(ellipse 100% 80% at 50% 100%, rgba(0,0,0,0.35), transparent 65%)',
				}}
			/>
			{/* Dot-matrix */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0"
				style={{
					backgroundImage:
						'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)',
					backgroundSize: '26px 26px',
					opacity: 0.05,
					maskImage:
						'radial-gradient(ellipse 70% 80% at 50% 50%, black 0%, transparent 85%)',
					WebkitMaskImage:
						'radial-gradient(ellipse 70% 80% at 50% 50%, black 0%, transparent 85%)',
				}}
			/>
			{/* Expanding ring — very subtle, loops */}
			<motion.div
				aria-hidden
				className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border border-[var(--p-text-faint)]"
				style={{
					width: 40,
					height: 40,
					marginLeft: -20,
					marginTop: -20,
				}}
				initial={{ scale: 0.5, opacity: 0 }}
				animate={{ scale: [0.5, 14], opacity: [0, 0.06, 0] }}
				transition={{
					duration: 9,
					repeat: Infinity,
					ease: 'easeOut',
				}}
			/>
		</>
	)
}

// ============================================================================
// ActiveLedger — header, greeting as first entry, conversation, then writing.
// ============================================================================

function ActiveLedger({
	today,
	onNewPage,
	newPageLabel,
	greeting,
	isArabic,
	messages,
	isLoading,
	customerTag,
}: {
	today: string
	onNewPage: () => void
	newPageLabel: string
	greeting: string
	isArabic: boolean
	messages: ReturnType<typeof usePortalChat>['messages']
	isLoading: boolean
	customerTag?: string
}) {
	return (
		<>
			<header className="relative z-[2] flex shrink-0 items-baseline justify-between gap-4 px-10 pb-3 pt-8">
				<span className="office-meta">{`Today · ${today} · Page`}</span>
				<button
					type="button"
					onClick={onNewPage}
					className="office-quiet"
					aria-label={newPageLabel}
				>
					{newPageLabel}
				</button>
			</header>

			<div className="office-rule mx-10" />

			<div className="relative flex min-h-0 flex-1 flex-col">
				<div className="office-ledger flex min-h-0 flex-1 flex-col">
					<FirstEntryGreeting greeting={greeting} isArabic={isArabic} />
					<ChatMessages
						messages={messages}
						isLoading={isLoading}
						customerTag={customerTag}
					/>
				</div>
			</div>
		</>
	)
}

function FirstEntryGreeting({
	greeting,
	isArabic,
}: {
	greeting: string
	isArabic: boolean
}) {
	return (
		<motion.section
			initial={{ opacity: 0, y: 4 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5, ease: 'easeOut' }}
			aria-labelledby="greeting-tag"
			className="px-10 pt-7"
		>
			<div className="grid grid-cols-[60px_1fr] items-baseline gap-x-6">
				<span id="greeting-tag" className="office-tag">
					{isArabic ? 'ليون' : 'Lyon'}
				</span>
				<p
					className={`max-w-[640px] text-[var(--p-text)] ${
						isArabic
							? 'voice-serif-ar text-[17px] leading-[1.75]'
							: 'voice-serif text-[18px] leading-[1.55]'
					}`}
				>
					{greeting}
				</p>
			</div>
			<div className="office-rule mt-6" />
		</motion.section>
	)
}
