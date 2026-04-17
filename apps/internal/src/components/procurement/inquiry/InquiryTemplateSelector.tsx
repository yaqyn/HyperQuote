import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import type { InternalKey } from '../../../lib/modules'
import type { InquiryTemplate } from '../../../types/procurement'

interface InquiryTemplateSelectorProps {
	value: InquiryTemplate
	onChange: (template: InquiryTemplate) => void
}

const TEMPLATES: { key: InquiryTemplate; i18nKey: InternalKey }[] = [
	{ key: 'standard', i18nKey: 'procurement.templates.standard' },
	{ key: 'urgent', i18nKey: 'procurement.templates.urgent' },
	{ key: 'repeat', i18nKey: 'procurement.templates.repeat' },
	{ key: 'project_based', i18nKey: 'procurement.templates.projectBased' },
	{
		key: 'negotiation_followup',
		i18nKey: 'procurement.templates.negotiationFollowup',
	},
]

export function InquiryTemplateSelector({
	value,
	onChange,
}: InquiryTemplateSelectorProps) {
	const { t } = useTranslation('internal')

	return (
		<div
			className="flex flex-wrap items-center gap-1"
			role="radiogroup"
			aria-label={t('procurement.inquiry.template')}
		>
			{TEMPLATES.map((tmpl) => {
				const isSelected = value === tmpl.key
				return (
					<Button
						key={tmpl.key}
						onPress={() => onChange(tmpl.key)}
						aria-pressed={isSelected}
						className={`rounded-lg px-3 py-1.5 text-[13px] font-medium outline-none transition-all duration-150
              data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/40
              ${
								isSelected
									? 'bg-black/[0.06] text-[var(--color-text)] dark:bg-white/[0.06]'
									: 'text-[var(--color-text-subtle)] data-[hovered]:text-[var(--color-text-muted)] data-[hovered]:bg-black/[0.03] dark:data-[hovered]:bg-white/[0.03]'
							}`}
					>
						{t(tmpl.i18nKey)}
					</Button>
				)
			})}
		</div>
	)
}
