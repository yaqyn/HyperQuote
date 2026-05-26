create or replace function public.finance_accounting_dashboard(
	p_period_start date default null,
	p_period_end date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	period_start date := coalesce(p_period_start, date_trunc('month', (now() at time zone 'Africa/Cairo'))::date);
	period_end date := coalesce(p_period_end, (now() at time zone 'Africa/Cairo')::date);
	target_period_month date := date_trunc('month', coalesce(p_period_end, (now() at time zone 'Africa/Cairo')::date))::date;
	dashboard jsonb;
	overview jsonb;
	cash_flow jsonb;
	payroll jsonb;
	fuel_expenses jsonb := '[]'::jsonb;
	company_assets jsonb := '[]'::jsonb;
	company_asset_total numeric := 0;
	company_asset_count integer := 0;
	pending_fuel_count integer := 0;
	pending_fuel_amount numeric := 0;
	payroll_due_count integer := 0;
	payroll_due_amount numeric := 0;
	salary_paid_total numeric := 0;
	bonus_paid_total numeric := 0;
	fuel_paid_total numeric := 0;
	company_asset_cash_total numeric := 0;
	cash_net_movement numeric := 0;
	cash_balance numeric := 0;
	cash_asset_balance numeric := 0;
	cash_overdraft numeric := 0;
	total_assets_value numeric := 0;
	total_liabilities_value numeric := 0;
	payables_value numeric := 0;
	cash_account_id uuid := app_private.finance_account_id('1010');
begin
	dashboard := public.finance_accounting_dashboard_without_operating_finance(
		period_start,
		period_end
	);

	select coalesce(sum(jl.debit - jl.credit), 0)
	into cash_net_movement
	from public.finance_journal_lines jl
	join public.finance_journal_entries je on je.id = jl.entry_id
	where je.status = 'posted'
	  and je.accounting_date between period_start and period_end
	  and jl.account_id = cash_account_id;

	select
		round(coalesce(sum(carrying_value) filter (where status = 'active'), 0), 2),
		count(*) filter (where status = 'active')::integer,
		coalesce(jsonb_agg(
			jsonb_build_object(
				'id', id,
				'assetNumber', asset_number,
				'assetType', asset_type,
				'name', name,
				'acquisitionDate', acquisition_date,
				'acquisitionCost', acquisition_cost,
				'carryingValue', carrying_value,
				'fundingSource', funding_source,
				'location', location,
				'relatedTruckId', related_truck_id,
				'status', status,
				'proofPath', proof_path,
				'proofDocumentId', proof_document_id,
				'journalEntryId', journal_entry_id,
				'createdAt', created_at
			)
			order by status, carrying_value desc, created_at desc
		) filter (
			where status = 'active'
			   or acquisition_date between period_start and period_end
		), '[]'::jsonb)
	into company_asset_total, company_asset_count, company_assets
	from public.company_assets;

	select
		count(*) filter (where fe.status = 'submitted')::integer,
		round(coalesce(sum(fe.amount) filter (where fe.status = 'submitted'), 0), 2),
		round(coalesce(sum(fe.amount) filter (where fe.status = 'posted' and fe.expense_date between period_start and period_end), 0), 2),
		coalesce(jsonb_agg(
			jsonb_build_object(
				'id', fe.id,
				'truckId', fe.truck_id,
				'truckPlate', t.plate_number,
				'driverId', fe.driver_id,
				'driverName', d.full_name,
				'deliveryId', fe.delivery_id,
				'expenseDate', fe.expense_date,
				'amount', fe.amount,
				'fuelLiters', fe.fuel_liters,
				'odometerKm', fe.odometer_km,
				'receiptImageDataUrl', fe.receipt_image_data_url,
				'receiptFileName', fe.receipt_file_name,
				'receiptMimeType', fe.receipt_mime_type,
				'note', fe.note,
				'financeNote', fe.finance_note,
				'status', fe.status,
				'postedAt', fe.posted_at,
				'journalEntryId', fe.journal_entry_id,
				'createdAt', fe.created_at
			)
			order by case when fe.status = 'submitted' then 0 else 1 end, fe.expense_date desc, fe.created_at desc
		) filter (
			where fe.status = 'submitted'
			   or fe.expense_date between period_start and period_end
		), '[]'::jsonb)
	into pending_fuel_count, pending_fuel_amount, fuel_paid_total, fuel_expenses
	from public.truck_fuel_expenses fe
	left join public.trucks t on t.id = fe.truck_id
	left join public.drivers d on d.id = fe.driver_id;

	select
		round(coalesce(sum(amount) filter (where payment_type = 'salary' and status = 'paid' and payment_date between period_start and period_end), 0), 2),
		round(coalesce(sum(amount) filter (where payment_type = 'bonus' and status = 'paid' and payment_date between period_start and period_end), 0), 2)
	into salary_paid_total, bonus_paid_total
	from public.employee_payroll_payments;

	select round(coalesce(sum(acquisition_cost) filter (
		where funding_source = 'cash_purchase'
		  and acquisition_date between period_start and period_end
	), 0), 2)
	into company_asset_cash_total
	from public.company_assets;

	with salary_payments as (
		select distinct on (employee_id)
			employee_id,
			id,
			amount,
			payment_date,
			created_at
		from public.employee_payroll_payments
		where payment_type = 'salary'
		  and status = 'paid'
		  and employee_payroll_payments.period_month = target_period_month
		order by employee_id, created_at desc
	),
	bonus_payments as (
		select
			employee_id,
			coalesce(sum(amount), 0) as amount
		from public.employee_payroll_payments
		where payment_type = 'bonus'
		  and status = 'paid'
		  and employee_payroll_payments.period_month = target_period_month
		group by employee_id
	),
	employee_rows as (
		select
			e.id,
			e.full_name,
			e.status,
			ec.department,
			ec.title,
			coalesce(ec.base_salary, 0) as base_salary,
			coalesce(ec.social_insurance_salary, 0) as social_insurance_salary,
			coalesce(ec.salary_currency, 'EGP') as salary_currency,
			sp.id as salary_payment_id,
			sp.amount as salary_paid_amount,
			sp.payment_date as salary_paid_at,
			coalesce(bp.amount, 0) as bonus_paid_amount
		from public.employees e
		left join public.employee_compensation ec on ec.employee_id = e.id
		left join salary_payments sp on sp.employee_id = e.id
		left join bonus_payments bp on bp.employee_id = e.id
		where e.status = 'active'
	)
	select jsonb_build_object(
		'canViewDetail', true,
		'periodMonth', target_period_month,
		'employeeCount', count(*),
		'monthlyBaseSalary', round(coalesce(sum(base_salary), 0), 2),
		'monthlySocialInsuranceSalary', round(coalesce(sum(social_insurance_salary), 0), 2),
		'salaryPaidThisPeriod', salary_paid_total,
		'bonusPaidThisPeriod', bonus_paid_total,
		'payrollDueCount', count(*) filter (where base_salary > 0 and salary_payment_id is null),
		'payrollDueAmount', round(coalesce(sum(
			case
				when base_salary > 0 and salary_payment_id is null then base_salary
				else 0
			end
		), 0), 2),
		'details', coalesce(jsonb_agg(
			jsonb_build_object(
				'employeeId', id,
				'employeeName', full_name,
				'department', department,
				'title', title,
				'baseSalary', base_salary,
				'socialInsuranceSalary', social_insurance_salary,
				'currency', salary_currency,
				'salaryPaidThisMonth', salary_payment_id is not null,
				'salaryPaymentId', salary_payment_id,
				'salaryPaidAmount', salary_paid_amount,
				'salaryPaidAt', salary_paid_at,
				'bonusPaidThisMonth', bonus_paid_amount
			)
			order by full_name
		), '[]'::jsonb)
	)
	into payroll
	from employee_rows;

	payroll_due_count := coalesce((payroll->>'payrollDueCount')::integer, 0);
	payroll_due_amount := coalesce((payroll->>'payrollDueAmount')::numeric, 0);

	overview := coalesce(dashboard->'overview', '{}'::jsonb);
	cash_balance := coalesce((overview->>'cashBalance')::numeric, 0);
	cash_asset_balance := greatest(cash_balance, 0);
	cash_overdraft := greatest(-cash_balance, 0);
	payables_value := coalesce((overview->>'payables')::numeric, 0);
	total_assets_value := round(
		coalesce((overview->>'totalAssets')::numeric, 0)
		- least(cash_balance, 0)
		+ company_asset_total,
		2
	);
	total_liabilities_value := round(payables_value + cash_overdraft, 2);

	dashboard := jsonb_set(
		dashboard,
		'{overview}',
		overview
			|| jsonb_build_object(
				'cashMovement', round(cash_net_movement, 2),
				'cashAssetBalance', round(cash_asset_balance, 2),
				'cashOverdraft', round(cash_overdraft, 2),
				'totalAssets', total_assets_value,
				'totalLiabilities', total_liabilities_value,
				'netAssets', round(total_assets_value - total_liabilities_value, 2),
				'companyAssets', company_asset_total,
				'companyAssetCount', company_asset_count,
				'pendingFuelExpenseCount', pending_fuel_count,
				'pendingFuelExpenseAmount', pending_fuel_amount,
				'payrollDueCount', payroll_due_count,
				'payrollDueAmount', payroll_due_amount
			),
		true
	);

	cash_flow := coalesce(dashboard->'cashFlow', '{}'::jsonb);
	dashboard := jsonb_set(
		dashboard,
		'{cashFlow}',
		cash_flow
			|| jsonb_build_object(
				'netCashMovement', round(cash_net_movement, 2),
				'salaryPayments', salary_paid_total,
				'bonusPayments', bonus_paid_total,
				'fuelExpenses', fuel_paid_total,
				'companyAssetPurchases', company_asset_cash_total
			),
		true
	);

	dashboard := jsonb_set(dashboard, '{payroll}', payroll, true);
	dashboard := jsonb_set(dashboard, '{fuelExpenses}', fuel_expenses, true);
	dashboard := jsonb_set(dashboard, '{companyAssets}', company_assets, true);

	return dashboard;
end;
$$;

do $$
begin
	if to_regclass('public.ceo_search_finance_vtable_without_reconciled_overview') is null then
		alter view public.ceo_search_finance_vtable
			rename to ceo_search_finance_vtable_without_reconciled_overview;
	end if;
end $$;

create or replace view public.ceo_search_finance_vtable
with (security_invoker = true)
as
with period_bounds as (
	select
		date_trunc('month', (now() at time zone 'Africa/Cairo'))::date as period_start,
		(now() at time zone 'Africa/Cairo')::date as period_end,
		date_trunc('month', (now() at time zone 'Africa/Cairo'))::date as target_period_month
),
cash_balance as (
	select round(coalesce(sum(jl.debit - jl.credit), 0), 2) as cash_balance
	from public.finance_journal_lines jl
	join public.finance_journal_entries je on je.id = jl.entry_id
	join public.finance_accounts account on account.id = jl.account_id
	where je.status = 'posted'
	  and account.code = '1010'
),
period_cash_flow as (
	select
		round(coalesce(sum(jl.debit) filter (where jl.source_type = 'customer_payment'), 0), 2) as customer_receipts,
		round(coalesce(sum(jl.credit) filter (where jl.source_type = 'supplier_payment'), 0), 2) as supplier_payments,
		round(coalesce(sum(jl.credit) filter (
			where jl.source_type = 'employee_payroll_payment'
			  and epp.payment_type = 'salary'
		), 0), 2) as salary_payments,
		round(coalesce(sum(jl.credit) filter (
			where jl.source_type = 'employee_payroll_payment'
			  and epp.payment_type = 'bonus'
		), 0), 2) as bonus_payments,
		round(coalesce(sum(jl.credit) filter (where jl.source_type = 'truck_fuel_expense'), 0), 2) as fuel_expenses,
		round(coalesce(sum(jl.credit) filter (where jl.source_type = 'company_asset'), 0), 2) as company_asset_purchases,
		round(coalesce(sum(jl.debit - jl.credit) filter (where jl.source_type = 'manual_adjustment'), 0), 2) as manual_cash_adjustments,
		round(coalesce(sum(jl.debit - jl.credit), 0), 2) as net_cash_movement
	from period_bounds pb
	join public.finance_journal_entries je
		on je.status = 'posted'
		and je.accounting_date between pb.period_start and pb.period_end
	join public.finance_journal_lines jl on jl.entry_id = je.id
	join public.finance_accounts account
		on account.id = jl.account_id
		and account.code = '1010'
	left join public.employee_payroll_payments epp
		on epp.id = jl.source_id
		and jl.source_type = 'employee_payroll_payment'
),
period_income as (
	select
		round(coalesce(sum(jl.credit - jl.debit) filter (where account.account_class = 'revenue'), 0), 2) as revenue,
		round(coalesce(sum(jl.debit - jl.credit) filter (where account.account_class = 'expense'), 0), 2) as expenses
	from period_bounds pb
	join public.finance_journal_entries je
		on je.status = 'posted'
		and je.accounting_date between pb.period_start and pb.period_end
	join public.finance_journal_lines jl on jl.entry_id = je.id
	join public.finance_accounts account on account.id = jl.account_id
),
inventory_summary as (
	select
		round(coalesce(sum(s.on_hand_quantity * coalesce(cost.raw_cost, p.price_range_min, 0)), 0), 2) as good_inventory_assets,
		count(*) filter (where cost.raw_cost is null)::integer as inventory_cost_review_count
	from public.inventory_stock s
	join public.products p on p.id = s.product_id
	left join lateral (
		select spl.raw_cost
		from public.supplier_product_links spl
		where spl.product_id = p.id
		order by spl.is_primary desc, spl.updated_at desc
		limit 1
	) cost on true
	where s.on_hand_quantity > 0
),
damage_summary as (
	select
		round(coalesce(sum(lot.remaining_quantity * lot.carrying_unit_value), 0), 2) as damaged_inventory_assets,
		count(*) filter (where lot.remaining_quantity > 0)::integer as damaged_inventory_lot_count
	from public.inventory_damage_lots lot
	where lot.remaining_quantity > 0
),
company_asset_summary as (
	select
		round(coalesce(sum(carrying_value) filter (where status = 'active'), 0), 2) as company_assets,
		count(*) filter (where status = 'active')::integer as company_asset_count,
		round(coalesce(sum(acquisition_cost) filter (
			where funding_source = 'cash_purchase'
			  and acquisition_date between (select period_start from period_bounds) and (select period_end from period_bounds)
		), 0), 2) as company_asset_purchases
	from public.company_assets
),
receivable_summary as (
	with payment_totals as (
		select order_id, coalesce(sum(amount), 0) as paid
		from public.customer_payments
		where status = 'recorded'
		group by order_id
	)
	select round(coalesce(sum(greatest(o.total_amount - coalesce(pt.paid, 0), 0)), 0), 2) as receivables
	from public.orders o
	left join payment_totals pt on pt.order_id = o.id
	where o.status::text not in ('rejected', 'canceled')
),
payable_summary as (
	with payment_totals as (
		select refill_request_id, coalesce(sum(amount), 0) as paid
		from public.supplier_payments
		where status = 'recorded'
		group by refill_request_id
	)
	select round(coalesce(sum(greatest((rr.quantity * rr.unit_cost) - coalesce(pt.paid, 0), 0)), 0), 2) as payables
	from public.refill_requests rr
	left join payment_totals pt on pt.refill_request_id = rr.id
	where rr.status::text not in ('rejected', 'canceled')
),
review_queue as (
	select (
		(select count(*) from public.finance_journal_entries where status = 'draft')
	) ::integer as unposted_count,
	(
		(select count(*) from public.finance_journal_entries where status = 'draft' and requires_accountant_signoff)
		+
		(select count(*) from public.finance_adjustments where status = 'review_required')
	) ::integer as review_required_count
),
fuel_queue as (
	select
		count(*) filter (where status = 'submitted')::integer as pending_fuel_expense_count,
		round(coalesce(sum(amount) filter (where status = 'submitted'), 0), 2) as pending_fuel_expense_amount
	from public.truck_fuel_expenses
),
payroll_queue as (
	with salary_payments as (
		select distinct on (employee_id) employee_id
		from public.employee_payroll_payments, period_bounds pb
		where payment_type = 'salary'
		  and status = 'paid'
		  and period_month = pb.target_period_month
		order by employee_id, created_at desc
	),
	employee_rows as (
		select
			e.id,
			coalesce(ec.base_salary, 0) as base_salary,
			sp.employee_id is not null as salary_paid
		from public.employees e
		left join public.employee_compensation ec on ec.employee_id = e.id
		left join salary_payments sp on sp.employee_id = e.id
		where e.status = 'active'
	)
	select
		count(*) filter (where base_salary > 0)::integer as payroll_employee_count,
		count(*) filter (where base_salary > 0 and not salary_paid)::integer as payroll_due_count,
		round(coalesce(sum(case when base_salary > 0 and not salary_paid then base_salary else 0 end), 0), 2) as payroll_due_amount
	from employee_rows
),
overview as (
	select
		pb.period_start,
		pb.period_end,
		cb.cash_balance,
		greatest(cb.cash_balance, 0) as cash_asset_balance,
		greatest(-cb.cash_balance, 0) as cash_overdraft,
		pcf.customer_receipts,
		pcf.supplier_payments,
		pcf.salary_payments,
		pcf.bonus_payments,
		pcf.fuel_expenses,
		coalesce(ca.company_asset_purchases, pcf.company_asset_purchases) as company_asset_purchases,
		pcf.manual_cash_adjustments,
		pcf.net_cash_movement,
		pi.revenue,
		pi.expenses,
		case
			when rq.review_required_count = 0 then round(pi.revenue - pi.expenses, 2)
			else null
		end as net_performance,
		inv.good_inventory_assets,
		dmg.damaged_inventory_assets,
		round(inv.good_inventory_assets + dmg.damaged_inventory_assets, 2) as inventory_assets,
		coalesce(ca.company_assets, 0) as company_assets,
		round(greatest(cb.cash_balance, 0) + rs.receivables + inv.good_inventory_assets + dmg.damaged_inventory_assets + coalesce(ca.company_assets, 0), 2) as total_assets,
		round(ps.payables + greatest(-cb.cash_balance, 0), 2) as total_liabilities,
		round(greatest(cb.cash_balance, 0) + rs.receivables + inv.good_inventory_assets + dmg.damaged_inventory_assets + coalesce(ca.company_assets, 0) - ps.payables - greatest(-cb.cash_balance, 0), 2) as net_assets,
		rs.receivables,
		ps.payables,
		rq.unposted_count,
		rq.review_required_count,
		inv.inventory_cost_review_count,
		dmg.damaged_inventory_lot_count,
		coalesce(ca.company_asset_count, 0) as company_asset_count,
		fq.pending_fuel_expense_count,
		fq.pending_fuel_expense_amount,
		pay.payroll_employee_count,
		pay.payroll_due_count,
		pay.payroll_due_amount
	from period_bounds pb
	cross join cash_balance cb
	cross join period_cash_flow pcf
	cross join period_income pi
	cross join inventory_summary inv
	cross join damage_summary dmg
	cross join company_asset_summary ca
	cross join receivable_summary rs
	cross join payable_summary ps
	cross join review_queue rq
	cross join fuel_queue fq
	cross join payroll_queue pay
)
select
	'finance'::text as entity_type,
	'accounting_overview:current'::text as entity_id,
	'Finance accounting overview'::text as title,
	'Balance sheet, work queue, and operating movement'::text as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'finance_accounting_overview',
		'period_start', overview.period_start,
		'period_end', overview.period_end,
		'cash_balance', overview.cash_balance,
		'cash_asset_balance', overview.cash_asset_balance,
		'cash_overdraft', overview.cash_overdraft,
		'cash_movement', overview.net_cash_movement,
		'inventory_assets', overview.inventory_assets,
		'damaged_inventory_assets', overview.damaged_inventory_assets,
		'damaged_inventory_lot_count', overview.damaged_inventory_lot_count,
		'company_assets', overview.company_assets,
		'company_asset_count', overview.company_asset_count,
		'total_assets', overview.total_assets,
		'total_liabilities', overview.total_liabilities,
		'net_assets', overview.net_assets,
		'receivables', overview.receivables,
		'payables', overview.payables,
		'unposted_count', overview.unposted_count,
		'review_required_count', overview.review_required_count,
		'inventory_cost_review_count', overview.inventory_cost_review_count,
		'pending_fuel_expense_count', overview.pending_fuel_expense_count,
		'pending_fuel_expense_amount', overview.pending_fuel_expense_amount,
		'payroll_employee_count', overview.payroll_employee_count,
		'payroll_due_count', overview.payroll_due_count,
		'payroll_due_amount', overview.payroll_due_amount
	)) as metadata,
	now() as sort_at,
	concat_ws(
		' ',
		'finance',
		'accounting',
		'overview',
		'balance sheet',
		'assets',
		'liabilities',
		'cash overdraft',
		'receivables',
		'payables',
		'damaged inventory',
		'company assets',
		'fuel receipts',
		'payroll due',
		'work queue',
		overview.cash_balance::text,
		overview.cash_asset_balance::text,
		overview.cash_overdraft::text,
		overview.net_cash_movement::text,
		overview.inventory_assets::text,
		overview.damaged_inventory_assets::text,
		overview.company_assets::text,
		overview.total_assets::text,
		overview.total_liabilities::text,
		overview.net_assets::text,
		overview.receivables::text,
		overview.payables::text,
		overview.unposted_count::text,
		overview.review_required_count::text,
		overview.pending_fuel_expense_count::text,
		overview.pending_fuel_expense_amount::text,
		overview.payroll_due_count::text,
		overview.payroll_due_amount::text,
		public.ceo_search_date_terms(overview.period_start::timestamptz),
		public.ceo_search_date_terms(overview.period_end::timestamptz)
	) as search_text
from overview
where public.can_access_ceo_search()
union all
select
	'finance'::text as entity_type,
	'income_statement:current'::text as entity_id,
	'Income statement - current period'::text as title,
	case
		when overview.net_performance is null then 'Requires sign-off'
		else concat('Net performance ', overview.net_performance::text, ' EGP')
	end as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'finance_income_statement',
		'period_start', overview.period_start,
		'period_end', overview.period_end,
		'revenue', overview.revenue,
		'expenses', overview.expenses,
		'net_performance', overview.net_performance,
		'review_required_count', overview.review_required_count
	)) as metadata,
	now() as sort_at,
	concat_ws(
		' ',
		'finance',
		'accounting',
		'income statement',
		'revenue',
		'expense',
		'net performance',
		'signoff',
		'review required',
		overview.revenue::text,
		overview.expenses::text,
		overview.net_performance::text,
		overview.review_required_count::text,
		public.ceo_search_date_terms(overview.period_start::timestamptz),
		public.ceo_search_date_terms(overview.period_end::timestamptz)
	) as search_text
from overview
where public.can_access_ceo_search()
union all
select
	'finance'::text as entity_type,
	'cash_flow:current'::text as entity_id,
	'Cash flow - current period'::text as title,
	concat('Net cash movement ', overview.net_cash_movement::text, ' EGP') as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'finance_cash_flow',
		'period_start', overview.period_start,
		'period_end', overview.period_end,
		'customer_receipts', overview.customer_receipts,
		'supplier_payments', overview.supplier_payments,
		'salary_payments', overview.salary_payments,
		'bonus_payments', overview.bonus_payments,
		'fuel_expenses', overview.fuel_expenses,
		'company_asset_purchases', overview.company_asset_purchases,
		'manual_cash_adjustments', overview.manual_cash_adjustments,
		'net_cash_movement', overview.net_cash_movement,
		'cash_balance', overview.cash_balance
	)) as metadata,
	now() as sort_at,
	concat_ws(
		' ',
		'finance',
		'accounting',
		'cash flow',
		'cash balance',
		'customer receipts',
		'supplier payments',
		'salary payments',
		'bonus payments',
		'fuel expenses',
		'company asset purchases',
		'manual cash adjustments',
		overview.customer_receipts::text,
		overview.supplier_payments::text,
		overview.salary_payments::text,
		overview.bonus_payments::text,
		overview.fuel_expenses::text,
		overview.company_asset_purchases::text,
		overview.manual_cash_adjustments::text,
		overview.net_cash_movement::text,
		overview.cash_balance::text,
		public.ceo_search_date_terms(overview.period_start::timestamptz),
		public.ceo_search_date_terms(overview.period_end::timestamptz)
	) as search_text
from overview
where public.can_access_ceo_search()
union all
select *
from public.ceo_search_finance_vtable_without_reconciled_overview
where coalesce(metadata->>'source', '') not in (
	'finance_accounting_overview',
	'finance_income_statement',
	'finance_cash_flow'
);

revoke all privileges on table public.ceo_search_finance_vtable
	from anon, authenticated, public;
revoke all privileges on table public.ceo_search_finance_vtable_without_reconciled_overview
	from anon, authenticated, public;

insert into app_private.ceo_search_refresh_state (id, dirty, dirty_at)
values (true, true, now())
on conflict (id) do update set
	dirty = true,
	dirty_at = excluded.dirty_at;
