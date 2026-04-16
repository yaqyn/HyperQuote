import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import {
  Switch,
  Heading,
  Modal,
  ModalOverlay,
  Dialog,
  Button as AriaButton,
} from 'react-aria-components'
import { PillGroup, Pill, UnderlineInput, Button as UiButton } from '../../ui'
import { sendQuote } from '../../../lib/server/sales-send'
import type { QuoteFormValues } from './types'

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
          // Recipients default to the customer's primary contact — the
          // server resolves it off db.customers. When multi-recipient
          // selection ships, pass the selected ids here.
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
        <p className="text-[12px] text-yellow-700 dark:text-yellow-300">
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{missingItems.length}</span>
          {' '}item{missingItems.length > 1 ? 's' : ''} will show "Price on Application"
        </p>
      )}

      {/* Recipients + Cover Note + Send Via -- compact rows */}
      <div className="flex items-center gap-3">
        {/* Recipients as tags */}
        <span className="text-[12px] font-medium text-[var(--color-text)]">
          Primary Contact
        </span>
        {/* Send via pills */}
        <PillGroup
          aria-label="Send method"
          value={sendMethod}
          onChange={(val) => setSendMethod(val as 'portal' | 'email' | 'both')}
        >
          <Pill value="portal" className="px-2.5 py-0.5">Portal</Pill>
          <Pill value="email" className="px-2.5 py-0.5">Email</Pill>
          <Pill value="both" className="px-2.5 py-0.5">Both</Pill>
        </PillGroup>

        {/* Schedule toggle */}
        <Switch
          isSelected={scheduleSend}
          onChange={setScheduleSend}
          className="group flex items-center gap-1.5"
        >
          <div className="h-4 w-7 rounded-full bg-black/[0.06] p-0.5 transition-colors group-data-[selected]:bg-[var(--color-primary)] dark:bg-white/[0.08]">
            <div className="h-3 w-3 rounded-full bg-white shadow transition-transform group-data-[selected]:translate-x-3 dark:bg-black" />
          </div>
          <span className="text-[12px] text-[var(--color-text-muted)]">Schedule</span>
        </Switch>

        {scheduleSend && (
          <>
            <UiButton
              variant="ghost"
              onPress={() => {
                const tomorrow = new Date()
                tomorrow.setDate(tomorrow.getDate() + 1)
                tomorrow.setHours(8, 0, 0, 0)
                setScheduledDate(tomorrow.toISOString())
              }}
            >
              Tomorrow 8 AM
            </UiButton>
            {scheduledDate && (
              <span className="font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-[var(--color-text-muted)]">
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
          <UnderlineInput
            value={field.value ?? ''}
            onChange={(val) => field.onChange(val)}
            placeholder="Cover note (optional)..."
            label="Cover note"
          />
        )}
      />

      {/* Send */}
      <UiButton
        variant="subtle"
        className="w-full rounded-lg py-2.5"
        onPress={() => setShowConfirm(true)}
        isDisabled={isSending}
      >
        {scheduleSend ? 'Schedule Send' : 'Send Quote'}
      </UiButton>

      {/* Confirmation Dialog */}
      <ModalOverlay
        isOpen={showConfirm}
        onOpenChange={setShowConfirm}
        isKeyboardDismissDisabled
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      >
        <Modal className="w-full max-w-md rounded-2xl">
          <Dialog
            className="rounded-2xl border border-black/[0.06] bg-white/90 p-6 shadow-2xl outline-none dark:border-white/[0.06] dark:bg-black/90"
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
              <p className="mt-2 text-[12px] text-yellow-700 dark:text-yellow-300">
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
