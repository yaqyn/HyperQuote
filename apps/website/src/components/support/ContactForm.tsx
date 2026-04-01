import { useState } from 'react'
import { useForm, useWatch, Controller } from 'react-hook-form'
import { standardSchemaResolver } from '@hyperquote/forms'
import { z } from 'zod'
import {
  TextField as AriaTextField,
  Label,
  Input,
  TextArea,
  FieldError,
  Select,
  Button,
  SelectValue,
  Popover,
  ListBox,
  ListBoxItem,
} from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { Check, Loader2 } from 'lucide-react'
import { submitContactForm } from '../../lib/contact'

const contactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().regex(/^\+?20[0-9]{10}$/).optional().or(z.literal('')),
  subject: z.enum(['general', 'quote', 'delivery', 'billing', 'other']),
  message: z.string().min(10).max(2000),
})

type ContactFormData = z.infer<typeof contactSchema>

function MessageCharCount({ control }: { control: any }) {
  const message = useWatch({ control, name: 'message', defaultValue: '' })
  const count = (message ?? '').length

  return (
    <span className="font-[family-name:var(--font-geist-mono)] text-[12px] text-[var(--color-text-muted)]">
      {count}/2000
    </span>
  )
}

export function ContactForm() {
  const { t } = useTranslation('website')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<ContactFormData>({
    resolver: standardSchemaResolver(contactSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      subject: 'general',
      message: '',
    },
    mode: 'onSubmit',
  })

  const subjectItems = [
    { id: 'general', label: t('support.form.subjects.general') },
    { id: 'quote', label: t('support.form.subjects.quote') },
    { id: 'delivery', label: t('support.form.subjects.delivery') },
    { id: 'billing', label: t('support.form.subjects.billing') },
    { id: 'other', label: t('support.form.subjects.other') },
  ]

  async function onSubmit(data: ContactFormData) {
    setSubmitting(true)
    try {
      await submitContactForm({ data })
      setSubmitted(true)
    } catch {
      // TODO: show error toast
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#2563EB]">
          <Check size={32} className="text-white" />
        </div>
        <p className="text-center text-[16px] font-bold">
          {t('support.form.success')}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* Name */}
      <Controller
        name="name"
        control={form.control}
        render={({ field, fieldState }) => (
          <AriaTextField
            value={field.value ?? ''}
            onChange={field.onChange}
            onBlur={field.onBlur}
            isRequired
            isInvalid={!!fieldState.error}
            isDisabled={submitting}
          >
            <Label className="mb-1 block text-[14px]">{t('support.form.name')}</Label>
            <Input className="h-[44px] w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-3 text-[16px] outline-none focus:ring-2 focus:ring-[#2563EB]" />
            {fieldState.error && (
              <FieldError className="mt-1 text-[12px] text-[var(--color-error)]">
                {fieldState.error.message}
              </FieldError>
            )}
          </AriaTextField>
        )}
      />

      {/* Email */}
      <Controller
        name="email"
        control={form.control}
        render={({ field, fieldState }) => (
          <AriaTextField
            value={field.value ?? ''}
            onChange={field.onChange}
            onBlur={field.onBlur}
            type="email"
            isRequired
            isInvalid={!!fieldState.error}
            isDisabled={submitting}
          >
            <Label className="mb-1 block text-[14px]">{t('support.form.email')}</Label>
            <Input className="h-[44px] w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-3 text-[16px] outline-none focus:ring-2 focus:ring-[#2563EB]" />
            {fieldState.error && (
              <FieldError className="mt-1 text-[12px] text-[var(--color-error)]">
                {fieldState.error.message}
              </FieldError>
            )}
          </AriaTextField>
        )}
      />

      {/* Phone (optional) */}
      <Controller
        name="phone"
        control={form.control}
        render={({ field, fieldState }) => (
          <AriaTextField
            value={field.value ?? ''}
            onChange={field.onChange}
            onBlur={field.onBlur}
            type="tel"
            isInvalid={!!fieldState.error}
            isDisabled={submitting}
          >
            <Label className="mb-1 block text-[14px]">{t('support.form.phone')}</Label>
            <Input className="h-[44px] w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-3 font-[family-name:var(--font-geist-mono)] text-[16px] outline-none focus:ring-2 focus:ring-[#2563EB]" />
            {fieldState.error && (
              <FieldError className="mt-1 text-[12px] text-[var(--color-error)]">
                {fieldState.error.message}
              </FieldError>
            )}
          </AriaTextField>
        )}
      />

      {/* Subject */}
      <Controller
        name="subject"
        control={form.control}
        render={({ field, fieldState }) => (
          <Select
            selectedKey={field.value ?? null}
            onSelectionChange={(key) => field.onChange(key as string)}
            onBlur={field.onBlur}
            isRequired
            isInvalid={!!fieldState.error}
            isDisabled={submitting}
          >
            <Label className="mb-1 block text-[14px]">{t('support.form.subject')}</Label>
            <Button className="flex h-[44px] w-full items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-3 text-[16px] outline-none focus:ring-2 focus:ring-[#2563EB]">
              <SelectValue />
            </Button>
            <Popover className="w-[var(--trigger-width)] rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg">
              <ListBox items={subjectItems} className="p-1">
                {(item) => (
                  <ListBoxItem
                    id={item.id}
                    className="cursor-pointer rounded-md px-3 py-2 text-[14px] outline-none hover:bg-[var(--color-surface)] focus:bg-[var(--color-surface)]"
                  >
                    {item.label}
                  </ListBoxItem>
                )}
              </ListBox>
            </Popover>
            {fieldState.error && (
              <FieldError className="mt-1 text-[12px] text-[var(--color-error)]">
                {fieldState.error.message}
              </FieldError>
            )}
          </Select>
        )}
      />

      {/* Message */}
      <Controller
        name="message"
        control={form.control}
        render={({ field, fieldState }) => (
          <AriaTextField
            value={field.value ?? ''}
            onChange={field.onChange}
            onBlur={field.onBlur}
            isRequired
            isInvalid={!!fieldState.error}
            isDisabled={submitting}
          >
            <Label className="mb-1 block text-[14px]">{t('support.form.message')}</Label>
            <TextArea
              rows={4}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-[16px] outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
            <div className="mt-1 flex items-center justify-between">
              {fieldState.error ? (
                <span className="text-[12px] text-[var(--color-error)]">
                  {fieldState.error.message}
                </span>
              ) : (
                <span />
              )}
              <MessageCharCount control={form.control} />
            </div>
          </AriaTextField>
        )}
      />

      {/* Submit */}
      <Button
        type="submit"
        isDisabled={submitting}
        className="mx-auto flex h-12 w-full max-w-[400px] items-center justify-center rounded-lg bg-[#2563EB] text-[16px] font-bold text-white outline-none hover:bg-[#1d4ed8] focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 disabled:opacity-50"
      >
        {submitting ? (
          <Loader2 size={20} className="animate-spin" />
        ) : (
          t('support.form.submit')
        )}
      </Button>
    </form>
  )
}
