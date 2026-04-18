/**
 * Display formatters. All bilingual-aware via i18next's `lng` argument
 * pattern — pass it explicitly rather than inferring globally so server-
 * rendered consumers (none yet, but possible) stay deterministic.
 */

const ARABIC_INDIC_OFFSET = 0x0660

function toArabicIndic(value: string | number): string {
	return String(value).replace(/\d/g, (d) =>
		String.fromCharCode(ARABIC_INDIC_OFFSET + Number(d)),
	)
}

export function formatNumber(value: number, lang: string): string {
	const formatted = new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
		maximumFractionDigits: 2,
	}).format(value)
	return lang === 'ar' ? toArabicIndic(formatted) : formatted
}

export function formatWeight(kg: number, lang: string): string {
	const tons = kg / 1000
	if (tons >= 1) return `${formatNumber(Number(tons.toFixed(2)), lang)} t`
	return `${formatNumber(Math.round(kg), lang)} kg`
}

export function formatDistanceKm(km: number, lang: string): string {
	if (km < 1) return `${formatNumber(Math.round(km * 1000), lang)} m`
	return `${formatNumber(Number(km.toFixed(1)), lang)} km`
}

export function formatEtaMinutes(minutes: number, lang: string): string {
	if (minutes < 60) return `${formatNumber(Math.round(minutes), lang)} min`
	const h = Math.floor(minutes / 60)
	const m = Math.round(minutes - h * 60)
	if (m === 0) return `${formatNumber(h, lang)} h`
	return `${formatNumber(h, lang)} h ${formatNumber(m, lang)} min`
}

function formatClock(date: Date, lang: string): string {
	const hh = String(date.getHours()).padStart(2, '0')
	const mm = String(date.getMinutes()).padStart(2, '0')
	const stamp = `${hh}:${mm}`
	return lang === 'ar' ? toArabicIndic(stamp) : stamp
}

export function formatRelativeMinutes(min: number, lang: string): string {
	if (min < 1) return lang === 'ar' ? 'الآن' : 'now'
	if (min < 60) {
		const v = formatNumber(Math.round(min), lang)
		return lang === 'ar' ? `قبل ${v} د` : `${v}m ago`
	}
	const h = Math.floor(min / 60)
	const v = formatNumber(h, lang)
	return lang === 'ar' ? `قبل ${v} س` : `${v}h ago`
}

function formatCurrencyEgp(amount: number, lang: string): string {
	const value = formatNumber(Math.round(amount), lang)
	return lang === 'ar' ? `${value} ج.م` : `EGP ${value}`
}

function cargoClassCode(
	cls: 'aggregate' | 'metal' | 'finishes' | 'mixed',
): string {
	switch (cls) {
		case 'aggregate':
			return 'AGG'
		case 'metal':
			return 'MTL'
		case 'finishes':
			return 'FIN'
		case 'mixed':
			return 'MIX'
	}
}
