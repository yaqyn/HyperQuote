import type { ChannelType } from '../../types/customer-service'

/**
 * Switchboard channel codes — two-letter mono marks instead of icons.
 * Reads like an operator's log entry rather than a consumer messaging app.
 */
const CODES: Record<ChannelType, string> = {
	email: 'EML',
	live: 'LIV',
}

interface ChannelCodeProps {
	channel: ChannelType
	className?: string
}

export function ChannelCode({ channel, className = '' }: ChannelCodeProps) {
	return (
		<span
			role="img"
			aria-label={channel}
			className={`font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-[0.14em] ${className}`}
		>
			{CODES[channel]}
		</span>
	)
}

/**
 * Backwards-compatible shim so any lingering consumer can still import
 * CHANNEL_ICONS. Each entry is a small component that renders the code
 * at the requested nominal size (ignored — codes auto-size via parent).
 */
export const CHANNEL_ICONS: Record<
	ChannelType,
	React.ComponentType<{ size?: number; className?: string }>
> = {
	email: ({ className }) => (
		<ChannelCode channel="email" className={className} />
	),
	live: ({ className }) => <ChannelCode channel="live" className={className} />,
}
