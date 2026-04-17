/**
 * PO detail route -- renders PODetail for a specific purchase order.
 * Uses route param `poId` to find PO from getSupplierPOs query.
 */

import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PODetail } from '../../components/supplier/PODetail'
import { WindowShell } from '../../components/windows/WindowShell'
import { getSupplierPOs } from '../../lib/server/supplier-orders'

export const Route = createFileRoute('/_portal/supplier/orders/$poId')({
	component: SupplierOrderDetailWindow,
})

function SupplierOrderDetailWindow() {
	const { t, i18n } = useTranslation('portal')
	const locale = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as 'ar' | 'en'
	const { poId } = Route.useParams()

	const { data, isLoading } = useQuery({
		queryKey: ['supplier-pos', 'detail', poId],
		queryFn: () => getSupplierPOs({ data: { page: 1, limit: 100 } }),
		staleTime: 60_000,
	})

	const po = data?.purchaseOrders?.find((p) => p.id === poId)

	return (
		<WindowShell title={t('supplier.purchaseOrdersTitle')}>
			{isLoading && (
				<div className="flex items-center justify-center py-16">
					<div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
				</div>
			)}
			{!isLoading && !po && (
				<div className="flex flex-col items-center justify-center gap-3 py-16">
					<p className="text-lg font-semibold text-[var(--color-text)]">
						PO not found
					</p>
				</div>
			)}
			{po && <PODetail po={po} locale={locale} />}
		</WindowShell>
	)
}
