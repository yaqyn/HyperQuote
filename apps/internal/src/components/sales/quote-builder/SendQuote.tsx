import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import {
  RadioGroup,
  Radio,
  Switch,
  Heading,
  Modal,
  ModalOverlay,
  Dialog,
  Button as AriaButton,
  Input,
  TextField,
} from 'react-aria-components'
import { sendQuote } from '../../../lib/server/sales-send'
import type { QuoteFormValues } from './LineItemsTable'

interface SendQuoteProps {
  quoteId: string
  quoteNumber: string
  customerName: string
  onSent: () => void
}

export function SendQuote({
  quoteId,
  quoteNumber,
  customerName,
  onSent,
}: SendQuoteProps) {
  const { i18n } = useTranslation('internal')
  const { control } = useFormContext<QuoteFormValues>()
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-EG'

  const lineItems = useWatch({ control, name: 'lineItems' })
  const coverNote = useWatch({ control, name: 'coverNote' })

  const [isSending, setIsSending] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [scheduleSend, setScheduleSend] = useState(false)
  const [sendMethod, setSendMethod] = useState<'portal' | 'email' | 'both'>('portal')
  const [scheduledDate, setScheduledDate] = useState<string | null>(null)

  const missingItems = (lineItems ?? []).filter(
    (item) => item.freshnessIndicator === 'missing',
  )
  const hasMissingPricing = missingItems.length > 0

  async function handleSend() {
    setIsSending(true)
    try {
      await sendQuote({
        data: {
          quoteId,
          method: sendMethod,
          recipientIds: ['primary-contact'],
          coverNote: coverNote || undefined,
          scheduledAt: scheduleSend && scheduledDate ? scheduledDate : undefined,
        },
      })
      setShowConfirm(false)
      onSent()
    } catch (err) {
      console.error('Failed to send quote:', err)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Missing pricing -- compact */}
      {hasMissingPricing && (
        <p className="text-[11px] text-yellow-700 dark:text-yellow-300">
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{missingItems.length}</span>
          {' '}item{missingItems.length > 1 ? 's' : ''} will show "Price on Application"
        </p>
      )}

      {/* Recipients + Cover Note + Send Via -- compact rows */}
      <div className="flex items-center gap-3">
        {/* Recipients as tags */}
        <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--color-primary)]">
          Primary Contact
        </span>
        <AriaButton
          className="text-[10px] font-medium text-[var(--color-primary)] outline-none transition-opacity data-[hovered]:opacity-70 data-[focus-visible]:underline"
          onPress={() => {
            console.log('Add CC recipient')
          }}
        >
          + CC
        </AriaButton>

        {/* Separator */}
        <div className="h-4 w-px bg-black/[0.06] dark:bg-white/[0.06]" />

        {/* Send via pills */}
        <RadioGroup
          aria-label="Send method"
          value={sendMethod}
          onChange={(val) => setSendMethod(val as 'portal' | 'email' | 'both')}
          className="flex gap-1"
        >
          {([
            { value: 'portal', label: 'Portal' },
            { value: 'email', label: 'Email' },
            { value: 'both', label: 'Both' },
          ] as const).map((opt) => (
            <Radio
              key={opt.value}
              value={opt.value}
              className="cursor-pointer rounded-full border border-black/[0.08] px-2.5 py-0.5 text-[10px] font-medium outline-none transition-all
                data-[selected]:border-[var(--color-primary)] data-[selected]:bg-[var(--color-primary)] data-[selected]:text-white
                data-[hovered]:bg-black/[0.02] data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50
                dark:border-white/[0.08] dark:data-[selected]:border-[var(--color-primary)]
                dark:data-[hovered]:bg-white/[0.03]"
            >
              {opt.label}
            </Radio>
          ))}
        </RadioGroup>

        {/* Separator */}
        <div className="h-4 w-px bg-black/[0.06] dark:bg-white/[0.06]" />

        {/* Schedule toggle */}
        <Switch
          isSelected={scheduleSend}
          onChange={setScheduleSend}
          className="group flex items-center gap-1.5"
        >
          <div className="h-4 w-7 rounded-full border border-black/[0.06] bg-black/[0.04] p-0.5 transition-colors group-data-[selected]:bg-[var(--color-primary)] dark:border-white/[0.06] dark:bg-white/[0.06]">
            <div className="h-3 w-3 rounded-full bg-white shadow transition-transform group-data-[selected]:translate-x-3 dark:bg-black" />
          </div>
          <span className="text-[10px] text-[var(--color-text-muted)]">Schedule</span>
        </Switch>

        {scheduleSend && (
          <>
            <AriaButton
              className="rounded-full border border-black/[0.08] px-2 py-0.5 text-[10px] font-medium outline-none data-[hovered]:bg-black/[0.03] data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50 dark:border-white/[0.08] dark:data-[hovered]:bg-white/[0.06]"
              onPress={() => {
                const tomorrow = new Date()
                tomorrow.setDate(tomorrow.getDate() + 1)
                tomorrow.setHours(8, 0, 0, 0)
                setScheduledDate(tomorrow.toISOString())
              }}
            >
              Tomorrow 8 AM
            </AriaButton>
            {scheduledDate && (
              <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--color-text-muted)]">
                {new Date(scheduledDate).toLocaleString(locale)}
              </span>
            )}
          </>
        )}
      </div>

      {/* Cover note -- single line input that can expand */}
      <Controller
        control={control}
        name="coverNote"
        render={({ field }) => (
          <TextField
            aria-label="Cover note"
            className="flex items-center gap-2"
          >
            <Input
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value)}
              placeholder="Cover note (optional)..."
              className="w-full rounded-md border border-black/[0.08] px-2 py-1.5 text-[12px] outline-none transition-colors placeholder:text-black/20 focus:border-[var(--color-primary)] dark:border-white/[0.08] dark:placeholder:text-white/20"
            />
          </TextField>
        )}
      />

      {/* Big Send button */}
      <AriaButton
        onPress={() => setShowConfirm(true)}
        className="w-full rounded-xl bg-[var(--color-primary)] py-3 text-[14px] font-semibold text-white outline-none transition-colors
          data-[hovered]:bg-[var(--color-primary)]/90 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50 data-[disabled]:opacity-50"
        isDisabled={isSending}
      >
        {scheduleSend ? 'Schedule Send' : 'Send Quote'}
      </AriaButton>

      {/* Confirmation Dialog */}
      <ModalOverlay
        isOpen={showConfirm}
        onOpenChange={setShowConfirm}
        isKeyboardDismissDisabled
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      >
        <Modal className="w-full max-w-md rounded-2xl">
          <Dialog
            className="rounded-2xl border border-black/[0.06] bg-white/90 p-6 shadow-2xl outline-none backdrop-blur-2xl dark:border-white/[0.06] dark:bg-black/90"
          >
            <Heading slot="title" className="text-[16px] font-semibold">
              Send to {customerName}?
            </Heading>
            <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">
              <span className="font-[family-name:var(--font-geist-mono)] font-medium tabular-nums">
                {quoteNumber}
              </span>{' '}
              via {sendMethod === 'both' ? 'Portal + Email' : sendMethod === 'portal' ? 'Portal' : 'Email'}
              {scheduleSend && scheduledDate
                ? ` at ${new Date(scheduledDate).toLocaleString(locale)}`
                : ''}
            </p>
            {hasMissingPricing && (
              <p className="mt-2 text-[11px] text-yellow-700 dark:text-yellow-300">
                {missingItems.length} item{missingItems.length > 1 ? 's' : ''} will show "Price on Application".
              </p>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <AriaButton
                onPress={() => setShowConfirm(false)}
                className="rounded-lg border border-black/[0.06] px-4 py-2 text-[13px] font-medium outline-none data-[hovered]:bg-black/[0.03] data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50 dark:border-white/[0.06] dark:data-[hovered]:bg-white/[0.06]"
              >
                Cancel
              </AriaButton>
              <AriaButton
                onPress={handleSend}
                isDisabled={isSending}
                className="rounded-lg bg-[var(--color-primary)] px-5 py-2 text-[13px] font-medium text-white outline-none data-[hovered]:bg-[var(--color-primary)]/90 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50 data-[disabled]:opacity-50"
              >
                {isSending ? 'Sending...' : 'Confirm'}
              </AriaButton>
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </div>
  )
}
