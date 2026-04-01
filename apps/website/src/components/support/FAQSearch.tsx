import { SearchField, Label, Input, Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { Search, X } from 'lucide-react'

interface FAQSearchProps {
  onSearchChange: (query: string) => void
}

export function FAQSearch({ onSearchChange }: FAQSearchProps) {
  const { t } = useTranslation('website')

  return (
    <SearchField
      aria-label={t('support.faq.searchPlaceholder')}
      onChange={onSearchChange}
      className="mx-auto w-full max-w-[480px]"
    >
      <Label className="sr-only">{t('support.faq.searchPlaceholder')}</Label>
      <div className="relative">
        <Search
          size={18}
          className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
        />
        <Input
          placeholder={t('support.faq.searchPlaceholder')}
          className="h-[44px] w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] ps-10 pe-10 text-[16px] outline-none focus:ring-2 focus:ring-[#2563EB]"
        />
        <Button className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] outline-none hover:text-[var(--color-text)]">
          <X size={16} />
        </Button>
      </div>
    </SearchField>
  )
}
