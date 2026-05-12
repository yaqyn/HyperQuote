import { ChevronDown, ChevronUp, Forward, Reply, ReplyAll } from 'lucide-react'
import { useState } from 'react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import type { Message } from '../../types/customer-service'
import {
	EmployeeActionButton,
	EmployeeStatusPill,
} from '../shared/EmployeeControls'

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

function stringMetadata(message: Message, key: string): string {
	const value = message.metadata[key]
	return typeof value === 'string' ? value : ''
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

	const from = stringMetadata(message, 'from') || message.senderName
	const to = stringMetadata(message, 'to')
	const cc = stringMetadata(message, 'cc')
	const isInbound = message.direction === 'inbound'

	if (!expanded) {
		return (
			<Button
				onPress={() => setExpanded(true)}
				aria-label={`${t('email.expand')} — ${message.senderName}`}
				className="group flex w-full flex-col gap-2 border-b border-dashed border-black/[0.08] py-4 text-start outline-none transition-colors hover:border-[var(--color-text-muted)] hover:bg-black/[0.015] dark:border-white/[0.08] dark:hover:bg-white/[0.02] lg:flex-row lg:items-start lg:gap-4"
			>
				<span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text-subtle)] lg:w-[84px] lg:shrink-0">
					{formatEmailDate(message.timestamp).split(',')[0]}
				</span>
				<span
					className={`break-words font-[family-name:var(--font-archivo)] text-[12px] font-semibold uppercase tracking-[0.1em] lg:w-[10rem] lg:shrink-0 ${
						isInbound
							? 'text-[var(--color-text)]'
							: 'text-[var(--color-primary)]'
					}`}
				>
					{message.senderName}
				</span>
				<span className="min-w-0 break-words font-[family-name:var(--font-archivo)] text-[13px] leading-relaxed text-[var(--color-text-muted)] lg:flex-1">
					{message.content.split('\n')[0]}
				</span>
				<ChevronDown
					size={14}
					className="shrink-0 text-[var(--color-text-subtle)] transition-opacity lg:opacity-0 lg:group-hover:opacity-100"
				/>
			</Button>
		)
	}

	return (
		<article className="border-b border-black/[0.08] dark:border-white/[0.08] pb-6">
			{/* Address plate — monospace like a postmark */}
			<header className="flex items-start justify-between gap-4 mb-4">
				<div className="flex-1 min-w-0 space-y-0.5">
					<div className="flex flex-wrap items-center gap-2">
						<span
							className={`break-words font-[family-name:var(--font-archivo)] text-[12px] font-semibold uppercase tracking-[0.1em] ${
								isInbound
									? 'text-[var(--color-text)]'
									: 'text-[var(--color-primary)]'
							}`}
						>
							{message.senderName}
						</span>
						<EmployeeStatusPill tone={isInbound ? 'neutral' : 'success'}>
							{isInbound ? 'Customer message' : 'Support reply'}
						</EmployeeStatusPill>
						<span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text-subtle)]">
							{formatEmailDate(message.timestamp)}
						</span>
					</div>
					<dl className="mt-3 flex flex-col gap-2 font-[family-name:var(--font-archivo)] text-[12px] text-[var(--color-text-subtle)]">
						<div className="flex flex-col gap-0.5 lg:flex-row lg:items-baseline lg:gap-3">
							<dt className="font-semibold uppercase tracking-[0.12em] lg:w-12 lg:shrink-0">
								from
							</dt>
							<dd className="min-w-0 break-all text-[var(--color-text-muted)]">
								{from}
							</dd>
						</div>
						<div className="flex flex-col gap-0.5 lg:flex-row lg:items-baseline lg:gap-3">
							<dt className="font-semibold uppercase tracking-[0.12em] lg:w-12 lg:shrink-0">
								to
							</dt>
							<dd className="min-w-0 break-all text-[var(--color-text-muted)]">
								{to}
							</dd>
						</div>
						{cc && (
							<div className="flex flex-col gap-0.5 lg:flex-row lg:items-baseline lg:gap-3">
								<dt className="font-semibold uppercase tracking-[0.12em] lg:w-12 lg:shrink-0">
									cc
								</dt>
								<dd className="min-w-0 break-all text-[var(--color-text-muted)]">
									{cc}
								</dd>
							</div>
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
				className={`whitespace-pre-wrap break-words font-[family-name:var(--font-archivo)] text-[14px] leading-relaxed
          ${isInbound ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}
			>
				{message.content}
			</p>

			{/* Attachments — underline marks, not boxes */}
			{message.attachments.length > 0 && (
				<div className="flex flex-wrap items-center gap-3 mt-4">
					{message.attachments.map((att) => (
						<span
							key={att.id}
							className="inline-flex max-w-full items-center gap-2 rounded-md border border-black/[0.08] px-2 py-1 font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)] dark:border-white/[0.1]"
						>
							<span className="min-w-0 break-words">{att.name}</span>
							<span className="text-[var(--color-text-subtle)] tabular-nums">
								{(att.sizeBytes / 1024).toFixed(0)}KB
							</span>
						</span>
					))}
				</div>
			)}

			{/* Actions — text links that sit beneath the letter */}
			<div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
				<EmployeeActionButton
					onClick={() => onAction('reply', message)}
					aria-label={t('email.reply')}
					tone="primary"
					size="sm"
					leading={<Reply size={14} strokeWidth={2.2} />}
				>
					{t('email.reply')}
				</EmployeeActionButton>
				{cc && (
					<EmployeeActionButton
						onClick={() => onAction('reply-all', message)}
						aria-label={t('email.replyAll')}
						tone="neutral"
						size="sm"
						leading={<ReplyAll size={14} strokeWidth={2.2} />}
					>
						{t('email.replyAll')}
					</EmployeeActionButton>
				)}
				<EmployeeActionButton
					onClick={() => onAction('forward', message)}
					aria-label={t('email.forward')}
					tone="neutral"
					size="sm"
					leading={<Forward size={14} strokeWidth={2.2} />}
				>
					{t('email.forward')}
				</EmployeeActionButton>
			</div>
		</article>
	)
}
