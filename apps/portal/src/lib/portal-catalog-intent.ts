export function productSearchTerm(userText: string): string {
	if (isOpenEndedCatalogSelectionRequest(userText)) return ''
	const normalized = normalizeCatalogIntentText(userText)
	const knownTerms = [
		['cement', 'cement'],
		['اسمنت', 'cement'],
		['أسمنت', 'cement'],
		['rebar', 'steel'],
		['steel', 'steel'],
		['metal', 'steel'],
		['metals', 'steel'],
		['حديد', 'steel'],
		['معدن', 'steel'],
		['معادن', 'steel'],
		['concrete', 'concrete'],
		['sand', 'sand'],
		['رمل', 'sand'],
		['brick', 'brick'],
		['طوب', 'brick'],
		['tile', 'tile'],
		['سيراميك', 'tile'],
		['wood', 'wood'],
		['timber', 'timber'],
		['lumber', 'lumber'],
		['خشب', 'wood'],
	] as const
	for (const [needle, replacement] of knownTerms) {
		if (normalized.includes(normalizeCatalogIntentText(needle))) {
			return replacement
		}
	}
	return userText.slice(0, 120)
}

export function productIntentTerms(userText: string): string[] {
	const normalized = normalizeCatalogIntentText(userText)
	const terms = new Set(productPlanningTerms(userText))
	addCatalogTerms(terms, materialSynonymTerms(normalized, userText))
	const query = productSearchTerm(userText)
	if (query) addCatalogTerms(terms, query.split(/\s+/))
	addCatalogTerms(
		terms,
		normalized
			.split(' ')
			.filter(
				(token) => token.length > 2 && !PRODUCT_INTENT_STOP_WORDS.has(token),
			)
			.slice(0, 24),
	)
	return Array.from(terms)
}

export function draftProductIntentTerms(userText: string): string[] {
	const normalized = normalizeCatalogIntentText(userText)
	const terms = new Set<string>()
	addCatalogTerms(
		terms,
		normalized
			.split(' ')
			.filter(
				(token) => token.length > 2 && !PRODUCT_INTENT_STOP_WORDS.has(token),
			),
	)
	return Array.from(terms)
}

function productPlanningTerms(userText: string): string[] {
	const normalized = normalizeCatalogIntentText(userText)
	const terms = new Set<string>()

	if (/\b(tree\s*house|treehouse|wood|timber|lumber)\b/.test(normalized)) {
		addCatalogTerms(terms, [
			'wood',
			'timber',
			'lumber',
			'plywood',
			'board',
			'roof',
			'paint',
			'sealant',
			'screw',
			'nail',
			'bracket',
			'ladder',
			'خشب',
			'دهان',
			'مسامير',
		])
	}
	if (/\b(roof|shed|house|room|villa|warehouse)\b/.test(normalized)) {
		addCatalogTerms(terms, [
			'cement',
			'concrete',
			'steel',
			'rebar',
			'brick',
			'block',
			'tile',
			'insulation',
			'roof',
			'paint',
			'اسمنت',
			'خرسانة',
			'حديد',
			'طوب',
		])
	}
	if (
		/\b(floor|wall|foundation|deck|platform|stairs?|ladder)\b/.test(normalized)
	) {
		addCatalogTerms(terms, [
			'cement',
			'concrete',
			'steel',
			'rebar',
			'aggregate',
			'sand',
			'tile',
			'wood',
			'اسمنت',
			'رمل',
			'حديد',
		])
	}
	if (
		/بيت|غرفة|اوضة|سقف|حائط|حيطة|جدار|ارضية|أرضية|سلم|منصة|فيلا|مخزن|خشب/.test(
			userText,
		)
	) {
		addCatalogTerms(terms, [
			'خشب',
			'اسمنت',
			'حديد',
			'طوب',
			'خرسانة',
			'رمل',
			'دهان',
			'wood',
			'cement',
			'steel',
			'brick',
		])
	}

	return Array.from(terms).filter(Boolean)
}

export function isOpenEndedCatalogSelectionRequest(userText: string): boolean {
	const normalized = normalizeCatalogIntentText(userText)
	const broadChoice =
		/\b(random|any|surprise|sample|something|whatever)\b/.test(normalized) ||
		/عشوائي|اي حاجه|اي حاجة/.test(userText)
	const catalogChoice =
		/\b(pick|choose|select|recommend|suggest|available|catalog|catalogue)\b/.test(
			normalized,
		) || /اختار|رشح|متاح|كتالوج/.test(userText)
	return (
		broadChoice ||
		(catalogChoice && !hasSpecificCatalogMaterialTerm(normalized, userText))
	)
}

function materialSynonymTerms(
	normalizedText: string,
	rawText: string,
): string[] {
	const terms: string[] = []
	const synonymGroups = [
		['wood', 'timber', 'lumber', 'plywood', 'board', 'خشب'],
		['steel', 'rebar', 'metal', 'metals', 'حديد', 'معدن', 'معادن'],
		['cement', 'opc', 'src', 'اسمنت', 'أسمنت'],
		['concrete', 'خرسانة'],
		['sand', 'aggregate', 'gravel', 'رمل', 'زلط'],
		['brick', 'block', 'bricks', 'طوب'],
		['tile', 'tiles', 'ceramic', 'سيراميك'],
		['paint', 'coating', 'sealant', 'دهان', 'بويات'],
	]
	for (const group of synonymGroups) {
		if (
			group.some((term) =>
				term.match(/[\u0600-\u06ff]/)
					? rawText.includes(term)
					: normalizedText.includes(normalizeCatalogIntentText(term)),
			)
		) {
			terms.push(...group)
		}
	}
	return terms
}

function hasSpecificCatalogMaterialTerm(
	normalizedText: string,
	rawText: string,
): boolean {
	return (
		/\b(cement|rebar|steel|metals?|concrete|sand|aggregate|bricks?|paints?|tiles?|wood|timber|lumber|plywood|boards?)\b/.test(
			normalizedText,
		) ||
		/اسمنت|أسمنت|حديد|معدن|معادن|خرسانة|رمل|طوب|بويات|سيراميك|خشب/.test(rawText)
	)
}

function addCatalogTerms(target: Set<string>, values: string[]) {
	for (const value of values) {
		const normalizedValue = normalizeCatalogIntentText(value)
		if (normalizedValue) target.add(normalizedValue)
	}
}

function normalizeCatalogIntentText(value: string): string {
	return value
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[إأآٱ]/g, 'ا')
		.replace(/ى/g, 'ي')
		.replace(/ة/g, 'ه')
		.replace(/[^\p{L}\p{N}\s]+/gu, ' ')
		.replace(/\s+/g, ' ')
		.trim()
}

const PRODUCT_INTENT_STOP_WORDS = new Set([
	'about',
	'add',
	'available',
	'catalog',
	'catalogue',
	'create',
	'draft',
	'for',
	'from',
	'items',
	'make',
	'material',
	'materials',
	'need',
	'now',
	'order',
	'plan',
	'please',
	'product',
	'products',
	'quote',
	'real',
	'review',
	'search',
	'the',
	'this',
	'want',
	'with',
	'عايز',
	'عايزه',
	'محتاج',
	'مواد',
	'منتج',
	'منتجات',
	'متاح',
	'مسودة',
])
