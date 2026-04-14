/**
 * TicketForm — underline inputs, minimal. Data is the design.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Form,
  TextField,
  Input,
  Label,
  Select,
  SelectValue,
  Popover,
  ListBox,
  ListBoxItem,
} from 'react-aria-components'
import type { TicketCategory } from '../../types/support'

const CATEGORIES: TicketCategory[] = [
  'order_issue',
  'delivery_problem',
  'billing',
  'account',
  'other',
]

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  order_issue: 'Order issue',
  delivery_problem: 'Delivery problem',
  billing: 'Billing',
  account: 'Account',
  other: 'Other',
}

interface TicketFormProps {
  onSubmit: (data: {
    subject: string
    category: TicketCategory
    message: string
    orderId?: string
  }) => void
  isSubmitting?: boolean
}

const labelClass = 'mb-3 block text-[13px] font-medium uppercase tracking-[0.15em] text-[var(--color-text-subtle)]'
const inputClass = 'w-full bg-transparent border-0 border-b border-[var(--color-border)] pb-2.5 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[#2563EB]'

export function TicketForm({ onSubmit, isSubmitting }: TicketFormProps) {
  const { t } = useTranslation('portal')
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState<TicketCategory>('order_issue')
  const [message, setMessage] = useState('')
  const [orderId, setOrderId] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) return
    onSubmit({
      subject: subject.trim(),
      category,
      message: message.trim(),
      orderId: orderId.trim() || undefined,
    })
  }

  return (
    <Form onSubmit={handleSubmit} className="flex flex-col gap-10">
      {/* Subject */}
      <TextField isRequired value={subject} onChange={setSubject}>
        <Label className={labelClass}>{t('support.formSubject')}</Label>
        <Input
          placeholder={t('support.formSubjectPlaceholder')}
          className={`${inputClass} placeholder:text-[var(--color-border)]`}
        />
      </TextField>

      {/* Category */}
      <Select
        selectedKey={category}
        onSelectionChange={(key) => setCategory(key as TicketCategory)}
      >
        <Label className={labelClass}>{t('support.formCategory')}</Label>
        <Button className="flex items-center justify-between w-full bg-transparent border-0 border-b border-[var(--color-border)] pb-2.5 text-sm text-[var(--color-text)] outline-none cursor-pointer transition-colors focus:border-[#2563EB]">
          <SelectValue />
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-[var(--color-text-subtle)]">
            <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Button>
        <Popover className="rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] shadow-lg overflow-hidden">
          <ListBox className="p-1 outline-none">
            {CATEGORIES.map((cat) => (
              <ListBoxItem
                key={cat}
                id={cat}
                textValue={CATEGORY_LABELS[cat]}
                className="px-3 py-2 text-sm text-[var(--color-text)] cursor-pointer outline-none rounded-md hover:bg-[var(--color-surface)] focus:bg-[var(--color-surface)]"
              >
                {CATEGORY_LABELS[cat]}
              </ListBoxItem>
            ))}
          </ListBox>
        </Popover>
      </Select>

      {/* Message */}
      <div>
        <label className={labelClass}>{t('support.formDescription')}</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('support.formDescriptionPlaceholder')}
          rows={4}
          className={`${inputClass} resize-y placeholder:text-[var(--color-border)]`}
        />
      </div>

      {/* Related order */}
      <TextField value={orderId} onChange={setOrderId}>
        <Label className={labelClass}>{t('support.formRelatedOrder')}</Label>
        <Input
          placeholder="ORD-2026-00042"
          className={`${inputClass} font-mono placeholder:text-[var(--color-border)]`}
        />
      </TextField>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting || !subject.trim() || !message.trim()}
        className="self-start h-9 px-5 rounded-lg bg-[#0F172A] text-white dark:bg-[#FAFAFA] dark:text-[#09090B] text-[13px] font-medium transition-opacity hover:opacity-80 disabled:opacity-30"
      >
        {isSubmitting ? t('support.submitting') : t('support.submitTicket')}
      </button>
    </Form>
  )
}
