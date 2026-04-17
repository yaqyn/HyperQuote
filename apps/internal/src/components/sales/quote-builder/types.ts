import type { FreshnessIndicator, PriceStatus } from '../../../types/sales'

/** Shape of a single line item inside the quote builder react-hook-form tree. */
export interface LineItemFormValues {
	id: string
	productName: string
	specification: string
	quantity: number
	unit: string
	supplierCost: number
	marginPercent: number
	sellPrice: number
	lineTotal: number
	freshnessIndicator: FreshnessIndicator
	priceStatus: PriceStatus
	recentlyOrdered: boolean
	supplierName: string
}

/** Whole form the quote builder manages. */
export interface QuoteFormValues {
	lineItems: LineItemFormValues[]
	validityDays: number
	paymentTerms: string
	deliveryMethod: string
	deliveryDate: string
	deliveryWindow: string
	specialInstructions: string
	earlyPaymentDiscount: string
	scheduledSendAt: string | null
	coverNote: string
	sendVia: 'portal' | 'email' | 'both' | null
}
