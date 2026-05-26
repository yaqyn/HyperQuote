import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import {
	INTERNAL_LIVE_REFETCH_MS,
	INTERNAL_LIVE_STALE_MS,
} from '../../lib/internal-live-query'
import { getDamagedInventoryOverview } from '../../lib/server/damaged-inventory'
import { getInventoryOverview } from '../../lib/server/inventory'
import { getCustomerOrdersList } from '../../lib/server/orders'
import { getStockOverview } from '../../lib/server/stock'

export function useProcurementOverview() {
	const stockQuery = useQuery({
		queryKey: ['stock-overview'],
		queryFn: () => getStockOverview({ data: {} }),
		refetchInterval: INTERNAL_LIVE_REFETCH_MS,
		refetchIntervalInBackground: true,
		refetchOnWindowFocus: 'always',
		staleTime: INTERNAL_LIVE_STALE_MS,
	})
	const inventoryQuery = useQuery({
		queryKey: ['inventory-overview'],
		queryFn: () => getInventoryOverview({ data: {} }),
		refetchInterval: INTERNAL_LIVE_REFETCH_MS,
		refetchIntervalInBackground: true,
		refetchOnWindowFocus: 'always',
		staleTime: INTERNAL_LIVE_STALE_MS,
	})
	const ordersQuery = useQuery({
		queryKey: ['customer-orders'],
		queryFn: () => getCustomerOrdersList({ data: {} }),
		refetchInterval: INTERNAL_LIVE_REFETCH_MS,
		refetchIntervalInBackground: true,
		refetchOnWindowFocus: 'always',
		staleTime: INTERNAL_LIVE_STALE_MS,
	})
	const damagedQuery = useQuery({
		queryKey: ['inventory-damage'],
		queryFn: () => getDamagedInventoryOverview({ data: {} }),
		refetchInterval: INTERNAL_LIVE_REFETCH_MS,
		refetchIntervalInBackground: true,
		refetchOnWindowFocus: 'always',
		staleTime: INTERNAL_LIVE_STALE_MS,
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
		const damagedOpenLots = damagedQuery.data?.totals.openLots ?? 0
		const damagedUnits = damagedQuery.data?.totals.remainingUnits ?? 0
		const combinedAlerts =
			outItems + criticalItems + urgentPrices + blockedOrders + damagedOpenLots

		return {
			totalMaterials,
			urgentPrices,
			outdatedPrices,
			pendingRequests,
			outItems,
			criticalItems,
			blockedOrders,
			readyOrders,
			damagedOpenLots,
			damagedUnits,
			combinedAlerts,
			attention: {
				stock: outItems + criticalItems,
				procurement: urgentPrices + pendingRequests,
				orders: blockedOrders,
				damaged: damagedOpenLots,
			},
		}
	}, [
		stockQuery.data,
		inventoryQuery.data,
		ordersQuery.data,
		damagedQuery.data,
	])

	return {
		damagedQuery,
		stockQuery,
		inventoryQuery,
		ordersQuery,
		totals,
	}
}
