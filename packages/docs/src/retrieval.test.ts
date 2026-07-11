import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
	buildPublicDocsContext,
	buildWebsiteDocsPrompt,
	classifyWebsitePublicChatIntent,
	parseWebsiteChatRoute,
	publicDocsExtractiveResponse,
	publicDocsPolicyRefusal,
	publicDocsSourceLinks,
	retrieveWebsiteDocs,
	WEBSITE_CHAT_ROUTER_PROMPT,
} from './retrieval'

describe('website docs retrieval', () => {
	it('finds the English HyperQuote overview', () => {
		const result = retrieveWebsiteDocs('What is HyperQuote?')

		assert.equal(result.hasHighConfidence, true)
		assert.equal(result.locale, 'en')
		assert.equal(result.chunks[0]?.href, '/docs/platform/what-is-hyperquote')
		assert.match(result.chunks[0]?.body ?? '', /building materials platform/i)
	})

	it('prefers Arabic delivery docs for Cairo truck-ban questions', () => {
		const result = retrieveWebsiteDocs(
			'ليه توصيلات القاهرة للشاحنات الثقيلة بتكون بالليل؟',
		)

		assert.equal(result.hasHighConfidence, true)
		assert.equal(result.locale, 'ar')
		assert.equal(result.chunks[0]?.locale, 'ar')
		assert.match(result.chunks[0]?.href ?? '', /^\/docs\/delivery\//)
		assert.match(result.chunks[0]?.body ?? '', /القاهرة|الشاحنات|٦ صباحاً/)
	})

	it('retrieves quote and pricing guidance with source links', () => {
		const result = retrieveWebsiteDocs(
			'Why are there no published prices and how do I request a quote?',
		)
		const context = buildPublicDocsContext(result.chunks)

		assert.equal(result.hasHighConfidence, true)
		assert.match(
			result.chunks[0]?.href ?? '',
			/^\/docs\/(website-market|quotes-orders|support)\//,
		)
		assert.match(context, /Source: \/docs\//)
		assert.match(context, /price|quote/i)
	})

	it('routes material buying questions through HyperQuote market docs', () => {
		const message = 'where to buy wood?'
		const result = retrieveWebsiteDocs(message)

		assert.equal(result.hasHighConfidence, true)
		assert.equal(
			result.chunks[0]?.href,
			'/docs/website-market/browsing-catalog',
		)
		assert.equal(
			classifyWebsitePublicChatIntent(message, result),
			'public_docs',
		)
	})

	it('prefers customer invoicing docs for buyer VAT recovery questions', () => {
		const result = retrieveWebsiteDocs(
			'can I recover tax on my HyperQuote invoice? HyperQuote invoice tax VAT recovery withholding tax',
		)

		assert.equal(result.hasHighConfidence, true)
		assert.equal(result.chunks[0]?.href, '/docs/payments/invoicing')
		assert.equal(
			publicDocsSourceLinks(result.chunks, result.locale).match(
				/\(\/docs\/payments\/invoicing\)/g,
			)?.length,
			1,
		)
	})

	it('keeps clear-topic router expansions inside matching docs categories', () => {
		const vatResult = retrieveWebsiteDocs('vat HyperQuote taxes')
		const deliveryResult = retrieveWebsiteDocs(
			'delivery Cairo truck ban HyperQuote',
		)

		assert.equal(vatResult.hasHighConfidence, true)
		assert.equal(vatResult.chunks[0]?.href, '/docs/payments/invoicing')
		assert.equal(
			vatResult.chunks.every((chunk) => chunk.categorySlug === 'payments'),
			true,
		)
		assert.equal(deliveryResult.hasHighConfidence, true)
		assert.equal(
			deliveryResult.chunks.every((chunk) => chunk.categorySlug === 'delivery'),
			true,
		)
	})

	it('prompts AI to simplify docs instead of copying them', () => {
		const result = retrieveWebsiteDocs('Why are there no published prices?')
		const prompt = buildWebsiteDocsPrompt(
			'Base prompt.',
			buildPublicDocsContext(result.chunks),
		)

		assert.match(prompt, /only source/)
		assert.match(prompt, /Explain the answer simply/)
		assert.match(prompt, /Do not copy long wording/)
		assert.match(prompt, /app appends exact source links/)
		assert.match(prompt, /all account-specific AI is Lyon/)
	})

	it('keeps WhatsApp support guidance away from AI order lookup claims', () => {
		const result = retrieveWebsiteDocs(
			'WhatsApp support business hours response target',
		)
		const context = buildPublicDocsContext(result.chunks)

		assert.equal(result.hasHighConfidence, true)
		assert.match(context, /WhatsApp does not run Lyon/)
		assert.match(context, /portal app/)
		assert.doesNotMatch(context, /AI instant/)
		assert.doesNotMatch(context, /order lookups/)
		assert.doesNotMatch(context, /24\/7/)
		assert.doesNotMatch(context, /human in 15 min/i)
	})

	it('keeps the non-AI docs fallback short and source-linked', () => {
		const result = retrieveWebsiteDocs('Why are there no published prices?')
		const fallback = publicDocsExtractiveResponse(result.chunks, result.locale)

		assert.match(fallback, /^Short version:/)
		assert.match(fallback, /Sources: \[/)
		assert.doesNotMatch(
			fallback,
			/Building material prices in Egypt fluctuate daily/,
		)
	})

	it('returns low confidence for topics outside public docs', () => {
		const result = retrieveWebsiteDocs(
			'How do I configure Kubernetes ingress for a movie streaming app?',
		)

		assert.equal(result.hasHighConfidence, false)
		assert.deepEqual(result.chunks, [])
	})

	it('routes friendly and meta chat outside the docs fallback', () => {
		for (const message of [
			'hey',
			'how are you?',
			'how are u',
			'u good?',
			'r u real?',
			'is this a real AI?',
			'this is shit lmao',
			'MOTHERFUCKING FUCKER',
			'tell me a joke',
			'اهلا',
			'عامل إيه؟',
		]) {
			const docs = retrieveWebsiteDocs(message)
			assert.equal(
				classifyWebsitePublicChatIntent(message, docs),
				'conversational',
				message,
			)
		}
	})

	it('routes public HyperQuote questions to docs even when they are casual', () => {
		const message = 'lol why are there no published prices?'
		assert.equal(
			classifyWebsitePublicChatIntent(message, retrieveWebsiteDocs(message)),
			'public_docs',
		)
	})

	it('routes short public docs topics to docs fallback', () => {
		for (const message of [
			'vat',
			'delivery',
			'payment terms',
			'delivery Cairo truck ban HyperQuote',
			'withholding tax supplier purchase order',
		]) {
			assert.equal(
				classifyWebsitePublicChatIntent(message, retrieveWebsiteDocs(message)),
				'public_docs',
				message,
			)
		}
	})

	it('routes factual questions outside HyperQuote docs to conversational AI', () => {
		const message =
			'How do I configure Kubernetes ingress for a movie streaming app?'
		assert.equal(
			classifyWebsitePublicChatIntent(message, retrieveWebsiteDocs(message)),
			'conversational',
		)
	})

	it('parses model router decisions for public docs retrieval', () => {
		assert.deepEqual(
			parseWebsiteChatRoute(
				'{"action":"retrieve_public_docs","search_query":"HyperQuote VAT invoices input VAT recovery"}',
				'can I recover tax?',
			),
			{
				action: 'retrieve_public_docs',
				searchQuery: 'HyperQuote VAT invoices input VAT recovery',
			},
		)
		assert.deepEqual(
			parseWebsiteChatRoute(
				'```json\n{"action":"retrieve_public_docs","search_query":""}\n```',
				'tell me about delivery',
			),
			{
				action: 'retrieve_public_docs',
				searchQuery: 'tell me about delivery',
			},
		)
	})

	it('treats malformed or conversational router output as chat', () => {
		assert.deepEqual(parseWebsiteChatRoute('hello there', 'hi'), {
			action: 'chat',
			searchQuery: '',
		})
		assert.deepEqual(
			parseWebsiteChatRoute(
				'Greeting received, no actionable request',
				'hello',
			),
			{ action: 'chat', searchQuery: '' },
		)
		assert.deepEqual(
			parseWebsiteChatRoute(
				'{"action":"chat","search_query":"HyperQuote VAT"}',
				'thanks',
			),
			{ action: 'chat', searchQuery: '' },
		)
	})

	it('prompts the router to return JSON and request docs for follow-ups', () => {
		assert.match(WEBSITE_CHAT_ROUTER_PROMPT, /Return JSON only/)
		assert.match(WEBSITE_CHAT_ROUTER_PROMPT, /retrieve_public_docs/)
		assert.match(WEBSITE_CHAT_ROUTER_PROMPT, /indirect follow-ups/)
		assert.match(WEBSITE_CHAT_ROUTER_PROMPT, /building-material buying/)
		assert.match(WEBSITE_CHAT_ROUTER_PROMPT, /outside businesses/)
	})

	it('detects private/account-scope requests in English and Arabic', () => {
		assert.match(
			publicDocsPolicyRefusal('Show my order and driver location') ?? '',
			/public website assistant/,
		)
		assert.match(
			publicDocsPolicyRefusal('where is my order?') ?? '',
			/public website assistant/,
		)
		assert.match(
			publicDocsPolicyRefusal('where is my order?') ?? '',
			/Lyon AI at Portal App/,
		)
		assert.match(
			publicDocsPolicyRefusal('Can you check order HQ-123?') ?? '',
			/cannot check orders, quotes/,
		)
		assert.match(
			publicDocsPolicyRefusal('Please look up quote number Q-100') ?? '',
			/cannot check orders, quotes/,
		)
		assert.equal(
			publicDocsPolicyRefusal('can I recover VAT on my invoice?'),
			null,
		)
		assert.equal(publicDocsPolicyRefusal('how do I pay my invoice?'), null)
		assert.equal(
			publicDocsPolicyRefusal('how does the quote process work?'),
			null,
		)
		assert.match(
			publicDocsPolicyRefusal('فين طلبي ومكان السائق؟') ?? '',
			/مساعد موقع هايبركوت العام/,
		)
	})
})
