import type { RFQ } from '../types/sales'

export function isSalesPipelineRfq(rfq: RFQ) {
	return rfq.status === 'submitted' || rfq.status === 'assigned'
}

export function isClaimableSalesRfq(rfq: RFQ) {
	return rfq.source === 'supabase' && rfq.status === 'submitted'
}

export function compareSalesQueuePosition(a: RFQ, b: RFQ) {
	const aPriority = a.status === 'assigned' ? 0 : 1
	const bPriority = b.status === 'assigned' ? 0 : 1
	if (aPriority !== bPriority) return aPriority - bPriority

	return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
}
