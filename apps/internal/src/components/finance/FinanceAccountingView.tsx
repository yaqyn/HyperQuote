import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	Ban,
	Banknote,
	BookOpenCheck,
	Building2,
	Calculator,
	Fuel,
	Gift,
	type LucideIcon,
	Plus,
	RefreshCcw,
	Undo2,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { INTERNAL_LIVE_STALE_MS } from '../../lib/internal-live-query'
import {
	backfillFinanceAccountingSources,
	createFinanceAdjustment,
	type FinanceAccountingAdjustment,
	type FinanceAccountingCompanyAsset,
	type FinanceAccountingDashboard,
	type FinanceAccountingFuelExpense,
	type FinanceAccountingInventoryAsset,
	type FinanceAccountingJournalEntry,
	type FinanceAccountingPayable,
	type FinanceAccountingReceivable,
	getFinanceAccountingDashboard,
	payEmployeeBonus,
	payEmployeeSalary,
	postFinanceJournalEntry,
	postTruckFuelExpense,
	recordCompanyAsset,
	rejectTruckFuelExpense,
	reverseFinanceJournalEntry,
	updateEmployeeCompensation,
	voidFinanceDraftJournalEntry,
} from '../../lib/server/finance'
import type { UploadedProofDocument } from '../../lib/server/proofs'
import {
	DispatchAction,
	DispatchBody,
	DispatchDialog,
	DispatchFooter,
} from '../shared/DispatchDialog'
import {
	EmployeeActionButton,
	EmployeeStatusPill,
} from '../shared/EmployeeControls'
import { formatDecimalEgp } from '../shared/formatters'
import { ProofUploadField } from '../shared/ProofUploadField'

type AccountingView =
	| 'overview'
	| 'income'
	| 'cash'
	| 'inventory'
	| 'companyAssets'
	| 'fuel'
	| 'receivables'
	| 'payables'
	| 'payroll'
	| 'adjustments'
	| 'journal'

type AccountingPeriodPreset =
	| 'today'
	| 'thisMonth'
	| 'lastMonth'
	| 'last30Days'
	| 'yearToDate'
	| 'custom'

const ACCOUNTING_VIEWS: Array<{
	id: AccountingView
	label: string
	icon: LucideIcon
}> = [
	{ id: 'overview', label: 'Overview', icon: Calculator },
	{ id: 'companyAssets', label: 'Company assets', icon: Building2 },
	{ id: 'fuel', label: 'Fuel', icon: Fuel },
	{ id: 'payroll', label: 'Payroll', icon: Banknote },
	{ id: 'adjustments', label: 'Adjustments', icon: Plus },
	{ id: 'journal', label: 'Journal', icon: BookOpenCheck },
]

const ACCOUNTING_PERIOD_PRESETS: Array<{
	id: AccountingPeriodPreset
	label: string
}> = [
	{ id: 'today', label: 'Today' },
	{ id: 'thisMonth', label: 'This month' },
	{ id: 'lastMonth', label: 'Last month' },
	{ id: 'last30Days', label: 'Last 30' },
	{ id: 'yearToDate', label: 'YTD' },
	{ id: 'custom', label: 'Custom' },
]

const ADJUSTMENT_TYPES = [
	{
		id: 'company_expense',
		label: 'Company expense',
		note: 'Posts an operating expense adjustment with proof.',
	},
	{
		id: 'damage',
		label: 'Damage',
		note: 'Use only for finance-side damage corrections; stock damage starts in Inventory.',
	},
	{
		id: 'refund',
		label: 'Refund',
		note: 'Tracks customer or supplier money returned with support proof.',
	},
	{
		id: 'write_off',
		label: 'Write-off',
		note: 'Removes value that will not be recovered.',
	},
	{
		id: 'credit_adjustment',
		label: 'Credit adjustment',
		note: 'Adds a documented credit to the ledger.',
	},
	{
		id: 'debit_adjustment',
		label: 'Debit adjustment',
		note: 'Adds a documented debit to the ledger.',
	},
] as const
type AdjustmentType = (typeof ADJUSTMENT_TYPES)[number]['id']

const ADJUSTMENT_CATEGORY_OPTIONS: Record<
	AdjustmentType,
	Array<{ id: string; label: string; description: string }>
> = {
	company_expense: [
		{
			id: 'utilities',
			label: 'Utilities',
			description: 'Electricity, water, telecom, internet, and site services.',
		},
		{
			id: 'office_supplies',
			label: 'Office supplies',
			description: 'Consumables used by the company team.',
		},
		{
			id: 'maintenance',
			label: 'Maintenance',
			description:
				'Small repairs or maintenance not recorded as a company asset.',
		},
		{
			id: 'permits_and_fees',
			label: 'Permits and fees',
			description: 'Government fees, licenses, permits, or compliance costs.',
		},
	],
	credit_adjustment: [
		{
			id: 'customer_credit',
			label: 'Customer credit',
			description: 'Credit applied to a customer balance after review.',
		},
		{
			id: 'supplier_credit',
			label: 'Supplier credit',
			description: 'Credit received from a supplier after review.',
		},
		{
			id: 'opening_balance_credit',
			label: 'Opening balance credit',
			description: 'Credit correction from a verified opening-balance proof.',
		},
	],
	damage: [
		{
			id: 'inventory_damage_review',
			label: 'Inventory damage review',
			description:
				'Finance correction for an inventory damage lot already recorded.',
		},
		{
			id: 'damage_count_correction',
			label: 'Damage count correction',
			description: 'Corrects a previously approved damage valuation.',
		},
		{
			id: 'damage_disposal_cost',
			label: 'Disposal cost',
			description: 'Cost paid to dispose of damaged stock.',
		},
	],
	debit_adjustment: [
		{
			id: 'customer_debit',
			label: 'Customer debit',
			description: 'Debit applied to a customer balance after review.',
		},
		{
			id: 'supplier_debit',
			label: 'Supplier debit',
			description: 'Debit applied to a supplier balance after review.',
		},
		{
			id: 'opening_balance_debit',
			label: 'Opening balance debit',
			description: 'Debit correction from a verified opening-balance proof.',
		},
	],
	refund: [
		{
			id: 'customer_refund',
			label: 'Customer refund',
			description: 'Money returned to a customer.',
		},
		{
			id: 'supplier_refund',
			label: 'Supplier refund',
			description: 'Money returned by or to a supplier.',
		},
		{
			id: 'overpayment_return',
			label: 'Overpayment return',
			description: 'Return of money paid above the approved balance.',
		},
	],
	write_off: [
		{
			id: 'uncollectible_receivable',
			label: 'Uncollectible receivable',
			description: 'Receivable balance approved as not recoverable.',
		},
		{
			id: 'inventory_write_off',
			label: 'Inventory write-off',
			description: 'Inventory value approved for full write-off.',
		},
		{
			id: 'rounding_write_off',
			label: 'Rounding write-off',
			description: 'Small rounding difference closed with proof.',
		},
	],
}

const COUNT_METRICS = new Set([
	'Review required',
	'Draft journals',
	'Cost reviews',
	'Pending fuel receipts',
	'Payroll due',
])

const COMPACT_INPUT_CLASS =
	'h-10 min-w-0 rounded-md border border-black/[0.1] bg-[var(--color-surface)] px-3 font-[family-name:var(--font-archivo)] text-[12px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)]/55 focus:ring-2 focus:ring-[var(--color-primary)]/15 dark:border-white/[0.12]'
const MONEY_INPUT_CLASS =
	'h-10 min-w-0 rounded-md border border-black/[0.1] bg-[var(--color-surface)] px-3 font-[family-name:var(--font-geist-mono)] text-[12px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)]/55 focus:ring-2 focus:ring-[var(--color-primary)]/15 dark:border-white/[0.12]'
const SELECT_CLASS =
	'h-10 min-w-0 rounded-md border border-black/[0.1] bg-[var(--color-surface)] px-3 font-[family-name:var(--font-archivo)] text-[12px] text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]/55 focus:ring-2 focus:ring-[var(--color-primary)]/15 dark:border-white/[0.12]'

function firstAdjustmentCategory(type: AdjustmentType): string {
	return ADJUSTMENT_CATEGORY_OPTIONS[type][0]?.id ?? ''
}

function adjustmentTypeCopy(type: AdjustmentType) {
	return ADJUSTMENT_TYPES.find((option) => option.id === type)
}

function adjustmentTypeLabel(value: string): string {
	return (
		ADJUSTMENT_TYPES.find((option) => option.id === value)?.label ??
		accountingLabel(value)
	)
}

function accountingLabel(value: string): string {
	const clean = value.replaceAll('_', ' ').trim()
	if (!clean) return 'Unknown'
	return clean.charAt(0).toUpperCase() + clean.slice(1)
}

function adjustmentStatusTone(status: string) {
	if (status === 'posted') return 'success'
	if (status === 'review_required') return 'warning'
	if (status === 'voided' || status === 'rejected') return 'danger'
	return 'neutral'
}

function proofPathValue(
	proof: UploadedProofDocument | null,
): string | undefined {
	return proof?.proofPath
}

function proofDocumentIdValue(
	proof: UploadedProofDocument | null,
): string | undefined {
	return proof?.id
}

function mutationErrorMessage(error: unknown): string | null {
	if (!error) return null
	if (error instanceof Error) return error.message
	return 'The action could not be recorded.'
}

function dateInputValue(date: Date) {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

function shiftedDate(date: Date, days: number) {
	const next = new Date(date)
	next.setDate(next.getDate() + days)
	return next
}

function accountingPeriodRange(
	preset: Exclude<AccountingPeriodPreset, 'custom'>,
) {
	const today = new Date()
	const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
	const startOfLastMonth = new Date(
		today.getFullYear(),
		today.getMonth() - 1,
		1,
	)
	const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)

	switch (preset) {
		case 'today':
			return {
				end: dateInputValue(today),
				start: dateInputValue(today),
			}
		case 'lastMonth':
			return {
				end: dateInputValue(endOfLastMonth),
				start: dateInputValue(startOfLastMonth),
			}
		case 'last30Days':
			return {
				end: dateInputValue(today),
				start: dateInputValue(shiftedDate(today, -29)),
			}
		case 'yearToDate':
			return {
				end: dateInputValue(today),
				start: dateInputValue(new Date(today.getFullYear(), 0, 1)),
			}
		case 'thisMonth':
			return {
				end: dateInputValue(today),
				start: dateInputValue(startOfThisMonth),
			}
	}
	throw new Error(`Unknown accounting period preset: ${preset}`)
}

function todayInputValue() {
	return accountingPeriodRange('today').end
}

function monthStartInputValue() {
	return accountingPeriodRange('thisMonth').start
}

function formatDateLabel(value: string) {
	const parsed = new Date(`${value}T00:00:00`)
	if (Number.isNaN(parsed.getTime())) return value
	return parsed.toLocaleDateString('en-US', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	})
}

export function FinanceAccountingView() {
	const queryClient = useQueryClient()
	const [activeView, setActiveView] = useState<AccountingView>('overview')
	const [periodPreset, setPeriodPreset] =
		useState<AccountingPeriodPreset>('thisMonth')
	const [periodStart, setPeriodStart] = useState(monthStartInputValue)
	const [periodEnd, setPeriodEnd] = useState(todayInputValue)

	const dashboardQuery = useQuery({
		queryKey: ['finance-accounting', periodStart, periodEnd],
		queryFn: () =>
			getDashboard({
				periodStart,
				periodEnd,
			}),
		refetchOnWindowFocus: 'always',
		staleTime: INTERNAL_LIVE_STALE_MS,
	})

	const backfillMutation = useMutation({
		mutationFn: () => backfillFinanceAccountingSources({ data: {} }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['finance-accounting'] })
		},
	})

	if (dashboardQuery.isError) {
		return (
			<AccountingStateMessage
				title="Accounting did not load"
				copy="Refresh and try again. No journal record was changed."
			/>
		)
	}

	if (dashboardQuery.isLoading || !dashboardQuery.data) {
		return (
			<AccountingStateMessage
				title="Loading accounting"
				copy="Reading posted journals, operational balances, and review items."
			/>
		)
	}

	const dashboard = dashboardQuery.data
	const applyPeriodPreset = (preset: AccountingPeriodPreset) => {
		setPeriodPreset(preset)
		if (preset === 'custom') return
		const range = accountingPeriodRange(preset)
		setPeriodStart(range.start)
		setPeriodEnd(range.end)
	}

	return (
		<div className="relative">
			<div className="mx-auto flex max-w-[1180px] flex-col px-4 pt-5 pb-16 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8 xl:px-10">
				<AccountingMasthead
					dashboard={dashboard}
					periodPreset={periodPreset}
					periodStart={periodStart}
					periodEnd={periodEnd}
					onPeriodPresetChange={applyPeriodPreset}
					onPeriodStartChange={(value) => {
						setPeriodPreset('custom')
						setPeriodStart(value)
					}}
					onPeriodEndChange={(value) => {
						setPeriodPreset('custom')
						setPeriodEnd(value)
					}}
					onBackfill={() => backfillMutation.mutate()}
					backfillBusy={backfillMutation.isPending}
				/>

				<AccountingViewStrip
					activeView={activeView}
					dashboard={dashboard}
					onSelect={setActiveView}
				/>

				{activeView === 'overview' && (
					<OverviewView dashboard={dashboard} onSelect={setActiveView} />
				)}
				{activeView === 'income' && <IncomeView dashboard={dashboard} />}
				{activeView === 'cash' && <CashFlowView dashboard={dashboard} />}
				{activeView === 'inventory' && (
					<InventoryAssetsView rows={dashboard.inventoryAssets} />
				)}
				{activeView === 'companyAssets' && (
					<CompanyAssetsView dashboard={dashboard} />
				)}
				{activeView === 'fuel' && <FuelExpensesView dashboard={dashboard} />}
				{activeView === 'receivables' && (
					<ReceivablesView rows={dashboard.receivables} />
				)}
				{activeView === 'payables' && (
					<PayablesView rows={dashboard.payables} />
				)}
				{activeView === 'payroll' && <PayrollView dashboard={dashboard} />}
				{activeView === 'adjustments' && (
					<AdjustmentsView rows={dashboard.adjustments} />
				)}
				{activeView === 'journal' && <JournalView rows={dashboard.journal} />}
			</div>
		</div>
	)
}

function getDashboard({
	periodStart,
	periodEnd,
}: {
	periodStart: string
	periodEnd: string
}) {
	return getFinanceAccountingDashboard({
		data: {
			periodStart,
			periodEnd,
		},
	})
}

function AccountingStateMessage({
	title,
	copy,
}: {
	title: string
	copy: string
}) {
	return (
		<div className="flex h-full items-center justify-center px-5">
			<div className="max-w-[380px] text-center">
				<p className="font-[family-name:var(--font-bricolage)] text-[16px] font-semibold text-[var(--color-text)]">
					{title}
				</p>
				<p className="mt-1 font-[family-name:var(--font-bricolage)] text-[12.5px] leading-relaxed text-[var(--color-text-subtle)]">
					{copy}
				</p>
			</div>
		</div>
	)
}

function AccountingMasthead({
	dashboard,
	periodPreset,
	periodStart,
	periodEnd,
	onPeriodPresetChange,
	onPeriodStartChange,
	onPeriodEndChange,
	onBackfill,
	backfillBusy,
}: {
	dashboard: FinanceAccountingDashboard
	periodPreset: AccountingPeriodPreset
	periodStart: string
	periodEnd: string
	onPeriodPresetChange: (value: AccountingPeriodPreset) => void
	onPeriodStartChange: (value: string) => void
	onPeriodEndChange: (value: string) => void
	onBackfill: () => void
	backfillBusy: boolean
}) {
	const isCustomPeriod = periodPreset === 'custom'
	return (
		<header className="border-b border-[var(--color-border)] pb-3 sm:pb-4">
			<div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-end lg:justify-between">
				<div className="min-w-0">
					<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
						<span className="font-[family-name:var(--font-archivo)] text-[12px] font-semibold text-[var(--color-text-muted)]">
							Accounting
						</span>
						<strong className="break-words font-[family-name:var(--font-geist-mono)] text-[26px] font-semibold leading-none text-[var(--color-text)] tabular-nums sm:text-[34px]">
							{formatDecimalEgp(dashboard.overview.totalAssets)}
						</strong>
						<span className="font-[family-name:var(--font-geist-mono)] text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
							EGP total assets
						</span>
					</div>
					<p className="mt-2 hidden max-w-[620px] font-[family-name:var(--font-bricolage)] text-[12.5px] leading-relaxed text-[var(--color-text-muted)] sm:block">
						{dashboard.overview.basis}
					</p>
				</div>

				<div className="flex min-w-0 flex-col gap-2 lg:min-w-[560px]">
					<div className="flex flex-wrap items-baseline justify-between gap-2">
						<span className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
							Period
						</span>
						<span className="font-[family-name:var(--font-geist-mono)] text-[11px] text-[var(--color-text-muted)]">
							{formatDateLabel(periodStart)} to {formatDateLabel(periodEnd)}
						</span>
					</div>
					<div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
						<div className="min-w-0">
							<div className="grid grid-cols-2 gap-1 rounded-lg border border-black/[0.08] bg-black/[0.025] p-1 dark:border-white/[0.1] dark:bg-white/[0.035] sm:grid-cols-3 xl:grid-cols-6">
								{ACCOUNTING_PERIOD_PRESETS.map((preset) => {
									const active = preset.id === periodPreset
									return (
										<button
											key={preset.id}
											type="button"
											aria-pressed={active}
											onClick={() => onPeriodPresetChange(preset.id)}
											className={`min-h-9 rounded-md px-2 py-1.5 font-[family-name:var(--font-archivo)] text-[10.5px] font-semibold uppercase tracking-[0.08em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 ${
												active
													? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm dark:bg-white/[0.08]'
													: 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] dark:hover:bg-white/[0.06]'
											}`}
										>
											{preset.label}
										</button>
									)
								})}
							</div>
							{isCustomPeriod && (
								<div className="mt-2 grid grid-cols-2 gap-2">
									<label className="flex min-w-0 flex-col gap-1">
										<span className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
											From
										</span>
										<input
											type="date"
											value={periodStart}
											onChange={(event) =>
												onPeriodStartChange(event.target.value)
											}
											className="h-10 min-w-0 rounded-md border border-black/[0.1] bg-[var(--color-surface)] px-3 font-[family-name:var(--font-geist-mono)] text-[12px] text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]/55 focus:ring-2 focus:ring-[var(--color-primary)]/15 dark:border-white/[0.12]"
										/>
									</label>
									<label className="flex min-w-0 flex-col gap-1">
										<span className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
											To
										</span>
										<input
											type="date"
											value={periodEnd}
											onChange={(event) =>
												onPeriodEndChange(event.target.value)
											}
											className="h-10 min-w-0 rounded-md border border-black/[0.1] bg-[var(--color-surface)] px-3 font-[family-name:var(--font-geist-mono)] text-[12px] text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]/55 focus:ring-2 focus:ring-[var(--color-primary)]/15 dark:border-white/[0.12]"
										/>
									</label>
								</div>
							)}
						</div>
						<EmployeeActionButton
							tone="neutral"
							size="sm"
							leading={<RefreshCcw aria-hidden="true" size={14} />}
							onClick={onBackfill}
							disabled={backfillBusy}
							fullWidthOnMobile
							className="sm:min-h-10"
						>
							{backfillBusy ? 'Reconciling' : 'Reconcile'}
						</EmployeeActionButton>
					</div>
				</div>
			</div>
		</header>
	)
}

function AccountingViewStrip({
	activeView,
	dashboard,
	onSelect,
}: {
	activeView: AccountingView
	dashboard: FinanceAccountingDashboard
	onSelect: (view: AccountingView) => void
}) {
	const counts: Partial<Record<AccountingView, number>> = {
		companyAssets: dashboard.companyAssets?.length ?? 0,
		fuel: dashboard.fuelExpenses?.length ?? 0,
		payroll: dashboard.payroll.payrollDueCount,
		adjustments: dashboard.adjustments.length,
		journal: dashboard.journal.length,
	}

	return (
		<nav
			aria-label="Accounting views"
			className="sticky top-0 z-10 -mx-4 overflow-x-auto border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 px-4 py-2 backdrop-blur [-webkit-overflow-scrolling:touch] sm:-mx-6 sm:px-6 sm:py-3 lg:mx-0 lg:bg-transparent lg:px-0 xl:static xl:backdrop-blur-none"
		>
			<ul className="flex min-w-max gap-2 sm:grid sm:min-w-0 sm:grid-cols-3 lg:grid-cols-6">
				{ACCOUNTING_VIEWS.map((view) => {
					const Icon = view.icon
					const count = counts[view.id]
					const active = activeView === view.id
					return (
						<li key={view.id} className="w-[156px] shrink-0 sm:w-auto">
							<button
								type="button"
								aria-pressed={active}
								title={view.label}
								onClick={() => onSelect(view.id)}
								className={`grid h-full min-h-11 w-full grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border px-3 py-2 text-left font-[family-name:var(--font-archivo)] text-[10.5px] font-semibold uppercase tracking-[0.09em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 ${
									active
										? 'border-transparent bg-black/[0.045] text-[var(--color-text)] shadow-sm dark:bg-white/[0.06]'
										: 'border-black/[0.08] text-[var(--color-text-subtle)] hover:border-[var(--color-primary)]/35 hover:bg-[var(--color-primary)]/[0.05] hover:text-[var(--color-text)] dark:border-white/[0.1]'
								}`}
							>
								<Icon
									aria-hidden="true"
									size={14}
									className={
										active && view.id === 'journal'
											? 'text-[var(--color-primary)]'
											: ''
									}
								/>
								<span className="min-w-0 truncate">{view.label}</span>
								{typeof count === 'number' && (
									<span
										className={`min-w-6 justify-self-end rounded-md px-1.5 py-0.5 text-center font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums ${
											active
												? 'bg-[var(--color-surface)] text-current dark:bg-black/25'
												: 'bg-black/[0.05] text-[var(--color-text-muted)] dark:bg-white/[0.08]'
										}`}
									>
										{count.toLocaleString('en-US')}
									</span>
								)}
							</button>
						</li>
					)
				})}
			</ul>
		</nav>
	)
}

function OverviewView({
	dashboard,
	onSelect,
}: {
	dashboard: FinanceAccountingDashboard
	onSelect: (view: AccountingView) => void
}) {
	const balanceRows: Array<[string, number]> = [
		['Cash balance', dashboard.overview.cashBalance],
		['Inventory assets', dashboard.overview.inventoryAssets],
		['Damaged inventory', dashboard.overview.damagedInventoryAssets ?? 0],
		['Company assets', dashboard.overview.companyAssets ?? 0],
		['Receivables', dashboard.overview.receivables],
		['Total assets', dashboard.overview.totalAssets],
	]
	const obligationRows: Array<[string, number]> = [
		['Payables', dashboard.overview.payables],
		['Draft journals', dashboard.overview.unpostedCount],
		['Review required', dashboard.overview.reviewRequiredCount],
		['Cost reviews', dashboard.overview.inventoryCostReviewCount],
		['Pending fuel receipts', dashboard.overview.pendingFuelExpenseCount ?? 0],
		['Payroll due', dashboard.overview.payrollDueCount ?? 0],
	]
	const movementRows: Array<[string, number]> = [
		['Customer receipts', dashboard.cashFlow.customerReceipts],
		['Supplier payments', -dashboard.cashFlow.supplierPayments],
		['Salary payments', -(dashboard.cashFlow.salaryPayments ?? 0)],
		['Bonus payments', -(dashboard.cashFlow.bonusPayments ?? 0)],
		['Fuel expenses', -(dashboard.cashFlow.fuelExpenses ?? 0)],
		['Asset purchases', -(dashboard.cashFlow.companyAssetPurchases ?? 0)],
		['Manual cash adjustments', dashboard.cashFlow.manualCashAdjustments],
		['Net cash movement', dashboard.cashFlow.netCashMovement],
	]
	const queueRows: Array<{
		count: number
		label: string
		meta: string
		target: AccountingView
	}> = [
		{
			count: dashboard.receivables.length,
			label: 'Receivables',
			meta: formatDecimalEgp(dashboard.overview.receivables),
			target: 'receivables',
		},
		{
			count: dashboard.payables.length,
			label: 'Payables',
			meta: formatDecimalEgp(dashboard.overview.payables),
			target: 'payables',
		},
		{
			count: dashboard.payroll.payrollDueCount ?? 0,
			label: 'Payroll',
			meta: `${formatDecimalEgp(dashboard.payroll.monthlyBaseSalary)} monthly`,
			target: 'payroll',
		},
		{
			count:
				dashboard.fuelExpenses?.filter((row) => row.status === 'submitted')
					.length ?? 0,
			label: 'Fuel receipts',
			meta: formatDecimalEgp(dashboard.cashFlow.fuelExpenses ?? 0),
			target: 'fuel',
		},
		{
			count: dashboard.companyAssets?.length ?? 0,
			label: 'Company assets',
			meta: formatDecimalEgp(dashboard.overview.companyAssets ?? 0),
			target: 'companyAssets',
		},
		{
			count: dashboard.journal.length,
			label: 'Journal entries',
			meta: `${dashboard.overview.unpostedCount} draft`,
			target: 'journal',
		},
	]

	return (
		<section className="mt-4 space-y-6 sm:mt-6 sm:space-y-8">
			<div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
				<div className="space-y-6">
					<div className="grid gap-6 md:grid-cols-2">
						<AccountingPanel title="Balance sheet" meta={dashboard.period.end}>
							<LedgerRows rows={balanceRows} countLabels={COUNT_METRICS} />
						</AccountingPanel>
						<AccountingPanel title="Liability and review" meta="open">
							<LedgerRows rows={obligationRows} countLabels={COUNT_METRICS} />
						</AccountingPanel>
					</div>

					<AccountingPanel
						title="Period movement"
						meta={dashboard.period.start}
					>
						<div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
							<LedgerRows rows={movementRows} countLabels={COUNT_METRICS} />
							<div className="border-t border-[var(--color-border)] pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-5">
								<p className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
									Net business performance
								</p>
								<p className="mt-2 break-words font-[family-name:var(--font-geist-mono)] text-[22px] font-semibold tabular-nums text-[var(--color-text)]">
									{dashboard.incomeStatement.netPerformance === null
										? 'Review'
										: formatDecimalEgp(
												dashboard.incomeStatement.netPerformance,
											)}
								</p>
							</div>
						</div>
					</AccountingPanel>
				</div>

				<AccountingPanel title="Work queue" meta="current">
					<div className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
						{queueRows.map((row) => (
							<button
								key={row.label}
								type="button"
								onClick={() => onSelect(row.target)}
								className="grid w-full grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 py-3 text-left outline-none transition-colors hover:bg-black/[0.025] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/25 dark:hover:bg-white/[0.04]"
							>
								<span className="font-[family-name:var(--font-geist-mono)] text-[20px] font-semibold tabular-nums text-[var(--color-text)]">
									{row.count}
								</span>
								<span className="min-w-0">
									<span className="block break-words font-[family-name:var(--font-bricolage)] text-[13px] font-semibold text-[var(--color-text)]">
										{row.label}
									</span>
									<span className="mt-0.5 block break-words font-[family-name:var(--font-geist-mono)] text-[11px] text-[var(--color-text-subtle)]">
										{row.meta}
									</span>
								</span>
								<span className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
									Open
								</span>
							</button>
						))}
					</div>
				</AccountingPanel>
			</div>

			<div className="grid gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
				<AccountingPanel
					title="Inventory asset register"
					meta={`${dashboard.inventoryAssets.length} rows`}
				>
					<InventoryPreview
						rows={dashboard.inventoryAssets}
						onOpen={() => onSelect('inventory')}
					/>
				</AccountingPanel>
				<AccountingPanel
					title="Journal activity"
					meta={`${dashboard.journal.length} entries`}
				>
					<JournalPreview
						rows={dashboard.journal}
						onOpen={() => onSelect('journal')}
					/>
				</AccountingPanel>
			</div>
		</section>
	)
}

function AccountingPanel({
	children,
	meta,
	title,
}: {
	children: ReactNode
	meta?: string
	title: string
}) {
	return (
		<section>
			<SectionHeader title={title} meta={meta} />
			<div className="mt-3">{children}</div>
		</section>
	)
}

function LedgerRows({
	countLabels,
	rows,
}: {
	countLabels: Set<string>
	rows: Array<[string, number]>
}) {
	return (
		<div className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
			{rows.map(([label, value], index) => {
				const isLast = index === rows.length - 1
				return (
					<div
						key={label}
						className={`grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-3 ${
							isLast ? 'ledger-double-rule' : ''
						}`}
					>
						<span className="break-words font-[family-name:var(--font-bricolage)] text-[13px] text-[var(--color-text-muted)]">
							{label}
						</span>
						<span
							className={`font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums text-[var(--color-text)] ${
								isLast ? 'font-semibold' : ''
							}`}
						>
							{countLabels.has(label)
								? value.toString()
								: formatDecimalEgp(value)}
						</span>
					</div>
				)
			})}
		</div>
	)
}

function InventoryPreview({
	onOpen,
	rows,
}: {
	onOpen: () => void
	rows: FinanceAccountingInventoryAsset[]
}) {
	const previewRows = rows.slice(0, 5)
	if (previewRows.length === 0) {
		return (
			<div>
				<EmptyRows label="No stock assets" />
				<OpenSectionButton onClick={onOpen}>Open inventory</OpenSectionButton>
			</div>
		)
	}
	return (
		<div>
			<div className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
				{previewRows.map((row) => (
					<div
						key={`${row.productId}:${row.lotId ?? 'good'}`}
						className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
					>
						<div className="min-w-0">
							<p className="break-words font-[family-name:var(--font-bricolage)] text-[13px] font-semibold text-[var(--color-text)]">
								{row.productName}
							</p>
							<p className="mt-0.5 font-[family-name:var(--font-geist-mono)] text-[11px] text-[var(--color-text-subtle)]">
								{row.sku} · {formatQuantity(row.onHand)}{' '}
								{row.condition === 'damaged' ? 'damaged' : 'on hand'}
							</p>
						</div>
						<span className="font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums text-[var(--color-text)]">
							{formatDecimalEgp(row.valuation)}
						</span>
					</div>
				))}
			</div>
			<OpenSectionButton onClick={onOpen}>Open inventory</OpenSectionButton>
		</div>
	)
}

function JournalPreview({
	onOpen,
	rows,
}: {
	onOpen: () => void
	rows: FinanceAccountingJournalEntry[]
}) {
	const previewRows = rows.slice(0, 4)
	if (previewRows.length === 0) {
		return (
			<div>
				<EmptyRows label="No journal entries" />
				<OpenSectionButton onClick={onOpen}>Open journal</OpenSectionButton>
			</div>
		)
	}
	return (
		<div>
			<div className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
				{previewRows.map((entry) => {
					const total = entry.lines.reduce((sum, line) => sum + line.debit, 0)
					return (
						<div
							key={entry.id}
							className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
						>
							<div className="min-w-0">
								<p className="break-words font-[family-name:var(--font-bricolage)] text-[13px] font-semibold text-[var(--color-text)]">
									{entry.description}
								</p>
								<p className="mt-0.5 font-[family-name:var(--font-geist-mono)] text-[11px] text-[var(--color-text-subtle)]">
									{entry.entryNumber} · {entry.status}
								</p>
							</div>
							<span className="font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums text-[var(--color-text)]">
								{formatDecimalEgp(total)}
							</span>
						</div>
					)
				})}
			</div>
			<OpenSectionButton onClick={onOpen}>Open journal</OpenSectionButton>
		</div>
	)
}

function OpenSectionButton({
	children,
	onClick,
}: {
	children: ReactNode
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="mt-3 font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)] outline-none hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/25"
		>
			{children}
		</button>
	)
}

function MetricGrid({ metrics }: { metrics: Array<[string, number]> }) {
	return (
		<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{metrics.map(([label, value]) => (
				<div
					key={label}
					className="rounded-md border border-[var(--color-border)] px-4 py-4"
				>
					<p className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
						{label}
					</p>
					<p className="mt-2 font-[family-name:var(--font-geist-mono)] text-[22px] font-semibold tabular-nums text-[var(--color-text)]">
						{COUNT_METRICS.has(label)
							? value.toString()
							: formatDecimalEgp(value)}
					</p>
				</div>
			))}
		</div>
	)
}

function IncomeView({
	dashboard,
	compact = false,
}: {
	dashboard: FinanceAccountingDashboard
	compact?: boolean
}) {
	const net = dashboard.incomeStatement.netPerformance
	return (
		<section className={compact ? '' : 'mt-6'}>
			<SectionHeader title="Income statement" meta={dashboard.period.start} />
			<StatementRows
				rows={[
					['Posted revenue', dashboard.incomeStatement.revenue],
					['Posted expenses', dashboard.incomeStatement.expenses],
				]}
			/>
			<div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-3">
				<span className="font-[family-name:var(--font-bricolage)] text-[13px] font-semibold text-[var(--color-text)]">
					Net business performance
				</span>
				<span className="font-[family-name:var(--font-geist-mono)] text-[18px] font-semibold tabular-nums text-[var(--color-text)]">
					{net === null ? 'Requires sign-off' : formatDecimalEgp(net)}
				</span>
			</div>
		</section>
	)
}

function CashFlowView({
	dashboard,
	compact = false,
}: {
	dashboard: FinanceAccountingDashboard
	compact?: boolean
}) {
	return (
		<section className={compact ? '' : 'mt-6'}>
			<SectionHeader title="Cash flow" meta={dashboard.period.end} />
			<StatementRows
				rows={[
					['Customer receipts', dashboard.cashFlow.customerReceipts],
					['Supplier payments', -dashboard.cashFlow.supplierPayments],
					['Salary payments', -(dashboard.cashFlow.salaryPayments ?? 0)],
					['Bonus payments', -(dashboard.cashFlow.bonusPayments ?? 0)],
					['Fuel expenses', -(dashboard.cashFlow.fuelExpenses ?? 0)],
					[
						'Company asset purchases',
						-(dashboard.cashFlow.companyAssetPurchases ?? 0),
					],
					['Manual cash adjustments', dashboard.cashFlow.manualCashAdjustments],
					['Net cash movement', dashboard.cashFlow.netCashMovement],
				]}
			/>
		</section>
	)
}

function StatementRows({ rows }: { rows: Array<[string, number]> }) {
	return (
		<div className="mt-3 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
			{rows.map(([label, value]) => (
				<div
					key={label}
					className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-3"
				>
					<span className="font-[family-name:var(--font-bricolage)] text-[13px] text-[var(--color-text-muted)]">
						{label}
					</span>
					<span className="font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums text-[var(--color-text)]">
						{formatDecimalEgp(value)}
					</span>
				</div>
			))}
		</div>
	)
}

function InventoryAssetsView({
	rows,
}: {
	rows: FinanceAccountingInventoryAsset[]
}) {
	return (
		<section className="mt-6">
			<SectionHeader title="Inventory assets" meta={`${rows.length} rows`} />
			{rows.length === 0 ? (
				<EmptyRows label="No stock assets in this view" />
			) : (
				<div className="mt-3 overflow-x-auto">
					<table className="min-w-full border-y border-[var(--color-border)] text-left">
						<thead>
							<tr className="font-[family-name:var(--font-archivo)] text-[10px] uppercase tracking-[0.1em] text-[var(--color-text-subtle)]">
								<th className="py-2 pr-4 font-semibold">SKU</th>
								<th className="py-2 pr-4 font-semibold">Product</th>
								<th className="py-2 pr-4 text-right font-semibold">On hand</th>
								<th className="py-2 pr-4 text-right font-semibold">Reserved</th>
								<th className="py-2 pr-4 text-right font-semibold">
									Unit cost
								</th>
								<th className="py-2 pr-4 text-right font-semibold">Value</th>
								<th className="py-2 pr-4 font-semibold">Basis</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--color-border)]">
							{rows.map((row) => (
								<tr
									key={`${row.productId}:${row.lotId ?? 'good'}`}
									className="text-[12.5px]"
								>
									<td className="py-3 pr-4 font-[family-name:var(--font-geist-mono)] text-[var(--color-text)]">
										{row.sku}
									</td>
									<td className="py-3 pr-4 font-[family-name:var(--font-bricolage)] text-[var(--color-text)]">
										{row.productName}
									</td>
									<QuantityCell value={row.onHand} />
									<QuantityCell value={row.reserved} />
									<MoneyCell value={row.unitCost} />
									<MoneyCell value={row.valuation} strong />
									<td className="py-3 pr-4">
										<EmployeeStatusPill
											tone={
												row.condition === 'damaged'
													? 'warning'
													: row.needsCostReview
														? 'warning'
														: 'success'
											}
											className="px-2 py-1 text-[11px]"
										>
											{row.condition === 'damaged'
												? (row.damageNumber ?? 'Damaged NRV')
												: row.needsCostReview
													? 'Needs cost review'
													: (row.supplierName ?? 'Supplier cost')}
										</EmployeeStatusPill>
										{row.condition === 'damaged' && row.writeDownAmount ? (
											<p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[10.5px] text-[var(--color-text-subtle)]">
												write-down {formatDecimalEgp(row.writeDownAmount)}
											</p>
										) : null}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</section>
	)
}

function ReceivablesView({ rows }: { rows: FinanceAccountingReceivable[] }) {
	return (
		<section className="mt-6">
			<SectionHeader title="Receivables" meta={`${rows.length} open`} />
			{rows.length === 0 ? (
				<EmptyRows label="No receivables in this view" />
			) : (
				<div className="mt-3 overflow-x-auto">
					<table className="min-w-full border-y border-[var(--color-border)] text-left">
						<thead>
							<tr className="font-[family-name:var(--font-archivo)] text-[10px] uppercase tracking-[0.1em] text-[var(--color-text-subtle)]">
								<th className="py-2 pr-4 font-semibold">Order</th>
								<th className="py-2 pr-4 font-semibold">Customer</th>
								<th className="py-2 pr-4 text-right font-semibold">Total</th>
								<th className="py-2 pr-4 text-right font-semibold">Paid</th>
								<th className="py-2 pr-4 text-right font-semibold">
									Remaining
								</th>
								<th className="py-2 pr-4 font-semibold">State</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--color-border)]">
							{rows.map((row) => (
								<tr key={row.orderId} className="text-[12.5px]">
									<td className="py-3 pr-4 font-[family-name:var(--font-geist-mono)] text-[var(--color-text)]">
										{row.orderNumber}
									</td>
									<td className="py-3 pr-4 font-[family-name:var(--font-bricolage)] text-[var(--color-text)]">
										{row.customerName}
									</td>
									<MoneyCell value={row.total} />
									<MoneyCell value={row.paid} />
									<MoneyCell value={row.remaining} strong />
									<td className="py-3 pr-4">
										<EmployeeStatusPill
											tone={row.isDelivered ? 'warning' : 'neutral'}
											className="px-2 py-1 text-[11px]"
										>
											{row.status} · {row.ageDays}d
										</EmployeeStatusPill>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</section>
	)
}

function PayablesView({ rows }: { rows: FinanceAccountingPayable[] }) {
	return (
		<section className="mt-6">
			<SectionHeader title="Payables" meta={`${rows.length} open`} />
			{rows.length === 0 ? (
				<EmptyRows label="No payables in this view" />
			) : (
				<div className="mt-3 overflow-x-auto">
					<table className="min-w-full border-y border-[var(--color-border)] text-left">
						<thead>
							<tr className="font-[family-name:var(--font-archivo)] text-[10px] uppercase tracking-[0.1em] text-[var(--color-text-subtle)]">
								<th className="py-2 pr-4 font-semibold">Supplier</th>
								<th className="py-2 pr-4 font-semibold">Product</th>
								<th className="py-2 pr-4 text-right font-semibold">Total</th>
								<th className="py-2 pr-4 text-right font-semibold">Paid</th>
								<th className="py-2 pr-4 text-right font-semibold">
									Remaining
								</th>
								<th className="py-2 pr-4 font-semibold">State</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--color-border)]">
							{rows.map((row) => (
								<tr key={row.refillRequestId} className="text-[12.5px]">
									<td className="py-3 pr-4 font-[family-name:var(--font-bricolage)] text-[var(--color-text)]">
										{row.supplierName}
									</td>
									<td className="py-3 pr-4 font-[family-name:var(--font-bricolage)] text-[var(--color-text-muted)]">
										{row.productName}
									</td>
									<MoneyCell value={row.total} />
									<MoneyCell value={row.paid} />
									<MoneyCell value={row.remaining} strong />
									<td className="py-3 pr-4">
										<EmployeeStatusPill className="px-2 py-1 text-[11px]">
											{row.status} · {row.ageDays}d
										</EmployeeStatusPill>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</section>
	)
}

function PayrollView({ dashboard }: { dashboard: FinanceAccountingDashboard }) {
	const periodMonth = dashboard.payroll.periodMonth ?? dashboard.period.start
	const payroll = dashboard.payroll
	return (
		<section className="mt-6">
			<SectionHeader
				title="Payroll"
				meta={`${payroll.employeeCount} employees · ${periodMonth}`}
			/>
			<MetricGrid
				metrics={[
					['Monthly base salary', payroll.monthlyBaseSalary],
					['Social insurance salary', payroll.monthlySocialInsuranceSalary],
					['Salary paid', payroll.salaryPaidThisPeriod ?? 0],
					['Bonus paid', payroll.bonusPaidThisPeriod ?? 0],
					['Payroll due', payroll.payrollDueCount ?? 0],
				]}
			/>
			{payroll.canViewDetail ? (
				<div className="mt-5 space-y-4">
					{payroll.details.map((employee) => (
						<PayrollEmployeeRow
							key={employee.employeeId}
							employee={employee}
							periodMonth={periodMonth}
						/>
					))}
				</div>
			) : (
				<EmptyRows label="Salary detail is restricted" />
			)}
		</section>
	)
}

function PayrollEmployeeRow({
	employee,
	periodMonth,
}: {
	employee: FinanceAccountingDashboard['payroll']['details'][number]
	periodMonth: string
}) {
	const queryClient = useQueryClient()
	const [baseSalary, setBaseSalary] = useState(String(employee.baseSalary ?? 0))
	const [socialSalary, setSocialSalary] = useState(
		String(employee.socialInsuranceSalary ?? 0),
	)
	const [salaryProof, setSalaryProof] = useState<UploadedProofDocument | null>(
		null,
	)
	const [payProof, setPayProof] = useState<UploadedProofDocument | null>(null)
	const [bonusAmount, setBonusAmount] = useState('')
	const [bonusReason, setBonusReason] = useState('')
	const [bonusProof, setBonusProof] = useState<UploadedProofDocument | null>(
		null,
	)
	const { confirmAction, confirmationDialog } = useFinanceActionConfirmation()

	const invalidate = () =>
		queryClient.invalidateQueries({ queryKey: ['finance-accounting'] })
	const updateMutation = useMutation({
		mutationFn: () =>
			updateEmployeeCompensation({
				data: {
					baseSalary: Number(baseSalary),
					currency: 'EGP',
					department: employee.department ?? undefined,
					employeeId: employee.employeeId,
					proofDocumentId: proofDocumentIdValue(salaryProof),
					proofPath: proofPathValue(salaryProof),
					socialInsuranceSalary: Number(socialSalary || 0),
					title: employee.title ?? undefined,
				},
			}),
		onSuccess: () => {
			setSalaryProof(null)
			invalidate()
		},
	})
	const salaryMutation = useMutation({
		mutationFn: () =>
			payEmployeeSalary({
				data: {
					employeeId: employee.employeeId,
					periodMonth,
					proofDocumentId: proofDocumentIdValue(payProof),
					proofPath: proofPathValue(payProof),
				},
			}),
		onSuccess: () => {
			setPayProof(null)
			invalidate()
		},
	})
	const bonusMutation = useMutation({
		mutationFn: () =>
			payEmployeeBonus({
				data: {
					amount: Number(bonusAmount),
					employeeId: employee.employeeId,
					periodMonth,
					proofDocumentId: proofDocumentIdValue(bonusProof),
					proofPath: proofPathValue(bonusProof),
					reason: bonusReason.trim(),
				},
			}),
		onSuccess: () => {
			setBonusAmount('')
			setBonusReason('')
			setBonusProof(null)
			invalidate()
		},
	})

	const configuredSalary = Number(baseSalary) > 0
	const canUpdate =
		Number(baseSalary) >= 0 &&
		Number(socialSalary || 0) >= 0 &&
		salaryProof !== null
	const canPay =
		configuredSalary && !employee.salaryPaidThisMonth && payProof !== null
	const canBonus =
		Number(bonusAmount) > 0 &&
		bonusReason.trim().length >= 3 &&
		bonusProof !== null

	return (
		<article className="rounded-md border border-[var(--color-border)] p-4">
			<div className="grid gap-4 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)]">
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-2">
						<p className="break-words font-[family-name:var(--font-bricolage)] text-[14px] font-semibold text-[var(--color-text)]">
							{employee.employeeName}
						</p>
						<EmployeeStatusPill
							tone={employee.salaryPaidThisMonth ? 'success' : 'warning'}
							className="px-2 py-1 text-[11px]"
						>
							{employee.salaryPaidThisMonth ? 'Paid' : 'Due'}
						</EmployeeStatusPill>
					</div>
					<p className="mt-1 break-words font-[family-name:var(--font-bricolage)] text-[12px] text-[var(--color-text-muted)]">
						{[employee.department, employee.title]
							.filter(Boolean)
							.join(' · ') || 'No department set'}
					</p>
					<div className="mt-4 grid gap-2 font-[family-name:var(--font-geist-mono)] text-[12px] text-[var(--color-text)]">
						<span>Base {formatDecimalEgp(employee.baseSalary ?? 0)}</span>
						<span>
							Social {formatDecimalEgp(employee.socialInsuranceSalary ?? 0)}
						</span>
						<span>
							Bonus paid {formatDecimalEgp(employee.bonusPaidThisMonth ?? 0)}
						</span>
					</div>
				</div>

				<div className="grid gap-3">
					<div className="grid gap-2 md:grid-cols-[120px_120px_auto]">
						<input
							value={baseSalary}
							onChange={(event) => setBaseSalary(event.target.value)}
							inputMode="decimal"
							placeholder="Base salary"
							className={MONEY_INPUT_CLASS}
						/>
						<input
							value={socialSalary}
							onChange={(event) => setSocialSalary(event.target.value)}
							inputMode="decimal"
							placeholder="Social salary"
							className={MONEY_INPUT_CLASS}
						/>
						<EmployeeActionButton
							size="sm"
							tone="neutral"
							onClick={() => {
								confirmAction({
									confirmLabel: 'Update',
									message: `Update salary for ${employee.employeeName}?`,
									onConfirm: () => updateMutation.mutate(),
									title: 'Update salary',
								})
							}}
							disabled={!canUpdate || updateMutation.isPending}
						>
							{updateMutation.isPending ? 'Saving' : 'Update'}
						</EmployeeActionButton>
					</div>
					<ProofUploadField
						className="mt-0"
						label="Salary-change proof"
						note="Upload approval, contract change, or HR sign-off under 1 MB."
						value={salaryProof}
						onChange={setSalaryProof}
						panel="finance"
						proofType="advisor_signoff"
						relatedEntityId={employee.employeeId}
						relatedEntityType="employee_compensation"
						title={`Salary-change proof · ${employee.employeeName}`}
					/>

					<div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_96px] md:items-end">
						<ProofUploadField
							className="mt-0"
							label="Salary payment proof"
							note="Upload transfer receipt, cash voucher, or bank proof under 1 MB."
							value={payProof}
							onChange={setPayProof}
							panel="finance"
							proofType="finance_out"
							relatedEntityId={employee.employeeId}
							relatedEntityType="employee_salary_payment"
							title={`Salary payment proof · ${employee.employeeName}`}
						/>
						<EmployeeActionButton
							size="sm"
							tone="success"
							leading={<Banknote aria-hidden="true" size={14} />}
							onClick={() => {
								confirmAction({
									confirmLabel: 'PAY',
									message: `Pay salary for ${employee.employeeName} for ${periodMonth}?`,
									onConfirm: () => salaryMutation.mutate(),
									title: 'Pay salary',
								})
							}}
							disabled={!canPay || salaryMutation.isPending}
						>
							{salaryMutation.isPending ? 'Paying' : 'PAY'}
						</EmployeeActionButton>
					</div>
					<div className="grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)]">
						<input
							value={bonusAmount}
							onChange={(event) => setBonusAmount(event.target.value)}
							inputMode="decimal"
							placeholder="Bonus amount"
							className={MONEY_INPUT_CLASS}
						/>
						<input
							value={bonusReason}
							onChange={(event) => setBonusReason(event.target.value)}
							placeholder="Bonus reason"
							className={COMPACT_INPUT_CLASS}
						/>
					</div>
					<div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
						<ProofUploadField
							className="mt-0"
							label="Bonus proof"
							note="Upload bonus approval, transfer receipt, or voucher under 1 MB."
							value={bonusProof}
							onChange={setBonusProof}
							panel="finance"
							proofType="finance_out"
							relatedEntityId={employee.employeeId}
							relatedEntityType="employee_bonus_payment"
							title={`Bonus proof · ${employee.employeeName}`}
						/>
						<EmployeeActionButton
							size="sm"
							tone="primary"
							leading={<Gift aria-hidden="true" size={14} />}
							onClick={() => {
								confirmAction({
									confirmLabel: 'Bonus',
									message: `Record ${formatDecimalEgp(Number(bonusAmount))} bonus for ${employee.employeeName}?`,
									onConfirm: () => bonusMutation.mutate(),
									title: 'Record bonus',
								})
							}}
							disabled={!canBonus || bonusMutation.isPending}
						>
							{bonusMutation.isPending ? 'Saving' : 'Bonus'}
						</EmployeeActionButton>
					</div>
					<MutationError
						error={
							updateMutation.error ??
							salaryMutation.error ??
							bonusMutation.error
						}
					/>
				</div>
			</div>
			{confirmationDialog}
		</article>
	)
}

function FuelExpensesView({
	dashboard,
}: {
	dashboard: FinanceAccountingDashboard
}) {
	const rows = dashboard.fuelExpenses ?? []
	return (
		<section className="mt-6">
			<SectionHeader title="Fuel expenses" meta={`${rows.length} receipts`} />
			<MetricGrid
				metrics={[
					[
						'Pending fuel receipts',
						rows.filter((row) => row.status === 'submitted').length,
					],
					['Fuel expenses', dashboard.cashFlow.fuelExpenses ?? 0],
				]}
			/>
			{rows.length === 0 ? (
				<EmptyRows label="No fuel receipts in this view" />
			) : (
				<div className="mt-5 grid gap-4 lg:grid-cols-2">
					{rows.map((row) => (
						<FuelExpenseRow key={row.id} row={row} />
					))}
				</div>
			)}
		</section>
	)
}

function FuelExpenseRow({ row }: { row: FinanceAccountingFuelExpense }) {
	const queryClient = useQueryClient()
	const [amount, setAmount] = useState(String(row.amount ?? ''))
	const [proofDocument, setProofDocument] =
		useState<UploadedProofDocument | null>(null)
	const [note, setNote] = useState('')
	const { confirmAction, confirmationDialog } = useFinanceActionConfirmation()
	const mutation = useMutation({
		mutationFn: () =>
			postTruckFuelExpense({
				data: {
					amount: Number(amount),
					expenseId: row.id,
					note: note.trim() || undefined,
					proofDocumentId: proofDocumentIdValue(proofDocument),
					proofPath: proofPathValue(proofDocument),
				},
			}),
		onSuccess: () => {
			setProofDocument(null)
			setNote('')
			queryClient.invalidateQueries({ queryKey: ['finance-accounting'] })
		},
	})
	const rejectMutation = useMutation({
		mutationFn: () =>
			rejectTruckFuelExpense({
				data: {
					expenseId: row.id,
					proofDocumentId: proofDocumentIdValue(proofDocument),
					proofPath: proofPathValue(proofDocument),
					reason: note.trim(),
				},
			}),
		onSuccess: () => {
			setProofDocument(null)
			setNote('')
			queryClient.invalidateQueries({ queryKey: ['finance-accounting'] })
		},
	})
	const canPost = row.status === 'submitted' && Number(amount) > 0
	const canReject =
		row.status === 'submitted' &&
		note.trim().length >= 3 &&
		proofDocument !== null
	const isBusy = mutation.isPending || rejectMutation.isPending

	return (
		<article className="rounded-md border border-[var(--color-border)] p-4">
			<div className="grid gap-3 sm:grid-cols-[112px_minmax(0,1fr)]">
				<img
					src={row.receiptImageDataUrl}
					alt=""
					className="h-28 w-full rounded-md border border-[var(--color-border)] object-cover sm:h-24"
				/>
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-2">
						<p className="break-words font-[family-name:var(--font-bricolage)] text-[13px] font-semibold text-[var(--color-text)]">
							{row.truckPlate ?? 'Truck'} · {row.driverName ?? 'Driver'}
						</p>
						<EmployeeStatusPill
							tone={
								row.status === 'posted'
									? 'success'
									: row.status === 'rejected'
										? 'danger'
										: 'warning'
							}
							className="px-2 py-1 text-[11px]"
						>
							{row.status}
						</EmployeeStatusPill>
					</div>
					<p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[11px] text-[var(--color-text-subtle)]">
						{row.expenseDate}
						{row.fuelLiters ? ` · ${formatQuantity(row.fuelLiters)} L` : ''}
						{row.odometerKm ? ` · ${formatQuantity(row.odometerKm)} km` : ''}
					</p>
					{row.note && (
						<p className="mt-2 break-words font-[family-name:var(--font-bricolage)] text-[12px] text-[var(--color-text-muted)]">
							{row.note}
						</p>
					)}
				</div>
			</div>
			{row.status === 'submitted' ? (
				<div className="mt-4 space-y-2">
					<div className="grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)_auto_auto]">
						<input
							value={amount}
							onChange={(event) => setAmount(event.target.value)}
							inputMode="decimal"
							placeholder="Amount"
							className={MONEY_INPUT_CLASS}
						/>
						<input
							value={note}
							onChange={(event) => setNote(event.target.value)}
							placeholder="Finance note or cancel reason"
							className={COMPACT_INPUT_CLASS}
						/>
						<EmployeeActionButton
							size="sm"
							tone="success"
							leading={<Fuel aria-hidden="true" size={14} />}
							onClick={() => {
								confirmAction({
									confirmLabel: 'Post',
									message: `Record fuel expense for ${row.truckPlate ?? 'truck'}?`,
									onConfirm: () => mutation.mutate(),
									title: 'Post fuel expense',
								})
							}}
							disabled={!canPost || isBusy}
						>
							{mutation.isPending ? 'Posting' : 'Post'}
						</EmployeeActionButton>
						<EmployeeActionButton
							size="sm"
							tone="danger"
							leading={<Ban aria-hidden="true" size={14} />}
							onClick={() => {
								confirmAction({
									confirmLabel: 'Cancel',
									message: `Cancel fuel expense from ${row.driverName ?? 'driver'}?`,
									onConfirm: () => rejectMutation.mutate(),
									title: 'Cancel fuel expense',
									tone: 'danger',
								})
							}}
							disabled={!canReject || isBusy}
						>
							{rejectMutation.isPending ? 'Canceling' : 'Cancel'}
						</EmployeeActionButton>
					</div>
					<ProofUploadField
						className="mt-0"
						label="Extra fuel proof"
						note="Upload extra finance proof, rejection support, or receipt supplement under 1 MB."
						value={proofDocument}
						onChange={setProofDocument}
						panel="finance"
						proofType="finance_out"
						relatedEntityId={row.id}
						relatedEntityType="truck_fuel_expense"
						title={`Fuel proof · ${row.truckPlate ?? row.driverName ?? 'Fuel expense'}`}
					/>
					<MutationError error={mutation.error ?? rejectMutation.error} />
				</div>
			) : (
				<p className="mt-4 font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold text-[var(--color-text)]">
					{formatDecimalEgp(row.amount ?? 0)}
				</p>
			)}
			{confirmationDialog}
		</article>
	)
}

function CompanyAssetsView({
	dashboard,
}: {
	dashboard: FinanceAccountingDashboard
}) {
	const rows = dashboard.companyAssets ?? []
	const queryClient = useQueryClient()
	const [assetType, setAssetType] =
		useState<FinanceAccountingCompanyAsset['assetType']>('truck')
	const [fundingSource, setFundingSource] = useState('cash_purchase')
	const [name, setName] = useState('')
	const [cost, setCost] = useState('')
	const [date, setDate] = useState(todayInputValue)
	const [location, setLocation] = useState('')
	const [proofDocument, setProofDocument] =
		useState<UploadedProofDocument | null>(null)
	const [notes, setNotes] = useState('')
	const mutation = useMutation({
		mutationFn: () =>
			recordCompanyAsset({
				data: {
					acquisitionCost: Number(cost),
					acquisitionDate: date,
					assetType: assetType as
						| 'building'
						| 'vehicle'
						| 'truck'
						| 'equipment'
						| 'furniture'
						| 'technology'
						| 'other',
					fundingSource: fundingSource as
						| 'cash_purchase'
						| 'opening_balance'
						| 'owner_contribution',
					location: location.trim() || undefined,
					name,
					notes: notes.trim() || undefined,
					proofDocumentId: proofDocumentIdValue(proofDocument),
					proofPath: proofPathValue(proofDocument),
				},
			}),
		onSuccess: () => {
			setName('')
			setCost('')
			setLocation('')
			setProofDocument(null)
			setNotes('')
			queryClient.invalidateQueries({ queryKey: ['finance-accounting'] })
		},
	})
	const canSubmit =
		name.trim().length >= 2 && Number(cost) > 0 && proofDocument !== null

	return (
		<section className="mt-6">
			<SectionHeader
				title="Company assets"
				meta={`${rows.length} assets · ${formatDecimalEgp(
					dashboard.overview.companyAssets ?? 0,
				)}`}
			/>
			<form
				className="mt-3 grid gap-3 rounded-md border border-[var(--color-border)] p-4 lg:grid-cols-[130px_150px_minmax(0,1fr)_130px]"
				onSubmit={(event) => {
					event.preventDefault()
					if (canSubmit) mutation.mutate()
				}}
			>
				<select
					value={assetType}
					onChange={(event) => setAssetType(event.target.value)}
					className={SELECT_CLASS}
				>
					<option value="truck">Truck</option>
					<option value="vehicle">Vehicle</option>
					<option value="building">Building</option>
					<option value="equipment">Equipment</option>
					<option value="furniture">Furniture</option>
					<option value="technology">Technology</option>
					<option value="other">Other</option>
				</select>
				<select
					value={fundingSource}
					onChange={(event) => setFundingSource(event.target.value)}
					className={SELECT_CLASS}
				>
					<option value="cash_purchase">Cash purchase</option>
					<option value="opening_balance">Opening balance</option>
					<option value="owner_contribution">Owner contribution</option>
				</select>
				<input
					value={name}
					onChange={(event) => setName(event.target.value)}
					placeholder="Asset name"
					className={COMPACT_INPUT_CLASS}
				/>
				<input
					value={cost}
					onChange={(event) => setCost(event.target.value)}
					inputMode="decimal"
					placeholder="Cost"
					className={MONEY_INPUT_CLASS}
				/>
				<input
					type="date"
					value={date}
					onChange={(event) => setDate(event.target.value)}
					className={COMPACT_INPUT_CLASS}
				/>
				<input
					value={location}
					onChange={(event) => setLocation(event.target.value)}
					placeholder="Location"
					className={COMPACT_INPUT_CLASS}
				/>
				<ProofUploadField
					className="mt-0 lg:col-span-2"
					label="Asset proof"
					note="Upload purchase invoice, ownership proof, or opening balance support under 1 MB."
					value={proofDocument}
					onChange={setProofDocument}
					panel="finance"
					proofType="finance_out"
					relatedEntityType="company_asset"
					title={`Company asset proof · ${name.trim() || 'New asset'}`}
				/>
				<EmployeeActionButton
					type="submit"
					size="sm"
					leading={<Building2 aria-hidden="true" size={14} />}
					disabled={!canSubmit || mutation.isPending}
				>
					{mutation.isPending ? 'Recording' : 'Record'}
				</EmployeeActionButton>
				<input
					value={notes}
					onChange={(event) => setNotes(event.target.value)}
					placeholder="Notes"
					className={`${COMPACT_INPUT_CLASS} lg:col-span-4`}
				/>
				<MutationError error={mutation.error} className="lg:col-span-4" />
			</form>
			{rows.length === 0 ? (
				<EmptyRows label="No company assets recorded" />
			) : (
				<div className="mt-5 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
					{rows.map((row) => (
						<div
							key={row.id}
							className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_140px_150px] sm:items-center"
						>
							<div className="min-w-0">
								<p className="break-words font-[family-name:var(--font-bricolage)] text-[13px] font-semibold text-[var(--color-text)]">
									{row.name}
								</p>
								<p className="mt-0.5 font-[family-name:var(--font-geist-mono)] text-[11px] text-[var(--color-text-subtle)]">
									{row.assetNumber} · {row.assetType} · {row.fundingSource}
								</p>
							</div>
							<span className="font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums text-[var(--color-text)]">
								{formatDecimalEgp(row.carryingValue)}
							</span>
							<EmployeeStatusPill
								tone={row.status === 'active' ? 'success' : 'neutral'}
								className="w-fit px-2 py-1 text-[11px]"
							>
								{row.status}
							</EmployeeStatusPill>
						</div>
					))}
				</div>
			)}
		</section>
	)
}

function AdjustmentsView({ rows }: { rows: FinanceAccountingAdjustment[] }) {
	const queryClient = useQueryClient()
	const [adjustmentType, setAdjustmentType] =
		useState<AdjustmentType>('company_expense')
	const [category, setCategory] = useState(
		firstAdjustmentCategory('company_expense'),
	)
	const [amount, setAmount] = useState('')
	const [proofDocument, setProofDocument] =
		useState<UploadedProofDocument | null>(null)
	const categoryOptions = ADJUSTMENT_CATEGORY_OPTIONS[adjustmentType]
	const selectedCategory =
		categoryOptions.find((option) => option.id === category) ??
		categoryOptions[0]
	const selectedType = adjustmentTypeCopy(adjustmentType)
	const amountValue = Number(amount)
	const amountPreview =
		amountValue > 0 ? formatDecimalEgp(amountValue) : 'Enter amount'

	const createMutation = useMutation({
		mutationFn: () =>
			createFinanceAdjustment({
				data: {
					adjustmentType,
					category: selectedCategory?.label ?? category,
					description: selectedCategory?.description ?? '',
					amount: Number(amount),
					proofDocumentId: proofDocumentIdValue(proofDocument),
					proofPath: proofPathValue(proofDocument),
				},
			}),
		onSuccess: () => {
			setCategory(firstAdjustmentCategory(adjustmentType))
			setAmount('')
			setProofDocument(null)
			queryClient.invalidateQueries({ queryKey: ['finance-accounting'] })
		},
	})

	const canSubmit =
		!!selectedCategory && Number(amount) > 0 && proofDocument !== null

	return (
		<section className="mt-6">
			<SectionHeader title="Adjustments" meta={`${rows.length} records`} />
			<form
				className="mt-4 border-y border-[var(--color-border)] py-4"
				onSubmit={(event) => {
					event.preventDefault()
					if (canSubmit) createMutation.mutate()
				}}
			>
				<div className="grid gap-4">
					<div>
						<div className="mb-2 flex flex-wrap items-end justify-between gap-2">
							<p className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
								Adjustment type
							</p>
							<p className="max-w-[560px] font-[family-name:var(--font-bricolage)] text-[12px] leading-relaxed text-[var(--color-text-muted)]">
								{selectedType?.note}
							</p>
						</div>
						<div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
							{ADJUSTMENT_TYPES.map((type) => {
								const active = type.id === adjustmentType
								return (
									<button
										key={type.id}
										type="button"
										aria-pressed={active}
										onClick={() => {
											setAdjustmentType(type.id)
											setCategory(firstAdjustmentCategory(type.id))
											setProofDocument(null)
										}}
										className={`min-h-11 rounded-md border px-3 py-2 text-left font-[family-name:var(--font-archivo)] text-[12px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 ${
											active
												? 'border-[var(--color-primary)]/35 bg-[var(--color-primary)]/[0.08] text-[var(--color-text)]'
												: 'border-black/[0.1] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/30 hover:text-[var(--color-text)] dark:border-white/[0.12]'
										}`}
									>
										{type.label}
									</button>
								)
							})}
						</div>
					</div>

					<div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_auto] lg:items-end">
						<label className="grid min-w-0 gap-1.5">
							<span className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
								Category
							</span>
							<select
								value={category}
								onChange={(event) => setCategory(event.target.value)}
								className={SELECT_CLASS}
							>
								{categoryOptions.map((option) => (
									<option key={option.id} value={option.id}>
										{option.label}
									</option>
								))}
							</select>
						</label>
						<label className="grid min-w-0 gap-1.5">
							<span className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
								Amount
							</span>
							<input
								value={amount}
								onChange={(event) => setAmount(event.target.value)}
								inputMode="decimal"
								placeholder="0.00"
								className={MONEY_INPUT_CLASS}
							/>
						</label>
						<EmployeeActionButton
							type="submit"
							size="sm"
							leading={<Plus aria-hidden="true" size={14} />}
							disabled={!canSubmit || createMutation.isPending}
							fullWidthOnMobile
							className="lg:min-h-10"
						>
							{createMutation.isPending ? 'Saving' : 'Record'}
						</EmployeeActionButton>
					</div>
					<ProofUploadField
						className="mt-0"
						label="Adjustment proof"
						note="Upload approval, credit note, debit note, or support document under 1 MB."
						value={proofDocument}
						onChange={setProofDocument}
						panel="finance"
						proofType="finance_out"
						relatedEntityType="finance_adjustment"
						title={`Adjustment proof · ${selectedCategory?.label ?? 'Finance adjustment'}`}
					/>

					<div className="grid gap-2 bg-black/[0.025] px-3 py-3 dark:bg-white/[0.035] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
						<div className="min-w-0">
							<p className="font-[family-name:var(--font-archivo)] text-[12px] font-semibold text-[var(--color-text)]">
								{selectedCategory?.label}
							</p>
							<p className="mt-1 break-words font-[family-name:var(--font-bricolage)] text-[12px] leading-relaxed text-[var(--color-text-muted)]">
								{selectedCategory?.description}
							</p>
						</div>
						<span className="font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums text-[var(--color-text)]">
							{amountPreview}
						</span>
					</div>

					<MutationError error={createMutation.error} />
				</div>
			</form>
			{rows.length === 0 ? (
				<EmptyRows label="No adjustments in this view" />
			) : (
				<div className="mt-5 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
					{rows.map((row) => (
						<div
							key={row.id}
							className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_150px_130px] md:items-center"
						>
							<div className="min-w-0">
								<div className="flex min-w-0 flex-wrap items-center gap-2">
									<p className="break-words font-[family-name:var(--font-bricolage)] text-[14px] font-semibold text-[var(--color-text)]">
										{row.category}
									</p>
									<span className="rounded-md bg-black/[0.04] px-2 py-1 font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)] dark:bg-white/[0.06]">
										{adjustmentTypeLabel(row.type)}
									</span>
								</div>
								<p className="mt-0.5 break-words font-[family-name:var(--font-bricolage)] text-[12px] text-[var(--color-text-muted)]">
									{row.description}
								</p>
								<p className="mt-2 break-words font-[family-name:var(--font-geist-mono)] text-[10.5px] text-[var(--color-text-subtle)]">
									{row.proofPath ? `Proof: ${row.proofPath}` : 'No proof path'}
								</p>
							</div>
							<span className="font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums text-[var(--color-text)]">
								{formatDecimalEgp(row.amount)}
							</span>
							<EmployeeStatusPill
								tone={adjustmentStatusTone(row.status)}
								className="w-fit px-2 py-1 text-[11px]"
							>
								{row.status.replaceAll('_', ' ')}
							</EmployeeStatusPill>
						</div>
					))}
				</div>
			)}
		</section>
	)
}

type JournalActionKind = 'post' | 'reverse' | 'void'

type JournalActionSelection = {
	action: JournalActionKind
	entry: FinanceAccountingJournalEntry
}

type JournalActionPayload = {
	entryId: string
	proof: UploadedProofDocument | null
	reason?: string
}

type FinanceConfirmationRequest = {
	confirmLabel: string
	message: string
	onConfirm: () => void
	title: string
	tone?: 'primary' | 'danger'
}

function useFinanceActionConfirmation() {
	const [request, setRequest] = useState<FinanceConfirmationRequest | null>(
		null,
	)

	return {
		confirmAction: setRequest,
		confirmationDialog: (
			<FinanceConfirmationDialog
				key={request ? `${request.title}:${request.message}` : 'closed'}
				request={request}
				onClose={() => setRequest(null)}
			/>
		),
	}
}

function FinanceConfirmationDialog({
	onClose,
	request,
}: {
	onClose: () => void
	request: FinanceConfirmationRequest | null
}) {
	const [adminConfirmed, setAdminConfirmed] = useState(false)

	return (
		<DispatchDialog
			isOpen={request !== null}
			onClose={onClose}
			title={request?.title ?? 'Confirm finance action'}
			eyebrow="Finance approval"
			caption="Confirm the admin-reviewed action before it is recorded."
			size="sm"
		>
			<DispatchBody>
				<p className="font-[family-name:var(--font-bricolage)] text-[13px] leading-relaxed text-[var(--color-text)]">
					{request?.message}
				</p>
				<label className="mt-4 flex items-start gap-3 rounded-md border border-black/[0.08] bg-black/[0.02] px-3 py-3 text-left dark:border-white/[0.1] dark:bg-white/[0.03]">
					<input
						type="checkbox"
						checked={adminConfirmed}
						onChange={(event) => setAdminConfirmed(event.target.checked)}
						className="mt-0.5 size-4 accent-[var(--color-primary)]"
					/>
					<span className="font-[family-name:var(--font-bricolage)] text-[12.5px] leading-relaxed text-[var(--color-text-muted)]">
						Admin reviewed the supporting proof and confirms this finance action
						should be recorded.
					</span>
				</label>
			</DispatchBody>
			<DispatchFooter>
				<DispatchAction tone="ghost" onPress={onClose}>
					Cancel
				</DispatchAction>
				<DispatchAction
					tone={request?.tone ?? 'primary'}
					isDisabled={!adminConfirmed}
					onPress={() => {
						request?.onConfirm()
						onClose()
					}}
				>
					{request?.confirmLabel ?? 'Confirm'}
				</DispatchAction>
			</DispatchFooter>
		</DispatchDialog>
	)
}

function JournalView({ rows }: { rows: FinanceAccountingJournalEntry[] }) {
	const queryClient = useQueryClient()
	const [selectedAction, setSelectedAction] =
		useState<JournalActionSelection | null>(null)
	const onJournalActionSuccess = () => {
		setSelectedAction(null)
		queryClient.invalidateQueries({ queryKey: ['finance-accounting'] })
	}
	const postMutation = useMutation({
		mutationFn: ({ entryId, proof }: JournalActionPayload) =>
			postFinanceJournalEntry({
				data: {
					entryId,
					proofDocumentId: proofDocumentIdValue(proof),
					proofPath: proofPathValue(proof),
				},
			}),
		onSuccess: onJournalActionSuccess,
	})
	const reverseMutation = useMutation({
		mutationFn: ({ entryId, proof, reason }: JournalActionPayload) => {
			if (!reason) throw new Error('Reason required')
			return reverseFinanceJournalEntry({
				data: {
					entryId,
					proofDocumentId: proofDocumentIdValue(proof),
					proofPath: proofPathValue(proof),
					reason,
				},
			})
		},
		onSuccess: onJournalActionSuccess,
	})
	const voidMutation = useMutation({
		mutationFn: ({ entryId, proof, reason }: JournalActionPayload) => {
			if (!reason) throw new Error('Reason required')
			return voidFinanceDraftJournalEntry({
				data: {
					entryId,
					proofDocumentId: proofDocumentIdValue(proof),
					proofPath: proofPathValue(proof),
					reason,
				},
			})
		},
		onSuccess: onJournalActionSuccess,
	})
	const busy =
		postMutation.isPending ||
		reverseMutation.isPending ||
		voidMutation.isPending
	const actionError =
		postMutation.error ?? reverseMutation.error ?? voidMutation.error

	function runJournalAction(payload: JournalActionPayload) {
		if (!selectedAction) return
		switch (selectedAction.action) {
			case 'post':
				postMutation.mutate(payload)
				break
			case 'reverse':
				reverseMutation.mutate(payload)
				break
			case 'void':
				voidMutation.mutate(payload)
				break
		}
	}

	return (
		<section className="mt-6">
			<SectionHeader
				title="Journal and ledger"
				meta={`${rows.length} entries`}
			/>
			{rows.length === 0 ? (
				<EmptyRows label="No journal entries in this period" />
			) : (
				<div className="mt-3 space-y-4">
					{rows.map((entry) => (
						<JournalEntryRow
							key={entry.id}
							entry={entry}
							busy={busy}
							onAction={(action) => setSelectedAction({ action, entry })}
						/>
					))}
				</div>
			)}
			<JournalActionDialog
				key={
					selectedAction
						? `${selectedAction.action}:${selectedAction.entry.id}`
						: 'closed'
				}
				selection={selectedAction}
				busy={busy}
				error={actionError}
				onClose={() => {
					if (!busy) setSelectedAction(null)
				}}
				onConfirm={runJournalAction}
			/>
		</section>
	)
}

function JournalActionDialog({
	busy,
	error,
	onClose,
	onConfirm,
	selection,
}: {
	busy: boolean
	error: unknown
	onClose: () => void
	onConfirm: (payload: JournalActionPayload) => void
	selection: JournalActionSelection | null
}) {
	const [adminConfirmed, setAdminConfirmed] = useState(false)
	const [proof, setProof] = useState<UploadedProofDocument | null>(null)
	const [reason, setReason] = useState('')
	const action = selection?.action ?? 'post'
	const entry = selection?.entry ?? null
	const isPost = action === 'post'
	const isReverse = action === 'reverse'
	const actionLabel = isPost ? 'Post' : isReverse ? 'Reverse' : 'Void'
	const reasonRequired = !isPost
	const proofRequired = !isPost
	const reasonValid = !reasonRequired || reason.trim().length >= 5
	const proofValid = !proofRequired || proof !== null
	const canConfirm =
		entry !== null && adminConfirmed && reasonValid && proofValid

	return (
		<DispatchDialog
			isOpen={entry !== null}
			onClose={onClose}
			title={`${actionLabel} journal entry`}
			eyebrow="Journal"
			caption={
				isPost
					? 'Post a balanced draft into the ledger after admin review.'
					: isReverse
						? 'Create a reversing entry with admin proof and a clear reason.'
						: 'Void a draft entry with admin proof and a clear reason.'
			}
			size="md"
			dismissDisabled={busy}
		>
			<DispatchBody>
				{entry && (
					<div className="grid gap-3 rounded-md border border-black/[0.08] bg-black/[0.02] px-3 py-3 dark:border-white/[0.1] dark:bg-white/[0.03]">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<span className="font-[family-name:var(--font-geist-mono)] text-[12px] font-semibold text-[var(--color-text)]">
								{entry.entryNumber}
							</span>
							<span className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
								{entry.status} · {entry.accountingDate}
							</span>
						</div>
						<p className="break-words font-[family-name:var(--font-bricolage)] text-[13px] leading-relaxed text-[var(--color-text)]">
							{entry.description}
						</p>
					</div>
				)}

				{reasonRequired && (
					<label className="mt-4 grid gap-1.5">
						<span className="flex flex-wrap items-baseline justify-between gap-2 font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
							<span>Reason</span>
							<span>Required</span>
						</span>
						<textarea
							value={reason}
							onChange={(event) => setReason(event.target.value)}
							placeholder={
								isReverse
									? 'Explain why this posted journal entry must be reversed.'
									: 'Explain why this draft journal entry must be voided.'
							}
							className="min-h-24 w-full resize-y rounded-md border border-black/[0.1] bg-[var(--color-surface)] px-3 py-2 font-[family-name:var(--font-bricolage)] text-[13px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 dark:border-white/[0.12]"
						/>
					</label>
				)}

				<ProofUploadField
					className="mt-4"
					label="Admin proof"
					note={
						proofRequired
							? 'Upload admin approval proof under 1 MB.'
							: 'Optional approval proof under 1 MB.'
					}
					value={proof}
					onChange={setProof}
					panel="finance"
					proofType="advisor_signoff"
					relatedEntityId={entry?.id}
					relatedEntityType={`finance_journal_${action}`}
					title={`${actionLabel} proof · ${entry?.entryNumber ?? 'Journal entry'}`}
				/>

				<label className="mt-4 flex items-start gap-3 rounded-md border border-black/[0.08] bg-black/[0.02] px-3 py-3 text-left dark:border-white/[0.1] dark:bg-white/[0.03]">
					<input
						type="checkbox"
						checked={adminConfirmed}
						onChange={(event) => setAdminConfirmed(event.target.checked)}
						className="mt-0.5 size-4 accent-[var(--color-primary)]"
					/>
					<span className="font-[family-name:var(--font-bricolage)] text-[12.5px] leading-relaxed text-[var(--color-text-muted)]">
						Admin reviewed this journal action and confirms it should be
						recorded.
					</span>
				</label>

				<MutationError error={error} className="mt-4" />
			</DispatchBody>
			<DispatchFooter leading={entry?.entryNumber}>
				<DispatchAction tone="ghost" onPress={onClose} isDisabled={busy}>
					Cancel
				</DispatchAction>
				<DispatchAction
					tone={isPost ? 'primary' : 'danger'}
					isDisabled={!canConfirm || busy}
					onPress={() => {
						if (!entry || !canConfirm) return
						onConfirm({
							entryId: entry.id,
							proof,
							reason: reason.trim() || undefined,
						})
					}}
				>
					{busy ? 'Working' : actionLabel}
				</DispatchAction>
			</DispatchFooter>
		</DispatchDialog>
	)
}

function JournalEntryRow({
	entry,
	busy,
	onAction,
}: {
	entry: FinanceAccountingJournalEntry
	busy: boolean
	onAction: (action: JournalActionKind) => void
}) {
	const debitTotal = entry.lines.reduce((sum, line) => sum + line.debit, 0)
	const creditTotal = entry.lines.reduce((sum, line) => sum + line.credit, 0)
	const balanced =
		Math.round(debitTotal * 100) === Math.round(creditTotal * 100)
	const canPost =
		entry.status === 'draft' &&
		!entry.requiresAccountantSignoff &&
		balanced &&
		entry.lines.length > 0
	const canReverse = entry.status === 'posted'
	const canVoid = entry.status === 'draft'
	const hasActions = canPost || canReverse || canVoid

	return (
		<article className="rounded-md border border-[var(--color-border)] p-4">
			<div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-2">
						<p className="font-[family-name:var(--font-geist-mono)] text-[12px] font-semibold text-[var(--color-text)]">
							{entry.entryNumber}
						</p>
						<EmployeeStatusPill
							tone={
								entry.status === 'posted'
									? 'success'
									: entry.status === 'draft'
										? 'warning'
										: 'neutral'
							}
							className="px-2 py-1 text-[11px]"
						>
							{entry.status}
						</EmployeeStatusPill>
						{entry.requiresAccountantSignoff && (
							<EmployeeStatusPill
								tone="warning"
								className="px-2 py-1 text-[11px]"
							>
								Requires sign-off
							</EmployeeStatusPill>
						)}
					</div>
					<p className="mt-2 break-words font-[family-name:var(--font-bricolage)] text-[13px] font-semibold text-[var(--color-text)]">
						{entry.description}
					</p>
					<p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[11px] text-[var(--color-text-subtle)]">
						{entry.accountingDate} · {entry.sourceType ?? 'manual'}
					</p>
					{entry.signoffReason && (
						<p className="mt-2 font-[family-name:var(--font-bricolage)] text-[12px] leading-relaxed text-amber-700 dark:text-amber-300">
							{entry.signoffReason}
						</p>
					)}
				</div>
				{hasActions && (
					<div className="flex flex-wrap gap-2 lg:justify-end">
						{canPost && (
							<EmployeeActionButton
								tone="success"
								size="sm"
								leading={<BookOpenCheck aria-hidden="true" size={14} />}
								onClick={() => onAction('post')}
								disabled={busy}
							>
								Post
							</EmployeeActionButton>
						)}
						{canReverse && (
							<EmployeeActionButton
								tone="neutral"
								size="sm"
								leading={<Undo2 aria-hidden="true" size={14} />}
								onClick={() => onAction('reverse')}
								disabled={busy}
							>
								Reverse
							</EmployeeActionButton>
						)}
						{canVoid && (
							<EmployeeActionButton
								tone="danger"
								size="sm"
								leading={<Ban aria-hidden="true" size={14} />}
								onClick={() => onAction('void')}
								disabled={busy}
							>
								Void
							</EmployeeActionButton>
						)}
					</div>
				)}
			</div>

			{entry.lines.length > 0 && (
				<div className="mt-4 overflow-x-auto">
					<table className="min-w-full border-t border-[var(--color-border)] text-left">
						<tbody className="divide-y divide-[var(--color-border)]">
							{entry.lines.map((line) => (
								<tr key={`${entry.id}-${line.lineNumber}`}>
									<td className="py-2 pr-4 font-[family-name:var(--font-geist-mono)] text-[11px] text-[var(--color-text-subtle)]">
										{line.accountCode}
									</td>
									<td className="py-2 pr-4 font-[family-name:var(--font-bricolage)] text-[12px] text-[var(--color-text)]">
										{line.accountName}
									</td>
									<MoneyCell value={line.debit} />
									<MoneyCell value={line.credit} />
								</tr>
							))}
						</tbody>
						<tfoot>
							<tr>
								<td className="py-2 pr-4" />
								<td className="py-2 pr-4 font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-subtle)]">
									Totals
								</td>
								<MoneyCell value={debitTotal} strong />
								<MoneyCell value={creditTotal} strong />
							</tr>
						</tfoot>
					</table>
				</div>
			)}
		</article>
	)
}

function SectionHeader({ title, meta }: { title: string; meta?: string }) {
	return (
		<div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[var(--color-border)] pb-2">
			<h3 className="font-[family-name:var(--font-bricolage)] text-[17px] font-semibold text-[var(--color-text)]">
				{title}
			</h3>
			{meta && (
				<span className="font-[family-name:var(--font-geist-mono)] text-[11px] text-[var(--color-text-subtle)]">
					{meta}
				</span>
			)}
		</div>
	)
}

function MutationError({
	className = '',
	error,
}: {
	className?: string
	error: unknown
}) {
	const message = mutationErrorMessage(error)
	if (!message) return null
	return (
		<p
			className={`rounded-md border border-red-600/20 bg-red-600/[0.04] px-3 py-2 font-[family-name:var(--font-archivo)] text-[12px] text-red-700 dark:text-red-300 ${className}`}
		>
			{message}
		</p>
	)
}

function QuantityCell({ value }: { value: number }) {
	return (
		<td className="py-3 pr-4 text-right font-[family-name:var(--font-geist-mono)] text-[12.5px] tabular-nums text-[var(--color-text)]">
			{formatQuantity(value)}
		</td>
	)
}

function formatQuantity(value: number) {
	return value.toLocaleString('en-US', {
		maximumFractionDigits: 2,
		minimumFractionDigits: 0,
	})
}

function MoneyCell({
	value,
	strong = false,
}: {
	value: number
	strong?: boolean
}) {
	return (
		<td
			className={`py-3 pr-4 text-right font-[family-name:var(--font-geist-mono)] text-[12.5px] tabular-nums text-[var(--color-text)] ${strong ? 'font-semibold' : ''}`}
		>
			{formatDecimalEgp(value)}
		</td>
	)
}

function EmptyRows({ label }: { label: string }) {
	return (
		<div className="mt-5 flex min-h-[120px] items-center justify-center border-y border-dashed border-[var(--color-border)] px-4 py-8 text-center font-[family-name:var(--font-bricolage)] text-[13px] text-[var(--color-text-subtle)]">
			{label}
		</div>
	)
}
