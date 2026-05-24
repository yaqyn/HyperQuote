import { ArrowDown } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { type AIChatMessage, useAIChatStore } from '../../stores/ai-chat'
import { SlidePanel } from './SlidePanel'

type AIChatPanelTone = 'default' | 'dark'

/**
 * AIChatPanel — the Correspondence.
 *
 * Every exchange with Lyon reads as a letter: a serif `L` monogram
 * crowns the thread, the title `Lyon` and a dated italic subtitle sit
 * next to it like a letterhead. Messages are ruled entries — a brand-
 * blue hairline runs down the speaker's edge of each entry, wrapping
 * both the eyebrow (role · time) and the body. The user types in
 * Archivo; Lyon replies in Literata. The typographic switch carries
 * the distinction of voice — you speak; Lyon authors.
 *
 * Empty state is the opening of a letter: a Literata prompt, an italic
 * atmosphere line, three italic starter questions as clickable seeds,
 * and a closing `— L` signature.
 */
export function AIChatPanel({ tone = 'default' }: { tone?: AIChatPanelTone }) {
	const isOpen = useAIChatStore((s) => s.isOpen)
	const close = useAIChatStore((s) => s.close)
	const messages = useAIChatStore((s) => s.messages)
	const draft = useAIChatStore((s) => s.draft)
	const setDraft = useAIChatStore((s) => s.setDraft)
	const send = useAIChatStore((s) => s.send)
	const clear = useAIChatStore((s) => s.clear)
	const isStreaming = useAIChatStore((s) => s.isStreaming)

	const scrollRef = useRef<HTMLDivElement>(null)
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const [showScrollToBottom, setShowScrollToBottom] = useState(false)
	const isDark = tone === 'dark'

	// Auto-stick to the bottom as new messages arrive — but only if the
	// user is already near the bottom. If they've scrolled up to read, we
	// leave their scroll position alone and show the jump-to-bottom button.
	useEffect(() => {
		if (!isOpen) return
		const node = scrollRef.current
		if (!node) return
		const nearBottom =
			node.scrollHeight - node.scrollTop - node.clientHeight < 160
		if (nearBottom) node.scrollTop = node.scrollHeight
	})

	// Focus the composer when the panel opens. Delayed one tick past the
	// SlidePanel spring so focus doesn't fight the slide-in.
	useEffect(() => {
		if (!isOpen) return
		const t = window.setTimeout(() => textareaRef.current?.focus(), 220)
		return () => window.clearTimeout(t)
	}, [isOpen])

	// Track scroll position so we know when to reveal the jump-to-bottom.
	useEffect(() => {
		if (!isOpen) return
		const node = scrollRef.current
		if (!node) return
		const handler = () => {
			const distance = node.scrollHeight - node.scrollTop - node.clientHeight
			setShowScrollToBottom(distance > 120)
		}
		handler()
		node.addEventListener('scroll', handler, { passive: true })
		return () => node.removeEventListener('scroll', handler)
	}, [isOpen])

	const jumpToBottom = () => {
		const node = scrollRef.current
		if (node) node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })
	}

	// Auto-size the composer textarea up to MAX_LINES, then let it scroll
	// internally. Runs in a layout effect so the height change happens
	// before paint — no flicker.
	useLayoutEffect(() => {
		const el = textareaRef.current
		if (!el) return
		const MAX_LINES = 6
		const cs = window.getComputedStyle(el)
		const lineHeight = parseFloat(cs.lineHeight || '20') || 20
		const maxHeight = lineHeight * MAX_LINES
		el.style.height = 'auto'
		el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
		el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden'
	})

	const seed = (prompt: string) => {
		setDraft(prompt)
		textareaRef.current?.focus()
	}

	return (
		<SlidePanel
			isOpen={isOpen}
			onClose={close}
			side="start"
			maxWidth={440}
			panelKey="ai-chat-panel"
			ariaLabel="AI assistant"
			tone={tone}
			mobileTitle={
				<span className="font-[family-name:var(--font-literata)] text-[18px] font-medium italic tracking-normal">
					Lyon
				</span>
			}
			mobileSubtitle={`assistant · ${formatLetterheadDate()}`}
			mobileAction={
				messages.length > 0 ? (
					<ClearButton onClear={clear} tone={tone} />
				) : undefined
			}
		>
			<div className="flex h-full min-h-0 flex-col">
				<ChatHeader
					hasConversation={messages.length > 0}
					onClear={clear}
					className="hidden lg:flex"
					tone={tone}
				/>

				{/* Thread */}
				<div className="relative min-h-0 flex-1">
					<div
						ref={scrollRef}
						data-lyon-thread="true"
						className="absolute inset-0 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6"
					>
						{messages.length === 0 ? (
							<EmptyState onSeed={seed} />
						) : (
							<div className="flex flex-col gap-7">
								{messages.map((m) => (
									<MessageEntry key={m.id} message={m} />
								))}
							</div>
						)}
					</div>

					{/* Jump-to-bottom — quiet fade, glass pill with brand accent */}
					<AnimatePresence>
						{showScrollToBottom && (
							<motion.button
								key="jump-to-bottom"
								type="button"
								onClick={jumpToBottom}
								aria-label="Jump to latest"
								initial={{ opacity: 0, y: 4 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: 4 }}
								transition={{ duration: 0.18, ease: 'easeOut' }}
								className={`absolute bottom-3 left-1/2 inline-flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full backdrop-blur-[2px] backdrop-saturate-150 transition-colors ${
									isDark
										? 'bg-white/[0.08] text-white/70 hover:bg-white/[0.12]'
										: 'bg-white/60 text-[var(--color-primary)] hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/15'
								}`}
							>
								<ArrowDown size={13} strokeWidth={2.5} />
							</motion.button>
						)}
					</AnimatePresence>
				</div>

				{/* Composer — glued to the bottom, reads as the continuation of a letter */}
				<form
					onSubmit={(e) => {
						e.preventDefault()
						send()
					}}
					className={`shrink-0 border-t px-5 py-3 sm:px-7 sm:py-4 ${
						isDark
							? 'border-white/[0.08]'
							: 'border-black/[0.08] dark:border-white/[0.08]'
					}`}
				>
					<div className="flex items-end gap-4">
						<textarea
							ref={textareaRef}
							value={draft}
							onChange={(e) => setDraft(e.target.value)}
							disabled={isStreaming}
							onKeyDown={(e) => {
								if (e.key === 'Enter' && !e.shiftKey) {
									e.preventDefault()
									send()
								}
							}}
							placeholder="ask lyon anything on screen…"
							rows={1}
							className="min-w-0 flex-1 resize-none bg-transparent font-[family-name:var(--font-archivo)] text-[var(--color-text)] outline-none placeholder:italic placeholder:text-[var(--color-text-subtle)] disabled:cursor-wait disabled:opacity-60"
							style={{
								fontSize: '13px',
								lineHeight: 1.55,
								letterSpacing: '0',
							}}
						/>
						<button
							type="submit"
							disabled={!draft.trim() || isStreaming}
							aria-label="Send"
							className="shrink-0 font-[family-name:var(--font-archivo)] italic text-[var(--color-primary)] transition-colors disabled:cursor-not-allowed disabled:text-[var(--color-text-subtle)]"
							style={{ fontSize: '12px' }}
						>
							send →
						</button>
					</div>
				</form>
			</div>
		</SlidePanel>
	)
}

// ─── Header ──────────────────────────────────────────────

function ChatHeader({
	hasConversation,
	onClear,
	className,
	tone = 'default',
}: {
	hasConversation: boolean
	onClear: () => void
	className?: string
	tone?: AIChatPanelTone
}) {
	const isDark = tone === 'dark'
	return (
		<header
			className={`h-16 shrink-0 items-center justify-between gap-4 border-b px-6 ${
				isDark
					? 'border-white/[0.08]'
					: 'border-black/[0.08] dark:border-white/[0.08]'
			} ${className ?? 'flex'}`}
		>
			<div className="min-w-0">
				<div className="flex min-w-0 items-baseline gap-2">
					<span
						className="truncate font-[family-name:var(--font-literata)] italic text-[var(--color-text)]"
						style={{
							fontSize: '22px',
							fontWeight: 500,
							letterSpacing: '0',
							lineHeight: 1,
						}}
					>
						Lyon
					</span>
					<span
						aria-hidden="true"
						className="h-px w-5 shrink-0 bg-[var(--color-primary)]"
					/>
				</div>
				<p
					className="mt-1.5 truncate font-[family-name:var(--font-archivo)] italic text-[var(--color-text-subtle)]"
					style={{ fontSize: '11px', letterSpacing: '0' }}
				>
					assistant · {formatLetterheadDate()}
				</p>
			</div>
			{hasConversation && <ClearButton onClear={onClear} tone={tone} />}
		</header>
	)
}

function ClearButton({
	onClear,
	tone = 'default',
}: {
	onClear: () => void
	tone?: AIChatPanelTone
}) {
	const isDark = tone === 'dark'
	return (
		<button
			type="button"
			onClick={onClear}
			aria-label="Clear conversation"
			className={`inline-flex h-8 shrink-0 items-center rounded-md px-2 font-[family-name:var(--font-archivo)] italic text-[var(--color-text-subtle)] transition-colors hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 ${
				isDark
					? 'hover:bg-white/[0.05]'
					: 'hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
			}`}
			style={{ fontSize: '11px', letterSpacing: '0' }}
		>
			clear ↻
		</button>
	)
}

function formatLetterheadDate(): string {
	const d = new Date()
	return d
		.toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
		})
		.toLowerCase()
}

// ─── Empty state ─────────────────────────────────────────

const STARTER_PROMPTS = [
	'what changed on screen today?',
	'where am i short on stock right now?',
	'summarize the last hour of activity.',
] as const

function EmptyState({ onSeed }: { onSeed: (prompt: string) => void }) {
	return (
		<div className="flex h-full items-start pt-2">
			<div
				className="ps-5"
				style={{
					borderInlineStart: '1px solid var(--color-primary)',
				}}
			>
				<p
					className="font-[family-name:var(--font-literata)]"
					style={{
						fontSize: '18px',
						fontWeight: 400,
						color: 'var(--color-text)',
						letterSpacing: '0',
						lineHeight: 1.3,
					}}
				>
					Ask me about anything on screen.
				</p>
				<p
					className="mt-2 max-w-[300px] font-[family-name:var(--font-archivo)] italic"
					style={{
						fontSize: '12px',
						color: 'var(--color-text-muted)',
						lineHeight: 1.5,
					}}
				>
					margins, stock, suppliers, order readiness — I see the same data you
					do and can help you decide faster.
				</p>

				<div className="mt-6">
					<p
						className="mb-2.5 font-[family-name:var(--font-archivo)] italic"
						style={{
							fontSize: '11px',
							color: 'var(--color-text-subtle)',
						}}
					>
						try asking —
					</p>
					<div className="flex flex-col gap-1.5">
						{STARTER_PROMPTS.map((prompt) => (
							<button
								key={prompt}
								type="button"
								onClick={() => onSeed(prompt)}
								className="group text-start font-[family-name:var(--font-literata)] transition-colors"
								style={{
									fontSize: '13px',
									color: 'var(--color-text-muted)',
									fontStyle: 'italic',
									letterSpacing: '0',
								}}
							>
								<span className="text-[var(--color-text-subtle)] group-hover:text-[var(--color-primary)] transition-colors">
									—{' '}
								</span>
								<span className="group-hover:text-[var(--color-text)] transition-colors">
									{prompt}
								</span>
							</button>
						))}
					</div>
				</div>

				<p
					className="mt-8 font-[family-name:var(--font-literata)] italic"
					style={{
						fontSize: '13px',
						color: 'var(--color-text-subtle)',
						letterSpacing: '0',
					}}
				>
					— L
				</p>
			</div>
		</div>
	)
}

// ─── Message entry ───────────────────────────────────────

function formatTime(iso: string): string {
	const d = new Date(iso)
	return d.toLocaleTimeString('en-EG', { hour: '2-digit', minute: '2-digit' })
}

function MessageEntry({ message }: { message: AIChatMessage }) {
	const isUser = message.role === 'user'
	const alignClass = isUser ? 'justify-end' : 'justify-start'
	const textAlignClass = isUser ? 'text-end' : 'text-start'
	const ruleStyle = isUser
		? {
				borderInlineEnd: '1px solid var(--color-primary)',
				paddingInlineEnd: '14px',
			}
		: {
				borderInlineStart: '1px solid var(--color-primary)',
				paddingInlineStart: '14px',
			}
	const isPending = !isUser && message.content === ''

	return (
		<motion.div
			className={`flex ${alignClass}`}
			initial={{ opacity: 0, y: 6 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.24, ease: 'easeOut' }}
		>
			<div className={`max-w-[94%] ${textAlignClass}`} style={ruleStyle}>
				{/* Eyebrow — italic role · mono time */}
				<div
					className={`flex items-baseline gap-2 ${alignClass}`}
					style={{ marginTop: '-2px' }}
				>
					<span
						className="font-[family-name:var(--font-archivo)] italic text-[var(--color-primary)]"
						style={{ fontSize: '11px', fontWeight: 500 }}
					>
						{isUser ? 'you' : 'lyon'}
					</span>
					<span
						className="font-[family-name:var(--font-plex-mono)] tabular-nums text-[var(--color-text-subtle)]"
						style={{ fontSize: '10px', letterSpacing: '0.04em' }}
					>
						{formatTime(message.createdAt)}
					</span>
				</div>

				{/* Body — user speaks Archivo, Lyon authors in Literata */}
				{isUser ? (
					<p
						className="mt-1.5 whitespace-pre-wrap font-[family-name:var(--font-archivo)] text-[var(--color-text)]"
						style={{
							fontSize: '13px',
							lineHeight: 1.55,
							letterSpacing: '0',
						}}
					>
						{message.content}
					</p>
				) : isPending ? (
					<TypingDots />
				) : (
					<p
						className="mt-1.5 whitespace-pre-wrap font-[family-name:var(--font-literata)] text-[var(--color-text)]"
						style={{
							fontSize: '14px',
							lineHeight: 1.55,
							letterSpacing: '0',
						}}
					>
						{message.content}
					</p>
				)}
			</div>
		</motion.div>
	)
}

// ─── Typing indicator ────────────────────────────────────
// Three italic dots, drifting in sequence. Reads like Lyon's
// pen hovering before the first word lands.

function TypingDots() {
	return (
		<div
			className="mt-2 flex items-end gap-1"
			aria-label="Lyon is composing"
			role="status"
		>
			{[0, 1, 2].map((i) => (
				<motion.span
					key={i}
					className="inline-block h-[5px] w-[5px] rounded-full"
					style={{ backgroundColor: 'var(--color-primary)', opacity: 0.55 }}
					animate={{ y: [0, -3, 0], opacity: [0.35, 0.85, 0.35] }}
					transition={{
						duration: 1.1,
						repeat: Infinity,
						ease: 'easeInOut',
						delay: i * 0.14,
					}}
				/>
			))}
		</div>
	)
}
