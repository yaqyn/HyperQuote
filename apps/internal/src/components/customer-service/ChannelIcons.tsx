import type { ChannelType } from '../../types/customer-service'

/**
 * Switchboard channel codes — two-letter mono marks instead of icons.
 * Reads like an operator's log entry rather than a consumer messaging app.
 */
const CODES: Record<ChannelType, string> = {
	email: 'EML',
	live: 'LIV',
	whatsapp: 'WSP',
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
