import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
	shouldShowWebsiteChatActionButtons,
	websiteDirectNavigationButtons,
} from './chat'

function labelsFor(message: string) {
	return websiteDirectNavigationButtons(message).map((button) => button.label)
}

describe('website chat navigation helpers', () => {
	it('routes generic buying language to the market without contact', () => {
		const labels = labelsFor('i need to reach the place where we buy stuff')

		assert.deepEqual(labels, ['Market'])
		assert.equal(
			shouldShowWebsiteChatActionButtons(
				'i need to reach the place where we buy stuff',
			),
			false,
		)
	})

	it('only shows action buttons for explicit link or open requests', () => {
		assert.equal(
			shouldShowWebsiteChatActionButtons('where do I buy wood?'),
			false,
		)
		assert.equal(
			shouldShowWebsiteChatActionButtons('which page has wood?'),
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
})
