import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getInventoryOverview } from '../../lib/server/inventory'
import { getCustomerOrdersList } from '../../lib/server/orders'
import { getStockOverview } from '../../lib/server/stock'

export function useProcurementOverview() {
	const stockQuery = useQuery({
		queryKey: ['stock-overview'],
		queryFn: () => getStockOverview({ data: {} }),
		staleTime: 30_000,
	})
	const inventoryQuery = useQuery({
		queryKey: ['inventory-overview'],
		queryFn: () => getInventoryOverview({ data: {} }),
		staleTime: 30_000,
	})
	const ordersQuery = useQuery({
		queryKey: ['customer-orders'],
		queryFn: () => getCustomerOrdersList({ data: {} }),
		staleTime: 30_000,
	})

	const totals = useMemo(() => {
		const totalMaterials = stockQuery.data?.totals.total ?? 0
		const urgentPrices = inventoryQuery.data?.totals.urgent ?? 0
		const outdatedPrices = inventoryQuery.data?.totals.outdated ?? 0
		const pendingRequests = inventoryQuery.data?.totals.pendingRequests ?? 0
		const outItems = stockQuery.data?.totals.out ?? 0
		const criticalItems = stockQuery.data?.totals.critical ?? 0
		const blockedOrders = ordersQuery.data?.totals.blocked ?? 0
		const readyOrders = ordersQuery.data?.totals.ready ?? 0
		const combinedAlerts =
			outItems + criticalItems + urgentPrices + blockedOrders

		return {
			totalMaterials,
			urgentPrices,
			outdatedPrices,
			pendingRequests,
			outItems,
			criticalItems,
			blockedOrders,
			readyOrders,
			combinedAlerts,
			attention: {
				stock: outItems + criticalItems,
				procurement: urgentPrices + pendingRequests,
				orders: blockedOrders,
			},
		}
	}, [stockQuery.data, inventoryQuery.data, ordersQuery.data])

	return {
		stockQuery,
		inventoryQuery,
		ordersQuery,
		totals,
	}
}
