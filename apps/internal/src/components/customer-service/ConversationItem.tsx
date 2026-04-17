import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import type { Conversation } from '../../types/customer-service'
import { ChannelCode } from './ChannelIcons'
import { LiveDot, PriorityMark, SlaTicker } from './SlaTicker'

/**
 * A single "line" in the switchboard inbox.
 *
 * Layout reads like an operator's logbook entry:
 *   [dot] [PRI]  Customer name                     [CODE]  [timer]
 *                Subject line                              [n unread]
 *                " last message preview in italic serif "
 *
 * Selected state is *not* a solid fill — it's a faint tint plus a blue
 * hairline on the leading edge. The row stays readable; the choice
 * whispers.
 */
interface ConversationItemProps {
	conversation: Conversation
	isSelected: boolean
	isLocked: boolean
	queuePosition: number
	onSelect: () => void
	/** Resolved view — items are visible but muted */
	isFaded?: boolean
}

function queueOpacity(position: number, isLocked: boolean): number {
	if (!isLocked) return 1
	if (position <= 1) return 0.6
	if (position <= 2) return 0.4
	if (position <= 3) return 0.25
	return 0.15
}

export function ConversationItem({
	conversation,
	isSelected,
	isLocked,
	queuePosition,
	onSelect,
	isFaded,
}: ConversationItemProps) {
	const { i18n } = useTranslation()
	const hasUnread = conversation.unreadCount > 0
	const isUrgent =
		conversation.priority === 'urgent' || conversation.slaBreached
	const name =
		i18n.language === 'ar'
			? conversation.customer.nameAr
			: conversation.customer.name

	const opacity = isFaded ? 0.45 : queueOpacity(queuePosition, isLocked)

	const dotTone =
		isUrgent || conversation.slaBreached
			? 'red'
			: conversation.priority === 'high'
				? 'amber'
				: hasUnread
					? 'primary'
					: 'muted'

	return (
		<Button
			onPress={() => {
				if (!isLocked) onSelect()
			}}
			aria-label={`${name} — ${conversation.subject}`}
			className={`group w-full text-start relative outline-none transition-colors
        focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]/40 focus-visible:ring-inset
        ${
					isSelected
						? 'bg-[var(--color-primary)]/[0.045] dark:bg-[var(--color-primary)]/[0.08]'
						: isLocked
							? ''
							: 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
				}`}
			style={{ opacity: isSelected ? 1 : opacity }}
		>
			{/* Leading hairline — blue when selected, accent for urgent otherwise */}
			<span
				aria-hidden
				className={`absolute inset-y-0 start-0 transition-all duration-200
          ${
						isSelected
							? 'w-[2px] bg-[var(--color-primary)]'
							: isUrgent && !isLocked
								? 'w-[2px] bg-[var(--color-signal-red)]/60'
								: 'w-0'
					}`}
			/>

			<div className="px-5 py-4">
				{/* Row 1 — live dot, priority, name, channel, SLA ticker */}
				<div className="flex items-center gap-2.5 mb-1.5">
					<LiveDot active={hasUnread && !isLocked && !isFaded} tone={dotTone} />
					<PriorityMark priority={conversation.priority} />
					<span
						className={`font-[family-name:var(--font-bricolage)] text-[13.5px] leading-none truncate
              ${
								isSelected
									? 'text-[var(--color-text)] font-semibold'
									: hasUnread
										? 'text-[var(--color-text)] font-semibold'
										: 'text-[var(--color-text-muted)] font-medium'
							}`}
						style={{ fontVariationSettings: '"opsz" 14, "wght" 500' }}
					>
						{name}
					</span>

					<span className="ms-auto flex items-center gap-2 shrink-0">
						<ChannelCode
							channel={conversation.channel}
							className="text-[var(--color-text-subtle)]"
						/>
						{conversation.slaDeadline && (
							<SlaTicker
								createdAt={conversation.createdAt}
								deadline={conversation.slaDeadline}
								breached={conversation.slaBreached}
								bare
								className="text-[10px]"
							/>
						)}
					</span>
				</div>

				{/* Row 2 — subject headline */}
				<h3
					className={`font-[family-name:var(--font-bricolage)] leading-snug line-clamp-2 transition-colors ps-[22px]
            ${
							isSelected
								? 'text-[14.5px] font-semibold text-[var(--color-text)]'
								: isUrgent
									? 'text-[14.5px] font-semibold text-[var(--color-text)]'
									: hasUnread
										? 'text-[14px] font-semibold text-[var(--color-text)]'
										: 'text-[13px] font-medium text-[var(--color-text-muted)]'
						}`}
					style={{ fontVariationSettings: '"opsz" 18, "wght" 550' }}
				>
					{conversation.subject}
				</h3>

				{/* Row 3 — preview as correspondence quote (Literata italic) */}
				<div className="flex items-baseline gap-2 mt-1.5 ps-[22px]">
					<p
						className={`flex-1 line-clamp-1 leading-relaxed font-[family-name:var(--font-literata)] italic text-[12.5px]
              ${
								isSelected
									? 'text-[var(--color-text-muted)]'
									: 'text-[var(--color-text-subtle)]'
							}`}
						style={{ fontVariationSettings: '"opsz" 14' }}
					>
						&ldquo;{conversation.lastMessagePreview}&rdquo;
					</p>
					{hasUnread && (
						<span className="shrink-0 font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium tabular-nums text-[var(--color-primary)]">
							+{conversation.unreadCount}
						</span>
					)}
				</div>
			</div>
		</Button>
	)
}
