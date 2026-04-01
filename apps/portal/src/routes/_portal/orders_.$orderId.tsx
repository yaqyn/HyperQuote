import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ClientOnly } from '@tanstack/react-start'
import { ArrowLeft, FileText, AlertTriangle } from 'lucide-react'
import { Button } from 'react-aria-components'
import { WindowShell } from '../../components/windows/WindowShell'
import { FloatingAIButton } from '../../components/windows/FloatingAIButton'
import { ProgressBar5Stage } from '../../components/orders/ProgressBar'
import { ETADisplay } from '../../components/orders/ETADisplay'
import { PODConfirmFlow } from '../../components/orders/PODConfirmFlow'
import { PaymentInstructionsCard } from '../../components/orders/PaymentInstructionsCard'
import {
  getOrderDetail,
  getDeliveryTracking,
  getPODDetails,
} from '../../lib/server/deliveries'
import type { DeliveryStage } from '../../lib/server/deliveries'

export const Route = createFileRoute('/_portal/orders_/$orderId')({
  component: OrderDetailRoute,
})

// Skeleton loader for the full page
function OrderDetailSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Progress bar skeleton */}
      <div className="flex items-center gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className="w-8 h-8 rounded-full bg-[var(--color-surface)]" />
            {i < 4 && <div className="flex-1 h-0.5 bg-[var(--color-surface)]" />}
          </div>
        ))}
      </div>
      {/* Info skeleton */}
      <div className="space-y-3">
        <div className="h-5 w-48 bg-[var(--color-surface)] rounded" />
        <div className="h-4 w-64 bg-[var(--color-surface)] rounded" />
        <div className="h-4 w-32 bg-[var(--color-surface)] rounded" />
      </div>
      {/* Map skeleton */}
      <div className="h-[300px] max-md:h-[240px] bg-[var(--color-surface)] rounded-xl" />
      {/* Timeline skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 bg-[var(--color-surface)] rounded-lg" />
        ))}
      </div>
    </div>
  )
}

// Map skeleton for ClientOnly fallback
function MapSkeleton() {
  return <div className="h-[300px] max-md:h-[240px] bg-[var(--color-surface)] rounded-xl animate-pulse" />
}

function OrderDetailRoute() {
  const { orderId } = Route.useParams()
  const { t } = useTranslation('portal')
  const navigate = useNavigate()

  const {
    data: orderData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['order-detail', orderId],
    queryFn: () => getOrderDetail({ data: { orderId } }),
    staleTime: 30_000,
  })

  // Delivery tracking data (only when out_for_delivery)
  const deliveryQuery = useQuery({
    queryKey: ['delivery-tracking', orderData?.delivery?.id],
    queryFn: () =>
      getDeliveryTracking({
        data: { deliveryId: orderData!.delivery!.id },
      }),
    enabled: !!orderData?.delivery && orderData.delivery.currentStage === 'out_for_delivery',
    refetchInterval: 10_000, // poll every 10s for GPS updates
    staleTime: 5_000,
  })

  // POD details (only when delivery has active POD)
  const podQuery = useQuery({
    queryKey: ['pod-details', orderData?.delivery?.id],
    queryFn: () =>
      getPODDetails({
        data: { deliveryId: orderData!.delivery!.id },
      }),
    enabled: !!orderData?.delivery?.hasActivePOD,
    staleTime: 60_000,
  })

  const handleBack = () => {
    navigate({ to: '/orders' })
  }

  if (isLoading) {
    return (
      <>
        <WindowShell title={t('tracking.loading')}>
          <OrderDetailSkeleton />
        </WindowShell>
        <FloatingAIButton />
      </>
    )
  }

  if (isError || !orderData) {
    return (
      <>
        <WindowShell title={t('tracking.error')}>
          <div className="flex flex-col items-center justify-center gap-4 py-16 px-6">
            <AlertTriangle size={48} className="text-[var(--color-text-subtle)]" />
            <p className="text-sm text-[var(--color-text-muted)]">
              {t('tracking.errorState')}
            </p>
            <Button
              onPress={() => refetch()}
              className="px-4 h-10 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity"
            >
              {t('tracking.retry')}
            </Button>
          </div>
        </WindowShell>
        <FloatingAIButton />
      </>
    )
  }

  const { order, timeline, documents, delivery } = orderData
  const currentStage = delivery?.currentStage ?? mapStatusToStage(order.status)
  const isOutForDelivery = currentStage === 'out_for_delivery'
  const isInvoiceGenerated = currentStage === 'invoice_generated'

  return (
    <>
      <WindowShell title={order.reference} subtitle={order.status}>
        <div className="space-y-6 pb-6">
          {/* Back button */}
          <div className="px-6 pt-4">
            <Button
              onPress={handleBack}
              className="flex items-center gap-2 text-sm text-[var(--color-primary)] hover:opacity-80 transition-opacity cursor-pointer"
            >
              <ArrowLeft size={16} className="rtl:rotate-180" />
              {t('tracking.backToOrders')}
            </Button>
          </div>

          {/* 1. Progress bar */}
          <ProgressBar5Stage currentStage={currentStage} />

          {/* 2. Order info section */}
          <div className="px-6 space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-sm text-[var(--color-primary)]">
                {order.reference}
              </span>
              <span className="font-mono text-sm font-semibold text-[var(--color-text)]">
                {order.amount != null ? `${order.currency} ${new Intl.NumberFormat('en-EG').format(order.amount)}` : '--'}
              </span>
            </div>
            <p className="text-sm text-[var(--color-text-muted)]">
              {order.description}
            </p>
            <p className="font-mono text-xs text-[var(--color-text-subtle)]">
              {new Date(order.date).toLocaleDateString()}
            </p>

            {/* Item list */}
            <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between items-center">
                  <span className="text-sm text-[var(--color-text)]">
                    {item.productName}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-xs text-[var(--color-text-muted)]">
                      {item.quantity} {item.unitOfMeasure}
                    </span>
                    <span className="font-mono text-sm text-[var(--color-text)]">
                      {order.currency} {new Intl.NumberFormat('en-EG').format(item.lineTotal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Delivery map (only when out_for_delivery) */}
          {isOutForDelivery && delivery && (
            <div className="px-6 space-y-2">
              <ClientOnly fallback={<MapSkeleton />}>
                {() => {
                  const { DeliveryMap } = require('../../components/orders/DeliveryMap')
                  const tracking = deliveryQuery.data
                  if (!tracking) return <MapSkeleton />
                  return (
                    <DeliveryMap
                      driverLocation={tracking.driverLocation}
                      routePolyline={tracking.routePolyline}
                      destination={tracking.destination}
                      eta={tracking.eta}
                    />
                  )
                }}
              </ClientOnly>
              {deliveryQuery.data && (
                <ETADisplay
                  eta={deliveryQuery.data.eta}
                  lastUpdated={deliveryQuery.data.lastUpdated}
                />
              )}
            </div>
          )}

          {/* 4. POD Confirm/Dispute flow */}
          {delivery?.hasActivePOD && podQuery.data && (
            <div className="px-6">
              <PODConfirmFlow
                deliveryId={delivery.id}
                pod={podQuery.data}
              />
            </div>
          )}

          {/* 5. Payment instructions (invoice_generated stage) */}
          {isInvoiceGenerated && (
            <div className="px-6">
              <PaymentInstructionsCard
                bankName="Commercial International Bank (CIB)"
                iban="EG380010000000000012345678901"
                reference={order.reference}
                amount={order.amount ?? 0}
                currency={order.currency}
              />
            </div>
          )}

          {/* 6. Timeline section */}
          <div className="px-6 space-y-3">
            <h3 className="text-base font-semibold text-[var(--color-text)]">
              {t('tracking.timeline')}
            </h3>
            <div className="space-y-0">
              {timeline.map((step, i) => (
                <div key={step.key} className="flex gap-3">
                  {/* Timeline dot and line */}
                  <div className="flex flex-col items-center">
                    <div
                      className={[
                        'w-3 h-3 rounded-full shrink-0',
                        step.status === 'completed'
                          ? 'bg-[var(--color-success)]'
                          : step.status === 'current'
                            ? 'bg-[var(--color-primary)]'
                            : 'bg-[var(--color-border)]',
                      ].join(' ')}
                    />
                    {i < timeline.length - 1 && (
                      <div className="w-0.5 h-8 bg-[var(--color-border)]" />
                    )}
                  </div>
                  {/* Step content */}
                  <div className="pb-4">
                    <p
                      className={[
                        'text-sm',
                        step.status === 'future'
                          ? 'text-[var(--color-text-subtle)]'
                          : 'text-[var(--color-text)]',
                      ].join(' ')}
                    >
                      {step.label}
                    </p>
                    {step.timestamp && (
                      <p className="font-mono text-xs text-[var(--color-text-subtle)]">
                        {new Date(step.timestamp).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 7. Documents section */}
          {documents.length > 0 && (
            <div className="px-6 space-y-3">
              <h3 className="text-base font-semibold text-[var(--color-text)]">
                {t('tracking.documents')}
              </h3>
              <div className="space-y-2">
                {documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/30 transition-colors"
                  >
                    <FileText size={16} className="text-[var(--color-primary)] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--color-text)] truncate">
                        {doc.name}
                      </p>
                      <p className="font-mono text-xs text-[var(--color-text-subtle)]">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </WindowShell>
      <FloatingAIButton />
    </>
  )
}

/** Map order status to a delivery stage for the progress bar */
function mapStatusToStage(status: string): DeliveryStage {
  switch (status) {
    case 'order_confirmed':
    case 'accepted':
      return 'confirmed'
    case 'being_prepared':
      return 'being_prepared'
    case 'out_for_delivery':
      return 'out_for_delivery'
    case 'delivered':
      return 'delivered'
    case 'invoice_generated':
      return 'invoice_generated'
    default:
      return 'confirmed'
  }
}
