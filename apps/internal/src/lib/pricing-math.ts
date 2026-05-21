export function computeSellPriceFromMargin(
	cost: number,
	margin: number,
): number {
	if (cost <= 0) return 0
	return Math.round(cost * (1 + margin / 100) * 100) / 100
}

export function computeMarginFromSellPrice(
	cost: number,
	sellPrice: number,
): number {
	if (cost <= 0 || sellPrice <= 0) return 0
	return Math.max(0, Math.round(((sellPrice - cost) / cost) * 1000) / 10)
}
