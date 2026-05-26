create or replace view public.ceo_search_finance_vtable
with (security_invoker = true)
as
with period_bounds as (
	select
		date_trunc('month', (now() at time zone 'Africa/Cairo'))::date as period_start,
		(now() at time zone 'Africa/Cairo')::date as period_end
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
		round(coalesce(sum(jl.debit - jl.credit) filter (where jl.source_type = 'manual_adjustment'), 0), 2) as manual_cash_adjustments
	from period_bounds pb
	join public.finance_journal_entries je
		on je.status = 'posted'
		and je.accounting_date between pb.period_start and pb.period_end
	join public.finance_journal_lines jl on jl.entry_id = je.id
	join public.finance_accounts account
		on account.id = jl.account_id
		and account.code = '1010'
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
		round(coalesce(sum(s.on_hand_quantity * coalesce(cost.raw_cost, p.price_range_min, 0)), 0), 2) as inventory_assets,
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
payroll_summary as (
	select count(*)::integer as payroll_employee_count
	from public.employee_compensation ec
	where coalesce(ec.base_salary, 0) > 0
	   or coalesce(ec.social_insurance_salary, 0) > 0
),
overview as (
	select
		pb.period_start,
		pb.period_end,
		cb.cash_balance,
		pcf.customer_receipts,
		pcf.supplier_payments,
		pcf.manual_cash_adjustments,
		round(pcf.customer_receipts - pcf.supplier_payments + pcf.manual_cash_adjustments, 2) as net_cash_movement,
		pi.revenue,
		pi.expenses,
		round(pi.revenue - pi.expenses, 2) as net_performance,
		inv.inventory_assets,
		round(cb.cash_balance + rs.receivables + inv.inventory_assets, 2) as total_assets,
		rs.receivables,
		ps.payables,
		rq.unposted_count,
		rq.review_required_count,
		inv.inventory_cost_review_count,
		pay.payroll_employee_count
	from period_bounds pb
	cross join cash_balance cb
	cross join period_cash_flow pcf
	cross join period_income pi
	cross join inventory_summary inv
	cross join receivable_summary rs
	cross join payable_summary ps
	cross join review_queue rq
	cross join payroll_summary pay
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
		'cash_movement', overview.net_cash_movement,
		'inventory_assets', overview.inventory_assets,
		'total_assets', overview.total_assets,
		'receivables', overview.receivables,
		'payables', overview.payables,
		'unposted_count', overview.unposted_count,
		'review_required_count', overview.review_required_count,
		'inventory_cost_review_count', overview.inventory_cost_review_count,
		'payroll_employee_count', overview.payroll_employee_count
	)) as metadata,
	now() as sort_at,
	concat_ws(
		' ',
		'finance',
		'accounting',
		'overview',
		'balance sheet',
		'assets',
		'receivables',
		'payables',
		'work queue',
		overview.cash_balance::text,
		overview.net_cash_movement::text,
		overview.inventory_assets::text,
		overview.total_assets::text,
		overview.receivables::text,
		overview.payables::text,
		overview.unposted_count::text,
		overview.review_required_count::text,
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
	concat('Net performance ', overview.net_performance::text, ' EGP') as subtitle,
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
		overview.revenue::text,
		overview.expenses::text,
		overview.net_performance::text,
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
		'manual cash adjustments',
		overview.customer_receipts::text,
		overview.supplier_payments::text,
		overview.manual_cash_adjustments::text,
		overview.net_cash_movement::text,
		overview.cash_balance::text,
		public.ceo_search_date_terms(overview.period_start::timestamptz),
		public.ceo_search_date_terms(overview.period_end::timestamptz)
	) as search_text
from overview
where public.can_access_ceo_search()
union all
select
	'finance'::text as entity_type,
	concat('finance_account:', account.id::text) as entity_id,
	concat('Finance account ', account.code, ' - ', account.name) as title,
	account.account_class::text as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'finance_account',
		'account_code', account.code,
		'account_name', account.name,
		'account_class', account.account_class,
		'normal_balance', account.normal_balance,
		'parent_account_code', parent.code,
		'parent_account_name', parent.name,
		'is_active', account.is_active,
		'is_system', account.is_system,
		'created_at', account.created_at,
		'updated_at', account.updated_at
	)) as metadata,
	account.updated_at as sort_at,
	concat_ws(
		' ',
		'finance',
		'accounting',
		'chart of accounts',
		account.code,
		account.name,
		account.account_class::text,
		account.normal_balance::text,
		parent.code,
		parent.name,
		public.ceo_search_date_terms(account.created_at),
		public.ceo_search_date_terms(account.updated_at)
	) as search_text
from public.finance_accounts account
left join public.finance_accounts parent on parent.id = account.parent_account_id
where public.can_access_ceo_search()
union all
select
	'finance'::text as entity_type,
	concat('inventory_asset:', p.id::text) as entity_id,
	concat('Inventory asset - ', p.name) as title,
	case when asset.needs_cost_review then 'needs cost review' else 'valued' end as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'finance_inventory_asset',
		'product_id', p.id,
		'product_sku', p.sku,
		'product_name', p.name,
		'product_name_ar', p.name_ar,
		'category', p.category,
		'subcategory', p.subcategory,
		'brand', p.brand,
		'unit_of_measure', p.unit_of_measure,
		'on_hand_quantity', s.on_hand_quantity,
		'reserved_quantity', s.reserved_quantity,
		'available_quantity', s.available_quantity,
		'unit_cost', asset.unit_cost,
		'valuation', asset.valuation,
		'primary_supplier', asset.supplier_name,
		'needs_cost_review', asset.needs_cost_review,
		'stock_updated_at', s.updated_at,
		'product_updated_at', p.updated_at
	)) as metadata,
	greatest(s.updated_at, p.updated_at) as sort_at,
	concat_ws(
		' ',
		'finance',
		'accounting',
		'inventory asset',
		'asset register',
		'valuation',
		case when asset.needs_cost_review then 'cost review' end,
		p.sku,
		p.slug,
		p.name,
		p.name_ar,
		p.category,
		p.subcategory,
		p.brand,
		p.manufacturer,
		p.unit_of_measure,
		s.on_hand_quantity::text,
		s.reserved_quantity::text,
		s.available_quantity::text,
		asset.unit_cost::text,
		asset.valuation::text,
		asset.supplier_name,
		public.ceo_search_date_terms(s.updated_at),
		public.ceo_search_date_terms(p.updated_at)
	) as search_text
from public.inventory_stock s
join public.products p on p.id = s.product_id
left join lateral (
	select spl.raw_cost, sup.name as supplier_name
	from public.supplier_product_links spl
	left join public.suppliers sup on sup.id = spl.supplier_id
	where spl.product_id = p.id
	order by spl.is_primary desc, spl.updated_at desc
	limit 1
) cost on true
cross join lateral (
	select
		round(coalesce(cost.raw_cost, p.price_range_min, 0), 2) as unit_cost,
		round(s.on_hand_quantity * coalesce(cost.raw_cost, p.price_range_min, 0), 2) as valuation,
		cost.raw_cost is null as needs_cost_review,
		cost.supplier_name
) asset
where public.can_access_ceo_search()
  and s.on_hand_quantity > 0
union all
select
	'finance'::text as entity_type,
	concat('receivable:', o.id::text) as entity_id,
	concat('Receivable - ', o.order_number) as title,
	receivable.payment_status as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'finance_receivable',
		'order_id', o.id,
		'order_number', o.order_number,
		'order_status', o.status,
		'customer_name', c.company_name,
		'contact_name', c.contact_name,
		'phone', c.phone,
		'email', c.email,
		'total_due', receivable.total_due,
		'amount_paid', receivable.amount_paid,
		'remaining_due', receivable.remaining_due,
		'payment_status', receivable.payment_status,
		'last_payment_at', payments.last_payment_at,
		'latest_follow_up_state', followup.follow_up_state,
		'latest_follow_up_due_at', followup.follow_up_due_at,
		'latest_follow_up_outcome', followup.outcome,
		'created_at', o.created_at,
		'updated_at', o.updated_at,
		'delivered_at', o.delivered_at
	)) as metadata,
	sort_values.sort_at,
	concat_ws(
		' ',
		'finance',
		'accounting',
		'receivable',
		'customer receivable',
		'customer order',
		receivable.payment_status,
		o.order_number,
		o.status::text,
		c.company_name,
		c.contact_name,
		c.phone,
		c.email,
		receivable.total_due::text,
		receivable.amount_paid::text,
		receivable.remaining_due::text,
		followup.contact_channel,
		followup.outcome,
		followup.notes,
		followup.follow_up_state,
		public.ceo_search_date_terms(o.created_at),
		public.ceo_search_date_terms(o.updated_at),
		public.ceo_search_date_terms(o.delivered_at),
		public.ceo_search_date_terms(payments.last_payment_at),
		public.ceo_search_date_terms(followup.follow_up_due_at)
	) as search_text
from public.orders o
left join public.customers c on c.id = o.customer_id
left join lateral (
	select
		coalesce(sum(cp.amount), 0) as amount_paid,
		max(cp.created_at) as last_payment_at
	from public.customer_payments cp
	where cp.order_id = o.id
	  and cp.status = 'recorded'
) payments on true
left join lateral (
	select fpf.*
	from public.finance_payment_followups fpf
	where fpf.order_id = o.id
	order by fpf.created_at desc
	limit 1
) followup on true
cross join lateral (
	select
		round(coalesce(o.total_amount, 0), 2) as total_due,
		round(least(coalesce(o.total_amount, 0), coalesce(payments.amount_paid, 0)), 2) as amount_paid
) receivable_amounts
cross join lateral (
	select
		receivable_amounts.total_due,
		receivable_amounts.amount_paid,
		round(greatest(receivable_amounts.total_due - receivable_amounts.amount_paid, 0), 2) as remaining_due,
		case
			when receivable_amounts.total_due <= 0
				or receivable_amounts.total_due - receivable_amounts.amount_paid <= 0 then 'paid'
			when receivable_amounts.amount_paid > 0 then 'partial'
			else 'unpaid'
		end as payment_status
) receivable
cross join lateral (
	select max(value) as sort_at
	from (values (o.updated_at), (o.created_at), (o.delivered_at), (payments.last_payment_at), (followup.created_at)) as values(value)
) sort_values
where public.can_access_ceo_search()
  and o.status::text not in ('rejected', 'canceled')
union all
select
	'finance'::text as entity_type,
	concat('payable:', rr.id::text) as entity_id,
	concat('Payable - ', coalesce(s.name, 'Supplier'), ' - ', coalesce(p.name, 'Refill')) as title,
	payable.payment_status as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'finance_payable',
		'refill_request_id', rr.id,
		'refill_status', rr.status,
		'supplier_name', s.name,
		'phone', s.phone,
		'email', s.email,
		'product_name', p.name,
		'product_sku', p.sku,
		'unit_of_measure', p.unit_of_measure,
		'quantity', rr.quantity,
		'unit_cost', rr.unit_cost,
		'total_due', payable.total_due,
		'amount_paid', payable.amount_paid,
		'remaining_due', payable.remaining_due,
		'payment_status', payable.payment_status,
		'last_payment_at', payments.last_payment_at,
		'latest_follow_up_state', followup.follow_up_state,
		'latest_follow_up_due_at', followup.follow_up_due_at,
		'latest_follow_up_outcome', followup.outcome,
		'created_at', rr.created_at,
		'updated_at', rr.updated_at
	)) as metadata,
	sort_values.sort_at,
	concat_ws(
		' ',
		'finance',
		'accounting',
		'payable',
		'supplier payable',
		'refill request',
		payable.payment_status,
		rr.status::text,
		s.name,
		s.phone,
		s.email,
		p.sku,
		p.slug,
		p.name,
		p.name_ar,
		p.category,
		p.subcategory,
		p.brand,
		p.manufacturer,
		rr.quantity::text,
		rr.unit_cost::text,
		payable.total_due::text,
		payable.amount_paid::text,
		payable.remaining_due::text,
		followup.contact_channel,
		followup.outcome,
		followup.notes,
		followup.follow_up_state,
		public.ceo_search_date_terms(rr.created_at),
		public.ceo_search_date_terms(rr.updated_at),
		public.ceo_search_date_terms(payments.last_payment_at),
		public.ceo_search_date_terms(followup.follow_up_due_at)
	) as search_text
from public.refill_requests rr
left join public.suppliers s on s.id = rr.supplier_id
left join public.products p on p.id = rr.product_id
left join lateral (
	select
		coalesce(sum(sp.amount), 0) as amount_paid,
		max(sp.created_at) as last_payment_at
	from public.supplier_payments sp
	where sp.refill_request_id = rr.id
	  and sp.status = 'recorded'
) payments on true
left join lateral (
	select fpf.*
	from public.finance_payment_followups fpf
	where fpf.refill_request_id = rr.id
	order by fpf.created_at desc
	limit 1
) followup on true
cross join lateral (
	select
		round(coalesce(rr.quantity, 0) * coalesce(rr.unit_cost, 0), 2) as total_due,
		round(least(coalesce(rr.quantity, 0) * coalesce(rr.unit_cost, 0), coalesce(payments.amount_paid, 0)), 2) as amount_paid
) payable_amounts
cross join lateral (
	select
		payable_amounts.total_due,
		payable_amounts.amount_paid,
		round(greatest(payable_amounts.total_due - payable_amounts.amount_paid, 0), 2) as remaining_due,
		case
			when payable_amounts.total_due <= 0
				or payable_amounts.total_due - payable_amounts.amount_paid <= 0 then 'paid'
			when payable_amounts.amount_paid > 0 then 'partial'
			else 'unpaid'
		end as payment_status
) payable
cross join lateral (
	select max(value) as sort_at
	from (values (rr.updated_at), (rr.created_at), (payments.last_payment_at), (followup.created_at)) as values(value)
) sort_values
where public.can_access_ceo_search()
  and rr.status::text not in ('rejected', 'canceled')
union all
select
	'finance'::text as entity_type,
	concat('finance_followup:', fpf.id::text) as entity_id,
	concat('Finance follow-up - ', coalesce(o.order_number, s.name, p.name, fpf.target_type)) as title,
	fpf.follow_up_state as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'finance_payment_followup',
		'target_type', fpf.target_type,
		'order_id', fpf.order_id,
		'order_number', o.order_number,
		'refill_request_id', fpf.refill_request_id,
		'supplier_name', s.name,
		'product_name', p.name,
		'contact_channel', fpf.contact_channel,
		'outcome', fpf.outcome,
		'notes', fpf.notes,
		'follow_up_state', fpf.follow_up_state,
		'follow_up_due_at', fpf.follow_up_due_at,
		'recorded_by', recorder.full_name,
		'created_at', fpf.created_at,
		'updated_at', fpf.updated_at
	)) as metadata,
	greatest(fpf.updated_at, fpf.created_at) as sort_at,
	concat_ws(
		' ',
		'finance',
		'payment followup',
		'collection follow up',
		fpf.target_type,
		fpf.contact_channel,
		fpf.outcome,
		fpf.notes,
		fpf.follow_up_state,
		o.order_number,
		c.company_name,
		s.name,
		p.name,
		recorder.full_name,
		public.ceo_search_date_terms(fpf.follow_up_due_at),
		public.ceo_search_date_terms(fpf.created_at),
		public.ceo_search_date_terms(fpf.updated_at)
	) as search_text
from public.finance_payment_followups fpf
left join public.orders o on o.id = fpf.order_id
left join public.customers c on c.id = o.customer_id
left join public.refill_requests rr on rr.id = fpf.refill_request_id
left join public.suppliers s on s.id = rr.supplier_id
left join public.products p on p.id = rr.product_id
left join public.employees recorder on recorder.id = fpf.recorded_by_employee_id
where public.can_access_ceo_search()
union all
select
	'finance'::text as entity_type,
	concat('finance_adjustment:', adj.id::text) as entity_id,
	concat('Finance adjustment - ', adj.category) as title,
	adj.status::text as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'finance_adjustment',
		'adjustment_type', adj.adjustment_type,
		'category', adj.category,
		'description', adj.description,
		'amount', adj.amount,
		'currency', adj.currency,
		'counterparty_type', adj.counterparty_type,
		'counterparty_id', adj.counterparty_id,
		'proof_document_id', adj.proof_document_id,
		'proof_path', adj.proof_path,
		'status', adj.status,
		'journal_entry_id', adj.journal_entry_id,
		'created_by', creator.full_name,
		'posted_by', poster.full_name,
		'posted_at', adj.posted_at,
		'voided_at', adj.voided_at,
		'void_reason', adj.void_reason,
		'created_at', adj.created_at,
		'updated_at', adj.updated_at
	)) as metadata,
	greatest(adj.updated_at, adj.created_at, coalesce(adj.posted_at, adj.created_at), coalesce(adj.voided_at, adj.created_at)) as sort_at,
	concat_ws(
		' ',
		'finance',
		'accounting',
		'adjustment',
		adj.adjustment_type::text,
		adj.category,
		adj.description,
		adj.amount::text,
		adj.currency,
		adj.counterparty_type,
		adj.status::text,
		adj.proof_path,
		creator.full_name,
		poster.full_name,
		public.ceo_search_date_terms(adj.created_at),
		public.ceo_search_date_terms(adj.updated_at),
		public.ceo_search_date_terms(adj.posted_at),
		public.ceo_search_date_terms(adj.voided_at)
	) as search_text
from public.finance_adjustments adj
left join public.employees creator on creator.id = adj.created_by_employee_id
left join public.employees poster on poster.id = adj.posted_by_employee_id
where public.can_access_ceo_search()
union all
select
	'finance'::text as entity_type,
	concat('journal_entry:', je.id::text) as entity_id,
	concat('Journal entry ', je.entry_number) as title,
	je.status::text as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'finance_journal_entry',
		'entry_number', je.entry_number,
		'accounting_date', je.accounting_date,
		'accounting_period', je.accounting_period,
		'status', je.status,
		'source_type', je.source_type,
		'source_id', je.source_id,
		'description', je.description,
		'actor', actor.full_name,
		'requires_accountant_signoff', je.requires_accountant_signoff,
		'signoff_reason', je.signoff_reason,
		'posted_at', je.posted_at,
		'posted_by', poster.full_name,
		'voided_at', je.voided_at,
		'voided_by', voider.full_name,
		'void_reason', je.void_reason,
		'reversed_at', je.reversed_at,
		'reversed_by', reverser.full_name,
		'reversal_entry_id', je.reversal_entry_id,
		'reversed_from_entry_id', je.reversed_from_entry_id,
		'total_debit', totals.total_debit,
		'total_credit', totals.total_credit,
		'line_count', totals.line_count,
		'lines', lines.lines,
		'source_links', source_links.links,
		'proof_links', proof_links.links,
		'created_at', je.created_at,
		'updated_at', je.updated_at
	)) as metadata,
	greatest(
		je.updated_at,
		je.created_at,
		coalesce(je.posted_at, je.created_at),
		coalesce(je.voided_at, je.created_at),
		coalesce(je.reversed_at, je.created_at)
	) as sort_at,
	concat_ws(
		' ',
		'finance',
		'accounting',
		'journal',
		'journal entry',
		je.entry_number,
		je.status::text,
		je.accounting_period,
		je.source_type::text,
		je.description,
		actor.full_name,
		poster.full_name,
		voider.full_name,
		reverser.full_name,
		je.signoff_reason,
		totals.total_debit::text,
		totals.total_credit::text,
		lines.line_search,
		source_links.link_search,
		proof_links.link_search,
		public.ceo_search_date_terms(je.accounting_date::timestamptz),
		public.ceo_search_date_terms(je.created_at),
		public.ceo_search_date_terms(je.updated_at),
		public.ceo_search_date_terms(je.posted_at),
		public.ceo_search_date_terms(je.voided_at),
		public.ceo_search_date_terms(je.reversed_at)
	) as search_text
from public.finance_journal_entries je
left join public.employees actor on actor.id = je.actor_employee_id
left join public.employees poster on poster.id = je.posted_by_employee_id
left join public.employees voider on voider.id = je.voided_by_employee_id
left join public.employees reverser on reverser.id = je.reversed_by_employee_id
left join lateral (
	select
		round(coalesce(sum(jl.debit), 0), 2) as total_debit,
		round(coalesce(sum(jl.credit), 0), 2) as total_credit,
		count(*)::integer as line_count
	from public.finance_journal_lines jl
	where jl.entry_id = je.id
) totals on true
left join lateral (
	select
		coalesce(jsonb_agg(
			jsonb_strip_nulls(jsonb_build_object(
				'line_number', jl.line_number,
				'account_code', account.code,
				'account_name', account.name,
				'account_class', account.account_class,
				'debit', jl.debit,
				'credit', jl.credit,
				'currency', jl.currency,
				'memo', jl.memo,
				'counterparty_type', jl.counterparty_type,
				'counterparty_id', jl.counterparty_id,
				'source_type', jl.source_type,
				'source_id', jl.source_id
			))
			order by jl.line_number
		), '[]'::jsonb) as lines,
		string_agg(
			concat_ws(
				' ',
				jl.line_number::text,
				account.code,
				account.name,
				account.account_class::text,
				jl.debit::text,
				jl.credit::text,
				jl.currency,
				jl.memo,
				jl.counterparty_type,
				jl.source_type::text
			),
			' ' order by jl.line_number
		) as line_search
	from public.finance_journal_lines jl
	join public.finance_accounts account on account.id = jl.account_id
	where jl.entry_id = je.id
) lines on true
left join lateral (
	select
		coalesce(jsonb_agg(
			jsonb_strip_nulls(jsonb_build_object(
				'source_type', link.source_type,
				'source_id', link.source_id,
				'link_role', link.link_role,
				'source_label', link.source_label,
				'created_at', link.created_at
			))
			order by link.created_at, link.link_role
		), '[]'::jsonb) as links,
		string_agg(concat_ws(' ', link.source_type::text, link.link_role, link.source_label), ' ' order by link.created_at) as link_search
	from public.finance_journal_source_links link
	where link.entry_id = je.id
) source_links on true
left join lateral (
	select
		coalesce(jsonb_agg(
			jsonb_strip_nulls(jsonb_build_object(
				'proof_document_id', proof.proof_document_id,
				'proof_path', proof.proof_path,
				'link_role', proof.link_role,
				'created_at', proof.created_at
			))
			order by proof.created_at, proof.link_role
		), '[]'::jsonb) as links,
		string_agg(concat_ws(' ', proof.proof_path, proof.link_role, proof.proof_document_id::text), ' ' order by proof.created_at) as link_search
	from public.finance_journal_proof_links proof
	where proof.entry_id = je.id
) proof_links on true
where public.can_access_ceo_search();

create or replace view public.ceo_search_finance_payroll_vtable
with (security_invoker = true)
as
select
	'finance_payroll'::text as entity_type,
	concat('finance_payroll:', ec.employee_id::text) as entity_id,
	concat('Payroll - ', e.full_name) as title,
	coalesce(ec.department, 'Payroll') as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'finance_payroll',
		'employee_id', ec.employee_id,
		'employee_name', e.full_name,
		'employee_status', e.status,
		'department', ec.department,
		'title', ec.title,
		'hire_date', ec.hire_date,
		'base_salary', ec.base_salary,
		'social_insurance_salary', ec.social_insurance_salary,
		'salary_currency', ec.salary_currency,
		'updated_by', updater.full_name,
		'created_at', ec.created_at,
		'updated_at', ec.updated_at
	)) as metadata,
	greatest(e.updated_at, ec.updated_at, ec.created_at) as sort_at,
	concat_ws(
		' ',
		'finance',
		'payroll',
		'salary',
		'social insurance',
		e.full_name,
		e.status::text,
		ec.department,
		ec.title,
		ec.base_salary::text,
		ec.social_insurance_salary::text,
		ec.salary_currency,
		updater.full_name,
		public.ceo_search_date_terms(ec.hire_date),
		public.ceo_search_date_terms(ec.created_at),
		public.ceo_search_date_terms(ec.updated_at)
	) as search_text
from public.employee_compensation ec
join public.employees e on e.id = ec.employee_id
left join public.employees updater on updater.id = ec.updated_by_employee_id
where public.can_access_ceo_search()
  and (
	coalesce(ec.base_salary, 0) > 0
	or coalesce(ec.social_insurance_salary, 0) > 0
  );

revoke all privileges on table public.ceo_search_finance_vtable
	from anon, authenticated, public;
revoke all privileges on table public.ceo_search_finance_payroll_vtable
	from anon, authenticated, public;

create or replace function app_private.refresh_ceo_search_documents()
returns integer
language plpgsql
security definer
set search_path = public, app_private, extensions
as $$
declare
	search_user_id uuid;
	refreshed_count integer := 0;
begin
	select e.user_id into search_user_id
	from public.employees e
	where e.user_id is not null
	  and e.status = 'active'
	  and (
		e.is_ceo
		or exists (
			select 1
			from public.employee_roles er
			where er.employee_id = e.id
			  and er.role = 'ceo'
		)
		or exists (
			select 1
			from public.employee_panel_permissions ep
			where ep.employee_id = e.id
			  and ep.panel = 'search'
			  and ep.can_read
		)
	  )
	order by e.is_ceo desc, e.created_at asc
	limit 1;

	if search_user_id is null then
		select count(*)::integer into refreshed_count
		from public.ceo_search_documents;
		return refreshed_count;
	end if;

	perform set_config('request.jwt.claim.sub', search_user_id::text, true);
	perform set_config(
		'request.jwt.claims',
		jsonb_build_object('sub', search_user_id::text, 'role', 'authenticated')::text,
		true
	);

	with source_rows as materialized (
		select distinct on (source_candidates.entity_type, source_candidates.entity_id)
			source_candidates.entity_type,
			source_candidates.entity_id,
			coalesce(source_candidates.title, source_candidates.entity_type) as title,
			source_candidates.subtitle,
			coalesce(source_candidates.metadata, '{}'::jsonb) as metadata,
			source_candidates.sort_at,
			coalesce(source_candidates.search_text, '') as search_text,
			to_tsvector(
				'simple'::regconfig,
				concat_ws(
					' ',
					source_candidates.entity_type,
					source_candidates.entity_id,
					source_candidates.title,
					source_candidates.subtitle,
					source_candidates.search_text,
					source_candidates.metadata::text
				)
			) as search_vector
		from (
			select * from public.ceo_search_order_vtable
			union all
			select * from public.ceo_search_quote_request_vtable
			union all
			select * from public.ceo_search_customer_vtable
			union all
			select * from public.ceo_search_payment_vtable
			union all
			select * from public.ceo_search_finance_vtable
			union all
			select * from public.ceo_search_finance_payroll_vtable
			union all
			select * from public.ceo_search_inventory_vtable
			union all
			select * from public.ceo_search_warehouse_vtable
			union all
			select * from public.ceo_search_receiving_vtable
			union all
			select * from public.ceo_search_dispatch_vtable
			union all
			select * from public.ceo_search_driver_vtable
			union all
			select * from public.ceo_search_support_vtable
			union all
			select * from public.ceo_search_supplier_vtable
			union all
			select * from public.ceo_search_employee_vtable
			union all
			select * from public.ceo_search_approval_vtable
			union all
			select * from public.ceo_search_category_vtable
			union all
			select * from public.ceo_search_pricing_vtable
			union all
			select * from public.ceo_search_support_message_vtable
			union all
			select * from public.ceo_search_sales_history_vtable
			union all
			select * from public.ceo_search_driver_location_vtable
			union all
			select * from public.ceo_search_document_vtable
			union all
			select * from public.ceo_search_activity_vtable
		) source_candidates
		where source_candidates.entity_type is not null
		  and source_candidates.entity_id is not null
		order by source_candidates.entity_type, source_candidates.entity_id, source_candidates.sort_at desc nulls last
	),
	upserted as (
		insert into public.ceo_search_documents (
			entity_type,
			entity_id,
			title,
			subtitle,
			metadata,
			sort_at,
			search_text,
			search_vector,
			refreshed_at
		)
		select
			entity_type,
			entity_id,
			title,
			subtitle,
			metadata,
			sort_at,
			search_text,
			search_vector,
			now()
		from source_rows
		on conflict (entity_type, entity_id) do update set
			title = excluded.title,
			subtitle = excluded.subtitle,
			metadata = excluded.metadata,
			sort_at = excluded.sort_at,
			search_text = excluded.search_text,
			search_vector = excluded.search_vector,
			refreshed_at = excluded.refreshed_at
		where public.ceo_search_documents.title is distinct from excluded.title
		   or public.ceo_search_documents.subtitle is distinct from excluded.subtitle
		   or public.ceo_search_documents.metadata is distinct from excluded.metadata
		   or public.ceo_search_documents.sort_at is distinct from excluded.sort_at
		   or public.ceo_search_documents.search_text is distinct from excluded.search_text
		   or public.ceo_search_documents.search_vector is distinct from excluded.search_vector
		returning 1
	),
	deleted as (
		delete from public.ceo_search_documents documents
		where not exists (
			select 1
			from source_rows
			where source_rows.entity_type = documents.entity_type
			  and source_rows.entity_id = documents.entity_id
		)
		returning 1
	)
	select counted.source_count into refreshed_count
	from (
		select count(*)::integer as source_count
		from source_rows
	) counted
	cross join (
		select count(*) as upsert_count
		from upserted
	) upsert_summary
	cross join (
		select count(*) as delete_count
		from deleted
	) delete_summary;

	return refreshed_count;
end;
$$;

revoke all privileges on function app_private.refresh_ceo_search_documents()
	from anon, authenticated, public;

do $$
declare
	source_table text;
begin
	foreach source_table in array array[
		'customer_addresses',
		'customer_payments',
		'customers',
		'employee_compensation',
		'employees',
		'finance_accounts',
		'finance_adjustments',
		'finance_journal_entries',
		'finance_journal_lines',
		'finance_journal_proof_links',
		'finance_journal_source_links',
		'finance_payment_followups',
		'inventory_stock',
		'orders',
		'products',
		'quote_items',
		'quote_request_items',
		'quote_requests',
		'quotes',
		'refill_requests',
		'supplier_payments',
		'supplier_product_links',
		'suppliers'
	] loop
		if to_regclass(format('public.%I', source_table)) is not null then
			execute format(
				'drop trigger if exists ceo_search_documents_dirty on public.%I',
				source_table
			);
			execute format(
				'create trigger ceo_search_documents_dirty after insert or update or delete or truncate on public.%I for each statement execute function app_private.mark_ceo_search_documents_dirty()',
				source_table
			);
		end if;
	end loop;
end
$$;

create or replace function app_private.assert_ai_read_scope(
	p_agent_scope public.ai_agent_scope,
	p_read_entities text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	read_entity text;
	entity text;
	employee_allowed_vtables text[] := array[
		'ceo_search_order_vtable',
		'ceo_search_quote_request_vtable',
		'ceo_search_customer_vtable',
		'ceo_search_payment_vtable',
		'ceo_search_finance_vtable',
		'ceo_search_approval_vtable',
		'ceo_search_inventory_vtable',
		'ceo_search_pricing_vtable',
		'ceo_search_category_vtable',
		'ceo_search_warehouse_vtable',
		'ceo_search_receiving_vtable',
		'ceo_search_dispatch_vtable',
		'ceo_search_driver_vtable',
		'ceo_search_driver_location_vtable',
		'ceo_search_support_vtable',
		'ceo_search_support_message_vtable',
		'ceo_search_supplier_vtable',
		'ceo_search_sales_history_vtable',
		'ceo_search_document_vtable'
	];
begin
	foreach read_entity in array coalesce(p_read_entities, '{}')
	loop
		entity := lower(btrim(read_entity));
		if entity = '' then
			continue;
		end if;

		if p_agent_scope = 'website' and entity not in ('website_index', 'public_docs', 'published_catalog') then
			raise exception 'website_ai_read_scope_denied' using errcode = '42501';
		end if;

		if p_agent_scope = 'portal' and entity not in (
			'active_draft',
			'activity_events',
			'customer_addresses',
			'customer_delivery_tracking',
			'customer_docs',
			'customer_documents',
			'customer_drafts',
			'customer_orders',
			'customer_profile',
			'customer_quote_requests',
			'projects',
			'public_docs',
			'published_products'
		) then
			raise exception 'portal_ai_read_scope_denied' using errcode = '42501';
		end if;

		if p_agent_scope = 'employee' then
			if entity in (
				'ceo_search_employee_vtable',
				'ceo_employee_summary',
				'employee',
				'employees',
				'staff',
				'team',
				'salary',
				'salaries',
				'employee_salary',
				'ceo_search_finance_payroll_vtable',
				'finance_payroll',
				'payroll',
				'social_insurance',
				'ceo_search_activity_vtable',
				'ceo_activity_summary',
				'activity',
				'activities',
				'audit_activity',
				'activity_history',
				'ceo_search_index',
				'raw_export',
				'secrets',
				'tokens'
			) then
				raise exception 'employee_ai_read_scope_denied' using errcode = '42501';
			end if;
			if entity like 'ceo_%' or entity like 'search_%' then
				if entity <> all(employee_allowed_vtables) then
					raise exception 'employee_ai_read_scope_denied' using errcode = '42501';
				end if;
			end if;
			if entity in ('finance', 'customer_payments', 'supplier_payments', 'private_finance') and not public.can_access_panel('finance') then
				raise exception 'employee_ai_finance_scope_denied' using errcode = '42501';
			end if;
			if entity in ('inventory', 'inventory_stock', 'supplier_costs') and not public.can_access_panel('inventory') then
				raise exception 'employee_ai_inventory_scope_denied' using errcode = '42501';
			end if;
			if entity in ('warehouse', 'loading_tasks', 'receiving_tasks') and not public.can_access_panel('warehouse') then
				raise exception 'employee_ai_warehouse_scope_denied' using errcode = '42501';
			end if;
			if entity in ('dispatch', 'deliveries', 'driver_locations') and not public.can_access_panel('dispatch') then
				raise exception 'employee_ai_dispatch_scope_denied' using errcode = '42501';
			end if;
			if entity in ('admin', 'employees', 'roles', 'exports') and not public.can_access_panel('admin') then
				raise exception 'employee_ai_admin_scope_denied' using errcode = '42501';
			end if;
		end if;

		if p_agent_scope = 'search' and entity not like 'ceo_%' and entity <> 'ceo_search_index' then
			raise exception 'search_ai_read_scope_denied' using errcode = '42501';
		end if;
	end loop;
end;
$$;

revoke all on function app_private.assert_ai_read_scope(public.ai_agent_scope, text[]) from public;

create or replace function app_private.internal_ai_search_documents(
	p_agent_scope public.ai_agent_scope,
	p_entity_types text[] default '{}',
	p_search_tokens text[] default '{}',
	p_limit_per_entity integer default 8
)
returns table (
	entity_type text,
	entity_id text,
	title text,
	subtitle text,
	metadata jsonb,
	sort_at timestamptz,
	search_text text
)
language plpgsql
security definer
set search_path = public, app_private, extensions
as $$
declare
	requested_limit integer := least(greatest(coalesce(p_limit_per_entity, 8), 1), 50);
begin
	if p_agent_scope not in ('employee', 'search') then
		raise exception 'internal_ai_scope_required' using errcode = '42501';
	end if;

	if public.current_employee_id() is null then
		raise exception 'employee_required_for_internal_ai' using errcode = '42501';
	end if;

	if p_agent_scope = 'search' and not public.can_access_ceo_search() then
		raise exception 'ceo_search_required_for_internal_ai' using errcode = '42501';
	end if;

	return query
	with allowed_entities(entity_type) as (
		select unnest(
			case
				when p_agent_scope = 'search' then array[
					'order',
					'customer',
					'payment',
					'finance',
					'approval',
					'inventory',
					'pricing',
					'category',
					'warehouse',
					'dispatch',
					'driver',
					'driver_location',
					'support',
					'support_message',
					'supplier',
					'sales_history',
					'document',
					'employee',
					'finance_payroll',
					'activity'
				]
				else array[
					'order',
					'customer',
					'payment',
					'finance',
					'approval',
					'inventory',
					'pricing',
					'category',
					'warehouse',
					'dispatch',
					'driver',
					'driver_location',
					'support',
					'support_message',
					'supplier',
					'sales_history',
					'document'
				]
			end
		)
	),
	requested_entities(entity_type) as (
		select distinct lower(btrim(requested_entity))
		from unnest(coalesce(p_entity_types, '{}')) requested_entity
		where btrim(requested_entity) <> ''
	),
	effective_entities(entity_type) as (
		select allowed_entities.entity_type
		from allowed_entities
		where not exists (select 1 from requested_entities)
		   or allowed_entities.entity_type in (select requested_entities.entity_type from requested_entities)
	),
	search_terms(term) as (
		select distinct lower(btrim(search_token))
		from unnest(coalesce(p_search_tokens, '{}')) search_token
		where btrim(search_token) <> ''
	),
	scoped_rows as (
		select documents.*
		from effective_entities
		join lateral (
			select
				d.entity_type,
				d.entity_id,
				d.title,
				d.subtitle,
				d.metadata,
				d.sort_at,
				d.search_text
			from public.ceo_search_documents d
			where d.entity_type = effective_entities.entity_type
			  and not exists (
				select 1
				from search_terms
				where d.search_text not ilike ('%' || search_terms.term || '%')
			  )
			order by d.sort_at desc nulls last, d.title asc
			limit requested_limit
		) documents on true
	)
	select
		scoped_rows.entity_type,
		scoped_rows.entity_id,
		scoped_rows.title,
		scoped_rows.subtitle,
		scoped_rows.metadata,
		scoped_rows.sort_at,
		scoped_rows.search_text
	from scoped_rows
	order by scoped_rows.sort_at desc nulls last, scoped_rows.title asc;
end;
$$;

revoke all privileges on function app_private.internal_ai_search_documents(
	public.ai_agent_scope,
	text[],
	text[],
	integer
) from anon, authenticated, public;

select app_private.refresh_ceo_search_documents_if_dirty(true);
