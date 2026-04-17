import { useTranslation } from 'react-i18next'

interface AttentionBadgeProps {
	count: number
	onClick: () => void
}

export function AttentionBadge({ count, onClick }: AttentionBadgeProps) {
	const { t } = useTranslation('ceo')

	if (count === 0) return null

	return (
		<button type="button" onClick={onClick} className="text-sm outline-none">
			<span className="font-mono text-[var(--color-error)]">{count}</span>{' '}
			<span className="text-[var(--color-text-muted)]">
				{t('attention.itemsNeedAttention')}
			</span>
		</button>
	)
}
