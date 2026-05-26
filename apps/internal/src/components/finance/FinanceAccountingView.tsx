import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	AlertTriangle,
	Ban,
	BookOpenCheck,
	Calculator,
	ClipboardList,
	Landmark,
	type LucideIcon,
	PackageCheck,
	Plus,
	ReceiptText,
	RefreshCcw,
	Undo2,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { INTERNAL_LIVE_STALE_MS } from '../../lib/internal-live-query'
import {
	backfillFinanceAccountingSources,
	createFinanceAdjustment,
	type FinanceAccountingAdjustment,
	type FinanceAccountingDashboard,
	type FinanceAccountingInventoryAsset,
	type FinanceAccountingJournalEntry,
	type FinanceAccountingPayable,
	type FinanceAccountingReceivable,
	getFinanceAccountingDashboard,
	postFinanceJournalEntry,
	reverseFinanceJournalEntry,
	voidFinanceDraftJournalEntry,
} from '../../lib/server/finance'
import {
	EmployeeActionButton,
	EmployeeFilterChip,
	EmployeeStatusPill,
} from '../shared/EmployeeControls'
import { formatDecimalEgp } from '../shared/formatters'

type AccountingView =
	| 'overview'
	| 'income'
	| 'cash'
	| 'inventory'
	| 'receivables'
	| 'payables'
	| 'payroll'
	| 'adjustments'
	| 'journal'

const ACCOUNTING_VIEWS: Array<{
	id: AccountingView
	label: string
	icon: LucideIcon
}> = [
	{ id: 'overview', label: 'Overview', icon: Calculator },
	{ id: 'income', label: 'Income', icon: ClipboardList },
	{ id: 'cash', label: 'Cash flow', icon: Landmark },
	{ id: 'inventory', label: 'Inventory assets', icon: PackageCheck },
	{ id: 'receivables', label: 'Receivables', icon: ReceiptText },
	{ id: 'payables', label: 'Payables', icon: ReceiptText },
	{ id: 'payroll', label: 'Payroll', icon: ClipboardList },
	{ id: 'adjustments', label: 'Adjustments', icon: Plus },
	{ id: 'journal', label: 'Journal', icon: BookOpenCheck },
]

const ADJUSTMENT_TYPES = [
	{ id: 'company_expense', label: 'Company expense' },
	{ id: 'damage', label: 'Damage' },
	{ id: 'refund', label: 'Refund' },
	{ id: 'write_off', label: 'Write-off' },
	{ id: 'credit_adjustment', label: 'Credit adjustment' },
	{ id: 'debit_adjustment', label: 'Debit adjustment' },
] as const
type AdjustmentType = (typeof ADJUSTMENT_TYPES)[number]['id']

const COUNT_METRICS = new Set([
	'Review required',
	'Draft journals',
	'Cost reviews',
])

function isAdjustmentType(value: string): value is AdjustmentType {
	return ADJUSTMENT_TYPES.some((type) => type.id === value)
}

function todayInputValue() {
	return new Date().toISOString().slice(0, 10)
}

function monthStartInputValue() {
	const now = new Date()
	return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
		.toISOString()
		.slice(0, 10)
}

export function FinanceAccountingView() {
	const queryClient = useQueryClient()
	const [activeView, setActiveView] = useState<AccountingView>('overview')
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

	return (
		<div className="relative">
			<div className="mx-auto flex max-w-[1180px] flex-col px-4 pt-6 pb-16 sm:px-6 lg:px-8 lg:pt-8 xl:px-10">
				<AccountingMasthead
					dashboard={dashboard}
					periodStart={periodStart}
					periodEnd={periodEnd}
					onPeriodStartChange={setPeriodStart}
					onPeriodEndChange={setPeriodEnd}
					onBackfill={() => backfillMutation.mutate()}
					backfillBusy={backfillMutation.isPending}
				/>

				<AccountingViewStrip
					activeView={activeView}
					dashboard={dashboard}
					onSelect={setActiveView}
				/>

				<SignoffWarning warnings={dashboard.incomeStatement.warnings} />

				{activeView === 'overview' && (
					<OverviewView dashboard={dashboard} onSelect={setActiveView} />
				)}
				{activeView === 'income' && <IncomeView dashboard={dashboard} />}
				{activeView === 'cash' && <CashFlowView dashboard={dashboard} />}
				{activeView === 'inventory' && (
					<InventoryAssetsView rows={dashboard.inventoryAssets} />
				)}
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
	periodStart,
	periodEnd,
	onPeriodStartChange,
	onPeriodEndChange,
	onBackfill,
	backfillBusy,
}: {
	dashboard: FinanceAccountingDashboard
	periodStart: string
	periodEnd: string
	onPeriodStartChange: (value: string) => void
	onPeriodEndChange: (value: string) => void
	onBackfill: () => void
	backfillBusy: boolean
}) {
	return (
		<header className="border-b border-[var(--color-border)] pb-4">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
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
					<p className="mt-2 max-w-[620px] font-[family-name:var(--font-bricolage)] text-[12.5px] leading-relaxed text-[var(--color-text-muted)]">
						{dashboard.overview.basis}
					</p>
				</div>

				<div className="flex flex-col gap-2 sm:flex-row sm:items-end">
					<label className="flex min-w-[150px] flex-col gap-1">
						<span className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
							From
						</span>
						<input
							type="date"
							value={periodStart}
							onChange={(event) => onPeriodStartChange(event.target.value)}
							className="h-10 rounded-md border border-black/[0.1] bg-[var(--color-surface)] px-3 font-[family-name:var(--font-geist-mono)] text-[12px] text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]/55 focus:ring-2 focus:ring-[var(--color-primary)]/15 dark:border-white/[0.12]"
						/>
					</label>
					<label className="flex min-w-[150px] flex-col gap-1">
						<span className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
							To
						</span>
						<input
							type="date"
							value={periodEnd}
							onChange={(event) => onPeriodEndChange(event.target.value)}
							className="h-10 rounded-md border border-black/[0.1] bg-[var(--color-surface)] px-3 font-[family-name:var(--font-geist-mono)] text-[12px] text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]/55 focus:ring-2 focus:ring-[var(--color-primary)]/15 dark:border-white/[0.12]"
						/>
					</label>
					<EmployeeActionButton
						tone="neutral"
						size="sm"
						leading={<RefreshCcw aria-hidden="true" size={14} />}
						onClick={onBackfill}
						disabled={backfillBusy}
					>
						{backfillBusy ? 'Reconciling' : 'Reconcile'}
					</EmployeeActionButton>
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
		inventory: dashboard.inventoryAssets.length,
		receivables: dashboard.receivables.length,
		payables: dashboard.payables.length,
		adjustments: dashboard.adjustments.length,
		journal: dashboard.journal.length,
	}

	return (
		<nav
			aria-label="Accounting views"
			className="sticky top-0 z-10 -mx-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:mx-0 lg:bg-transparent lg:px-0 xl:static xl:backdrop-blur-none"
		>
			<ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-9">
				{ACCOUNTING_VIEWS.map((view) => {
					const Icon = view.icon
					return (
						<li key={view.id}>
							<EmployeeFilterChip
								active={activeView === view.id}
								count={counts[view.id]}
								tone={view.id === 'journal' ? 'primary' : 'neutral'}
								onClick={() => onSelect(view.id)}
								className="h-full w-full"
							>
								<span className="inline-flex items-center gap-1.5">
									<Icon aria-hidden="true" size={13} />
									{view.label}
								</span>
							</EmployeeFilterChip>
						</li>
					)
				})}
			</ul>
		</nav>
	)
}

function SignoffWarning({ warnings }: { warnings: string[] }) {
	if (warnings.length === 0) return null
	return (
		<div className="mt-5 flex gap-3 rounded-md border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-amber-800 dark:text-amber-300">
			<AlertTriangle aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
			<div className="min-w-0 space-y-1 font-[family-name:var(--font-bricolage)] text-[12.5px] leading-relaxed">
				{warnings.map((warning) => (
					<p key={warning}>{warning}</p>
				))}
			</div>
		</div>
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
		['Receivables', dashboard.overview.receivables],
		['Total assets', dashboard.overview.totalAssets],
	]
	const obligationRows: Array<[string, number]> = [
		['Payables', dashboard.overview.payables],
		['Draft journals', dashboard.overview.unpostedCount],
		['Review required', dashboard.overview.reviewRequiredCount],
		['Cost reviews', dashboard.overview.inventoryCostReviewCount],
	]
	const movementRows: Array<[string, number]> = [
		['Customer receipts', dashboard.cashFlow.customerReceipts],
		['Supplier payments', -dashboard.cashFlow.supplierPayments],
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
			count: dashboard.adjustments.length,
			label: 'Adjustments',
			meta: `${dashboard.overview.reviewRequiredCount} review`,
			target: 'adjustments',
		},
		{
			count: dashboard.journal.length,
			label: 'Journal entries',
			meta: `${dashboard.overview.unpostedCount} draft`,
			target: 'journal',
		},
	]

	return (
		<section className="mt-6 space-y-8">
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

			<div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
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
						key={row.productId}
						className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
					>
						<div className="min-w-0">
							<p className="break-words font-[family-name:var(--font-bricolage)] text-[13px] font-semibold text-[var(--color-text)]">
								{row.productName}
							</p>
							<p className="mt-0.5 font-[family-name:var(--font-geist-mono)] text-[11px] text-[var(--color-text-subtle)]">
								{row.sku} · {formatQuantity(row.onHand)} on hand
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
								<tr key={row.productId} className="text-[12.5px]">
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
											tone={row.needsCostReview ? 'warning' : 'success'}
											className="px-2 py-1 text-[11px]"
										>
											{row.needsCostReview
												? 'Needs cost review'
												: (row.supplierName ?? 'Supplier cost')}
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
	const payroll = dashboard.payroll
	return (
		<section className="mt-6">
			<SectionHeader
				title="Payroll"
				meta={`${payroll.employeeCount} employees`}
			/>
			<MetricGrid
				metrics={[
					['Monthly base salary', payroll.monthlyBaseSalary],
					['Social insurance salary', payroll.monthlySocialInsuranceSalary],
					['Review required', dashboard.overview.reviewRequiredCount],
				]}
			/>
			{payroll.canViewDetail ? (
				<div className="mt-5 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
					{payroll.details.map((employee) => (
						<div
							key={employee.employeeId}
							className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
						>
							<div className="min-w-0">
								<p className="break-words font-[family-name:var(--font-bricolage)] text-[13px] font-semibold text-[var(--color-text)]">
									{employee.employeeName}
								</p>
								<p className="mt-0.5 break-words font-[family-name:var(--font-bricolage)] text-[12px] text-[var(--color-text-muted)]">
									{[employee.department, employee.title]
										.filter(Boolean)
										.join(' · ')}
								</p>
							</div>
							<span className="font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums text-[var(--color-text)]">
								{formatDecimalEgp(employee.baseSalary ?? 0)} {employee.currency}
							</span>
						</div>
					))}
				</div>
			) : (
				<EmptyRows label="Salary detail is restricted" />
			)}
		</section>
	)
}

function AdjustmentsView({ rows }: { rows: FinanceAccountingAdjustment[] }) {
	const queryClient = useQueryClient()
	const [adjustmentType, setAdjustmentType] =
		useState<AdjustmentType>('company_expense')
	const [category, setCategory] = useState('')
	const [description, setDescription] = useState('')
	const [amount, setAmount] = useState('')
	const [proofPath, setProofPath] = useState('')

	const createMutation = useMutation({
		mutationFn: () =>
			createFinanceAdjustment({
				data: {
					adjustmentType,
					category,
					description,
					amount: Number(amount),
					proofPath: proofPath.trim() || undefined,
				},
			}),
		onSuccess: () => {
			setCategory('')
			setDescription('')
			setAmount('')
			setProofPath('')
			queryClient.invalidateQueries({ queryKey: ['finance-accounting'] })
		},
	})

	const canSubmit =
		category.trim().length >= 2 &&
		description.trim().length >= 5 &&
		Number(amount) > 0

	return (
		<section className="mt-6">
			<SectionHeader
				title="Damages and adjustments"
				meta={`${rows.length} rows`}
			/>
			<form
				className="mt-3 grid gap-3 rounded-md border border-[var(--color-border)] p-4 lg:grid-cols-[180px_minmax(0,1fr)_140px_auto]"
				onSubmit={(event) => {
					event.preventDefault()
					if (canSubmit) createMutation.mutate()
				}}
			>
				<select
					value={adjustmentType}
					onChange={(event) => {
						if (isAdjustmentType(event.target.value)) {
							setAdjustmentType(event.target.value)
						}
					}}
					className="h-10 rounded-md border border-black/[0.1] bg-[var(--color-surface)] px-3 font-[family-name:var(--font-archivo)] text-[12px] text-[var(--color-text)] outline-none dark:border-white/[0.12]"
				>
					{ADJUSTMENT_TYPES.map((type) => (
						<option key={type.id} value={type.id}>
							{type.label}
						</option>
					))}
				</select>
				<div className="grid gap-3 sm:grid-cols-2">
					<input
						value={category}
						onChange={(event) => setCategory(event.target.value)}
						placeholder="Category"
						className="h-10 rounded-md border border-black/[0.1] bg-[var(--color-surface)] px-3 font-[family-name:var(--font-archivo)] text-[12px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)] dark:border-white/[0.12]"
					/>
					<input
						value={description}
						onChange={(event) => setDescription(event.target.value)}
						placeholder="Description"
						className="h-10 rounded-md border border-black/[0.1] bg-[var(--color-surface)] px-3 font-[family-name:var(--font-archivo)] text-[12px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)] dark:border-white/[0.12]"
					/>
					<input
						value={proofPath}
						onChange={(event) => setProofPath(event.target.value)}
						placeholder="Proof path"
						className="h-10 rounded-md border border-black/[0.1] bg-[var(--color-surface)] px-3 font-[family-name:var(--font-archivo)] text-[12px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)] dark:border-white/[0.12] sm:col-span-2"
					/>
				</div>
				<input
					value={amount}
					onChange={(event) => setAmount(event.target.value)}
					inputMode="decimal"
					placeholder="Amount"
					className="h-10 rounded-md border border-black/[0.1] bg-[var(--color-surface)] px-3 font-[family-name:var(--font-geist-mono)] text-[12px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)] dark:border-white/[0.12]"
				/>
				<EmployeeActionButton
					type="submit"
					size="sm"
					leading={<Plus aria-hidden="true" size={14} />}
					disabled={!canSubmit || createMutation.isPending}
				>
					{createMutation.isPending ? 'Saving' : 'Add'}
				</EmployeeActionButton>
			</form>
			{rows.length === 0 ? (
				<EmptyRows label="No adjustments in this view" />
			) : (
				<div className="mt-5 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
					{rows.map((row) => (
						<div
							key={row.id}
							className="grid gap-2 py-3 lg:grid-cols-[minmax(0,1fr)_140px_150px] lg:items-center"
						>
							<div className="min-w-0">
								<p className="break-words font-[family-name:var(--font-bricolage)] text-[13px] font-semibold text-[var(--color-text)]">
									{row.category}
								</p>
								<p className="mt-0.5 break-words font-[family-name:var(--font-bricolage)] text-[12px] text-[var(--color-text-muted)]">
									{row.description}
								</p>
							</div>
							<span className="font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums text-[var(--color-text)]">
								{formatDecimalEgp(row.amount)}
							</span>
							<EmployeeStatusPill
								tone={row.status === 'posted' ? 'success' : 'warning'}
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

function JournalView({ rows }: { rows: FinanceAccountingJournalEntry[] }) {
	const postMutation = useJournalMutation((entryId) =>
		postFinanceJournalEntry({ data: { entryId } }),
	)
	const reverseMutation = useJournalMutation((entryId, reason) => {
		if (!reason) throw new Error('Reason required')
		return reverseFinanceJournalEntry({ data: { entryId, reason } })
	})
	const voidMutation = useJournalMutation((entryId, reason) => {
		if (!reason) throw new Error('Reason required')
		return voidFinanceDraftJournalEntry({ data: { entryId, reason } })
	})

	const busy =
		postMutation.isPending ||
		reverseMutation.isPending ||
		voidMutation.isPending

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
							onPost={() => postMutation.mutate({ entryId: entry.id })}
							onReverse={() => {
								const reason = window.prompt('Reason for reversal')
								if (reason?.trim()) {
									reverseMutation.mutate({
										entryId: entry.id,
										reason: reason.trim(),
									})
								}
							}}
							onVoid={() => {
								const reason = window.prompt('Reason for void')
								if (reason?.trim()) {
									voidMutation.mutate({
										entryId: entry.id,
										reason: reason.trim(),
									})
								}
							}}
						/>
					))}
				</div>
			)}
		</section>
	)
}

function useJournalMutation(
	mutationFn: (entryId: string, reason?: string) => Promise<unknown>,
) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ entryId, reason }: { entryId: string; reason?: string }) =>
			mutationFn(entryId, reason),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['finance-accounting'] })
		},
	})
}

function JournalEntryRow({
	entry,
	busy,
	onPost,
	onReverse,
	onVoid,
}: {
	entry: FinanceAccountingJournalEntry
	busy: boolean
	onPost: () => void
	onReverse: () => void
	onVoid: () => void
}) {
	const debitTotal = entry.lines.reduce((sum, line) => sum + line.debit, 0)
	const creditTotal = entry.lines.reduce((sum, line) => sum + line.credit, 0)
	const balanced =
		Math.round(debitTotal * 100) === Math.round(creditTotal * 100)

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
				<div className="flex flex-wrap gap-2 lg:justify-end">
					<EmployeeActionButton
						tone="success"
						size="sm"
						leading={<BookOpenCheck aria-hidden="true" size={14} />}
						onClick={onPost}
						disabled={
							busy ||
							entry.status !== 'draft' ||
							entry.requiresAccountantSignoff ||
							!balanced ||
							entry.lines.length === 0
						}
					>
						Post
					</EmployeeActionButton>
					<EmployeeActionButton
						tone="neutral"
						size="sm"
						leading={<Undo2 aria-hidden="true" size={14} />}
						onClick={onReverse}
						disabled={busy || entry.status !== 'posted'}
					>
						Reverse
					</EmployeeActionButton>
					<EmployeeActionButton
						tone="danger"
						size="sm"
						leading={<Ban aria-hidden="true" size={14} />}
						onClick={onVoid}
						disabled={busy || entry.status !== 'draft'}
					>
						Void
					</EmployeeActionButton>
				</div>
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
