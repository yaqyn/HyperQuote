/**
 * Order Detail — premium product view.
 * Shows order products with images, quantities, pricing.
 * Timeline as a minimal vertical track. Documents as cards.
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, FileText, AlertTriangle, Download, Check, Clock, Truck } from 'lucide-react'
import { Button } from 'react-aria-components'
import { motion } from 'motion/react'
import {
  getOrderDetail,
} from '../../lib/server/deliveries'
import type { DeliveryStage } from '../../lib/server/deliveries'

export const Route = createFileRoute('/_portal/orders_/$orderId')({
  component: OrderDetailWrapper,
})

function OrderDetailWrapper() {
  const { orderId } = Route.useParams()
  return <OrderDetailRoute key={orderId} orderId={orderId} />
}

function OrderDetailRoute({ orderId }: { orderId: string }) {
  const { t, i18n } = useTranslation('portal')
  const navigate = useNavigate()
  const isAr = i18n.language === 'ar'

  const { data: orderData, isLoading, isError, refetch } = useQuery({
    queryKey: ['order-detail', orderId],
    queryFn: () => getOrderDetail({ data: { orderId } }),
    staleTime: 30_000,
  })

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col h-full min-h-0 overflow-auto">
        <div className="w-full max-w-[800px] mx-auto px-6 max-md:px-4 py-8">
          <DetailSkeleton />
        </div>
      </div>
    )
  }

  if (isError || !orderData) {
    return (
      <div className="flex-1 flex flex-col h-full min-h-0 overflow-auto">
        <div className="w-full max-w-[800px] mx-auto px-6 max-md:px-4 flex flex-col items-center justify-center gap-4 py-20">
          <AlertTriangle size={36} className="text-[var(--p-text-muted)]" />
          <p className="text-sm text-[var(--p-text-muted)]">{t('tracking.errorState')}</p>
          <Button
            onPress={() => refetch()}
            className="px-4 h-9 rounded-lg bg-[var(--p-text)] text-[var(--p-bg)] text-[13px] font-medium cursor-pointer hover:opacity-90 transition-opacity"
          >
            {t('tracking.retry')}
          </Button>
        </div>
      </div>
    )
  }

  const { order, timeline, documents } = orderData
  const formattedDate = new Date(order.date).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const total = order.amount != null
    ? `EGP ${new Intl.NumberFormat('en-EG').format(order.amount)}`
    : null

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-auto">
      <div className="w-full max-w-[800px] mx-auto px-6 max-md:px-4 py-8 max-md:py-5">

        {/* Back */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Button
            onPress={() => navigate({ to: '/orders' })}
            className="flex items-center gap-2 text-sm text-[var(--p-text-muted)] hover:text-[var(--p-text)] transition-colors cursor-pointer mb-8"
          >
            <ArrowLeft size={14} className="rtl:rotate-180" />
            {t('tracking.backToOrders')}
          </Button>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="mb-10"
        >
          <div className="flex items-start justify-between gap-4 mb-2">
            <h1
              className="text-[24px] font-semibold tracking-tight font-mono"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.25) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {order.reference}
            </h1>
            {total && (
              <span className="font-mono text-lg font-medium text-[var(--p-text)] shrink-0">
                {total}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <StatusPill status={order.status} />
            <span className="font-mono text-[13px] text-[var(--p-text-muted)]">{formattedDate}</span>
          </div>
        </motion.div>

        {/* Products */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mb-10"
        >
          <h2 className="text-[13px] uppercase tracking-[0.15em] text-[var(--p-text-muted)] mb-4">
            {t('orders.items', { count: order.itemCount })}
          </h2>
          <div className="flex flex-col gap-3">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 rounded-xl bg-[var(--p-card)] border border-[var(--p-border)] p-4 hover:border-[var(--p-border-strong)] transition-colors"
              >
                {/* Product image */}
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-[var(--p-elevated)] border border-[var(--p-border)] shrink-0">
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>

                {/* Product info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--p-text)] truncate">
                    {isAr ? item.productNameAr : item.productName}
                  </p>
                  <p className="font-mono text-[13px] text-[var(--p-text-muted)] mt-0.5">
                    {item.quantity} {item.unitOfMeasure}
                    {item.unitPrice > 0 && (
                      <span className="ms-2">
                        × EGP {new Intl.NumberFormat('en-EG').format(item.unitPrice)}
                      </span>
                    )}
                  </p>
                </div>

                {/* Line total */}
                {item.lineTotal > 0 && (
                  <span className="font-mono text-sm font-medium text-[var(--p-text)] shrink-0">
                    EGP {new Intl.NumberFormat('en-EG').format(item.lineTotal)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Total bar */}
          {total && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--p-border)]">
              <span className="text-[13px] text-[var(--p-text-muted)] uppercase tracking-wider">
                {t('tracking.amount')}
              </span>
              <span className="font-mono text-base font-semibold text-[var(--p-text)]">
                {total}
              </span>
            </div>
          )}
        </motion.div>

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="mb-10"
        >
          <h2 className="text-[13px] uppercase tracking-[0.15em] text-[var(--p-text-muted)] mb-4">
            {t('tracking.timeline')}
          </h2>
          <div className="flex flex-col">
            {timeline.map((step, i) => {
              const isLast = i === timeline.length - 1
              const icon = step.status === 'completed'
                ? <Check size={12} strokeWidth={2} />
                : step.status === 'current'
                  ? <Truck size={12} strokeWidth={1.5} />
                  : <Clock size={12} strokeWidth={1.5} />

              const dotColor = step.status === 'completed'
                ? 'bg-[var(--p-success)] text-[var(--p-bg)]'
                : step.status === 'current'
                  ? 'bg-[var(--p-accent)] text-white'
                  : 'bg-[var(--p-card)] text-[var(--p-text-muted)] border border-[var(--p-border)]'

              const lineColor = step.status === 'completed'
                ? 'bg-[var(--p-success)]'
                : 'bg-[var(--p-border)]'

              return (
                <div key={step.key} className="flex gap-4">
                  {/* Track */}
                  <div className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${dotColor}`}>
                      {icon}
                    </div>
                    {!isLast && (
                      <div className={`w-px flex-1 min-h-6 ${lineColor}`} />
                    )}
                  </div>

                  {/* Content */}
                  <div className={`pb-6 ${isLast ? 'pb-0' : ''}`}>
                    <p className={`text-sm ${step.status === 'future' ? 'text-[var(--p-text-muted)]' : 'text-[var(--p-text)]'}`}>
                      {step.label}
                    </p>
                    {step.timestamp && (
                      <p className="font-mono text-[13px] text-[var(--p-text-muted)] mt-0.5">
                        {new Date(step.timestamp).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Documents */}
        {documents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="mb-10"
          >
            <h2 className="text-[13px] uppercase tracking-[0.15em] text-[var(--p-text-muted)] mb-4">
              {t('tracking.documents')}
            </h2>
            <div className="flex flex-col gap-2">
              {documents.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 rounded-xl bg-[var(--p-card)] border border-[var(--p-border)] p-4 hover:border-[var(--p-border-strong)] transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-[var(--p-elevated)] border border-[var(--p-border)] flex items-center justify-center shrink-0">
                    <FileText size={16} strokeWidth={1.5} className="text-[var(--p-text-muted)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--p-text)] truncate">{doc.name}</p>
                    <p className="font-mono text-[13px] text-[var(--p-text-muted)] mt-0.5">
                      {new Date(doc.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <Download size={14} strokeWidth={1.5} className="text-[var(--p-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Status Pill
// ============================================================================

function StatusPill({ status }: { status: string }) {
  const color =
    status === 'delivered' || status === 'order_confirmed'
      ? 'text-[var(--p-success)]'
      : status === 'out_for_delivery' || status === 'being_prepared'
        ? 'text-[var(--p-accent)]'
        : 'text-[var(--p-text-muted)]'

  const label = status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <span className={`text-[13px] uppercase tracking-[0.12em] font-medium ${color}`}>
      {label}
    </span>
  )
}

// ============================================================================
// Skeleton
// ============================================================================

function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-8 pt-12">
      <div>
        <div className="h-6 w-48 bg-[var(--p-card)] rounded mb-3" />
        <div className="h-3 w-32 bg-[var(--p-card)] rounded" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl bg-[var(--p-card)] border border-[var(--p-border)] p-4">
            <div className="w-14 h-14 rounded-lg bg-[var(--p-elevated)]" />
            <div className="flex-1">
              <div className="h-4 w-40 bg-[var(--p-border)] rounded mb-2" />
              <div className="h-3 w-24 bg-[var(--p-border)] rounded" />
            </div>
            <div className="h-4 w-20 bg-[var(--p-border)] rounded" />
          </div>
        ))}
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="w-6 h-6 rounded-full bg-[var(--p-card)]" />
            <div className="h-4 w-32 bg-[var(--p-card)] rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
