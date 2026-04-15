/**
 * Orders — premium card grid with product thumbnails.
 * Grouped by type: Saved, Submitted, Confirmed.
 * Cards show stacked product images, quantities, and inline actions.
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Pencil, Send, Trash2, ChevronRight, Package, AlertTriangle } from 'lucide-react'
import { Button } from 'react-aria-components'

import { getAllCustomerOrders, deleteOrder, submitOrder } from '../../lib/server/orders'
import type { Order, OrderType } from '../../types/order'

export const Route = createFileRoute('/_portal/orders')({
  component: OrdersPage,
})

// ============================================================================
// Main Page
// ============================================================================

function OrdersPage() {
  const { t } = useTranslation('portal')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['customer-orders-all'],
    queryFn: () => getAllCustomerOrders(),
    staleTime: 30_000,
  })

  const grouped = useMemo(() => {
    if (!data?.orders) return { saved: [], submitted: [], confirmed: [] }
    return {
      saved: data.orders.filter((o) => o.type === 'saved'),
      submitted: data.orders.filter((o) => o.type === 'submitted'),
      confirmed: data.orders.filter((o) => o.type === 'confirmed'),
    }
  }, [data])

  const hasAny = (grouped.saved.length + grouped.submitted.length + grouped.confirmed.length) > 0

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-auto">
      <div className="w-full max-w-[960px] mx-auto px-6 max-md:px-4 py-8 max-md:py-5">
        {/* Header */}
        <div className="mb-10">
          <h1
            className="text-[22px] font-semibold tracking-tight"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.25) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {t('nav.orders')}
          </h1>
        </div>

        {isLoading && <SkeletonGrid />}

        {isError && (
          <div className="py-16 text-center">
            <AlertTriangle size={32} className="mx-auto mb-3 text-[var(--p-text-muted)]" />
            <p className="text-sm text-[var(--p-text-muted)]">{t('orders.error')}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-3 text-sm text-[var(--p-text)] underline underline-offset-2"
            >
              {t('orders.retry')}
            </button>
          </div>
        )}

        {!isLoading && !isError && !hasAny && <EmptyState />}

        {!isLoading && !isError && hasAny && (
          <div className="flex flex-col gap-12">
            <OrderSection type="saved" orders={grouped.saved} />
            <OrderSection type="submitted" orders={grouped.submitted} />
            <OrderSection type="confirmed" orders={grouped.confirmed} />
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Order Section
// ============================================================================

function OrderSection({ type, orders }: { type: OrderType; orders: Order[] }) {
  const { t } = useTranslation('portal')
  if (orders.length === 0) return null

  return (
    <section>
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[type]}`} />
        <h3 className="text-[13px] uppercase tracking-[0.15em] text-[var(--p-text-muted)]">
          {t(`orders.${type}`)}
        </h3>
        <span className="font-mono text-[13px] text-[var(--p-text-muted)]">
          {orders.length}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {orders.map((order, i) => (
            <motion.div
              key={order.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
            >
              <OrderCard order={order} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  )
}

// ============================================================================
// Order Card
// ============================================================================

const STATUS_DOT: Record<OrderType, string> = {
  saved: 'bg-[var(--p-text-muted)]',
  submitted: 'bg-[var(--p-text-secondary)]',
  confirmed: 'bg-[var(--p-text)]',
}

const GLOW_COLOR: Record<OrderType, string> = {
  saved: 'rgba(255,255,255,0.06)',
  submitted: 'rgba(255,255,255,0.08)',
  confirmed: 'rgba(255,255,255,0.1)',
}

function OrderCard({ order }: { order: Order }) {
  const { t, i18n } = useTranslation('portal')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isAr = i18n.language === 'ar'
  const [confirmDelete, setConfirmDelete] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: () => deleteOrder({ data: { orderId: order.id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customer-orders-all'] }),
  })

  const submitMutation = useMutation({
    mutationFn: () => submitOrder({ data: { orderId: order.id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customer-orders-all'] }),
  })

  const formattedDate = new Date(order.date).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', {
    day: 'numeric',
    month: 'short',
  })

  const title = order.type === 'saved' ? order.name : order.reference
  const isClickable = order.type !== 'saved'

  // Deduplicate images for the thumbnail strip
  const uniqueImages = [...new Set(order.items.map((i) => i.imageUrl))].slice(0, 4)

  const handleCardClick = () => {
    if (isClickable) {
      navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
    }
  }

  const cardInner = (
    <>
      {/* Top glow */}
      <div
        className="absolute inset-x-0 top-0 h-px rounded-t-xl"
        style={{
          background: `linear-gradient(90deg, transparent 5%, ${GLOW_COLOR[order.type]} 50%, transparent 95%)`,
        }}
      />

      {/* Product image strip */}
      <div className="flex gap-2 mb-4">
        {uniqueImages.map((img, i) => (
          <div
            key={i}
            className="w-12 h-12 rounded-lg overflow-hidden bg-[var(--p-elevated)] border border-[var(--p-border)] shrink-0"
          >
            <img
              src={img}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
        ))}
        {order.items.length > uniqueImages.length && (
          <div className="w-12 h-12 rounded-lg bg-[var(--p-elevated)] border border-[var(--p-border)] shrink-0 flex items-center justify-center">
            <span className="font-mono text-[13px] text-[var(--p-text-muted)]">
              +{order.items.length - uniqueImages.length}
            </span>
          </div>
        )}
      </div>

      {/* Title row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className={`text-[15px] font-medium text-[var(--p-text)] leading-snug ${order.type !== 'saved' ? 'font-mono' : ''}`}>
          {title}
        </h4>
        {isClickable && (
          <ChevronRight size={14} strokeWidth={1.5} className="shrink-0 mt-0.5 text-[var(--p-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity rtl:rotate-180" />
        )}
      </div>

      {/* Item list — always 3 rows + more line for consistent height */}
      <div className="flex flex-col gap-1.5 mb-4">
        {Array.from({ length: 3 }).map((_, i) => {
          const item = order.items[i]
          if (!item) {
            return <div key={i} className="h-[18px]" />
          }
          return (
            <div key={item.productId} className="flex items-center justify-between">
              <span className="text-[13px] text-[var(--p-text-secondary)] truncate flex-1">
                {isAr ? item.productNameAr : item.productName}
              </span>
              <span className="font-mono text-[13px] text-[var(--p-text-muted)] ms-3 shrink-0">
                {item.quantity} {item.unitOfMeasure}
              </span>
            </div>
          )
        })}
        <div className="h-[17px]">
          {order.items.length > 3 && (
            <span className="text-[13px] text-[var(--p-text-muted)]">
              +{order.items.length - 3} {t('orders.more')}
            </span>
          )}
        </div>
      </div>

      {/* Footer: date + amount */}
      <div className="flex items-center gap-3 mt-auto">
        <span className="font-mono text-[13px] text-[var(--p-text-muted)]">
          {formattedDate}
        </span>
        {order.amount != null && (
          <>
            <span className="text-[var(--p-border)]">·</span>
            <span className="font-mono text-[13px] font-medium text-[var(--p-text)]">
              EGP {new Intl.NumberFormat('en-EG').format(order.amount)}
            </span>
          </>
        )}
      </div>
    </>
  )

  // Submitted/Confirmed: entire card is a button
  if (isClickable) {
    return (
      <button
        type="button"
        onClick={handleCardClick}
        className="group relative flex flex-col w-full rounded-xl bg-[var(--p-card)] border border-[var(--p-border)] p-5 pb-6 transition-all duration-200 hover:border-[var(--p-border-strong)] hover:bg-[var(--p-elevated)] text-start cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-[var(--p-accent)]"
      >
        {cardInner}
      </button>
    )
  }

  // Saved: card with action buttons
  return (
    <div className="group relative flex flex-col rounded-xl bg-[var(--p-card)] border border-[var(--p-border)] p-5 transition-all duration-200 hover:border-[var(--p-border-strong)] hover:bg-[var(--p-elevated)]">
      {cardInner}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 mt-4 border-t border-[var(--p-border)]">
        <ActionButton
          icon={<Pencil size={12} strokeWidth={1.5} />}
          label={t('orders.edit')}
          onPress={() => navigate({ to: '/orders/edit/$orderId', params: { orderId: order.id } })}
        />
        <ActionButton
          icon={<Send size={12} strokeWidth={1.5} />}
          label={t('orders.submit')}
          variant="primary"
          loading={submitMutation.isPending}
          onPress={() => submitMutation.mutate()}
        />
        <div className="flex-1" />
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => deleteMutation.mutate()}
              className="text-[13px] text-[var(--p-error)] hover:underline"
            >
              {t('orders.confirmDelete')}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="text-[13px] text-[var(--p-text-muted)]"
            >
              {t('orders.cancel')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="p-1.5 rounded-md text-[var(--p-text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--p-error)] transition-all"
            aria-label={t('orders.delete')}
          >
            <Trash2 size={12} strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Action Button
// ============================================================================

function ActionButton({
  icon,
  label,
  variant = 'default',
  loading = false,
  onPress,
}: {
  icon: React.ReactNode
  label: string
  variant?: 'default' | 'primary'
  loading?: boolean
  onPress: () => void
}) {
  const base = 'flex items-center gap-1.5 h-7 px-3 rounded-md text-[13px] font-medium transition-all cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-[var(--p-accent)] disabled:opacity-40'
  const variants = {
    default: 'text-[var(--p-text-secondary)] hover:text-[var(--p-text)] hover:bg-[var(--p-hover)]',
    primary: 'text-[var(--p-text)] hover:bg-[var(--p-hover)]',
  }

  return (
    <Button
      onPress={onPress}
      isDisabled={loading}
      className={`${base} ${variants[variant]}`}
    >
      {loading ? <Spinner /> : icon}
      {label}
    </Button>
  )
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyState() {
  const { t } = useTranslation('portal')

  return (
    <div className="flex flex-col items-center py-20">
      <div className="w-14 h-14 rounded-2xl bg-[var(--p-card)] border border-[var(--p-border)] flex items-center justify-center mb-6">
        <Package size={24} strokeWidth={1} className="text-[var(--p-text-muted)]" />
      </div>
      <p className="text-sm text-[var(--p-text)]">{t('orders.noOrders')}</p>
      <p className="text-sm text-[var(--p-text-muted)] mt-1">{t('orders.noOrdersBody')}</p>
    </div>
  )
}

// ============================================================================
// Skeleton
// ============================================================================

function SkeletonGrid() {
  return (
    <div className="flex flex-col gap-12">
      {[1, 2].map((section) => (
        <div key={section}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--p-border)] animate-pulse" />
            <div className="h-2.5 w-20 bg-[var(--p-card)] rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((card) => (
              <div
                key={card}
                className="rounded-xl bg-[var(--p-card)] border border-[var(--p-border)] p-5 animate-pulse"
              >
                <div className="flex gap-2 mb-4">
                  {[1, 2, 3].map((thumb) => (
                    <div key={thumb} className="w-12 h-12 rounded-lg bg-[var(--p-elevated)]" />
                  ))}
                </div>
                <div className="h-4 w-40 bg-[var(--p-border)] rounded mb-3" />
                <div className="h-3 w-full bg-[var(--p-border)] rounded mb-2" />
                <div className="h-3 w-3/4 bg-[var(--p-border)] rounded mb-2" />
                <div className="h-3 w-1/2 bg-[var(--p-border)] rounded mb-4" />
                <div className="h-2.5 w-24 bg-[var(--p-border)] rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Spinner
// ============================================================================

function Spinner() {
  return (
    <span className="inline-block h-3 w-3 animate-spin rounded-full border-[1.5px] border-[var(--p-accent)]/20 border-t-[var(--p-accent)]" />
  )
}
