import type { RFQ } from '../types/sales'

type SupabaseSalesRfqStatusRow = {
	status: string
	eligible_at: string
}

export function mapSupabaseRfqStatusForSales(
	row: SupabaseSalesRfqStatusRow,
): RFQ['status'] | null {
	const heldUntil = new Date(row.eligible_at).getTime()
	if (
		row.status === 'submitted' &&
		Number.isFinite(heldUntil) &&
		heldUntil > Date.now()
	) {
		return 'saved'
	}

	switch (row.status) {
		case 'draft':
			return null
		case 'submitted':
			return 'submitted'
		case 'assigned':
			return 'assigned'
		case 'saved':
			return 'saved'
		case 'reviewing':
			return 'reviewing'
		case 'awaiting_clarification':
			return 'awaiting_clarification'
		case 'quoting':
			return 'quoting'
		case 'quoted':
			return 'quoted'
		case 'declined':
			return 'declined'
		case 'expired':
			return 'expired'
		case 'approved':
			return 'quoted'
		case 'rejected':
		case 'canceled':
			return 'declined'
		default:
			return 'submitted'
	}
}
