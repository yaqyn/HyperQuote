/**
 * TicketForm: Support ticket submission form.
 * Subject, category (React Aria Select), description, related order, attachments.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Form,
  TextField,
  TextArea,
  Input,
  Label,
  Select,
  SelectValue,
  Popover,
  ListBox,
  ListBoxItem,
} from 'react-aria-components'
import { Send } from 'lucide-react'
import type { TicketCategory } from '../../types/support'

interface TicketFormProps {
  onSubmit: (data: {
    subject: string
    category: TicketCategory
    message: string
    orderId?: string
  }) => void
  isSubmitting?: boolean
}

const CATEGORIES: TicketCategory[] = [
  'order_issue',
  'delivery_problem',
  'billing',
  'account',
  'other',
]

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
    <Form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
    >
      {/* Subject */}
      <TextField
        isRequired
        value={subject}
        onChange={setSubject}
        className="flex flex-col gap-1.5"
      >
        <Label className="text-sm font-medium text-[var(--color-text)]">
          {t('support.formSubject')}
        </Label>
        <Input
          placeholder={t('support.formSubjectPlaceholder')}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
        />
      </TextField>

      {/* Category */}
      <Select
        selectedKey={category}
        onSelectionChange={(key) => setCategory(key as TicketCategory)}
        className="flex flex-col gap-1.5"
      >
        <Label className="text-sm font-medium text-[var(--color-text)]">
          {t('support.formCategory')}
        </Label>
        <Button className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 cursor-pointer">
          <SelectValue />
          <span aria-hidden="true" className="text-[var(--color-text-muted)]">
            &#9662;
          </span>
        </Button>
        <Popover className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg overflow-hidden">
          <ListBox className="p-1 outline-none">
            {CATEGORIES.map((cat) => (
              <ListBoxItem
                key={cat}
                id={cat}
                textValue={t(`support.category.${cat}`)}
                className="px-3 py-2 text-sm text-[var(--color-text)] cursor-pointer outline-none rounded-md hover:bg-[var(--color-surface)] focus:bg-[var(--color-surface)]"
              >
                {t(`support.category.${cat}`)}
              </ListBoxItem>
            ))}
          </ListBox>
        </Popover>
      </Select>

      {/* Description */}
      <TextField
        isRequired
        value={message}
        onChange={setMessage}
        className="flex flex-col gap-1.5"
      >
        <Label className="text-sm font-medium text-[var(--color-text)]">
          {t('support.formDescription')}
        </Label>
        <TextArea
          placeholder={t('support.formDescriptionPlaceholder')}
          rows={4}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 resize-y"
        />
      </TextField>

      {/* Related Order (optional) */}
      <TextField
        value={orderId}
        onChange={setOrderId}
        className="flex flex-col gap-1.5"
      >
        <Label className="text-sm font-medium text-[var(--color-text)]">
          {t('support.formRelatedOrder')}
        </Label>
        <Input
          placeholder="ORD-2026-00042"
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 font-mono"
        />
      </TextField>

      {/* Attachments (optional) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[var(--color-text)]">
          {t('support.formAttachments')}
        </label>
        <input
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx"
          className="text-sm text-[var(--color-text-muted)] file:me-3 file:rounded-lg file:border-0 file:bg-[var(--color-surface)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--color-text)] file:cursor-pointer"
        />
      </div>

      {/* Submit */}
      <Button
        type="submit"
        isDisabled={isSubmitting || !subject.trim() || !message.trim()}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white outline-none hover:opacity-90 focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-opacity"
      >
        <Send size={14} />
        {isSubmitting ? t('support.submitting') : t('support.submitTicket')}
      </Button>
    </Form>
  )
}
