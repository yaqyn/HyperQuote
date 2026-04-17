import { describe, it } from 'vitest'

describe('Supplier Purchase Orders', () => {
	describe('POLineItem', () => {
		it.todo('defaults to confirmed checkbox checked')
		it.todo('shows reason Select when checkbox unchecked')
		it.todo('shows partial quantity NumberField for Partial Only reason')
		it.todo('shows new price NumberField for Price Changed reason')
	})

	describe('PODetail', () => {
		it.todo('calls confirmPO with lines and delivery schedule')
		it.todo('calls rejectPO with reason text')
		it.todo('never exposes customer name in PO view')
	})

	describe('uploadDeliveryNote', () => {
		it.todo('uploads delivery note file for confirmed PO')
		it.todo('returns deliveryNoteId on success')
	})
})
