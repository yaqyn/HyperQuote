import { Select, SelectValue, Button, Popover, ListBox, ListBoxItem, Label } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import type { InquiryTemplate } from '../../../types/procurement'

interface InquiryTemplateSelectorProps {
  value: InquiryTemplate
  onChange: (template: InquiryTemplate) => void
}

const TEMPLATES: { key: InquiryTemplate; i18nKey: string }[] = [
  { key: 'standard', i18nKey: 'procurement.templates.standard' },
  { key: 'urgent', i18nKey: 'procurement.templates.urgent' },
  { key: 'repeat', i18nKey: 'procurement.templates.repeat' },
  { key: 'project_based', i18nKey: 'procurement.templates.projectBased' },
  { key: 'negotiation_followup', i18nKey: 'procurement.templates.negotiationFollowup' },
]

export function InquiryTemplateSelector({ value, onChange }: InquiryTemplateSelectorProps) {
  const { t } = useTranslation('internal')

  return (
    <Select
      selectedKey={value}
      onSelectionChange={(key) => onChange(key as InquiryTemplate)}
    >
      <Label className="sr-only">{t('procurement.inquiry.template')}</Label>
      <Button className="flex w-full items-center justify-between rounded-lg border border-black/10 bg-white/60 px-3 py-2 text-sm outline-none backdrop-blur-xl transition-colors data-[focus-visible]:border-[#2563EB] dark:border-white/10 dark:bg-black/60">
        <SelectValue className="truncate" />
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black/40 dark:text-white/40"><path d="m6 9 6 6 6-6" /></svg>
      </Button>
      <Popover className="w-[var(--trigger-width)] rounded-xl border border-black/10 bg-white/95 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-black/95">
        <ListBox className="p-1">
          {TEMPLATES.map((tmpl) => (
            <ListBoxItem
              key={tmpl.key}
              id={tmpl.key}
              textValue={t(tmpl.i18nKey)}
              className="cursor-pointer rounded-lg px-3 py-2 text-sm outline-none transition-colors data-[hovered]:bg-black/5 dark:data-[hovered]:bg-white/5 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 data-[selected]:font-medium data-[selected]:text-[#2563EB]"
            >
              {t(tmpl.i18nKey)}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </Select>
  )
}
