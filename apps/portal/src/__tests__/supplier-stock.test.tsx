import { describe, it, expect } from 'vitest'

describe('Supplier Stock & Pricing', () => {
  describe('InlineEditCell', () => {
    it.todo('displays value in Geist Mono when not editing')
    it.todo('enters edit mode on click')
    it.todo('saves on blur and flashes green on success')
    it.todo('saves on Enter key press')
    it.todo('reverts value and shows toast on save error')
    it.todo('does not save when value is unchanged')
  })

  describe('FreshnessIndicator', () => {
    it.todo('shows green for updates less than 24 hours ago')
    it.todo('shows yellow for updates 1-3 days ago')
    it.todo('shows red for updates more than 3 days ago')
  })

  describe('BulkUpdateDiff', () => {
    it.todo('generates CSV from current products via PapaParse')
    it.todo('parses uploaded CSV and computes diff by productId')
    it.todo('shows only changed rows in diff preview')
    it.todo('calls bulkUpdatePrices with array of updates on apply')
  })
})
