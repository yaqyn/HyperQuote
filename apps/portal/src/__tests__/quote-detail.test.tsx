import { describe, it, expect } from 'vitest'

describe('QuoteDetail', () => {
  describe('QuoteHeader', () => {
    it.todo('renders quote reference in Geist Mono')
    it.todo('shows status badge')
    it.todo('shows validity countdown')
    it.todo('shows assigned rep with WhatsApp link when available')
  })

  describe('QuoteTimeline', () => {
    it.todo('renders 7 timeline steps')
    it.todo('marks completed steps with green check')
    it.todo('marks current step with blue pulsing ring')
    it.todo('marks future steps as gray')
  })

  describe('LineItemsTable', () => {
    it.todo('renders all line items with correct columns')
    it.todo('displays prices with CurrencyDisplay')
    it.todo('shows bilingual product names')
    it.todo('uses font-mono for all number columns')
  })

  describe('SubtotalsSection', () => {
    it.todo('shows subtotal, delivery fee, VAT 14%, and total')
    it.todo('shows free delivery label when fee is 0')
    it.todo('displays payment terms')
    it.todo('shows price disclaimer with validity date')
  })

  describe('QuoteActionBar', () => {
    it.todo('renders 4 action buttons when status is sent')
    it.todo('hides action bar when status is not sent')
  })

  describe('VersionHistory', () => {
    it.todo('shows collapsible version sections')
    it.todo('hides when only one version exists')
    it.todo('shows compare button when multiple versions')
  })
})
