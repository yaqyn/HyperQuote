import { useState, useCallback } from 'react'
import { useForm, useWatch, Controller } from 'react-hook-form'
import { standardSchemaResolver } from '@hyperquote/forms'
import { z } from 'zod'
import {
  TextField as AriaTextField,
  Label,
  Input,
  TextArea,
  Select,
  Button,
  SelectValue,
  Popover,
  ListBox,
  ListBoxItem,
} from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { Check, Loader2, Info } from 'lucide-react'
import { motion } from 'motion/react'
import { submitContactForm } from '../../lib/contact'

const contactSchema = z.object({
  name: z
    .string()
    .min(2, 'Please enter at least 2 characters')
    .max(80, 'Name is too long')
    .regex(/^[^\d]+$/, 'Names can\u2019t contain numbers'),
  email: z.string().email('This doesn\u2019t look like a valid email'),
  phone: z
    .string()
    .regex(/^[0-9]{10}$/, 'Enter 10 digits after the country code')
    .optional()
    .or(z.literal('')),
  subject: z.enum(['general', 'quote', 'delivery', 'billing', 'other']),
  message: z
    .string()
    .min(10, 'A bit more detail would help us assist you')
    .max(2000, 'Message is too long'),
})

type ContactFormData = z.infer<typeof contactSchema>

const COUNTRY_CODE = '+20'

const inputClass =
  'h-[48px] w-full border-0 border-b border-[var(--color-text)]/[0.1] bg-transparent ps-0 pe-0 text-[16px] outline-none transition-colors duration-200 focus:border-[var(--color-primary)]/40'
const labelClass =
  'mb-2 block text-[11px] font-medium uppercase tracking-[.1em] opacity-30'

function FieldHint({ message }: { message: string }) {
  return (
    <div className="mt-2 flex items-start gap-1.5">
      <Info size={13} className="mt-px shrink-0 text-[var(--color-primary)] opacity-60" />
      <span className="text-[12px] leading-[1.4] text-[var(--color-primary)] opacity-70">
        {message}
      </span>
    </div>
  )
}

function MessageCharCount({ control }: { control: any }) {
  const message = useWatch({ control, name: 'message', defaultValue: '' })
  const count = (message ?? '').length

  return (
    <span className="font-[family-name:var(--font-mono)] text-[11px] opacity-30">
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

  const [error, setError] = useState<string | null>(null)

  // Strip country code if user types it manually
  const handlePhoneChange = useCallback(
    (value: string) => {
      let cleaned = value.replace(/[^0-9]/g, '')
      // Strip leading 20 if they typed the country code
      if (cleaned.startsWith('20') && cleaned.length > 10) {
        cleaned = cleaned.slice(2)
      }
      // Strip leading 0 (local format)
      if (cleaned.startsWith('0') && cleaned.length > 10) {
        cleaned = cleaned.slice(1)
      }
      // Cap at 10 digits
      cleaned = cleaned.slice(0, 10)
      form.setValue('phone', cleaned, { shouldValidate: false })
    },
    [form],
  )

  async function onSubmit(data: ContactFormData) {
    // Prepend country code for submission
    const submitData = {
      ...data,
      phone: data.phone ? `${COUNTRY_CODE}${data.phone}` : '',
    }
    setSubmitting(true)
    setError(null)
    try {
      await submitContactForm({ data: submitData })
      setSubmitted(true)
    } catch {
      setError(t('support.form.error'))
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="flex flex-col items-center gap-4 py-12"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary)]">
          <Check size={28} className="text-white" />
        </div>
        <p className="text-center text-[16px] font-bold">
          {t('support.form.success')}
        </p>
      </motion.div>
    )
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-8"
    >
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
            <Label className={labelClass}>{t('support.form.name')}</Label>
            <Input className={inputClass} />
            {fieldState.error && (
              <FieldHint message={fieldState.error.message ?? 'Please enter your name'} />
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
            <Label className={labelClass}>{t('support.form.email')}</Label>
            <Input className={inputClass} />
            {fieldState.error && (
              <FieldHint message={fieldState.error.message ?? 'Please enter a valid email'} />
            )}
          </AriaTextField>
        )}
      />

      {/* Phone */}
      <Controller
        name="phone"
        control={form.control}
        render={({ field, fieldState }) => (
          <AriaTextField
            value={field.value ?? ''}
            onChange={handlePhoneChange}
            onBlur={field.onBlur}
            type="tel"
            isInvalid={!!fieldState.error}
            isDisabled={submitting}
          >
            <Label className={labelClass}>{t('support.form.phone')}</Label>
            <div className="flex items-center border-b border-[var(--color-text)]/[0.1] transition-colors duration-200 focus-within:border-[var(--color-primary)]/40">
              <span className="flex h-[48px] shrink-0 items-center pe-3 font-[family-name:var(--font-mono)] text-[16px] opacity-35">
                {COUNTRY_CODE}
              </span>
              <div className="h-5 w-px bg-[var(--color-text)]/[0.08]" />
              <Input className="h-[48px] w-full border-0 bg-transparent ps-3 pe-0 font-[family-name:var(--font-mono)] text-[16px] outline-none" />
            </div>
            {fieldState.error && (
              <FieldHint message={fieldState.error.message ?? 'Enter 10 digits after the country code'} />
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
            <Label className={labelClass}>{t('support.form.subject')}</Label>
            <Button
              className={`flex items-center justify-between ${inputClass}`}
            >
              <SelectValue />
            </Button>
            <Popover className="w-[var(--trigger-width)] rounded-xl border border-[var(--color-text)]/[0.06] bg-[var(--color-card)] p-1 shadow-lg backdrop-blur-[20px]">
              <ListBox items={subjectItems}>
                {(item) => (
                  <ListBoxItem
                    id={item.id}
                    className="cursor-pointer rounded-lg px-3 py-2.5 text-[14px] outline-none hover:bg-[var(--color-text)]/[0.04] focus:bg-[var(--color-text)]/[0.04]"
                  >
                    {item.label}
                  </ListBoxItem>
                )}
              </ListBox>
            </Popover>
            {fieldState.error && (
              <FieldHint message="Please select a subject" />
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
            <Label className={labelClass}>{t('support.form.message')}</Label>
            <TextArea
              rows={4}
              className="w-full border-0 border-b border-[var(--color-text)]/[0.1] bg-transparent ps-0 pe-0 py-3 text-[16px] outline-none transition-colors duration-200 focus:border-[var(--color-primary)]/40"
            />
            <div className="mt-1.5 flex items-center justify-between">
              {fieldState.error ? (
                <FieldHint message={fieldState.error.message ?? 'Please add more detail'} />
              ) : (
                <span />
              )}
              <MessageCharCount control={form.control} />
            </div>
          </AriaTextField>
        )}
      />

      {/* Server error */}
      {error && (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)]/[0.06] px-4 py-3">
          <Info size={14} className="shrink-0 text-[var(--color-primary)]" />
          <p className="text-[13px] text-[var(--color-primary)]" role="alert">
            {error}
          </p>
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        isDisabled={submitting}
        className="mt-4 flex h-12 items-center justify-center rounded-lg bg-[var(--color-primary)] px-10 text-[15px] font-semibold text-white outline-none transition-all duration-200 hover:bg-[var(--color-primary-hover)] focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.2)] disabled:opacity-50"
      >
        {submitting ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          t('support.form.submit')
        )}
      </Button>
    </form>
  )
}
