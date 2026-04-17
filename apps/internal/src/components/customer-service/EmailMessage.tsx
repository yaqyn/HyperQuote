import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import type { Message } from '../../types/customer-service'

export type EmailAction = 'reply' | 'reply-all' | 'forward'

interface EmailMessageProps {
	message: Message
	isLatest: boolean
	onAction: (action: EmailAction, message: Message) => void
}

function formatEmailDate(iso: string): string {
	const date = new Date(iso)
	const now = new Date()
	const isToday =
		date.getDate() === now.getDate() &&
		date.getMonth() === now.getMonth() &&
		date.getFullYear() === now.getFullYear()

	const time = date.toLocaleTimeString('en-US', {
		hour: 'numeric',
		minute: '2-digit',
		hour12: true,
	})

	if (isToday) return `Today, ${time}`

	return `${date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
	})}, ${time}`
}

/**
 * Email in correspondence form. Collapsed: a single line that reads like
 * an index entry in a letter archive. Expanded: a proper letter with
 * monospace address plate, Literata body, and text-link actions.
 */
export function EmailMessage({
	message,
	isLatest,
	onAction,
}: EmailMessageProps) {
	const { t } = useTranslation('customer-service')
	const [expanded, setExpanded] = useState(isLatest)

	const from = (message.metadata.from as string) ?? message.senderName
	const to = (message.metadata.to as string) ?? ''
	const cc = (message.metadata.cc as string | null) ?? null
	const isInbound = message.direction === 'inbound'

	if (!expanded) {
		return (
			<Button
				onPress={() => setExpanded(true)}
				aria-label={`${t('email.expand')} — ${message.senderName}`}
				className="group w-full text-start grid items-baseline gap-4 py-3 outline-none border-b border-dashed border-black/[0.08] dark:border-white/[0.08] hover:border-[var(--color-text-muted)] transition-colors"
				style={{ gridTemplateColumns: '72px 1fr auto auto' }}
			>
				<span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
					{formatEmailDate(message.timestamp).split(',')[0]}
				</span>
				<span
					className={`font-[family-name:var(--font-bricolage)] text-[12.5px] uppercase tracking-[0.12em] truncate ${
						isInbound
							? 'text-[var(--color-text)]'
							: 'text-[var(--color-primary)]'
					}`}
					style={{ fontVariationSettings: '"opsz" 14, "wght" 600' }}
				>
					{message.senderName}
				</span>
				<span className="font-[family-name:var(--font-literata)] italic text-[13px] text-[var(--color-text-subtle)] truncate min-w-0 max-w-[28rem]">
					&ldquo;{message.content.split('\n')[0]}&rdquo;
				</span>
				<ChevronDown
					size={12}
					className="text-[var(--color-text-subtle)] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
				/>
			</Button>
		)
	}

	return (
		<article className="border-b border-black/[0.08] dark:border-white/[0.08] pb-6">
			{/* Address plate — monospace like a postmark */}
			<header className="flex items-start justify-between gap-4 mb-4">
				<div className="flex-1 min-w-0 space-y-0.5">
					<div className="flex items-baseline gap-3 flex-wrap">
						<span
							className={`font-[family-name:var(--font-bricolage)] text-[13px] uppercase tracking-[0.14em] ${
								isInbound
									? 'text-[var(--color-text)]'
									: 'text-[var(--color-primary)]'
							}`}
							style={{ fontVariationSettings: '"opsz" 14, "wght" 600' }}
						>
							{message.senderName}
						</span>
						<span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
							{formatEmailDate(message.timestamp)}
						</span>
					</div>
					<dl
						className="grid gap-x-3 gap-y-0.5 mt-1.5 font-[family-name:var(--font-jetbrains-mono)] text-[10px] text-[var(--color-text-subtle)]"
						style={{ gridTemplateColumns: 'auto minmax(0, 1fr)' }}
					>
						<dt className="uppercase tracking-[0.18em]">from</dt>
						<dd className="truncate text-[var(--color-text-muted)]">{from}</dd>
						<dt className="uppercase tracking-[0.18em]">to</dt>
						<dd className="truncate text-[var(--color-text-muted)]">{to}</dd>
						{cc && (
							<>
								<dt className="uppercase tracking-[0.18em]">cc</dt>
								<dd className="truncate text-[var(--color-text-muted)]">
									{cc}
								</dd>
							</>
						)}
					</dl>
				</div>

				{!isLatest && (
					<Button
						onPress={() => setExpanded(false)}
						aria-label={t('email.collapse')}
						className="flex items-center justify-center w-6 h-6 text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)] transition-colors shrink-0"
					>
						<ChevronUp size={13} strokeWidth={1.5} />
					</Button>
				)}
			</header>

			{/* Body in Literata — the customer's actual voice */}
			<p
				className={`font-[family-name:var(--font-literata)] text-[14.5px] leading-[1.75] whitespace-pre-wrap
          ${isInbound ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}
				style={{ fontVariationSettings: '"opsz" 16, "wght" 400' }}
			>
				{message.content}
			</p>

			{/* Attachments — underline marks, not boxes */}
			{message.attachments.length > 0 && (
				<div className="flex flex-wrap items-center gap-3 mt-4">
					{message.attachments.map((att) => (
						<span
							key={att.id}
							className="inline-flex items-center gap-2 font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-[0.1em] text-[var(--color-text-muted)] border-b border-[var(--color-border)] pb-0.5"
						>
							<span>{att.name}</span>
							<span className="text-[var(--color-text-subtle)] tabular-nums">
								{(att.sizeBytes / 1024).toFixed(0)}KB
							</span>
						</span>
					))}
				</div>
			)}

			{/* Actions — text links that sit beneath the letter */}
			<div className="flex items-center gap-5 mt-5">
				<Button
					onPress={() => onAction('reply', message)}
					aria-label={t('email.reply')}
					className="font-[family-name:var(--font-inter)] text-[12px] font-medium text-[var(--color-text-muted)] border-b border-transparent hover:text-[var(--color-text)] hover:border-[var(--color-text)] outline-none transition-colors"
				>
					{t('email.reply')}
				</Button>
				{cc && (
					<Button
						onPress={() => onAction('reply-all', message)}
						aria-label={t('email.replyAll')}
						className="font-[family-name:var(--font-inter)] text-[12px] font-medium text-[var(--color-text-muted)] border-b border-transparent hover:text-[var(--color-text)] hover:border-[var(--color-text)] outline-none transition-colors"
					>
						{t('email.replyAll')}
					</Button>
				)}
				<Button
					onPress={() => onAction('forward', message)}
					aria-label={t('email.forward')}
					className="font-[family-name:var(--font-inter)] text-[12px] font-medium text-[var(--color-text-muted)] border-b border-transparent hover:text-[var(--color-text)] hover:border-[var(--color-text)] outline-none transition-colors"
				>
					{t('email.forward')}
				</Button>
			</div>
		</article>
	)
}
