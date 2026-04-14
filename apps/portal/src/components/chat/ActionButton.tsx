/**
 * ActionButton -- Inline action button in AI chat responses.
 *
 * Blue outline button that navigates to a portal route on press.
 * Shows localized label based on current language.
 */
import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import { useNavigate } from '@tanstack/react-router'
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
      className="h-8 px-3 rounded-lg border border-[var(--color-primary)] text-[var(--color-primary)] text-[13px] font-semibold cursor-pointer hover:bg-[var(--color-primary)]/5 transition-colors"
    >
      {label}
    </Button>
  )
}
