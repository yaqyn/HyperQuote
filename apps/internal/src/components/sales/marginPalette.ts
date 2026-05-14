export const SALES_MARGIN_FLOOR_COLOR = '#F97316'
export const SALES_MARGIN_TARGET_COLOR = '#2563EB'
export const SALES_MARGIN_BONUS_COLOR = '#090909'
export const SALES_MARGIN_TARGET_PERCENT = 20
export const SALES_MARGIN_CAP_PERCENT = 25

export function getSalesMarginColor(
	margin: number,
	target = SALES_MARGIN_TARGET_PERCENT,
	cap = SALES_MARGIN_CAP_PERCENT,
) {
	if (margin >= cap) return SALES_MARGIN_BONUS_COLOR
	return margin >= target ? SALES_MARGIN_TARGET_COLOR : SALES_MARGIN_FLOOR_COLOR
}

export function getSalesMarginCap(floor = 0) {
	return Math.max(floor, SALES_MARGIN_CAP_PERCENT)
}

export function clampSalesMargin(
	margin: number,
	min = 0,
	cap = getSalesMarginCap(min),
) {
	if (!Number.isFinite(margin)) return min
	return Math.max(min, Math.min(cap, Math.round(margin * 10) / 10))
}
