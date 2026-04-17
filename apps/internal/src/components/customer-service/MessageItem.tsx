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
			className={`relative grid gap-x-6 ${isFirstInGroup ? 'pt-3' : 'pt-1.5'}`}
			style={{ gridTemplateColumns: '64px minmax(0, 1fr)' }}
		>
			{/* Hanging timestamp in the leading margin */}
			<div className="text-end pt-[3px]">
				{isFirstInGroup && (
					<span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
						{formatTimestamp(message.timestamp)}
					</span>
				)}
			</div>

			{/* Reading column */}
			<div className={isInbound ? '' : 'text-end'}>
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
							className={`font-[family-name:var(--font-bricolage)] text-[10.5px] uppercase tracking-[0.18em] ${
								isInbound
									? 'text-[var(--color-text)]'
									: 'text-[var(--color-primary)]'
							}`}
							style={{ fontVariationSettings: '"opsz" 12, "wght" 600' }}
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
					className={`font-[family-name:var(--font-literata)] text-[14.5px] leading-[1.75] whitespace-pre-wrap
            ${isInbound ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}
					style={{ fontVariationSettings: '"opsz" 16, "wght" 400' }}
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
			</div>
		</article>
	)
}
