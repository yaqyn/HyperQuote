import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogTrigger, Modal, ModalOverlay, Heading } from 'react-aria-components'
import { sendInvoice } from '../../../lib/server/finance-invoices'
import type { Invoice } from '../../../types/finance'

interface SendInvoiceModalProps {
  invoice: Invoice
  onClose: () => void
}

type SendChannel = 'portal' | 'email' | 'whatsapp' | 'print'

const CHANNELS: { id: SendChannel; label: string; defaultChecked: boolean }[] = [
  { id: 'portal', label: 'Customer Portal', defaultChecked: true },
  { id: 'email', label: 'Email', defaultChecked: true },
  { id: 'whatsapp', label: 'WhatsApp', defaultChecked: false },
  { id: 'print', label: 'Print & Mail', defaultChecked: false },
]

/**
 * Multi-channel send modal (React Aria Dialog).
 * 4 checkboxes: Portal (default), Email (default), WhatsApp, Print & Mail.
 * Pre-filled message template, Send Now / Schedule buttons.
 */
export function SendInvoiceModal({ invoice, onClose }: SendInvoiceModalProps) {
  const { t } = useTranslation('finance')
  const [selected, setSelected] = useState<Set<SendChannel>>(
    new Set(CHANNELS.filter((c) => c.defaultChecked).map((c) => c.id))
  )
  const [message, setMessage] = useState(
    `Dear Customer,\n\nPlease find attached Invoice ${invoice.number} for EGP ${invoice.grandTotal.toLocaleString()}.\n\nPayment is due by ${invoice.dueDate}.\n\nThank you for your business.\n\nHyperQuote Trading LLC`
  )
  const [isSending, setIsSending] = useState(false)
  const [sent, setSent] = useState(false)

  const toggleChannel = (id: SendChannel) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSendNow = async () => {
    if (selected.size === 0) return
    setIsSending(true)
    try {
      await sendInvoice({
        data: {
          invoiceId: invoice.id,
          channels: Array.from(selected),
        },
      })
      setSent(true)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <ModalOverlay
      isDismissable
      isOpen
      onOpenChange={(open) => { if (!open) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <Modal className="w-full max-w-lg mx-4">
        <Dialog className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/90 dark:bg-black/90 backdrop-blur-2xl p-6 outline-none">
          {({ close }) => (
            <>
              <Heading slot="title" className="text-lg font-semibold mb-4">
                {t('invoicing.sendInvoice', 'Send Invoice')} {invoice.number}
              </Heading>

              {sent ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-green-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  <div className="text-sm font-medium mb-1">{t('invoicing.invoiceSent', 'Invoice Sent!')}</div>
                  <div className="text-xs text-black/40 dark:text-white/40">
                    {t('invoicing.sentVia', 'Sent via')}: {Array.from(selected).join(', ')}
                  </div>
                  <div className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black/40 dark:text-white/40 mt-1">
                    {new Date().toISOString().slice(0, 19).replace('T', ' ')}
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    className="mt-4 rounded-lg bg-[#2563EB] text-white px-4 py-2 text-sm font-medium hover:bg-[#2563EB]/90 transition-colors"
                  >
                    {t('invoicing.done', 'Done')}
                  </button>
                </div>
              ) : (
                <>
                  {/* Channel checkboxes */}
                  <div className="space-y-3 mb-4">
                    <div className="text-sm font-medium text-black/60 dark:text-white/60">
                      {t('invoicing.sendChannels', 'Send via')}
                    </div>
                    {CHANNELS.map((channel) => (
                      <label key={channel.id} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selected.has(channel.id)}
                          onChange={() => toggleChannel(channel.id)}
                          className="rounded border-black/20 dark:border-white/20"
                        />
                        <span className="text-sm">{channel.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* Message template */}
                  <div className="mb-4">
                    <label className="text-sm font-medium text-black/60 dark:text-white/60 mb-1 block">
                      {t('invoicing.messageTemplate', 'Message')}
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={6}
                      className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 px-3 py-2 text-sm resize-none"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={close}
                      className="rounded-lg border border-black/10 dark:border-white/10 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      {t('invoicing.cancel', 'Cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={handleSendNow}
                      disabled={isSending || selected.size === 0}
                      className="rounded-lg bg-[#2563EB] text-white px-4 py-2 text-sm font-medium hover:bg-[#2563EB]/90 transition-colors disabled:opacity-50"
                    >
                      {isSending
                        ? t('invoicing.sending', 'Sending...')
                        : t('invoicing.sendNow', 'Send Now')}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
