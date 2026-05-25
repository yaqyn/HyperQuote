import type { ChannelType, Message } from '../../types/customer-service'
import { ChannelCode } from './ChannelIcons'

interface MessageItemProps {
	message: Message
	conversationChannel: ChannelType
	isFirstInGroup: boolean
}

function formatTimestamp(iso: string): string {
	const date = new Date(iso)
	const hh = date.getHours().toString().padStart(2, '0')
	const mm = date.getMinutes().toString().padStart(2, '0')
	return `${hh}:${mm}`
}

function AttachmentPill({
	attachment,
}: {
	attachment: Message['attachments'][number]
}) {
	const content = (
		<>
			<span className="min-w-0 break-words">{attachment.name}</span>
			{attachment.sizeBytes > 0 && (
				<span className="text-[var(--color-text-subtle)] tabular-nums">
					{(attachment.sizeBytes / 1024).toFixed(0)}KB
				</span>
			)}
		</>
	)
	const className =
		'inline-flex max-w-full items-center gap-2 rounded-md border border-black/[0.08] px-2 py-1 font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)] dark:border-white/[0.1]'
	if (!attachment.url) {
		return <span className={className}>{content}</span>
	}
	return (
		<a
			href={attachment.url}
			target="_blank"
			rel="noreferrer"
			className={`${className} transition-colors hover:border-[var(--color-primary)]/35 hover:text-[var(--color-text)]`}
		>
			{content}
		</a>
	)
}

/**
 * A single exchange in a live conversation — rendered as a letter entry,
 * not a chat bubble. The timestamp hangs in the leading margin; the
 * body sits in a narrow reading column in Literata. Inbound stays to
 * the start edge, outbound reverses against the trailing edge with
 * right-aligned text, so the visual rhythm still reads "me → them" but
 * the motif is correspondence, not messaging.
 */
export function MessageItem({
	message,
	conversationChannel,
	isFirstInGroup,
}: MessageItemProps) {
	const isInbound = message.direction === 'inbound'
	const channelDiffers = message.channel !== conversationChannel

	const isUnread = !message.read && isInbound

	return (
		<article
			className={`relative flex min-w-0 flex-col gap-1 lg:flex-row lg:gap-6 ${isFirstInGroup ? 'pt-3' : 'pt-1.5'}`}
		>
			{/* Hanging timestamp in the leading margin */}
			<div className="pt-[3px] text-start lg:w-16 lg:shrink-0 lg:text-end">
				{isFirstInGroup && (
					<span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
						{formatTimestamp(message.timestamp)}
					</span>
				)}
			</div>

			{/* Reading column */}
			<div className={`min-w-0 flex-1 ${isInbound ? '' : 'text-end'}`}>
				{isFirstInGroup && (
					<header
						className={`mb-1.5 flex items-center gap-2.5 ${
							isInbound ? '' : 'justify-end'
						}`}
					>
						{isUnread && (
							<span
								aria-hidden
								className="w-[6px] h-[6px] rounded-full bg-[var(--color-primary)]"
							/>
						)}
						<span
							className={`min-w-0 break-words font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.12em] ${
								isInbound
									? 'text-[var(--color-text)]'
									: 'text-[var(--color-primary)]'
							}`}
						>
							{message.senderName}
						</span>
						{channelDiffers && (
							<ChannelCode
								channel={message.channel}
								className="text-[var(--color-text-subtle)]"
							/>
						)}
					</header>
				)}

				{/* Body — Literata for the actual human words */}
				<p
					className={`whitespace-pre-wrap break-words font-[family-name:var(--font-archivo)] text-[14px] leading-relaxed
            ${isInbound ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}
				>
					{message.content}
				</p>

				{/* Attachments — mono labels, hairline rule */}
				{message.attachments.length > 0 && (
					<div
						className={`mt-3 flex flex-wrap items-center gap-3 ${
							isInbound ? '' : 'justify-end'
						}`}
					>
						{message.attachments.map((att) => (
							<AttachmentPill key={att.id} attachment={att} />
						))}
					</div>
				)}
			</div>
		</article>
	)
}
