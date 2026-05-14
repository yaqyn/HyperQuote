import type { QuoteItem } from '../../../types/sales'

const CEMENT_ITEM: QuoteItem = {
	id: 'qi-1',
	productName: 'Portland Cement CEM I 42.5N',
	specification: '50kg bags',
	quantity: 500,
	unit: 'bag',
	supplierCost: 47.0,
	marginPercent: 18,
	sellPrice: 55.0,
	lineTotal: 27_500,
	freshnessIndicator: 'fresh',
	priceStatus: 'updated',
	recentlyOrdered: false,
	supplierName: 'Suez Cement',
	customerCounterPrice: 54.0,
}

const REBAR_ITEM: QuoteItem = {
	id: 'qi-2',
	productName: 'Steel Rebar 16mm',
	specification: 'Grade 60, 12m',
	quantity: 200,
	unit: 'bundle',
	supplierCost: 3_249.25,
	marginPercent: 12,
	sellPrice: 3_600,
	lineTotal: 720_000,
	freshnessIndicator: 'fresh',
	priceStatus: 'updated',
	recentlyOrdered: false,
	supplierName: 'Ezz Steel',
	customerCounterPrice: 3_550.0,
}

const BLOCK_ITEM: QuoteItem = {
	id: 'qi-3',
	productName: 'Concrete Blocks 20cm',
	specification: 'Hollow, load-bearing',
	quantity: 5000,
	unit: 'piece',
	supplierCost: 12.81,
	marginPercent: 20,
	sellPrice: 15.0,
	lineTotal: 75_000,
	freshnessIndicator: 'aging',
	priceStatus: 'outdated',
	recentlyOrdered: false,
	supplierName: 'Arabian Cement',
	customerCounterPrice: null,
}

const CURRENT_VERSION_ITEMS: QuoteItem[] = [CEMENT_ITEM, REBAR_ITEM, BLOCK_ITEM]

const EARLIER_VERSION_ITEMS: QuoteItem[] = [
	{
		...CEMENT_ITEM,
		marginPercent: 20,
		sellPrice: 56.4,
		lineTotal: 28_200,
	},
	{
		...REBAR_ITEM,
		marginPercent: 15,
		sellPrice: 3_738,
		lineTotal: 747_600,
	},
	{
		...BLOCK_ITEM,
		marginPercent: 22,
		sellPrice: 15.63,
		lineTotal: 78_150,
	},
]

interface MockQuoteVersion {
	version: number
	items: QuoteItem[]
	subtotal: number
	vatAmount: number
	total: number
}

export function getMockLineItems(): QuoteItem[] {
	return CURRENT_VERSION_ITEMS.map((item) => ({ ...item }))
}

export function getMockVersionItems(versionId: string): MockQuoteVersion {
	const isEarlierVersion =
		versionId.endsWith('-v1') || versionId.endsWith('-v2')
	const items = (
		isEarlierVersion ? EARLIER_VERSION_ITEMS : CURRENT_VERSION_ITEMS
	).map((item) => ({ ...item }))
	const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
	const vatAmount = Math.round(subtotal * 14) / 100
	return {
		version: isEarlierVersion ? (versionId.endsWith('-v1') ? 1 : 2) : 3,
		items,
		subtotal,
		vatAmount,
		total: subtotal + vatAmount,
	}
}
