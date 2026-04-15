import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, Modal, ModalOverlay, Heading, Button } from 'react-aria-components'
import { motion } from 'motion/react'
import { sendInvoice } from '../../../lib/server/finance-invoices'
import type { Invoice } from '../../../types/finance'

interface SendInvoiceModalProps {
  invoice: Invoice
  onClose: () => void
}

type SendChannel = 'portal' | 'email' | 'whatsapp' | 'print'

const CHANNELS: { id: SendChannel; label: string; defaultChecked: boolean }[] = [
  { id: 'portal', label: 'Portal', defaultChecked: true },
  { id: 'email', label: 'Email', defaultChecked: true },
  { id: 'whatsapp', label: 'WhatsApp', defaultChecked: false },
  { id: 'print', label: 'Print', defaultChecked: false },
]

/**
 * Send invoice modal — recipient tags + channel pills + schedule option.
 * Clean, minimal, professional.
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <Modal className="w-full max-w-md mx-4">
        <Dialog
          className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white/95 dark:bg-black/95 p-0 outline-none"
        >
          {({ close }) => (
            <motion.div
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              {/* Header */}
              <div className="px-6 pt-5 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
                <Heading slot="title" className="text-sm font-medium">
                  {t('invoicing.sendInvoice', 'Send Invoice')}
                </Heading>
                <div className="text-xs text-black/30 dark:text-white/30 mt-0.5 font-[family-name:var(--font-geist-mono)] tabular-nums">
                  {invoice.number}
                </div>
              </div>

              {sent ? (
                /* ─── Success ─────────────────────────────── */
                <div className="px-6 py-10 text-center">
                  <div className="size-8 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                    <span className="size-2 rounded-full bg-green-500" />
                  </div>
                  <div className="text-xs font-medium text-black/70 dark:text-white/70 mb-1">
                    {t('invoicing.invoiceSent', 'Sent')}
                  </div>
                  <div className="text-[11px] text-black/30 dark:text-white/30 mt-1">
                    {Array.from(selected).join(' + ')}
                  </div>
                  <div className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] text-black/20 dark:text-white/20 mt-1">
                    {new Date().toISOString().slice(0, 19).replace('T', ' ')}
                  </div>
                  <Button
                    onPress={close}
                    className="mt-6 rounded-md bg-black/[0.04] dark:bg-white/[0.04] px-4 py-1.5 text-xs hover:bg-black/[0.08] dark:hover:bg-white/[0.08] transition-colors"
                  >
                    {t('invoicing.done', 'Done')}
                  </Button>
                </div>
              ) : (
                <div className="px-6 py-5 space-y-5">
                  {/* ─── Channel pills ──────────────────────── */}
                  <div>
                    <div className="text-[10px] tracking-widest uppercase text-black/25 dark:text-white/25 mb-2">
                      {t('invoicing.sendChannels', 'Channels')}
                    </div>
                    <div className="flex gap-1.5">
                      {CHANNELS.map((channel) => (
                        <button
                          key={channel.id}
                          type="button"
                          onClick={() => toggleChannel(channel.id)}
                          className={`rounded-full px-3 py-1 text-xs transition-colors ${
                            selected.has(channel.id)
                              ? 'bg-[#2563EB] text-white'
                              : 'bg-black/[0.04] dark:bg-white/[0.04] text-black/40 dark:text-white/40 hover:bg-black/[0.08] dark:hover:bg-white/[0.08]'
                          }`}
                        >
                          {channel.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ─── Message ─────────────────────────────── */}
                  <div>
                    <div className="text-[10px] tracking-widest uppercase text-black/25 dark:text-white/25 mb-2">
                      {t('invoicing.messageTemplate', 'Message')}
                    </div>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={5}
                      className="w-full bg-transparent border border-black/[0.06] dark:border-white/[0.06] rounded-lg px-3 py-2 text-xs text-black/60 dark:text-white/60 resize-none outline-none focus:border-[#2563EB]/30 transition-colors"
                    />
                  </div>

                  {/* ─── Actions ─────────────────────────────── */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
                    <Button
                      onPress={close}
                      className="rounded-md px-4 py-1.5 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
                    >
                      {t('invoicing.cancel', 'Cancel')}
                    </Button>
                    <Button
                      onPress={handleSendNow}
                      isDisabled={isSending || selected.size === 0}
                      className="rounded-md bg-[#2563EB] text-white px-4 py-1.5 text-xs font-medium hover:bg-[#2563EB]/90 pressed:bg-[#2563EB]/80 transition-colors disabled:opacity-40"
                    >
                      {isSending
                        ? t('invoicing.sending', 'Sending...')
                        : t('invoicing.sendNow', 'Send Now')}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
