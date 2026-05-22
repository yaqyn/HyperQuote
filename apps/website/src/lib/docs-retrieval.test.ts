import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
	buildPublicDocsContext,
	publicDocsPolicyRefusal,
	retrieveWebsiteDocs,
} from './docs-retrieval'

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

	it('returns low confidence for topics outside public docs', () => {
		const result = retrieveWebsiteDocs(
			'How do I configure Kubernetes ingress for a movie streaming app?',
		)

		assert.equal(result.hasHighConfidence, false)
		assert.deepEqual(result.chunks, [])
	})

	it('detects private/account-scope requests in English and Arabic', () => {
		assert.match(
			publicDocsPolicyRefusal('Show my order and driver location') ?? '',
			/public HyperQuote website and docs information/,
		)
		assert.match(
			publicDocsPolicyRefusal('فين طلبي ومكان السائق؟') ?? '',
			/وثائق هايبركوت العامة/,
		)
	})
})
