import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Cell,
  Column,
  Row,
  Table,
  TableBody,
  TableHeader,
} from 'react-aria-components'
import { getCustomer360 } from '../../../lib/server/sales-customers'

interface OrdersTabProps {
  customerId: string
  enabled: boolean
}

export function OrdersTab({ customerId, enabled }: OrdersTabProps) {
  const { t } = useTranslation('internal')

  const { data, isLoading } = useQuery({
    queryKey: ['customer-360', 'orders', customerId],
    queryFn: () => getCustomer360({ customerId }),
    staleTime: 120_000,
    enabled,
    select: (d) => d.orders,
  })

  if (!enabled) return null
  if (isLoading) return <TabSkeleton />
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-black/40 dark:text-white/40">
        {t('sales.customer360.orders.noOrders')}
      </div>
    )
  }

  return (
    <div className="p-4">
      <Table
        aria-label={t('sales.customer360.orders.title')}
        className="w-full"
        selectionMode="none"
      >
        <TableHeader>
          <Column isRowHeader className="text-start text-xs font-medium text-black/50 dark:text-white/50 pb-2 pe-4">
            {t('sales.customer360.orders.orderNumber')}
          </Column>
          <Column className="text-start text-xs font-medium text-black/50 dark:text-white/50 pb-2 pe-4">
            {t('sales.customer360.orders.date')}
          </Column>
          <Column className="text-end text-xs font-medium text-black/50 dark:text-white/50 pb-2 pe-4">
            {t('sales.customer360.orders.total')}
          </Column>
          <Column className="text-start text-xs font-medium text-black/50 dark:text-white/50 pb-2 pe-4">
            {t('sales.customer360.orders.status')}
          </Column>
          <Column className="text-start text-xs font-medium text-black/50 dark:text-white/50 pb-2 pe-4">
            {t('sales.customer360.orders.delivery')}
          </Column>
          <Column className="text-start text-xs font-medium text-black/50 dark:text-white/50 pb-2">
            {t('sales.customer360.orders.payment')}
          </Column>
        </TableHeader>
        <TableBody>
          {data.map((order) => (
            <Row
              key={order.id}
              className="border-t border-black/5 dark:border-white/5 hover:bg-black/3 dark:hover:bg-white/3 cursor-pointer"
            >
              <Cell className="py-2.5 pe-4 text-sm font-[family-name:var(--font-geist-mono)] font-medium text-[#2563EB]">
                {order.orderNumber}
              </Cell>
              <Cell className="py-2.5 pe-4 text-sm font-[family-name:var(--font-geist-mono)] text-black/60 dark:text-white/60">
                {new Date(order.createdAt).toLocaleDateString()}
              </Cell>
              <Cell className="py-2.5 pe-4 text-end text-sm font-[family-name:var(--font-geist-mono)] text-black dark:text-white">
                {formatCurrency(order.total)}
              </Cell>
              <Cell className="py-2.5 pe-4">
                <StatusPill label={order.status} />
              </Cell>
              <Cell className="py-2.5 pe-4">
                <StatusPill label={order.deliveryStatus} />
              </Cell>
              <Cell className="py-2.5">
                <StatusPill label={order.paymentStatus} />
              </Cell>
            </Row>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function StatusPill({ label }: { label: string }) {
  return (
    <span className="inline-flex px-2 py-0.5 text-xs rounded-full bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60 capitalize">
      {label.replace(/_/g, ' ')}
    </span>
  )
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function TabSkeleton() {
  return (
    <div className="p-4 space-y-3 animate-pulse">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-10 rounded bg-black/5 dark:bg-white/5" />
      ))}
    </div>
  )
}
