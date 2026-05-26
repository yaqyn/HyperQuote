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
const ceoSearchFinanceMigrationSql = readRepoFile(
	'supabase/migrations/20260526013854_ceo_search_finance_vtables.sql',
)
const damageEnumMigrationSql = readRepoFile(
	'supabase/migrations/20260526021103_inventory_damage_enum_values.sql',
)
const damageMigrationSql = readRepoFile(
	'supabase/migrations/20260526021104_inventory_damage_system.sql',
)
const damageActivitySearchMigrationSql = readRepoFile(
	'supabase/migrations/20260526025230_inventory_damage_activity_search_wiring.sql',
)
const operatingFinanceMigrationSql = readRepoFile(
	'supabase/migrations/20260526031533_finance_payroll_fuel_company_asset_system.sql',
)
const financeActivityStressMigrationSql = readRepoFile(
	'supabase/migrations/20260526043645_finance_activity_search_stress_fixes.sql',
)
const fuelRejectMigrationSql = readRepoFile(
	'supabase/migrations/20260526074819_finance_fuel_reject_expense.sql',
)
const journalActionProofMigrationSql = readRepoFile(
	'supabase/migrations/20260526080044_finance_journal_action_proofs.sql',
)
const journalActivitySearchMigrationSql = readRepoFile(
	'supabase/migrations/20260526081311_finance_journal_activity_search.sql',
)
const accountingViewSource = readRepoFile(
	'apps/internal/src/components/finance/FinanceAccountingView.tsx',
)
const financeServerSource = readRepoFile(
	'apps/internal/src/lib/server/finance.ts',
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

	it('publishes accounting data through CEO search vtables', () => {
		expect(ceoSearchFinanceMigrationSql).toContain(
			'create or replace view public.ceo_search_finance_vtable',
		)
		expect(ceoSearchFinanceMigrationSql).toContain(
			'create or replace view public.ceo_search_finance_payroll_vtable',
		)
		expect(ceoSearchFinanceMigrationSql).toContain(
			'select * from public.ceo_search_finance_vtable',
		)
		expect(ceoSearchFinanceMigrationSql).toContain(
			'select * from public.ceo_search_finance_payroll_vtable',
		)
		expect(ceoSearchFinanceMigrationSql).toContain("'finance_journal_entries'")
		expect(ceoSearchFinanceMigrationSql).toContain(
			"'finance_payment_followups'",
		)
		expect(ceoSearchFinanceMigrationSql).toContain("'supplier_product_links'")
		expect(ceoSearchFinanceMigrationSql).toContain(
			"'ceo_search_finance_vtable'",
		)
		expect(ceoSearchFinanceMigrationSql).toContain(
			"'ceo_search_finance_payroll_vtable'",
		)
	})

	it('records damaged inventory as stock movement plus accounting journals', () => {
		expect(damageEnumMigrationSql).toContain('inventory_damage_recorded')
		expect(damageEnumMigrationSql).toContain('inventory_damage_transaction')
		expect(damageMigrationSql).toContain(
			'create table if not exists public.inventory_damage_lots',
		)
		expect(damageMigrationSql).toContain(
			'create table if not exists public.inventory_damage_transactions',
		)
		expect(damageMigrationSql).toContain(
			'create or replace function public.inventory_record_damage',
		)
		expect(damageMigrationSql).toContain(
			'create or replace function public.inventory_sell_damaged_inventory',
		)
		expect(damageMigrationSql).toContain(
			'create or replace function public.inventory_dispose_damaged_inventory',
		)
		expect(damageMigrationSql).toContain(
			'create or replace function public.inventory_reverse_damage',
		)
		expect(damageMigrationSql).toContain(
			'set on_hand_quantity = on_hand_quantity - p_quantity',
		)
		expect(damageMigrationSql).toContain(
			'set on_hand_quantity = on_hand_quantity + p_quantity',
		)
		expect(damageMigrationSql).toContain("'1210'")
		expect(damageMigrationSql).toContain("'1211'")
		expect(damageMigrationSql).toContain("'5410'")
		expect(damageMigrationSql).toContain("'5110'")
		expect(damageMigrationSql).toContain("'4110'")
	})

	it('routes damaged inventory through CEO finance search and AI vtables', () => {
		expect(damageMigrationSql).toContain(
			'create or replace view public.ceo_search_finance_damage_vtable',
		)
		expect(damageActivitySearchMigrationSql).toContain(
			'create or replace view public.ceo_search_inventory_damage_activity_vtable',
		)
		expect(damageMigrationSql).toContain(
			'from public.ceo_search_finance_damage_vtable',
		)
		expect(damageActivitySearchMigrationSql).toContain(
			'from public.ceo_search_inventory_damage_activity_vtable',
		)
		expect(damageMigrationSql).toContain("'ceo_search_finance_damage_vtable'")
		expect(damageActivitySearchMigrationSql).toContain(
			"'ceo_search_inventory_damage_activity_vtable'",
		)
		expect(damageMigrationSql).toContain('finance_inventory_damage_lot')
		expect(damageMigrationSql).toContain('finance_inventory_damage_transaction')
		expect(damageActivitySearchMigrationSql).toContain(
			'activity_inventory_damage',
		)
	})

	it('keeps damaged inventory visible in the accounting asset register', () => {
		expect(damageMigrationSql).toContain(
			'finance_accounting_dashboard_without_damage',
		)
		expect(damageMigrationSql).toContain('damagedInventoryAssets')
		expect(damageMigrationSql).toContain('damage_assets')
		expect(financeServerSource).toContain('damagedInventoryAssets?: number')
		expect(accountingViewSource).toContain('Damaged inventory')
		expect(accountingViewSource).toContain("row.condition === 'damaged'")
		expect(accountingViewSource).toContain("row.lotId ?? 'good'")
	})

	it('wires payroll, fuel, and company assets through ledger-backed accounting', () => {
		expect(operatingFinanceMigrationSql).toContain(
			'create table if not exists public.employee_payroll_payments',
		)
		expect(operatingFinanceMigrationSql).toContain(
			'create table if not exists public.truck_fuel_expenses',
		)
		expect(operatingFinanceMigrationSql).toContain(
			'create table if not exists public.company_assets',
		)
		expect(operatingFinanceMigrationSql).toContain(
			'finance_pay_employee_salary',
		)
		expect(operatingFinanceMigrationSql).toContain('driver_submit_fuel_receipt')
		expect(operatingFinanceMigrationSql).toContain(
			'finance_record_company_asset',
		)
		expect(operatingFinanceMigrationSql).toContain(
			'ceo_search_finance_fuel_vtable',
		)
		expect(operatingFinanceMigrationSql).toContain(
			'ceo_search_finance_company_asset_vtable',
		)
		expect(accountingViewSource).toContain('PAY')
		expect(accountingViewSource).toContain('FuelExpensesView')
		expect(accountingViewSource).toContain('CompanyAssetsView')
	})

	it('records finance operating actions as human searchable activities', () => {
		expect(financeActivityStressMigrationSql).toContain(
			'ceo_search_finance_activity_vtable',
		)
		expect(financeActivityStressMigrationSql).toContain(
			"'finance_adjustment_created'",
		)
		expect(financeActivityStressMigrationSql).toContain(
			"'category', created_adjustment.category",
		)
		expect(financeActivityStressMigrationSql).toContain(
			"'description', created_adjustment.description",
		)
		expect(financeActivityStressMigrationSql).toContain(
			"'proof_path', clean_proof_path",
		)
		expect(financeActivityStressMigrationSql).toContain(
			'activity_finance_operating',
		)
		expect(financeActivityStressMigrationSql).toContain(
			'refresh_ceo_search_documents_without_finance_activity',
		)
	})

	it('uses canonical proof uploads for finance operating actions', () => {
		expect(accountingViewSource).toContain('ProofUploadField')
		expect(accountingViewSource).toContain('Salary-change proof')
		expect(accountingViewSource).toContain('Salary payment proof')
		expect(accountingViewSource).toContain('Bonus proof')
		expect(accountingViewSource).toContain('Extra fuel proof')
		expect(accountingViewSource).toContain('Asset proof')
		expect(accountingViewSource).toContain('Adjustment proof')
		expect(accountingViewSource).toContain('proofDocumentIdValue')
		expect(financeServerSource).toContain('proofDocumentId')
		expect(financeServerSource).toContain('p_proof_document_id')
	})

	it('requires confirmation and supports canceling submitted fuel receipts', () => {
		expect(accountingViewSource).toContain('FinanceConfirmationDialog')
		expect(accountingViewSource).not.toContain('window.confirm')
		expect(accountingViewSource).toContain('rejectTruckFuelExpense')
		expect(fuelRejectMigrationSql).toContain("'finance_fuel_expense_rejected'")
		expect(fuelRejectMigrationSql).toContain(
			'finance_reject_truck_fuel_expense',
		)
		expect(fuelRejectMigrationSql).toContain(
			'service_finance_reject_truck_fuel_expense',
		)
		expect(fuelRejectMigrationSql).toContain('Rejected fuel expense for')
	})

	it('keeps journal actions contextual, in-app, and proof backed', () => {
		expect(accountingViewSource).not.toContain('window.prompt')
		expect(accountingViewSource).toContain('JournalActionDialog')
		expect(accountingViewSource).toContain('canPost')
		expect(accountingViewSource).toContain('canReverse')
		expect(accountingViewSource).toContain('canVoid')
		expect(accountingViewSource).toContain('Admin proof')
		expect(accountingViewSource).toContain('Admin reviewed this journal action')
		expect(journalActionProofMigrationSql).toContain(
			'finance_link_journal_action_proof',
		)
		expect(journalActionProofMigrationSql).toContain('journal_post_approval')
		expect(journalActionProofMigrationSql).toContain('journal_void_approval')
		expect(journalActionProofMigrationSql).toContain(
			'journal_reversal_approval',
		)
		expect(journalActionProofMigrationSql).toContain(
			"'proof_document_id', p_proof_document_id",
		)
		expect(journalActionProofMigrationSql).toContain(
			'finance_journal_action_proof_required',
		)
		expect(journalActivitySearchMigrationSql).toContain(
			"'finance_journal_posted'",
		)
		expect(journalActivitySearchMigrationSql).toContain(
			"'finance_journal_reversed'",
		)
		expect(journalActivitySearchMigrationSql).toContain(
			"'finance_journal_voided'",
		)
		expect(journalActivitySearchMigrationSql).toContain('Posted journal entry')
		expect(journalActivitySearchMigrationSql).toContain(
			'journal ledger entry reverse void post',
		)
	})

	it('presents the accounting overview as a wired operating dashboard', () => {
		expect(accountingViewSource).toContain('Balance sheet')
		expect(accountingViewSource).toContain('Liability and review')
		expect(accountingViewSource).toContain('Period movement')
		expect(accountingViewSource).toContain('Work queue')
		expect(accountingViewSource).toContain('Inventory asset register')
		expect(accountingViewSource).toContain('Journal activity')
		expect(accountingViewSource).toContain("onSelect('inventory')")
		expect(accountingViewSource).toContain("onSelect('journal')")
	})

	it('keeps the accounting surface tuned for tablet breakpoints', () => {
		expect(accountingViewSource).toContain('sm:grid-cols-3 lg:grid-cols-6')
		expect(accountingViewSource).toContain('md:grid-cols-2')
		expect(accountingViewSource).toContain(
			'lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]',
		)
		expect(accountingViewSource).toContain(
			'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]',
		)
	})

	it('keeps the accounting surface compact on phones', () => {
		expect(accountingViewSource).toContain('overflow-x-auto')
		expect(accountingViewSource).toContain('flex min-w-max')
		expect(accountingViewSource).toContain('w-[132px] shrink-0 sm:w-auto')
		expect(accountingViewSource).toContain('grid grid-cols-2 gap-2 sm:flex')
		expect(accountingViewSource).toContain('fullWidthOnMobile')
		expect(accountingViewSource).toContain('hidden max-w-[620px]')
		expect(accountingViewSource).toContain('py-2')
		expect(accountingViewSource).toContain('mt-4 space-y-6 sm:mt-6')
	})

	it('replaces the stale Finance history placeholder with Accounting', () => {
		expect(financeModuleSource).not.toContain('HistoryPlaceholder')
		expect(financeModuleSource).not.toContain('History is not connected yet')
		expect(financeTabsSource).toContain("title: 'Payments'")
		expect(financeTabsSource).toContain("title: 'Accounting'")
		expect(financeTabsSource).not.toContain('Live ledger')
	})
})
