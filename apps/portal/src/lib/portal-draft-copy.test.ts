import { describe, expect, it } from 'vitest'
import {
	isLegacyGeneratedDraftTitle,
	normalizePortalDraftNotes,
	normalizePortalDraftTitle,
	type PortalDraftCopyItem,
} from './portal-draft-copy'

const wood: PortalDraftCopyItem = {
	name: 'Wood',
	nameAr: 'خشب',
	qty: 400,
	unit: 'piece',
	unitAr: 'قطعة',
}

describe('portal draft copy helpers', () => {
	it('keeps clean model-authored draft title and notes', () => {
		expect(normalizePortalDraftTitle('Tree house wood', [wood], 'en')).toBe(
			'Tree house wood',
		)
		expect(
			normalizePortalDraftNotes(
				'Wood materials for the backyard tree-house frame.',
				[wood],
				'en',
			),
		).toBe('Wood materials for the backyard tree-house frame.')
	})

	it('replaces process-heavy model copy with factual material copy', () => {
		expect(
			normalizePortalDraftTitle('Draft: an order of 400 wood', [wood], 'en'),
		).toBe('Wood - 400 piece')
		expect(
			normalizePortalDraftNotes(
				'Lyon selected 400 piece Wood from the available catalog for the project. Review dimensions and quantities before submitting.',
				[wood],
				'en',
			),
		).toBe('400 piece Wood.')
		expect(
			normalizePortalDraftNotes(
				'I can adjust the draft to:\n\n| Item | Qty |\n| --- | --- |\n| Wood | 400 piece |\n\nShall I apply these changes to the draft?',
				[wood],
				'en',
			),
		).toBe('400 piece Wood.')
	})

	it('summarizes the current material list when the model omits notes', () => {
		expect(
			normalizePortalDraftNotes(
				undefined,
				[
					wood,
					{
						name: 'Cement',
						nameAr: 'أسمنت',
						qty: 12,
						unit: 'bag',
						unitAr: 'شكارة',
					},
				],
				'en',
			),
		).toBe('400 piece Wood, 12 bag Cement.')
	})

	it('detects old generated draft names that should be refreshed after edits', () => {
		expect(isLegacyGeneratedDraftTitle('Draft: an order of 400 wood')).toBe(
			true,
		)
		expect(isLegacyGeneratedDraftTitle('Portal AI draft')).toBe(true)
		expect(isLegacyGeneratedDraftTitle('Tree house wood')).toBe(false)
	})
})
