import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import {
  RadioGroup,
  Radio,
  Label,
  Switch,
  DatePicker,
  DateInput,
  DateSegment,
  Calendar,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarCell,
  Heading,
  Popover,
  Dialog,
  DialogTrigger,
  Modal,
  ModalOverlay,
  Group,
  Button as AriaButton,
  TextArea,
  TextField,
} from 'react-aria-components'
import { today, getLocalTimeZone } from '@internationalized/date'
import { sendQuote } from '../../../lib/server/sales-send'
import type { QuoteFormValues } from './LineItemsTable'
import type { FreshnessIndicator } from '../../../types/sales'

// ─── SendQuote ────────────────────────────────────────────
// Step 10: Send to customer via Portal / Email / Both.
// Schedule send option. Partial quote handling.
// Confirmation dialog with isKeyboardDismissDisabled.

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
  const { t, i18n } = useTranslation('internal')
  const { control } = useFormContext<QuoteFormValues>()

  const lineItems = useWatch({ control, name: 'lineItems' })
  const coverNote = useWatch({ control, name: 'coverNote' })

  const [isSending, setIsSending] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [scheduleSend, setScheduleSend] = useState(false)
  const [sendMethod, setSendMethod] = useState<'portal' | 'email' | 'both'>('portal')
  const [scheduledDate, setScheduledDate] = useState<string | null>(null)

  // Detect partial quote: items with missing freshness
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
    <div className="space-y-4">
      {/* Partial Quote Notice */}
      {hasMissingPricing && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 dark:border-yellow-800 dark:bg-yellow-950/30">
          <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
            {missingItems.length} item{missingItems.length > 1 ? 's' : ''} without pricing
          </p>
          <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
            These items will show "Price on Application -- we'll update within 24 hours" on the customer quote.
          </p>
        </div>
      )}

      {/* Send Method */}
      <RadioGroup
        aria-label="Send method"
        value={sendMethod}
        onChange={(val) => setSendMethod(val as 'portal' | 'email' | 'both')}
        className="flex flex-col gap-1"
      >
        <Label className="text-xs font-medium text-black/50 dark:text-white/50">
          Send Via
        </Label>
        <div className="flex gap-3">
          {([
            { value: 'portal', label: 'Portal', description: 'Preferred -- instant access', highlighted: true },
            { value: 'email', label: 'Email (PDF)', description: 'PDF attachment' },
            { value: 'both', label: 'Both', description: 'Portal + Email' },
          ] as const).map((opt) => (
            <Radio
              key={opt.value}
              value={opt.value}
              className={`flex flex-1 cursor-pointer flex-col gap-0.5 rounded-lg border px-3 py-2.5 outline-none transition-colors
                data-[selected]:border-[#2563EB] data-[selected]:bg-[#2563EB]/5
                data-[hovered]:bg-black/3 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50
                dark:data-[selected]:border-[#2563EB] dark:data-[selected]:bg-[#2563EB]/10
                dark:data-[hovered]:bg-white/5
                ${'highlighted' in opt && opt.highlighted
                  ? 'border-[#2563EB]/30 dark:border-[#2563EB]/30'
                  : 'border-black/10 dark:border-white/10'
                }`}
            >
              <span className="text-sm font-medium">{opt.label}</span>
              <span className="text-xs text-black/40 dark:text-white/40">{opt.description}</span>
            </Radio>
          ))}
        </div>
      </RadioGroup>

      {/* Recipient Selection */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs font-medium text-black/50 dark:text-white/50">
          Recipients
        </Label>
        <div className="flex items-center gap-2 rounded-lg border border-black/10 bg-white/60 px-3 py-2 backdrop-blur-sm dark:border-white/10 dark:bg-black/40">
          <span className="rounded bg-[#2563EB]/10 px-2 py-0.5 text-xs font-medium text-[#2563EB]">
            Primary Contact
          </span>
          <AriaButton
            className="rounded border border-dashed border-black/20 px-2 py-0.5 text-xs text-black/40 outline-none data-[hovered]:bg-black/5 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 dark:border-white/20 dark:text-white/40 dark:data-[hovered]:bg-white/10"
            onPress={() => {
              // TODO: Open CC contact picker ComboBox
              console.log('Add CC recipient')
            }}
          >
            + Add CC
          </AriaButton>
        </div>
      </div>

      {/* Cover Note */}
      <Controller
        control={control}
        name="coverNote"
        render={({ field }) => (
          <TextField
            aria-label="Cover note"
            className="flex flex-col gap-1"
          >
            <Label className="text-xs font-medium text-black/50 dark:text-white/50">
              Cover Note (personalized)
            </Label>
            <TextArea
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value)}
              placeholder="Dear valued customer, please find attached our competitive quotation..."
              rows={3}
              className="rounded-lg border border-black/10 bg-white/60 px-3 py-2 text-sm backdrop-blur-sm outline-none placeholder:text-black/30 focus:ring-2 focus:ring-[#2563EB]/50 dark:border-white/10 dark:bg-black/40 dark:placeholder:text-white/30"
            />
          </TextField>
        )}
      />

      {/* Schedule Send */}
      <div className="flex flex-col gap-2">
        <Switch
          isSelected={scheduleSend}
          onChange={setScheduleSend}
          className="group flex items-center gap-2"
        >
          <div className="h-5 w-9 rounded-full border border-black/10 bg-black/5 p-0.5 transition-colors group-data-[selected]:bg-[#2563EB] dark:border-white/10 dark:bg-white/10">
            <div className="h-4 w-4 rounded-full bg-white shadow transition-transform group-data-[selected]:translate-x-4 dark:bg-black" />
          </div>
          <span className="text-sm">Schedule for later</span>
        </Switch>

        {scheduleSend && (
          <div className="ms-11 flex items-center gap-2">
            <p className="text-xs text-black/40 dark:text-white/40">
              Default suggestion: Send at 8 AM tomorrow
            </p>
            <AriaButton
              className="rounded border border-black/10 px-2 py-1 text-xs outline-none data-[hovered]:bg-black/5 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 dark:border-white/10 dark:data-[hovered]:bg-white/10"
              onPress={() => {
                const tomorrow = new Date()
                tomorrow.setDate(tomorrow.getDate() + 1)
                tomorrow.setHours(8, 0, 0, 0)
                setScheduledDate(tomorrow.toISOString())
              }}
            >
              Use suggestion
            </AriaButton>
            {scheduledDate && (
              <span className="font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-black/60 dark:text-white/60">
                Scheduled: {new Date(scheduledDate).toLocaleString(locale)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Send Button */}
      <div className="flex justify-end pt-2">
        <AriaButton
          onPress={() => setShowConfirm(true)}
          className="rounded-lg bg-[#2563EB] px-6 py-2.5 text-sm font-medium text-white outline-none data-[hovered]:bg-[#2563EB]/90 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 data-[disabled]:opacity-50"
          isDisabled={isSending}
        >
          {scheduleSend ? 'Schedule Send' : 'Send Quote'}
        </AriaButton>
      </div>

      {/* Confirmation Dialog */}
      <ModalOverlay
        isOpen={showConfirm}
        onOpenChange={setShowConfirm}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      >
        <Modal className="w-full max-w-md rounded-2xl">
          <Dialog
            className="rounded-2xl border border-black/10 bg-white/90 p-6 shadow-2xl outline-none backdrop-blur-2xl dark:border-white/10 dark:bg-black/90"
            isKeyboardDismissDisabled
          >
            <Heading slot="title" className="text-base font-semibold">
              Send quote to {customerName}?
            </Heading>
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">
              Quote{' '}
              <span className="font-[family-name:var(--font-geist-mono)] font-medium tabular-nums">
                {quoteNumber}
              </span>{' '}
              will be sent via {sendMethod === 'both' ? 'Portal and Email' : sendMethod === 'portal' ? 'Portal' : 'Email'}.
              {scheduleSend && scheduledDate
                ? ` Scheduled for ${new Date(scheduledDate).toLocaleString(locale)}.`
                : ''}
            </p>
            {hasMissingPricing && (
              <p className="mt-2 text-xs text-yellow-700 dark:text-yellow-300">
                {missingItems.length} item{missingItems.length > 1 ? 's' : ''} will show "Price on Application".
              </p>
            )}
            <div className="mt-4 flex justify-end gap-3">
              <AriaButton
                onPress={() => setShowConfirm(false)}
                className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium outline-none data-[hovered]:bg-black/5 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 dark:border-white/10 dark:data-[hovered]:bg-white/10"
              >
                Cancel
              </AriaButton>
              <AriaButton
                onPress={handleSend}
                isDisabled={isSending}
                className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white outline-none data-[hovered]:bg-[#2563EB]/90 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 data-[disabled]:opacity-50"
              >
                {isSending ? 'Sending...' : 'Confirm Send'}
              </AriaButton>
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </div>
  )
}
