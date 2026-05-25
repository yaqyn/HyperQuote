import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	AlertTriangle,
	Ban,
	BookOpenCheck,
	Calculator,
	ClipboardList,
	Landmark,
	Plus,
	ReceiptText,
	RefreshCcw,
	Undo2,
} from 'lucide-react'
import { useState } from 'react'
import { INTERNAL_LIVE_STALE_MS } from '../../lib/internal-live-query'
import {
	backfillFinanceAccountingSources,
	createFinanceAdjustment,
	type FinanceAccountingAdjustment,
	type FinanceAccountingDashboard,
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
	| 'receivables'
	| 'payables'
	| 'payroll'
	| 'adjustments'
	| 'journal'

const ACCOUNTING_VIEWS: Array<{
	id: AccountingView
	label: string
	icon: typeof Calculator
}> = [
	{ id: 'overview', label: 'Overview', icon: Calculator },
	{ id: 'income', label: 'Income', icon: ClipboardList },
	{ id: 'cash', label: 'Cash flow', icon: Landmark },
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

const COUNT_METRICS = new Set(['Review required', 'Draft journals'])

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
			<div className="mx-auto flex max-w-[1180px] flex-col px-4 pt-6 pb-16 sm:px-6 lg:px-10 lg:pt-8">
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

				{activeView === 'overview' && <OverviewView dashboard={dashboard} />}
				{activeView === 'income' && <IncomeView dashboard={dashboard} />}
				{activeView === 'cash' && <CashFlowView dashboard={dashboard} />}
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
							{formatDecimalEgp(dashboard.overview.cashBalance)}
						</strong>
						<span className="font-[family-name:var(--font-geist-mono)] text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
							EGP cash
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
		receivables: dashboard.receivables.length,
		payables: dashboard.payables.length,
		adjustments: dashboard.adjustments.length,
		journal: dashboard.journal.length,
	}

	return (
		<nav
			aria-label="Accounting views"
			className="sticky top-0 z-10 -mx-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:backdrop-blur-none"
		>
			<ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
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
}: {
	dashboard: FinanceAccountingDashboard
}) {
	return (
		<section className="mt-6">
			<MetricGrid
				metrics={[
					['Cash movement', dashboard.overview.cashMovement],
					['Receivables', dashboard.overview.receivables],
					['Payables', dashboard.overview.payables],
					['Review required', dashboard.overview.reviewRequiredCount],
					['Draft journals', dashboard.overview.unpostedCount],
					['Net cash flow', dashboard.cashFlow.netCashMovement],
				]}
			/>
			<div className="mt-8 grid gap-8 lg:grid-cols-2">
				<IncomeView dashboard={dashboard} compact />
				<CashFlowView dashboard={dashboard} compact />
			</div>
		</section>
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
