import { Bell } from 'lucide-react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'

interface NotificationBellProps {
	hasUnread?: boolean
	onPress: () => void
}

export function NotificationBell({
	hasUnread = false,
	onPress,
}: NotificationBellProps) {
	const { t } = useTranslation('internal')

	return (
		<Button
			onPress={onPress}
			aria-label={t('bell.label')}
			className="relative flex items-center justify-center w-11 h-11 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
		>
			<Bell size={20} />
			{hasUnread && (
				<span className="absolute top-2 end-2 w-2 h-2 rounded-full bg-[var(--color-primary)]" />
			)}
		</Button>
	)
}
