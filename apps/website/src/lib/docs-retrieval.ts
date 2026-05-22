import {
	type DocsLocale,
	getAllLocalizedContent,
	type LocalizedDocContent,
} from '../content/docs'

const ARABIC_BLOCK = /[\u0600-\u06ff]/
const ARABIC_DIACRITICS = /[\u064b-\u065f\u0670]/g
const TOKEN_PATTERN = /[\p{L}\p{N}]+/gu

const EN_STOP_WORDS = new Set([
	'a',
	'an',
	'and',
	'app',
	'are',
	'as',
	'at',
	'be',
	'by',
	'can',
	'do',
	'does',
	'for',
	'from',
	'how',
	'i',
	'in',
	'is',
	'it',
	'me',
	'of',
	'on',
	'or',
	'the',
	'to',
	'what',
	'when',
	'where',
	'why',
	'with',
	'you',
	'your',
])

const AR_STOP_WORDS = new Set([
	'ا',
	'او',
	'اي',
	'ايه',
	'ازاي',
	'انا',
	'ان',
	'انت',
	'انه',
	'انها',
	'ال',
	'الي',
	'الى',
	'اللي',
	'ايضا',
	'ب',
	'بس',
	'بعد',
	'بتاع',
	'بتاعة',
	'بين',
	'ده',
	'دي',
	'دا',
	'عن',
	'علي',
	'عند',
	'في',
	'كده',
	'كم',
	'لا',
	'لو',
	'لي',
	'ليه',
	'ما',
	'من',
	'هو',
	'هي',
	'و',
	'يا',
])

const PRIVATE_SCOPE_PATTERNS = [
	/\bmy\s+(account|balance|delivery|draft|invoice|order|payment|profile|quote)\b/i,
	/\bour\s+(account|balance|delivery|draft|invoice|order|payment|profile|quote)\b/i,
	/\banother customer\b/i,
	/\bother customer\b/i,
	/\bcustomer (data|order|record)\b/i,
	/\bdriver location\b/i,
	/\bemployee\b/i,
	/\binternal\b/i,
	/\binternal finance\b/i,
	/\bfinance (data|report|record)\b/i,
	/\bfinancials?\b/i,
	/\bmargin\b/i,
	/\bprofit\b/i,
	/\bsupplier (cost|margin|price book|pricing)\b/i,
	/حسابي|حسابنا|طلبي|طلباتنا|طلباتي|عرضي|عروضي|فاتورتي|فواتيري|رصيدي/,
	/عميل\s+(تاني|تانى|اخر|آخر)/,
	/بيانات\s+(عميل|حساب|موظف|سائق)/,
	/مكان\s+السائق|موقع\s+السائق|السائق\s+فين/,
	/داخلي|داخلية|الموظف|الموظفين|بيانات\s+مالية|بيانات\s+ماليه|قسم\s+المالية|هامش|ربح|تكلفة\s+المورد/,
]

const EN_GREETING_PATTERN =
	/^(hey|hi|hello|yo|good\s+(morning|afternoon|evening)|howdy|sup|what'?s\s+up|how\s+are\s+you|how'?s\s+it\s+going|you\s+good|are\s+you\s+ok|are\s+you\s+okay|thanks|thank\s+you|lol|lmao)[\s!.?]*$/i

const AR_GREETING_PATTERN =
	/^(السلام عليكم|سلام عليكم|سلام|اهلا|أهلا|اهلين|أهلين|هاي|هلا|صباح الخير|مساء الخير|ازيك|عامل ايه|عامل إيه|عامله ايه|عاملة إيه|شكرا|تسلم|تمام|الحمد لله)[\s!.؟]*$/

const EN_CONVERSATIONAL_PATTERN =
	/\b(are you real|real ai|who are you|what are you|how are you|how's it going|how is it going|what can you do|can you talk|talk normal|be normal|joke|funny|lol|lmao|haha|bro|mate|thanks|thank you|sorry|my bad|that was bad|this is shit|you suck|nice|cool|ok|okay|great|test)\b/i

const AR_CONVERSATIONAL_PATTERN =
	/(انت مين|إنت مين|ذكاء اصطناعي|عامل ايه|عامل إيه|ازيك|بتعمل ايه|بتعمل إيه|هزار|نكتة|اضحك|شكرا|اسف|آسف|تمام|حلو|جامد|اختبار|كلم|اتكلم|طبيعي)/

const FACTUAL_QUESTION_PATTERN =
	/\b(what|when|where|why|how|which|who|can|does|do|is|are|should|configure|setup|install|build|fix)\b|\?/i

const PUBLIC_DOCS_TOPIC_PATTERN =
	/\b(hyperquote|lyon|quote|quotes|rfq|price|prices|pricing|delivery|deliveries|payment|payments|market|catalog|product|products|order|orders|support|portal|supplier|driver|invoice|vat|eta|cairo|truck)\b/i

const AR_PUBLIC_DOCS_TOPIC_PATTERN =
	/(هايبر|ليون|عرض|عروض|سعر|اسعار|أسعار|تسعير|توصيل|التوصيل|دفع|الدفع|السوق|كتالوج|الكتالوج|منتج|منتجات|طلب|طلبات|دعم|الدعم|بوابة|مورد|سائق|فاتورة|ضريبة|القاهرة|شاحن)/

interface DocsChunk {
	article: LocalizedDocContent
	heading: string
	body: string
	normalizedHeading: string
	normalizedBody: string
	normalizedTitle: string
	normalizedCategory: string
	normalizedDescription: string
	bodyTokens: string[]
}

export interface RetrievedDocsChunk {
	articleSlug: string
	body: string
	categorySlug: string
	categoryTitle: string
	description: string
	heading: string
	href: string
	locale: DocsLocale
	score: number
	title: string
}

export interface DocsRetrievalResult {
	chunks: RetrievedDocsChunk[]
	hasHighConfidence: boolean
	locale: DocsLocale
	queryTokens: string[]
}

export type WebsitePublicChatIntent =
	| 'conversational'
	| 'out_of_scope'
	| 'public_docs'

interface RetrievalOptions {
	maxChunks?: number
	maxContextCharacters?: number
}

const DEFAULT_MAX_CHUNKS = 4
const DEFAULT_CONTEXT_CHARACTERS = 6400
const HIGH_CONFIDENCE_SCORE = 9

const DOC_CHUNKS = buildDocChunks()

export function detectDocsQueryLocale(query: string): DocsLocale {
	return ARABIC_BLOCK.test(query) ? 'ar' : 'en'
}

export function publicDocsPolicyRefusal(userMessage: string): string | null {
	for (const pattern of PRIVATE_SCOPE_PATTERNS) {
		if (pattern.test(userMessage)) {
			return detectDocsQueryLocale(userMessage) === 'ar'
				? 'أقدر أجاوب بس من معلومات ووثائق هايبركوت العامة. سجّل دخولك في البوابة عشان بيانات حسابك أو طلباتك.'
				: 'I can only answer from public HyperQuote website and docs information. Sign in to the portal for your account-specific data.'
		}
	}
	return null
}

export function publicDocsNoAnswerResponse(locale: DocsLocale): string {
	if (locale === 'ar') {
		return 'المعلومة دي مش موجودة في وثائق هايبركوت العامة. أقدر أجاوب بس عن مواضيع الوثائق العامة زي العروض، التوصيل، الدفع، السوق، الدعم، أو ليون.'
	}
	return 'I do not have that in the public HyperQuote docs. I can only answer from public docs, such as quotes, delivery, payments, Market, support, or Lyon.'
}

export function classifyWebsitePublicChatIntent(
	userMessage: string,
	docs: DocsRetrievalResult,
): WebsitePublicChatIntent {
	if (docs.hasHighConfidence && isPublicDocsSeekingMessage(userMessage)) {
		return 'public_docs'
	}
	if (isConversationalMessage(userMessage)) return 'conversational'
	if (docs.hasHighConfidence) return 'public_docs'
	return 'out_of_scope'
}

export function publicConversationFallbackResponse(
	userMessage: string,
): string {
	return detectDocsQueryLocale(userMessage) === 'ar'
		? 'تمام يا زميلي، قولّي تحب نبدأ بإيه؟'
		: 'I’m here. What do you want to figure out?'
}

function isConversationalMessage(userMessage: string): boolean {
	const trimmed = userMessage.trim()
	if (!trimmed) return true
	if (EN_GREETING_PATTERN.test(trimmed) || AR_GREETING_PATTERN.test(trimmed)) {
		return true
	}
	if (
		EN_CONVERSATIONAL_PATTERN.test(trimmed) ||
		AR_CONVERSATIONAL_PATTERN.test(trimmed)
	) {
		return true
	}

	const tokens = tokenize(trimmed, detectDocsQueryLocale(trimmed))
	if (tokens.length <= 5 && !FACTUAL_QUESTION_PATTERN.test(trimmed)) return true

	return false
}

function isPublicDocsSeekingMessage(userMessage: string): boolean {
	if (!FACTUAL_QUESTION_PATTERN.test(userMessage)) return false
	return (
		PUBLIC_DOCS_TOPIC_PATTERN.test(userMessage) ||
		AR_PUBLIC_DOCS_TOPIC_PATTERN.test(userMessage)
	)
}

export function publicDocsExtractiveResponse(
	chunks: RetrievedDocsChunk[],
	locale: DocsLocale,
): string {
	const topChunks = chunks.slice(0, 2)
	const sources = topChunks
		.map((chunk) => {
			const label =
				locale === 'ar'
					? chunk.heading === 'Overview'
						? 'وثائق هايبركوت'
						: chunk.heading
					: chunk.title
			return `[${label}](${chunk.href})`
		})
		.join(locale === 'ar' ? '، ' : ', ')
	const summary = topChunks
		.map((chunk) => firstSentences(chunk.body))
		.filter(Boolean)
		.join('\n\n')

	if (locale === 'ar') {
		return `من وثائق هايبركوت العامة: ${summary}\n\nالمصادر: ${sources}`
	}
	return `From the public HyperQuote docs: ${summary}\n\nSources: ${sources}`
}

export function retrieveWebsiteDocs(
	query: string,
	options: RetrievalOptions = {},
): DocsRetrievalResult {
	const locale = detectDocsQueryLocale(query)
	const queryTokens = tokenize(query, locale)
	if (queryTokens.length === 0) {
		return { chunks: [], hasHighConfidence: false, locale, queryTokens }
	}

	const maxChunks = options.maxChunks ?? DEFAULT_MAX_CHUNKS
	const maxContextCharacters =
		options.maxContextCharacters ?? DEFAULT_CONTEXT_CHARACTERS
	const scored = DOC_CHUNKS.map((chunk) => ({
		chunk,
		score: scoreChunk(chunk, query, queryTokens, locale),
	}))
		.filter((candidate) => candidate.score > 0)
		.sort((a, b) => b.score - a.score)

	const topScore = scored[0]?.score ?? 0
	if (topScore < HIGH_CONFIDENCE_SCORE) {
		return { chunks: [], hasHighConfidence: false, locale, queryTokens }
	}

	let usedCharacters = 0
	const chunks: RetrievedDocsChunk[] = []

	for (const candidate of scored) {
		if (chunks.length >= maxChunks) break
		const body = trimChunkBody(candidate.chunk.body)
		const projectedCharacters = usedCharacters + body.length
		if (chunks.length > 0 && projectedCharacters > maxContextCharacters) break
		usedCharacters = projectedCharacters
		chunks.push({
			articleSlug: candidate.chunk.article.articleSlug,
			body,
			categorySlug: candidate.chunk.article.categorySlug,
			categoryTitle: candidate.chunk.article.categoryTitle,
			description: candidate.chunk.article.description,
			heading: candidate.chunk.heading,
			href: candidate.chunk.article.href,
			locale: candidate.chunk.article.locale,
			score: Math.round(candidate.score * 100) / 100,
			title: candidate.chunk.article.title,
		})
	}

	return {
		chunks,
		hasHighConfidence: chunks.length > 0,
		locale,
		queryTokens,
	}
}

export function buildPublicDocsContext(chunks: RetrievedDocsChunk[]): string {
	return chunks
		.map((chunk, index) => {
			const heading =
				chunk.heading === 'Overview'
					? chunk.title
					: `${chunk.title} - ${chunk.heading}`
			return [
				`[${index + 1}] ${heading}`,
				`Category: ${chunk.categoryTitle}`,
				`Source: ${chunk.href}`,
				chunk.body,
			].join('\n')
		})
		.join('\n\n---\n\n')
}

export function buildWebsiteDocsPrompt(
	basePrompt: string,
	publicDocsContext: string,
): string {
	return `${basePrompt}

Grounding rules:
- Answer only from the public docs context supplied below.
- If the context does not answer the user's question, say the answer is not in the public HyperQuote docs.
- Cite the source for each factual answer using Markdown links to the supplied /docs/... URLs.
- Keep Lyon's existing language behavior: English questions get English; Arabic or Arabizi questions get pure Egyptian Arabic with no Latin letters.
- Never access or imply access to account records, portal drafts, internal operations, driver locations, finance data, supplier costs, employee data, or secrets.

Public docs context:
${publicDocsContext}`
}

function buildDocChunks(): DocsChunk[] {
	return getAllLocalizedContent().flatMap((article) =>
		chunkMarkdown(article).map((chunk) => {
			const normalizedBody = normalize(chunk.body)
			return {
				article,
				heading: chunk.heading,
				body: chunk.body,
				normalizedHeading: normalize(chunk.heading),
				normalizedBody,
				normalizedTitle: normalize(article.title),
				normalizedCategory: normalize(article.categoryTitle),
				normalizedDescription: normalize(article.description),
				bodyTokens: tokensFromNormalized(normalizedBody, article.locale),
			}
		}),
	)
}

function chunkMarkdown(
	article: LocalizedDocContent,
): Array<{ heading: string; body: string }> {
	const lines = article.content.split(/\r?\n/)
	const chunks: Array<{ heading: string; lines: string[] }> = [
		{ heading: 'Overview', lines: [] },
	]

	for (const line of lines) {
		const heading = line.match(/^##\s+(.+?)\s*$/)
		if (heading) {
			chunks.push({ heading: heading[1], lines: [line] })
			continue
		}
		chunks[chunks.length - 1]?.lines.push(line)
	}

	return chunks
		.map((chunk) => ({
			heading: chunk.heading,
			body: stripMarkdown(chunk.lines.join('\n')),
		}))
		.filter((chunk) => chunk.body.length > 0)
}

function scoreChunk(
	chunk: DocsChunk,
	rawQuery: string,
	queryTokens: string[],
	preferredLocale: DocsLocale,
): number {
	const normalizedQuery = normalize(rawQuery)
	let score = 0

	if (chunk.article.locale === preferredLocale) score += 3
	else score -= 1

	if (
		normalizedQuery.length > 2 &&
		chunk.normalizedTitle.includes(normalizedQuery)
	) {
		score += 18
	}
	if (
		normalizedQuery.length > 8 &&
		chunk.normalizedBody.includes(normalizedQuery)
	) {
		score += 12
	}

	for (const token of queryTokens) {
		if (chunk.normalizedTitle.split(' ').includes(token)) score += 8
		if (chunk.normalizedHeading.split(' ').includes(token)) score += 6
		if (chunk.normalizedCategory.split(' ').includes(token)) score += 4
		if (chunk.normalizedDescription.split(' ').includes(token)) score += 3
		const bodyHits = chunk.bodyTokens.filter(
			(bodyToken) => bodyToken === token,
		).length
		score += Math.min(bodyHits, 4) * 1.4
	}

	score += phraseScore(chunk, queryTokens)

	if (
		/\bwhat\s+is\s+hyperquote\b/i.test(rawQuery) &&
		chunk.article.categorySlug === 'platform' &&
		chunk.article.articleSlug === 'what-is-hyperquote'
	) {
		score += 18
		if (chunk.heading === 'Overview') score += 8
	}
	if (
		/\b(price|prices|pricing|quote|quotes|rfq)\b/i.test(rawQuery) &&
		(chunk.article.categorySlug === 'quotes-orders' ||
			chunk.article.categorySlug === 'website-market')
	) {
		score += 6
	}
	if (
		/سعر|اسعار|أسعار|عرض|عروض|تسعير/.test(rawQuery) &&
		(chunk.article.categorySlug === 'quotes-orders' ||
			chunk.article.categorySlug === 'website-market')
	) {
		score += 6
	}

	return score
}

function phraseScore(chunk: DocsChunk, queryTokens: string[]): number {
	let score = 0
	for (let index = 0; index < queryTokens.length - 1; index += 1) {
		const phrase = `${queryTokens[index]} ${queryTokens[index + 1]}`
		if (chunk.normalizedBody.includes(phrase)) score += 4
		if (chunk.normalizedHeading.includes(phrase)) score += 7
		if (chunk.normalizedTitle.includes(phrase)) score += 9
	}
	return score
}

function tokenize(text: string, locale: DocsLocale): string[] {
	const stopWords = locale === 'ar' ? AR_STOP_WORDS : EN_STOP_WORDS
	return tokensFromNormalized(normalize(text), locale).filter(
		(token) => token.length > 1 && !stopWords.has(token),
	)
}

function tokensFromNormalized(text: string, locale: DocsLocale): string[] {
	const matches = text.match(TOKEN_PATTERN) ?? []
	if (locale === 'ar') {
		return matches.flatMap((token) =>
			token.startsWith('ال') && token.length > 4
				? [token, token.slice(2)]
				: [token],
		)
	}
	return matches
}

function normalize(text: string): string {
	return text
		.toLowerCase()
		.normalize('NFKD')
		.replace(ARABIC_DIACRITICS, '')
		.replace(/[إأآٱ]/g, 'ا')
		.replace(/ى/g, 'ي')
		.replace(/ؤ/g, 'و')
		.replace(/ئ/g, 'ي')
		.replace(/ة/g, 'ه')
		.replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
		.replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
		.replace(/[^\p{L}\p{N}\s]+/gu, ' ')
		.replace(/\s+/g, ' ')
		.trim()
}

function stripMarkdown(markdown: string): string {
	return markdown
		.replace(/^#{1,6}\s+/gm, '')
		.replace(/\*\*([^*]+)\*\*/g, '$1')
		.replace(/\*([^*]+)\*/g, '$1')
		.replace(/`([^`]+)`/g, '$1')
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
		.replace(/^[-*+]\s+/gm, '')
		.replace(/^\d+\.\s+/gm, '')
		.replace(/\|/g, ' ')
		.replace(/\n{3,}/g, '\n\n')
		.trim()
}

function trimChunkBody(body: string): string {
	const normalized = body.replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n')
	if (normalized.length <= 1700) return normalized
	return `${normalized.slice(0, 1690).trim()}...`
}

function firstSentences(text: string): string {
	const firstParagraph = text.split(/\n{2,}/)[0]?.trim() ?? ''
	if (firstParagraph.length <= 420) return firstParagraph
	return `${firstParagraph.slice(0, 410).trim()}...`
}
