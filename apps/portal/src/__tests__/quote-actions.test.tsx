import { describe, it, expect } from 'vitest'

describe('Quote Actions', () => {
  describe('AcceptConfirmModal', () => {
    it.todo('shows confirmation with total and payment terms')
    it.todo('calls onConfirm when accept button clicked')
    it.todo('disables accept button when isPending')
  })

  describe('DeclineModal', () => {
    it.todo('shows reason dropdown with 4 options')
    it.todo('calls onConfirm with reason and notes')
    it.todo('resets state on close')
  })

  describe('CounterOfferPanel', () => {
    it.todo('shows mode selection between total and per-line')
    it.todo('total mode: calculates new total from discount percent')
    it.todo('per-line mode: enables editable prices in table')
    it.todo('shows self-pickup checkbox')
    it.todo('shows notes textarea')
  })

  describe('PartialAcceptControls', () => {
    it.todo('shows accept/reject/negotiate buttons per line')
    it.todo('shows reject reason dropdown when rejected')
    it.todo('shows price input when negotiate selected')
  })

  describe('PartialSummaryBar', () => {
    it.todo('shows live count of accepted/rejected/pending')
    it.todo('disables submit until all lines decided')
  })

  describe('QuoteActionsStore', () => {
    it.todo('initializes with mode view and empty state')
    it.todo('setMode changes mode')
    it.todo('setItemPrice updates modifiedPrices')
    it.todo('setLineDecision updates lineDecisions')
    it.todo('getModifiedCount returns count of modified prices')
    it.todo('getDecisionSummary returns correct counts')
    it.todo('allDecided returns true when all lines have decisions')
    it.todo('reset clears all state')
  })
})
