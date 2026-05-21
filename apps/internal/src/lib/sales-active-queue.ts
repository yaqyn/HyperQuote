import type { RFQ } from '../types/sales'

export function isSalesPipelineRfq(rfq: RFQ) {
	return rfq.status === 'submitted' || rfq.status === 'assigned'
}

export function isClaimableSalesRfq(rfq: RFQ) {
	return rfq.source === 'supabase' && rfq.status === 'submitted'
}

export function compareSalesQueuePosition(a: RFQ, b: RFQ) {
	return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
}
