import { describe, expect, it } from 'vitest'
import { portalChatShouldUseModel } from './portal-chat-routing'

describe('portal chat routing', () => {
	it('uses the model only for ordinary chat without a deterministic answer', () => {
		expect(
			portalChatShouldUseModel({
				aiEnabled: true,
			}),
		).toBe(true)
		expect(
			portalChatShouldUseModel({
				aiEnabled: false,
			}),
		).toBe(false)
		expect(
			portalChatShouldUseModel({
				aiEnabled: true,
				commandName: 'open_orders',
			}),
		).toBe(false)
		expect(
			portalChatShouldUseModel({
				aiEnabled: true,
				contextMessage: 'Use this deterministic answer.',
			}),
		).toBe(false)
	})
})
