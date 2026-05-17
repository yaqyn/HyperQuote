import { useTranslation } from 'react-i18next'

interface OtpResendControlProps {
	countdown: number
	onResend: () => void
	variant?: 'full' | 'compact'
}

export function OtpResendControl({
	countdown,
	onResend,
	variant = 'full',
}: OtpResendControlProps) {
	const { t } = useTranslation('website')

	return (
		<div
			className={
				variant === 'compact'
					? 'mt-2 text-center text-[11px]'
					: 'mt-6 text-center text-[13px]'
			}
		>
			{countdown > 0 ? (
				<span className="text-[var(--color-text-subtle)]">
					{t('login.resendIn')} <span className="font-mono">{countdown}s</span>
				</span>
			) : (
				<button
					type="button"
					onClick={onResend}
					className="text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
				>
					{t('login.resend')}
				</button>
			)}
		</div>
	)
}
