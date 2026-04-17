import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const BASE = join(__dirname, '..', 'components', 'operations', 'order-detail')

function readComponent(name: string): string {
	return readFileSync(join(BASE, name), 'utf-8')
}

describe('Order Detail (OPS-02)', () => {
	describe('OrderDetailView', () => {
		const src = readComponent('OrderDetailView.tsx')

		it('fetches order via getOrderDetail with selectedOrderId', () => {
			expect(src).toContain('getOrderDetail')
			expect(src).toContain('selectedOrderId')
			expect(src).toContain('useQuery')
		})

		it('uses Geist Mono for order number', () => {
			expect(src).toContain('font-geist-mono')
		})

		it('renders back button that resets to operations', () => {
			expect(src).toContain('ChevronLeft')
			expect(src).toContain("setActiveTab('operations')")
		})

		it('includes all sub-components', () => {
			expect(src).toContain('OrderProgressBar')
			expect(src).toContain('OrderLineItems')
			expect(src).toContain('OrderActivityLog')
			expect(src).toContain('OrderDocuments')
			expect(src).toContain('CrossModuleHandoff')
			expect(src).toContain('OrderActions')
		})
	})

	describe('OrderLineItems', () => {
		const src = readComponent('OrderLineItems.tsx')

		it('uses React Aria Table components', () => {
			expect(src).toContain('Table')
			expect(src).toContain('TableHeader')
			expect(src).toContain('Column')
			expect(src).toContain('TableBody')
			expect(src).toContain('Row')
			expect(src).toContain('Cell')
		})

		it('shows fulfilledQuantity / quantity in Geist Mono', () => {
			expect(src).toContain('fulfilledQuantity')
			expect(src).toContain('font-geist-mono')
		})

		it('supports sorting by status and ETA', () => {
			expect(src).toContain("handleSort('status')")
			expect(src).toContain("handleSort('eta')")
		})
	})

	describe('OrderProgressBar', () => {
		const src = readComponent('OrderProgressBar.tsx')

		it('computes percentage from fulfilledQuantity / quantity', () => {
			expect(src).toContain('fulfilledQuantity')
			expect(src).toContain('Math.round')
		})

		it('uses blue fill bar', () => {
			expect(src).toContain('2563EB')
		})

		it('displays in Geist Mono', () => {
			expect(src).toContain('font-geist-mono')
		})
	})

	describe('OrderActivityLog', () => {
		const src = readComponent('OrderActivityLog.tsx')

		it('maps over activityLog entries', () => {
			expect(src).toContain('activityLog')
		})

		it('renders timeline with blue dot for latest', () => {
			expect(src).toContain('bg-[#2563EB]')
			expect(src).toContain('bg-black/20')
		})

		it('shows timestamp in Geist Mono', () => {
			expect(src).toContain('font-geist-mono')
		})
	})

	describe('OrderDocuments', () => {
		const src = readComponent('OrderDocuments.tsx')

		it('uses FileText icon for PDFs', () => {
			expect(src).toContain('FileText')
		})

		it('shows download button', () => {
			expect(src).toContain('Download')
		})

		it('displays document date in Geist Mono', () => {
			expect(src).toContain('font-geist-mono')
		})
	})

	describe('OrderActions', () => {
		const src = readComponent('OrderActions.tsx')

		it('has all 4 action buttons', () => {
			expect(src).toContain('Schedule Delivery')
			expect(src).toContain('Split')
			expect(src).toContain('Hold')
			expect(src).toContain('Cancel')
		})

		it('uses isKeyboardDismissDisabled on dialogs', () => {
			expect(src).toContain('isKeyboardDismissDisabled')
		})

		it('calls mutation functions', () => {
			expect(src).toContain('splitOrder')
			expect(src).toContain('holdOrder')
			expect(src).toContain('cancelOrder')
		})
	})

	describe('CrossModuleHandoff', () => {
		const src = readComponent('CrossModuleHandoff.tsx')

		it('uses HANDOFF_STAGES constant', () => {
			expect(src).toContain('HANDOFF_STAGES')
		})

		it('has Nudge button with Bell icon', () => {
			expect(src).toContain('nudgeHandoff')
			expect(src).toContain('Bell')
		})

		it('uses blue for current stage', () => {
			expect(src).toContain('2563EB')
		})

		it('shows time in Geist Mono', () => {
			expect(src).toContain('font-geist-mono')
		})
	})
})
