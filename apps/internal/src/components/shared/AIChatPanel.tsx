import { ArrowDown } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useInternalAuth } from '../../lib/internal-auth'
import { MODULES } from '../../lib/modules'
import { type AIChatMessage, useAIChatStore } from '../../stores/ai-chat'
import { SlidePanel } from './SlidePanel'

type AIChatPanelTone = 'default' | 'dark'
const THREAD_BOTTOM_THRESHOLD = 120

function isThreadNearBottom(node: HTMLDivElement): boolean {
	return (
		node.scrollHeight - node.scrollTop - node.clientHeight <=
		THREAD_BOTTOM_THRESHOLD
	)
}

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
	const { t } = useTranslation('internal')
	const auth = useInternalAuth()
	const isOpen = useAIChatStore((s) => s.isOpen)
	const close = useAIChatStore((s) => s.close)
	const messages = useAIChatStore((s) => s.messages)
	const draft = useAIChatStore((s) => s.draft)
	const setDraft = useAIChatStore((s) => s.setDraft)
	const send = useAIChatStore((s) => s.send)
	const clear = useAIChatStore((s) => s.clear)
	const isStreaming = useAIChatStore((s) => s.isStreaming)
	const panelId = useAIChatStore((s) => s.panelId)

	const scrollRef = useRef<HTMLDivElement>(null)
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const pinnedToBottomRef = useRef(true)
	const [showScrollToBottom, setShowScrollToBottom] = useState(false)
	const isDark = tone === 'dark'

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
			const pinned = isThreadNearBottom(node)
			pinnedToBottomRef.current = pinned
			setShowScrollToBottom(!pinned)
		}
		handler()
		node.addEventListener('scroll', handler, { passive: true })
		return () => node.removeEventListener('scroll', handler)
	}, [isOpen])

	// Keep the thread pinned while the user is already at the bottom, including
	// while Lyon streams tokens. If the user scrolls up, leave them there.
	useLayoutEffect(() => {
		if (!isOpen) return
		const node = scrollRef.current
		if (!node) return
		if (messages.length <= 1 || pinnedToBottomRef.current) {
			node.scrollTop = node.scrollHeight
			pinnedToBottomRef.current = true
			setShowScrollToBottom(false)
		}
	}, [isOpen, messages])

	const jumpToBottom = () => {
		const node = scrollRef.current
		if (!node) return
		pinnedToBottomRef.current = true
		setShowScrollToBottom(false)
		node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })
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
	const activeModule = MODULES.find((module) => module.id === panelId)
	const panelName = activeModule ? t(activeModule.labelKey) : 'Workspace'
	const employeeName = employeeDisplayName(auth)

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
			keyboardAware
		>
			<div className="flex h-full min-h-0 flex-col">
				<ChatHeader
					hasConversation={messages.length > 0}
					onClear={clear}
					className="hidden lg:flex"
					tone={tone}
				/>

				{/* Thread */}
				<div className="relative min-h-0 flex-1 overflow-hidden overscroll-contain">
					<div
						ref={scrollRef}
						data-lyon-thread="true"
						className="absolute inset-0 touch-pan-y overflow-y-auto overscroll-contain px-5 py-5 [-webkit-overflow-scrolling:touch] sm:px-7 sm:py-6"
					>
						{messages.length === 0 ? (
							<EmptyState
								employeeName={employeeName}
								onSeed={seed}
								panelName={panelName}
							/>
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
							readOnly={isStreaming}
							aria-disabled={isStreaming}
							onKeyDown={(e) => {
								if (e.key === 'Enter' && !e.shiftKey) {
									e.preventDefault()
									send()
								}
							}}
							placeholder="ask lyon anything…"
							rows={1}
							className={`min-w-0 flex-1 resize-none bg-transparent font-[family-name:var(--font-archivo)] text-[var(--color-text)] outline-none placeholder:italic placeholder:text-[var(--color-text-subtle)] ${
								isStreaming ? 'cursor-wait opacity-60' : ''
							}`}
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
	'what needs attention right now?',
	'where am i short on stock?',
	'summarize the latest activity.',
] as const

function EmptyState({
	employeeName,
	onSeed,
	panelName,
}: {
	employeeName: string
	onSeed: (prompt: string) => void
	panelName: string
}) {
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
					Welcome back, {employeeName}.
					<br />
					{panelName} is ready.
				</p>

				<div className="mt-7">
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

function employeeDisplayName(auth: ReturnType<typeof useInternalAuth>): string {
	const metadata = auth?.user.user_metadata
	const metadataName =
		typeof metadata?.full_name === 'string'
			? metadata.full_name
			: typeof metadata?.name === 'string'
				? metadata.name
				: typeof metadata?.display_name === 'string'
					? metadata.display_name
					: ''
	const emailName = auth?.user.email?.split('@')[0] ?? ''
	const name = metadataName.trim() || emailName.trim()
	return name || 'there'
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
					<FormattedAssistantMessage content={message.content} />
				)}
			</div>
		</motion.div>
	)
}

function FormattedAssistantMessage({ content }: { content: string }) {
	const blocks = parseAssistantBlocks(content)
	const blockKeys = createStableKeys(
		blocks.map(assistantBlockIdentity),
		'block',
	)
	return (
		<div
			className="mt-1.5 space-y-3 break-words font-[family-name:var(--font-literata)] text-[var(--color-text)]"
			style={{
				fontSize: '14px',
				lineHeight: 1.55,
				letterSpacing: '0',
			}}
		>
			{blocks.map((block, blockPosition) =>
				renderAssistantBlock(block, blockKeys[blockPosition] ?? 'block'),
			)}
		</div>
	)
}

type AssistantBlock =
	| { text: string; type: 'paragraph' }
	| { items: string[]; ordered: boolean; type: 'list' }
	| { text: string; type: 'code' }
	| { headers: string[]; rows: string[][]; type: 'table' }

function parseAssistantBlocks(content: string): AssistantBlock[] {
	const lines = content.replace(/\r\n/g, '\n').split('\n')
	const blocks: AssistantBlock[] = []
	let index = 0

	while (index < lines.length) {
		const line = lines[index] ?? ''
		if (!line.trim()) {
			index += 1
			continue
		}

		if (/^\s*```/.test(line)) {
			const codeLines: string[] = []
			index += 1
			while (index < lines.length && !/^\s*```/.test(lines[index] ?? '')) {
				codeLines.push(lines[index] ?? '')
				index += 1
			}
			if (index < lines.length) index += 1
			blocks.push({ text: codeLines.join('\n'), type: 'code' })
			continue
		}

		if (isAssistantTableAt(lines, index)) {
			const headers = splitTableRow(lines[index] ?? '')
			const rows: string[][] = []
			index += 2
			while (index < lines.length && isTableRow(lines[index] ?? '')) {
				rows.push(
					padTableRow(splitTableRow(lines[index] ?? ''), headers.length),
				)
				index += 1
			}
			blocks.push({ headers, rows, type: 'table' })
			continue
		}

		const listMatch = matchAssistantListLine(line)
		if (listMatch) {
			const ordered = listMatch.ordered
			const items: string[] = []
			while (index < lines.length) {
				const currentMatch = matchAssistantListLine(lines[index] ?? '')
				if (!currentMatch || currentMatch.ordered !== ordered) break
				items.push(currentMatch.text)
				index += 1
			}
			blocks.push({ items, ordered, type: 'list' })
			continue
		}

		const paragraphLines: string[] = []
		while (index < lines.length && !isAssistantSpecialStart(lines, index)) {
			const current = lines[index] ?? ''
			if (!current.trim()) break
			paragraphLines.push(current.trim())
			index += 1
		}
		blocks.push({ text: paragraphLines.join('\n'), type: 'paragraph' })
	}

	return blocks.length > 0 ? blocks : [{ text: content, type: 'paragraph' }]
}

function renderAssistantBlock(block: AssistantBlock, blockKey: string) {
	switch (block.type) {
		case 'paragraph':
			return (
				<p key={blockKey} className="whitespace-pre-wrap">
					{renderAssistantInline(block.text, blockKey)}
				</p>
			)
		case 'list': {
			const ListTag = block.ordered ? 'ol' : 'ul'
			const itemKeys = createStableKeys(block.items, `${blockKey}:item`)
			return (
				<ListTag
					key={blockKey}
					className={`space-y-1.5 ${
						block.ordered ? 'list-decimal' : 'list-disc'
					} ps-5`}
				>
					{block.items.map((item, itemPosition) => (
						<li key={itemKeys[itemPosition] ?? `${blockKey}:item`}>
							{renderAssistantInline(
								item,
								itemKeys[itemPosition] ?? `${blockKey}:item`,
							)}
						</li>
					))}
				</ListTag>
			)
		}
		case 'code':
			return (
				<pre
					key={blockKey}
					className="overflow-x-auto rounded-md border border-black/[0.08] bg-black/[0.03] p-3 text-start dark:border-white/[0.1] dark:bg-white/[0.05]"
				>
					<code className="font-[family-name:var(--font-plex-mono)] text-[12px] leading-relaxed">
						{block.text}
					</code>
				</pre>
			)
		case 'table': {
			const headerKeys = createStableKeys(block.headers, `${blockKey}:head`)
			const rowKeys = createStableKeys(
				block.rows.map((row) => row.join('\u001f')),
				`${blockKey}:row`,
			)
			return (
				<div key={blockKey} className="max-w-full overflow-x-auto">
					<table className="w-full min-w-[260px] border-collapse text-start font-[family-name:var(--font-archivo)] text-[12px]">
						<thead>
							<tr>
								{block.headers.map((header, headerPosition) => (
									<th
										key={headerKeys[headerPosition] ?? `${blockKey}:head`}
										className="border-b border-black/[0.12] px-2 py-2 text-start font-semibold dark:border-white/[0.14]"
									>
										{renderAssistantInline(
											header,
											headerKeys[headerPosition] ?? `${blockKey}:head`,
										)}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{block.rows.map((row, rowPosition) => {
								const rowKey = rowKeys[rowPosition] ?? `${blockKey}:row`
								const cellKeys = createStableKeys(
									row.map(
										(cell, cellPosition) =>
											`${block.headers[cellPosition] ?? 'cell'}:${cell}`,
									),
									`${rowKey}:cell`,
								)
								return (
									<tr key={rowKey}>
										{row.map((cell, cellPosition) => {
											const cellKey = cellKeys[cellPosition] ?? `${rowKey}:cell`
											return (
												<td
													key={cellKey}
													className="border-b border-black/[0.06] px-2 py-2 align-top dark:border-white/[0.08]"
												>
													{renderAssistantInline(cell, cellKey)}
												</td>
											)
										})}
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			)
		}
	}
}

function renderAssistantInline(text: string, keyPrefix: string) {
	const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g)
	const partKeys = createStableKeys(parts, `${keyPrefix}:part`)
	return parts.map((part, partPosition) => {
		const key = partKeys[partPosition] ?? `${keyPrefix}:part`
		if (part.startsWith('`') && part.endsWith('`')) {
			return (
				<code
					key={key}
					className="rounded bg-black/[0.05] px-1 py-0.5 font-[family-name:var(--font-plex-mono)] text-[0.9em] dark:bg-white/[0.08]"
				>
					{part.slice(1, -1)}
				</code>
			)
		}
		if (part.startsWith('**') && part.endsWith('**')) {
			return <strong key={key}>{part.slice(2, -2)}</strong>
		}
		return <span key={key}>{part}</span>
	})
}

function assistantBlockIdentity(block: AssistantBlock): string {
	switch (block.type) {
		case 'paragraph':
			return `paragraph:${block.text}`
		case 'list':
			return `${block.ordered ? 'ordered' : 'unordered'}:${block.items.join(
				'\u001f',
			)}`
		case 'code':
			return `code:${block.text}`
		case 'table':
			return `table:${block.headers.join('\u001f')}:${block.rows
				.map((row) => row.join('\u001f'))
				.join('\u001e')}`
	}
}

function createStableKeys(values: string[], prefix: string): string[] {
	const seen = new Map<string, number>()
	return values.map((value) => {
		const baseKey = `${prefix}:${stableMessageKey(value)}`
		const count = seen.get(baseKey) ?? 0
		seen.set(baseKey, count + 1)
		return count === 0 ? baseKey : `${baseKey}:${count}`
	})
}

function stableMessageKey(value: string): string {
	let hash = 0
	for (let index = 0; index < value.length; index += 1) {
		hash = (hash * 31 + value.charCodeAt(index)) >>> 0
	}
	return hash.toString(36)
}

function matchAssistantListLine(
	line: string,
): { ordered: boolean; text: string } | null {
	const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/)
	if (ordered) return { ordered: true, text: ordered[1]?.trim() ?? '' }
	const unordered = line.match(/^\s*[-*]\s+(.+)$/)
	if (unordered) return { ordered: false, text: unordered[1]?.trim() ?? '' }
	return null
}

function isAssistantSpecialStart(lines: string[], index: number): boolean {
	const line = lines[index] ?? ''
	return (
		!line.trim() ||
		/^\s*```/.test(line) ||
		isAssistantTableAt(lines, index) ||
		matchAssistantListLine(line) !== null
	)
}

function isAssistantTableAt(lines: string[], index: number): boolean {
	return (
		isTableRow(lines[index] ?? '') && isTableDivider(lines[index + 1] ?? '')
	)
}

function isTableRow(line: string): boolean {
	const trimmed = line.trim()
	return trimmed.startsWith('|') && trimmed.endsWith('|')
}

function isTableDivider(line: string): boolean {
	return /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*$/.test(line.trim())
}

function splitTableRow(line: string): string[] {
	return line
		.trim()
		.replace(/^\|/, '')
		.replace(/\|$/, '')
		.split('|')
		.map((cell) => cell.trim())
}

function padTableRow(row: string[], length: number): string[] {
	if (row.length >= length) return row.slice(0, length)
	return [...row, ...Array.from({ length: length - row.length }, () => '')]
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
