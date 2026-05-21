import { beforeEach, describe, expect, it } from 'vitest'
import { useQuoteActionsStore } from '../stores/quote-actions'

describe('quote action state', () => {
	beforeEach(() => {
		useQuoteActionsStore.getState().reset()
	})

	it('tracks counter-offer edits without mutating unrelated lines', () => {
		const store = useQuoteActionsStore.getState()

		store.setMode('counter-per-line')
		store.setItemPrice('line-a', 120)
		store.setItemQuantity('line-b', 8)
		store.setTotalDiscount(5)
		store.setCounterNotes('Customer asked for split delivery.')
		store.setSelfPickup(true)

		const state = useQuoteActionsStore.getState()
		expect(state.mode).toBe('counter-per-line')
		expect(state.modifiedPrices).toEqual({ 'line-a': 120 })
		expect(state.modifiedQuantities).toEqual({ 'line-b': 8 })
		expect(state.totalDiscount).toBe(5)
		expect(state.counterNotes).toBe('Customer asked for split delivery.')
		expect(state.selfPickup).toBe(true)
		expect(state.getModifiedCount()).toBe(1)
	})

	it('summarizes partial accept decisions and resets to a clean state', () => {
		const store = useQuoteActionsStore.getState()

		store.setMode('partial')
		store.setLineDecision('line-a', 'accepted')
		store.setLineDecision('line-b', 'rejected')
		useQuoteActionsStore.setState((state) => ({
			lineDecisions: { ...state.lineDecisions, 'line-c': 'pending' },
		}))
		store.setRejectReason('line-b', 'Wrong specification')
		store.setNegotiatedPrice('line-c', 95)

		expect(useQuoteActionsStore.getState().getDecisionSummary()).toEqual({
			accepted: 1,
			rejected: 1,
			pending: 1,
		})
		expect(useQuoteActionsStore.getState().allDecided()).toBe(false)

		store.setLineDecision('line-c', 'negotiate')
		expect(useQuoteActionsStore.getState().allDecided()).toBe(true)

		store.reset()
		expect(useQuoteActionsStore.getState().mode).toBe('view')
		expect(useQuoteActionsStore.getState().lineDecisions).toEqual({})
		expect(useQuoteActionsStore.getState().negotiatedPrices).toEqual({})
	})
})
