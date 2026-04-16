import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import { X, Mail, Phone, MessageCircle } from 'lucide-react'
import { SlidePanel } from '../shared/SlidePanel'
import { ReportViewerModal } from '../shared/ReportViewer'
import type { Conversation, LinkedOrder, LinkedQuote } from '../../types/customer-service'

interface CustomerProfilePanelProps {
  conversation: Conversation | null
  isOpen: boolean
  onClose: () => void
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days < 1) return 'today'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  const years = Math.floor(months / 12)
  return `${years}y ago`
}

export function CustomerProfilePanel({ conversation, isOpen, onClose }: CustomerProfilePanelProps) {
  const { t, i18n } = useTranslation('customer-service')
  const [reportRfqId, setReportRfqId] = useState<string | null>(null)

  if (!conversation) return null

  const customer = conversation.customer
  const name = i18n.language === 'ar' ? customer.nameAr : customer.name
  const company = i18n.language === 'ar' ? customer.companyAr : customer.company
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <>
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      maxWidth={400}
      panelKey="customer-profile"
      ariaLabel={`${name} — ${t('profile.title')}`}
      scope="customer-service"
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-black/[0.06] dark:border-white/[0.06] shrink-0">
        <span className="text-[13px] font-semibold text-[var(--color-text)]">
          {t('profile.title')}
        </span>
        <Button
          onPress={onClose}
          aria-label={t('profile.close')}
          className="flex items-center justify-center w-7 h-7 rounded-md text-[var(--color-text-subtle)] hover:text-[var(--color-text)] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
        >
          <X size={15} strokeWidth={1.5} />
        </Button>
      </div>

      {/* ── Scrollable content ─────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Identity */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
              <span className="text-[13px] font-bold text-[var(--color-primary)]">{initials}</span>
            </div>
            <div className="min-w-0">
              <h3 className="text-[16px] font-semibold text-[var(--color-text)] leading-tight">
                {name}
              </h3>
              {company && (
                <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">{company}</p>
              )}
              <p className="font-[var(--font-geist-mono)] text-[10px] text-[var(--color-text-subtle)] mt-1.5 tabular-nums">
                {t('context.customerSince')} {formatRelativeDate(customer.firstContactAt)} · {customer.totalConversations} {t('profile.orders')}
              </p>
            </div>
          </div>
        </div>

        {/* Contact actions */}
        <div className="px-5 pb-4">
          <div className="flex items-center gap-1.5">
            {customer.email && (
              <a
                href={`mailto:${customer.email}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md bg-black/[0.03] dark:bg-white/[0.04] hover:bg-[var(--color-primary)]/8 transition-colors group"

              >
                <Mail size={12} strokeWidth={1.5} className="text-[var(--color-text-subtle)] group-hover:text-[var(--color-primary)] transition-colors" />
                <span className="text-[10px] font-medium text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors">
                  {t('context.email')}
                </span>
              </a>
            )}
            {customer.phone && (
              <a
                href={`tel:${customer.phone.replace(/\s/g, '')}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md bg-black/[0.03] dark:bg-white/[0.04] hover:bg-[var(--color-primary)]/8 transition-colors group"

              >
                <Phone size={12} strokeWidth={1.5} className="text-[var(--color-text-subtle)] group-hover:text-[var(--color-primary)] transition-colors" />
                <span className="text-[10px] font-medium text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors">
                  {t('context.call')}
                </span>
              </a>
            )}
            {customer.phone && (
              <a
                href={`https://wa.me/${customer.phone.replace(/[^0-9+]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md bg-black/[0.03] dark:bg-white/[0.04] hover:bg-[var(--color-primary)]/8 transition-colors group"
              >
                <MessageCircle size={12} strokeWidth={1.5} className="text-[var(--color-text-subtle)] group-hover:text-[var(--color-primary)] transition-colors" />
                <span className="text-[10px] font-medium text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors">
                  WhatsApp
                </span>
              </a>
            )}
          </div>
        </div>

        {/* Contact details */}
        <div className="px-5 pb-4 flex flex-col gap-2">
          {customer.email && (
            <div className="flex items-center gap-2">
              <Mail size={11} strokeWidth={1.5} className="text-[var(--color-text-subtle)] shrink-0" />
              <span className="font-[var(--font-geist-mono)] text-[11px] text-[var(--color-text-muted)] truncate">
                {customer.email}
              </span>
            </div>
          )}
          {customer.phone && (
            <div className="flex items-center gap-2">
              <Phone size={11} strokeWidth={1.5} className="text-[var(--color-text-subtle)] shrink-0" />
              <span className="font-[var(--font-geist-mono)] text-[11px] text-[var(--color-text-muted)] tabular-nums" dir="ltr">
                {customer.phone}
              </span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-black/[0.04] dark:border-white/[0.04]" />

        {/* Linked Orders */}
        {conversation.linkedOrders.length > 0 && (
          <div className="px-5 pt-4 pb-2">
            <h4 className="font-[var(--font-geist-mono)] text-[10px] font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider mb-2">
              {t('context.orders')}
            </h4>
            <div className="flex flex-col">
              {conversation.linkedOrders.map((order: LinkedOrder) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => order.rfqId && setReportRfqId(order.rfqId)}
                  className={`flex items-center justify-between py-2.5 px-2 -mx-2 rounded-md transition-colors border-b border-black/[0.03] dark:border-white/[0.03] last:border-0 ${
                    order.rfqId
                      ? 'hover:bg-black/[0.03] dark:hover:bg-white/[0.03] cursor-pointer'
                      : 'cursor-default'
                  }`}
                >
                  <div className="min-w-0">
                    <span className="font-[var(--font-geist-mono)] text-[12px] font-medium text-[var(--color-text)]">
                      {order.displayId}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`font-[var(--font-geist-mono)] text-[9px] uppercase tracking-wider px-1 py-px rounded ${
                        order.status === 'delivered'
                          ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]'
                          : order.status === 'in_transit'
                            ? 'bg-[var(--color-info-bg)] text-[var(--color-info)]'
                            : 'bg-black/[0.04] dark:bg-white/[0.04] text-[var(--color-text-subtle)]'
                      }`}>
                        {order.status.replace('_', ' ')}
                      </span>
                      <span className="font-[var(--font-geist-mono)] text-[10px] text-[var(--color-text-subtle)] tabular-nums">
                        {formatRelativeDate(order.createdAt)}
                      </span>
                    </div>
                  </div>
                  <span className="font-[var(--font-geist-mono)] text-[12px] font-medium text-[var(--color-text)] tabular-nums shrink-0">
                    {formatCurrency(order.totalAmount, order.currency)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Linked Quotes */}
        {conversation.linkedQuotes.length > 0 && (
          <div className="px-5 pt-3 pb-2">
            <h4 className="font-[var(--font-geist-mono)] text-[10px] font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider mb-2">
              {t('context.quotes')}
            </h4>
            <div className="flex flex-col">
              {conversation.linkedQuotes.map((quote: LinkedQuote) => (
                <div
                  key={quote.id}
                  className="flex items-center justify-between py-2.5 border-b border-black/[0.03] dark:border-white/[0.03] last:border-0"
                >
                  <div className="min-w-0">
                    <span className="font-[var(--font-geist-mono)] text-[12px] font-medium text-[var(--color-text)]">
                      {quote.displayId}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`font-[var(--font-geist-mono)] text-[9px] uppercase tracking-wider px-1 py-px rounded ${
                        quote.status === 'accepted'
                          ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]'
                          : 'bg-black/[0.04] dark:bg-white/[0.04] text-[var(--color-text-subtle)]'
                      }`}>
                        {quote.status}
                      </span>
                      <span className="font-[var(--font-geist-mono)] text-[10px] text-[var(--color-text-subtle)] tabular-nums">
                        {formatRelativeDate(quote.createdAt)}
                      </span>
                    </div>
                  </div>
                  <span className="font-[var(--font-geist-mono)] text-[12px] font-medium text-[var(--color-text)] tabular-nums shrink-0">
                    {formatCurrency(quote.totalAmount, quote.currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ticket ID if tracked */}
        {conversation.ticketId && (
          <div className="px-5 py-3 border-t border-black/[0.04] dark:border-white/[0.04]">
            <div className="flex items-center justify-between">
              <span className="font-[var(--font-geist-mono)] text-[10px] text-[var(--color-text-subtle)] uppercase tracking-wider">
                {t('profile.ticketRef')}
              </span>
              <span className="font-[var(--font-geist-mono)] text-[12px] font-medium text-[var(--color-text)] tabular-nums">
                {conversation.ticketId}
              </span>
            </div>
          </div>
        )}
      </div>
    </SlidePanel>
    <ReportViewerModal rfqId={reportRfqId} onClose={() => setReportRfqId(null)} />
    </>
  )
}
