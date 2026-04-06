import { useTranslation } from 'react-i18next'

type TimeOfDay = 'morning' | 'afternoon' | 'evening'

interface GreetingTextProps {
  timeOfDay: TimeOfDay
  name: string
}

export function GreetingText({ timeOfDay, name }: GreetingTextProps) {
  const { t } = useTranslation('ceo')

  return (
    <p className="font-semibold text-xl text-[var(--color-text)] text-center">
      {t(`greeting.${timeOfDay}`, { name })}
    </p>
  )
}
