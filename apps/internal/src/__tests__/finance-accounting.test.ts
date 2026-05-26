import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationSql = readRepoFile(
	'supabase/migrations/20260525215935_finance_accounting_subledger.sql',
)
const automationMigrationSql = readRepoFile(
	'supabase/migrations/20260526005441_finance_accounting_inventory_automation.sql',
)
const historicalBackfillMigrationSql = readRepoFile(
	'supabase/migrations/20260526010549_finance_accounting_historical_asset_totals.sql',
)
const accountingViewSource = readRepoFile(
	'apps/internal/src/components/finance/FinanceAccountingView.tsx',
)
const financeModuleSource = readRepoFile(
	'apps/internal/src/components/finance/FinanceModule.tsx',
)
const financeTabsSource = readRepoFile(
	'apps/internal/src/components/finance/FinanceTabStrip.tsx',
)

function readRepoFile(relativePath: string) {
	return readFileSync(resolve(process.cwd(), '../..', relativePath), 'utf8')
}

describe('finance accounting rebuild', () => {
	it('guards posted journals as balanced double-entry records', () => {
		expect(migrationSql).toContain('finance_journal_lines_one_side')
		expect(migrationSql).toContain('finance_journal_entry_is_balanced')
		expect(migrationSql).toContain('finance_enforce_posted_entry_balance')
		expect(migrationSql).toContain('finance_posted_journal_lines_are_locked')
	})

	it('makes payment-source backfill idempotent', () => {
		expect(migrationSql).toContain('unique (source_type, source_id, link_role)')
		expect(migrationSql).toContain("link.link_role = 'cash_movement'")
		expect(migrationSql).toContain('finance_backfill_accounting_sources')
	})

	it('keeps accountant sign-off and payroll visibility explicit', () => {
		expect(migrationSql).toContain('requires_accountant_signoff')
		expect(migrationSql).toContain('finance_accountant_signoff_required')
		expect(migrationSql).toContain('can_view_salary_detail')
		expect(migrationSql).toContain(
			'Payroll, tax, and social-insurance accruals require accountant/legal sign-off.',
		)
	})

	it('wires accounting records from operational sources automatically', () => {
		expect(automationMigrationSql).toContain(
			'finance_customer_payments_sync_journal',
		)
		expect(automationMigrationSql).toContain(
			'finance_supplier_payments_sync_journal',
		)
		expect(automationMigrationSql).toContain(
			'finance_orders_sync_review_journal',
		)
		expect(automationMigrationSql).toContain(
			'finance_refills_sync_review_journal',
		)
		expect(automationMigrationSql).toContain(
			'finance_employee_compensation_sync_review_journal',
		)
		expect(automationMigrationSql).toContain('inventoryAssets')
		expect(automationMigrationSql).toContain('primary supplier raw cost')
	})

	it('catches up existing operational rows and leads with total assets', () => {
		expect(historicalBackfillMigrationSql).toContain(
			'finance_record_customer_payment_journal',
		)
		expect(historicalBackfillMigrationSql).toContain(
			'finance_record_supplier_payment_journal',
		)
		expect(historicalBackfillMigrationSql).toContain(
			'finance_record_order_review_journal',
		)
		expect(historicalBackfillMigrationSql).toContain(
			'finance_record_refill_review_journal',
		)
		expect(historicalBackfillMigrationSql).toContain(
			'finance_record_payroll_review_journal',
		)
		expect(accountingViewSource).toContain('EGP total assets')
		expect(accountingViewSource).toContain('dashboard.overview.totalAssets')
	})

	it('replaces the stale Finance history placeholder with Accounting', () => {
		expect(financeModuleSource).not.toContain('HistoryPlaceholder')
		expect(financeModuleSource).not.toContain('History is not connected yet')
		expect(financeTabsSource).toContain("title: 'Payments'")
		expect(financeTabsSource).toContain("title: 'Accounting'")
		expect(financeTabsSource).not.toContain('Live ledger')
	})
})
