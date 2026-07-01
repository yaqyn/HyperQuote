import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
	shouldShowWebsiteChatActionButtons,
	websiteChatRateLimitKey,
	websiteDirectNavigationButtons,
	websiteUnsupportedHelpButtons,
} from './chat'

function labelsFor(message: string) {
	return websiteDirectNavigationButtons(message).map((button) => button.label)
}

function unsupportedLabelsFor(message: string) {
	return websiteUnsupportedHelpButtons(message).map((button) => button.label)
}

describe('website chat navigation helpers', () => {
	it('routes generic buying language to the market without contact', () => {
		const labels = labelsFor('i need to reach the place where we buy stuff')

		assert.deepEqual(labels, ['Market'])
		assert.equal(
			shouldShowWebsiteChatActionButtons(
				'i need to reach the place where we buy stuff',
			),
			true,
		)
	})

	it('shows action buttons for navigation requests, not informational answers', () => {
		assert.equal(
			shouldShowWebsiteChatActionButtons('where do I buy wood?'),
			true,
		)
		assert.equal(
			shouldShowWebsiteChatActionButtons('which page has wood?'),
			true,
		)
		assert.deepEqual(labelsFor('where is the place we buy stuff?'), ['Market'])
		assert.deepEqual(labelsFor('where is the cart making place? lol'), [
			'Market',
		])
		assert.equal(shouldShowWebsiteChatActionButtons('market please?'), true)
		assert.equal(shouldShowWebsiteChatActionButtons('support'), true)
		assert.equal(
			shouldShowWebsiteChatActionButtons('how do published prices work?'),
			false,
		)
		assert.equal(
			shouldShowWebsiteChatActionButtons('send me the market link'),
			true,
		)
		assert.equal(
			shouldShowWebsiteChatActionButtons('open the support page'),
			true,
		)
	})

	it('does not offer quote action buttons from website chat', () => {
		assert.deepEqual(labelsFor('send me the quote link'), [])
		assert.deepEqual(labelsFor('how do I check quote number Q-100?'), [])
	})

	it('points unsupported account help to Lyon AI at Portal App', () => {
		assert.deepEqual(unsupportedLabelsFor('check my order status'), [
			'Portal App',
		])
		assert.deepEqual(unsupportedLabelsFor('where do I buy wood?'), [])
	})

	it('keeps website chat rate limits scoped to stable request identity', () => {
		assert.equal(
			websiteChatRateLimitKey(
				new Request('https://www.hyperquote.net/api/chat', {
					headers: { 'cf-connecting-ip': '203.0.113.10' },
				}),
			),
			'website-chat:ip:203.0.113.10',
		)
		assert.equal(
			websiteChatRateLimitKey(
				new Request('https://www.hyperquote.net/api/chat', {
					headers: { 'x-forwarded-for': '198.51.100.1, 10.0.0.1' },
				}),
			),
			'website-chat:ip:198.51.100.1',
		)

		const firstFallback = websiteChatRateLimitKey(
			new Request('https://www.hyperquote.net/api/chat', {
				headers: {
					'accept-language': 'en',
					'user-agent': 'browser-one',
				},
			}),
		)
		const secondFallback = websiteChatRateLimitKey(
			new Request('https://www.hyperquote.net/api/chat', {
				headers: {
					'accept-language': 'en',
					'user-agent': 'browser-two',
				},
			}),
		)

		assert.match(firstFallback, /^website-chat:fallback:/)
		assert.notEqual(firstFallback, secondFallback)
	})
})
