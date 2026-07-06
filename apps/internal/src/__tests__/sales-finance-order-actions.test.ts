import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = process.cwd().endsWith('apps/internal')
	? join(process.cwd(), '../..')
	: process.cwd()

function readRepoFile(path: string): string {
	return readFileSync(join(repoRoot, path), 'utf8')
}

describe('sales and finance order actions', () => {
	it('keeps reject in Sales and cancel in Finance', () => {
		const salesQuoteBuilder = readRepoFile(
			'apps/internal/src/components/sales/quote-builder/QuoteBuilderView.tsx',
		)
		const financePaymentPanel = readRepoFile(
			'apps/internal/src/components/finance/FinancePaymentPanel.tsx',
		)

		expect(salesQuoteBuilder).toContain('DeclineRFQDialog')
		expect(salesQuoteBuilder).toContain('ariaLabel="Reject quote"')
		expect(salesQuoteBuilder).not.toContain('CancelRFQDialog')
		expect(salesQuoteBuilder).not.toContain('ariaLabel="Cancel quote"')

		expect(financePaymentPanel).toContain('cancelOrderFromFinance')
		expect(financePaymentPanel).toContain(
			"Cancel {mode === 'order' ? 'order' : 'deal'}",
		)
	})
})
