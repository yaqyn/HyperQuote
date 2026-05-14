import { db, hoursSince } from '../db/db'

type QuoteRow = NonNullable<ReturnType<typeof db.quotes.get>>
type RfqRow = NonNullable<ReturnType<typeof db.rfqs.get>>
type CustomerRow = NonNullable<ReturnType<typeof db.customers.get>>
type OrderReportRow = NonNullable<ReturnType<typeof db.orderReports.forRfq>>

interface QuoteContext {
	quote: QuoteRow
	rfq: RfqRow | undefined
	customer: CustomerRow | undefined
	report: OrderReportRow | undefined
}

export function roundMoney(value: number): number {
	return Math.round(value * 100) / 100
}

export function roundedHoursSince(iso: string): number {
	return Math.round(hoursSince(iso))
}

export function getQuoteContext(quoteId: string): QuoteContext | null {
	const quote = db.quotes.get(quoteId)
	if (!quote) return null
	return {
		quote,
		rfq: db.rfqs.get(quote.rfqId),
		customer: db.customers.get(quote.customerId),
		report: db.orderReports.forRfq(quote.rfqId),
	}
}

export function quoteCustomerSnapshot(
	context: QuoteContext,
	nameFallback: string,
) {
	return {
		customerName:
			context.rfq?.customerName ??
			context.customer?.companyName ??
			nameFallback,
		customerTier: context.rfq?.customerTier ?? context.customer?.tier ?? 'new',
		customerPhone: context.customer?.phone ?? '',
		customerContactName:
			context.rfq?.contactName ?? context.customer?.contactName ?? '',
	}
}

export function quoteDeliverySnapshot(
	context: QuoteContext,
	options: { preferQuote?: boolean } = {},
) {
	if (options.preferQuote) {
		return {
			deliveryAddress:
				context.quote.deliveryAddress ?? context.rfq?.deliveryAddress ?? '',
			deliveryCity:
				context.quote.deliveryCity ?? context.rfq?.deliveryCity ?? '',
			deliveryUrgencyDays: context.rfq?.deliveryUrgency ?? 0,
		}
	}
	return {
		deliveryAddress:
			context.rfq?.deliveryAddress ?? context.customer?.address ?? '',
		deliveryCity: context.rfq?.deliveryCity ?? '',
		deliveryUrgencyDays: context.rfq?.deliveryUrgency ?? 0,
	}
}

function quoteAcceptedAt(context: QuoteContext): string {
	return context.quote.sentAt ?? new Date().toISOString()
}

export function quoteOrderIdentity(
	context: QuoteContext,
	nameFallback: string,
	options: { preferQuoteDelivery?: boolean } = {},
) {
	const acceptedAt = quoteAcceptedAt(context)
	const customer = quoteCustomerSnapshot(context, nameFallback)
	const delivery = quoteDeliverySnapshot(context, {
		preferQuote: options.preferQuoteDelivery,
	})

	return {
		quoteId: context.quote.id,
		quoteNumber: context.quote.quoteNumber,
		rfqId: context.quote.rfqId,
		customerId: context.quote.customerId,
		customerName: customer.customerName,
		customerTier: customer.customerTier,
		customerPoNumber: context.quote.customerPoNumber,
		acceptedAt,
		acceptedHoursAgo: roundedHoursSince(acceptedAt),
		deliveryAddress: delivery.deliveryAddress,
		deliveryCity: delivery.deliveryCity,
	}
}

export function quoteSellTotal(quote: QuoteRow): number {
	return roundMoney(
		quote.items.reduce((sum, item) => sum + item.sellPrice * item.quantity, 0),
	)
}
