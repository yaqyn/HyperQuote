import { useTranslation } from 'react-i18next'

export function TypingIndicator() {
	const { i18n, t } = useTranslation('portal')
	const isArabic = i18n.language === 'ar'

	return (
		<li className="list-none">
			<article
				className="flex items-baseline gap-2 py-1 text-[var(--p-text-muted)]"
				aria-label={t('chat.assistantTypingLabel')}
			>
				<span className="sr-only">{t('chat.assistantLabel')}: </span>
				<span className="office-pen-nib" aria-hidden />
				<span
					className={
						isArabic
							? 'voice-serif-ar text-[14px] sm:text-[15px]'
							: 'voice-serif text-[14px] italic sm:text-[16px]'
					}
				>
					{t('chat.typingShort')}
				</span>
			</article>
		</li>
	)
}
