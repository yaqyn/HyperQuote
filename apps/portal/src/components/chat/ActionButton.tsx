/**
 * ActionButton -- Inline action button in AI chat responses.
 *
 * Blue outline button that navigates to a portal route on press.
 * Shows localized label based on current language.
 */

import { useNavigate } from '@tanstack/react-router'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import type { ActionButtonData } from '../../lib/chat-types'

interface ActionButtonProps {
	data: ActionButtonData
}

export function ActionButton({ data }: ActionButtonProps) {
	const { i18n } = useTranslation()
	const navigate = useNavigate()
	const isArabic = i18n.language === 'ar'
	const label = isArabic ? data.labelAr : data.label

	const handlePress = () => {
		navigate({ to: data.route, search: data.params ?? {} })
	}

	return (
		<Button
			onPress={handlePress}
			className="min-h-10 rounded-lg border border-[var(--color-primary)] px-3 text-[13px] font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/5 sm:min-h-8"
		>
			{label}
		</Button>
	)
}
