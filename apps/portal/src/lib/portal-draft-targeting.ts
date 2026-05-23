export interface EditableDraftDescriptor {
	materialTokens: string[]
	quantities: number[]
	specific: boolean
}

const DRAFT_DESCRIPTOR_STOPWORDS = new Set([
	'a',
	'add',
	'an',
	'and',
	'as',
	'call',
	'can',
	'cannot',
	'cant',
	'change',
	'clear',
	'could',
	'delete',
	'draft',
	'drafts',
	'edit',
	'for',
	'from',
	'i',
	'it',
	'item',
	'items',
	'instead',
	'line',
	'let',
	'lets',
	'make',
	'material',
	'materials',
	'me',
	'meant',
	'my',
	'name',
	'note',
	'notes',
	'of',
	'order',
	'orders',
	'piece',
	'pieces',
	'please',
	'product',
	'products',
	'qty',
	'quantity',
	'quote',
	'remove',
	'rename',
	'request',
	'replace',
	'said',
	'set',
	'that',
	'the',
	'them',
	'this',
	'to',
	'u',
	'unit',
	'units',
	'update',
	'want',
	'with',
	'would',
	'you',
])

export function editableDraftDescriptorFromText(
	text: string,
): EditableDraftDescriptor {
	const withoutQuotedNames = text.replace(/["“”'][^"“”']+["“”']/g, ' ')
	const withoutTrailingTarget = stripTrailingCommandTarget(withoutQuotedNames)
	const normalized = normalizeDraftTargetText(withoutTrailingTarget)
	const quantities = selectorQuantitiesFromNormalizedText(normalized)
	const materialTokens = uniqueTokens(
		normalized
			.split(' ')
			.map(normalizeDraftTargetToken)
			.filter((token) => {
				return (
					token.length > 2 &&
					!Number.isFinite(Number(token)) &&
					!DRAFT_DESCRIPTOR_STOPWORDS.has(token)
				)
			}),
	)
	return {
		materialTokens,
		quantities,
		specific: quantities.length > 0 || materialTokens.length > 0,
	}
}

export function editableDraftDescriptorLabel(
	descriptor: EditableDraftDescriptor,
): string {
	const parts = [
		...descriptor.quantities.map((quantity) => String(quantity)),
		...descriptor.materialTokens,
	]
	return parts.length > 0 ? `"${parts.join(' ')}"` : 'that description'
}

function stripTrailingCommandTarget(text: string): string {
	const matches = [...text.matchAll(/\b(?:to|as)\b/gi)]
	const lastMatch = matches.at(-1)
	if (!lastMatch || lastMatch.index === undefined) return text
	const before = text.slice(0, lastMatch.index).trim()
	const after = text.slice(lastMatch.index + lastMatch[0].length).trim()
	if (!before) return text
	if (after.length === 0 || after.length <= 120) return before
	return text
}

function selectorQuantitiesFromNormalizedText(text: string): number[] {
	const insteadOf = text.match(
		/\b(?:make|set|change|update|edit)\b.{0,120}?\b(\d+(?:\.\d+)?)\b.{0,120}?\binstead\s+of\s+(\d+(?:\.\d+)?)\b/,
	)
	if (insteadOf) {
		const value = Number.parseFloat(insteadOf[2] ?? '')
		return Number.isFinite(value) && value > 0 ? [value] : []
	}
	const previousQuantity = text.match(
		/\b(?:from\s+)?(\d+(?:\.\d+)?)\s*(?:pieces?|pcs?|units?|qty|quantity)?\s*(?:to|make it|set it to|set to|be|become)\s*(\d+(?:\.\d+)?)\b/,
	)
	if (previousQuantity) {
		const value = Number.parseFloat(previousQuantity[1] ?? '')
		return Number.isFinite(value) && value > 0 ? [value] : []
	}
	return uniqueNumbers(
		[...text.matchAll(/\b(\d+(?:\.\d+)?)\b/g)]
			.map((match) => Number.parseFloat(match[1] ?? ''))
			.filter((value) => Number.isFinite(value) && value > 0),
	)
}

function normalizeDraftTargetText(value: string): string {
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

function normalizeDraftTargetToken(token: string): string {
	if (token === 'wooden') return 'wood'
	return token
}

function uniqueTokens(tokens: string[]): string[] {
	return [...new Set(tokens)]
}

function uniqueNumbers(values: number[]): number[] {
	const unique: number[] = []
	for (const value of values) {
		if (!unique.some((candidate) => quantityEquals(candidate, value))) {
			unique.push(value)
		}
	}
	return unique
}

function quantityEquals(left: number, right: number): boolean {
	return Number.isFinite(left) && Math.abs(left - right) < 0.000001
}
