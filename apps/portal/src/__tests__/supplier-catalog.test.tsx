import { describe, it } from 'vitest'

describe('Supplier Catalog Upload', () => {
	describe('CatalogUploadModal', () => {
		it.todo('accepts PDF, Excel, and CSV file types')
		it.todo('calls uploadCatalog server function on file drop')
		it.todo('shows processing state during AI parsing')
		it.todo('advances to review step on processing complete')
	})

	describe('ConfidenceBadge', () => {
		it.todo('shows green for confidence > 90%')
		it.todo('shows yellow for confidence 70-90%')
		it.todo('shows red for confidence < 70%')
	})

	describe('CatalogReview', () => {
		it.todo('sorts items by confidence ascending (lowest first)')
		it.todo('renders editable fields for each parsed item')
	})
})
