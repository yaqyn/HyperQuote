alter table public.finance_journal_entries
	alter column accounting_date set default ((now() at time zone 'Africa/Cairo')::date),
	alter column accounting_period set default to_char(now() at time zone 'Africa/Cairo', 'YYYY-MM');

create or replace function app_private.finance_cairo_date(p_value timestamptz)
returns date
language sql
stable
security definer
set search_path = public, app_private
as $$
	select (coalesce(p_value, now()) at time zone 'Africa/Cairo')::date
$$;

create or replace function app_private.finance_record_customer_payment_journal(
	p_payment_id uuid,
	p_actor_employee_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	cash_account_id uuid := app_private.finance_account_id('1010');
	customer_clearing_account_id uuid := app_private.finance_account_id('2100');
	customer_payment record;
	entry_id uuid;
	proof_id uuid;
	source_employee_id uuid;
begin
	perform pg_advisory_xact_lock(hashtextextended('finance:customer_payment:' || p_payment_id::text, 0));

	if exists (
		select 1
		from public.finance_journal_source_links link
		where link.source_type = 'customer_payment'
		  and link.source_id = p_payment_id
		  and link.link_role = 'cash_movement'
	) then
		return false;
	end if;

	if cash_account_id is null or customer_clearing_account_id is null then
		raise exception 'finance_chart_of_accounts_missing' using errcode = '23514';
	end if;

	select
		cp.id,
		cp.order_id,
		cp.amount,
		cp.proof_path,
		cp.recorded_by_employee_id,
		cp.created_at,
		o.order_number,
		c.company_name
	into customer_payment
	from public.customer_payments cp
	join public.orders o on o.id = cp.order_id
	left join public.customers c on c.id = o.customer_id
	where cp.id = p_payment_id
	  and cp.status = 'recorded';

	if customer_payment.id is null then
		return false;
	end if;

	source_employee_id := coalesce(
		customer_payment.recorded_by_employee_id,
		p_actor_employee_id,
		public.current_employee_id()
	);
	if source_employee_id is null then
		raise exception 'finance_payment_journal_actor_required' using errcode = '42501';
	end if;

	insert into public.finance_journal_entries (
		accounting_date,
		source_type,
		source_id,
		description,
		actor_employee_id
	)
	values (
		app_private.finance_cairo_date(customer_payment.created_at),
		'customer_payment',
		customer_payment.id,
		'Customer receipt clearing for ' || customer_payment.order_number,
		source_employee_id
	)
	returning id into entry_id;

	insert into public.finance_journal_lines (
		entry_id,
		line_number,
		account_id,
		debit,
		credit,
		memo,
		counterparty_type,
		counterparty_id,
		source_type,
		source_id
	)
	values
		(
			entry_id,
			1,
			cash_account_id,
			round(customer_payment.amount, 2),
			0,
			'Cash received from customer',
			'customer',
			customer_payment.order_id,
			'customer_payment',
			customer_payment.id
		),
		(
			entry_id,
			2,
			customer_clearing_account_id,
			0,
			round(customer_payment.amount, 2),
			'Clearing liability until revenue policy is signed off',
			'customer',
			customer_payment.order_id,
			'customer_payment',
			customer_payment.id
		);

	insert into public.finance_journal_source_links (
		entry_id,
		source_type,
		source_id,
		link_role,
		source_label
	)
	values (
		entry_id,
		'customer_payment',
		customer_payment.id,
		'cash_movement',
		coalesce(customer_payment.company_name, customer_payment.order_number)
	);

	proof_id := app_private.proof_document_id_from_text(customer_payment.proof_path);
	if proof_id is not null or btrim(coalesce(customer_payment.proof_path, '')) <> '' then
		insert into public.finance_journal_proof_links (
			entry_id,
			proof_document_id,
			proof_path,
			link_role
		)
		values (
			entry_id,
			proof_id,
			case when proof_id is null then customer_payment.proof_path else null end,
			'payment_proof'
		);
	end if;

	update public.finance_journal_entries
	set
		status = 'posted',
		posted_at = now(),
		posted_by_employee_id = source_employee_id
	where id = entry_id;

	return true;
end;
$$;

create or replace function app_private.finance_record_supplier_payment_journal(
	p_payment_id uuid,
	p_actor_employee_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	cash_account_id uuid := app_private.finance_account_id('1010');
	supplier_clearing_account_id uuid := app_private.finance_account_id('1200');
	supplier_payment record;
	entry_id uuid;
	proof_id uuid;
	source_employee_id uuid;
begin
	perform pg_advisory_xact_lock(hashtextextended('finance:supplier_payment:' || p_payment_id::text, 0));

	if exists (
		select 1
		from public.finance_journal_source_links link
		where link.source_type = 'supplier_payment'
		  and link.source_id = p_payment_id
		  and link.link_role = 'cash_movement'
	) then
		return false;
	end if;

	if cash_account_id is null or supplier_clearing_account_id is null then
		raise exception 'finance_chart_of_accounts_missing' using errcode = '23514';
	end if;

	select
		sp.id,
		sp.refill_request_id,
		sp.amount,
		sp.proof_path,
		sp.recorded_by_employee_id,
		sp.created_at,
		s.name as supplier_name
	into supplier_payment
	from public.supplier_payments sp
	join public.refill_requests rr on rr.id = sp.refill_request_id
	left join public.suppliers s on s.id = rr.supplier_id
	where sp.id = p_payment_id
	  and sp.status = 'recorded';

	if supplier_payment.id is null then
		return false;
	end if;

	source_employee_id := coalesce(
		supplier_payment.recorded_by_employee_id,
		p_actor_employee_id,
		public.current_employee_id()
	);
	if source_employee_id is null then
		raise exception 'finance_payment_journal_actor_required' using errcode = '42501';
	end if;

	insert into public.finance_journal_entries (
		accounting_date,
		source_type,
		source_id,
		description,
		actor_employee_id
	)
	values (
		app_private.finance_cairo_date(supplier_payment.created_at),
		'supplier_payment',
		supplier_payment.id,
		'Supplier payment clearing for '
			|| coalesce(supplier_payment.supplier_name, supplier_payment.refill_request_id::text),
		source_employee_id
	)
	returning id into entry_id;

	insert into public.finance_journal_lines (
		entry_id,
		line_number,
		account_id,
		debit,
		credit,
		memo,
		counterparty_type,
		counterparty_id,
		source_type,
		source_id
	)
	values
		(
			entry_id,
			1,
			supplier_clearing_account_id,
			round(supplier_payment.amount, 2),
			0,
			'Supplier advance until receiving and COGS policy are signed off',
			'supplier',
			supplier_payment.refill_request_id,
			'supplier_payment',
			supplier_payment.id
		),
		(
			entry_id,
			2,
			cash_account_id,
			0,
			round(supplier_payment.amount, 2),
			'Cash paid to supplier',
			'supplier',
			supplier_payment.refill_request_id,
			'supplier_payment',
			supplier_payment.id
		);

	insert into public.finance_journal_source_links (
		entry_id,
		source_type,
		source_id,
		link_role,
		source_label
	)
	values (
		entry_id,
		'supplier_payment',
		supplier_payment.id,
		'cash_movement',
		supplier_payment.supplier_name
	);

	proof_id := app_private.proof_document_id_from_text(supplier_payment.proof_path);
	if proof_id is not null or btrim(coalesce(supplier_payment.proof_path, '')) <> '' then
		insert into public.finance_journal_proof_links (
			entry_id,
			proof_document_id,
			proof_path,
			link_role
		)
		values (
			entry_id,
			proof_id,
			case when proof_id is null then supplier_payment.proof_path else null end,
			'payment_proof'
		);
	end if;

	update public.finance_journal_entries
	set
		status = 'posted',
		posted_at = now(),
		posted_by_employee_id = source_employee_id
	where id = entry_id;

	return true;
end;
$$;

create or replace function app_private.finance_record_order_review_journal(
	p_order_id uuid,
	p_actor_employee_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	order_review record;
	entry_id uuid;
	source_employee_id uuid := coalesce(p_actor_employee_id, public.current_employee_id());
begin
	perform pg_advisory_xact_lock(hashtextextended('finance:order_review:' || p_order_id::text, 0));

	if exists (
		select 1
		from public.finance_journal_source_links link
		where link.source_type = 'order'
		  and link.source_id = p_order_id
		  and link.link_role = 'revenue_recognition_review'
	) then
		return false;
	end if;

	select id, order_number, status, delivered_at, updated_at, created_at
	into order_review
	from public.orders
	where id = p_order_id
	  and status in ('dispatch_ready', 'dispatch_assigned', 'out_for_delivery', 'delivered');

	if order_review.id is null then
		return false;
	end if;

	insert into public.finance_journal_entries (
		accounting_date,
		source_type,
		source_id,
		description,
		actor_employee_id,
		requires_accountant_signoff,
		signoff_reason
	)
	values (
		app_private.finance_cairo_date(coalesce(order_review.delivered_at, order_review.updated_at, order_review.created_at)),
		'order',
		order_review.id,
		'Revenue recognition review for ' || order_review.order_number,
		source_employee_id,
		true,
		'Revenue, VAT, and receivable recognition require accountant sign-off.'
	)
	returning id into entry_id;

	insert into public.finance_journal_source_links (
		entry_id,
		source_type,
		source_id,
		link_role,
		source_label
	)
	values (
		entry_id,
		'order',
		order_review.id,
		'revenue_recognition_review',
		order_review.order_number
	);

	return true;
end;
$$;

create or replace function app_private.finance_record_refill_review_journal(
	p_refill_request_id uuid,
	p_actor_employee_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	refill_review record;
	entry_id uuid;
	source_employee_id uuid := coalesce(p_actor_employee_id, public.current_employee_id());
begin
	perform pg_advisory_xact_lock(hashtextextended('finance:refill_review:' || p_refill_request_id::text, 0));

	if exists (
		select 1
		from public.finance_journal_source_links link
		where link.source_type = 'refill_request'
		  and link.source_id = p_refill_request_id
		  and link.link_role = 'inventory_cogs_review'
	) then
		return false;
	end if;

	select rr.id, rr.status, rr.created_at, rr.updated_at, s.name as supplier_name
	into refill_review
	from public.refill_requests rr
	left join public.suppliers s on s.id = rr.supplier_id
	where rr.id = p_refill_request_id
	  and rr.status = 'received';

	if refill_review.id is null then
		return false;
	end if;

	insert into public.finance_journal_entries (
		accounting_date,
		source_type,
		source_id,
		description,
		actor_employee_id,
		requires_accountant_signoff,
		signoff_reason
	)
	values (
		app_private.finance_cairo_date(coalesce(refill_review.updated_at, refill_review.created_at)),
		'refill_request',
		refill_review.id,
		'Inventory and COGS review for '
			|| coalesce(refill_review.supplier_name, refill_review.id::text),
		source_employee_id,
		true,
		'Inventory valuation and COGS recognition require accountant sign-off.'
	)
	returning id into entry_id;

	insert into public.finance_journal_source_links (
		entry_id,
		source_type,
		source_id,
		link_role,
		source_label
	)
	values (
		entry_id,
		'refill_request',
		refill_review.id,
		'inventory_cogs_review',
		refill_review.supplier_name
	);

	return true;
end;
$$;

create or replace function app_private.finance_record_payroll_review_journal(
	p_employee_id uuid,
	p_actor_employee_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	payroll_review record;
	entry_id uuid;
	source_employee_id uuid := coalesce(p_actor_employee_id, public.current_employee_id());
begin
	perform pg_advisory_xact_lock(hashtextextended('finance:payroll_review:' || p_employee_id::text, 0));

	if exists (
		select 1
		from public.finance_journal_source_links link
		where link.source_type = 'employee_compensation'
		  and link.source_id = p_employee_id
		  and link.link_role = 'payroll_accrual_review'
	) then
		return false;
	end if;

	select ec.employee_id, e.full_name, ec.created_at, ec.updated_at
	into payroll_review
	from public.employee_compensation ec
	join public.employees e on e.id = ec.employee_id
	where ec.employee_id = p_employee_id
	  and coalesce(ec.base_salary, 0) > 0;

	if payroll_review.employee_id is null then
		return false;
	end if;

	insert into public.finance_journal_entries (
		accounting_date,
		source_type,
		source_id,
		description,
		actor_employee_id,
		requires_accountant_signoff,
		signoff_reason
	)
	values (
		app_private.finance_cairo_date(coalesce(payroll_review.updated_at, payroll_review.created_at)),
		'employee_compensation',
		payroll_review.employee_id,
		'Payroll accrual review for ' || payroll_review.full_name,
		source_employee_id,
		true,
		'Payroll, tax, and social-insurance accruals require accountant/legal sign-off.'
	)
	returning id into entry_id;

	insert into public.finance_journal_source_links (
		entry_id,
		source_type,
		source_id,
		link_role,
		source_label
	)
	values (
		entry_id,
		'employee_compensation',
		payroll_review.employee_id,
		'payroll_accrual_review',
		payroll_review.full_name
	);

	return true;
end;
$$;

create or replace function app_private.finance_sync_customer_payment_journal()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	if new.status = 'recorded' then
		perform app_private.finance_record_customer_payment_journal(
			new.id,
			new.recorded_by_employee_id
		);
	end if;
	return new;
end;
$$;

drop trigger if exists finance_customer_payments_sync_journal
	on public.customer_payments;
create trigger finance_customer_payments_sync_journal
	after insert or update of status on public.customer_payments
	for each row execute function app_private.finance_sync_customer_payment_journal();

create or replace function app_private.finance_sync_supplier_payment_journal()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	if new.status = 'recorded' then
		perform app_private.finance_record_supplier_payment_journal(
			new.id,
			new.recorded_by_employee_id
		);
	end if;
	return new;
end;
$$;

drop trigger if exists finance_supplier_payments_sync_journal
	on public.supplier_payments;
create trigger finance_supplier_payments_sync_journal
	after insert or update of status on public.supplier_payments
	for each row execute function app_private.finance_sync_supplier_payment_journal();

create or replace function app_private.finance_sync_order_review_journal()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	if new.status in ('dispatch_ready', 'dispatch_assigned', 'out_for_delivery', 'delivered') then
		perform app_private.finance_record_order_review_journal(new.id);
	end if;
	return new;
end;
$$;

drop trigger if exists finance_orders_sync_review_journal
	on public.orders;
create trigger finance_orders_sync_review_journal
	after insert or update of status on public.orders
	for each row execute function app_private.finance_sync_order_review_journal();

create or replace function app_private.finance_sync_refill_review_journal()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	if new.status = 'received' then
		perform app_private.finance_record_refill_review_journal(new.id);
	end if;
	return new;
end;
$$;

drop trigger if exists finance_refills_sync_review_journal
	on public.refill_requests;
create trigger finance_refills_sync_review_journal
	after insert or update of status on public.refill_requests
	for each row execute function app_private.finance_sync_refill_review_journal();

create or replace function app_private.finance_sync_payroll_review_journal()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	if coalesce(new.base_salary, 0) > 0 then
		perform app_private.finance_record_payroll_review_journal(
			new.employee_id,
			new.updated_by_employee_id
		);
	end if;
	return new;
end;
$$;

drop trigger if exists finance_employee_compensation_sync_review_journal
	on public.employee_compensation;
create trigger finance_employee_compensation_sync_review_journal
	after insert or update of base_salary, social_insurance_salary on public.employee_compensation
	for each row execute function app_private.finance_sync_payroll_review_journal();

create or replace function public.finance_backfill_accounting_sources()
returns jsonb
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	employee_id uuid;
	customer_payment record;
	supplier_payment record;
	order_review record;
	refill_review record;
	payroll_review record;
	customer_count integer := 0;
	supplier_count integer := 0;
	review_count integer := 0;
begin
	employee_id := public.require_panel('finance', true);

	for customer_payment in
		select cp.id
		from public.customer_payments cp
		where cp.status = 'recorded'
		order by cp.created_at, cp.id
	loop
		if app_private.finance_record_customer_payment_journal(customer_payment.id, employee_id) then
			customer_count := customer_count + 1;
		end if;
	end loop;

	for supplier_payment in
		select sp.id
		from public.supplier_payments sp
		where sp.status = 'recorded'
		order by sp.created_at, sp.id
	loop
		if app_private.finance_record_supplier_payment_journal(supplier_payment.id, employee_id) then
			supplier_count := supplier_count + 1;
		end if;
	end loop;

	for order_review in
		select o.id
		from public.orders o
		where o.status in ('dispatch_ready', 'dispatch_assigned', 'out_for_delivery', 'delivered')
		order by o.updated_at, o.id
	loop
		if app_private.finance_record_order_review_journal(order_review.id, employee_id) then
			review_count := review_count + 1;
		end if;
	end loop;

	for refill_review in
		select rr.id
		from public.refill_requests rr
		where rr.status = 'received'
		order by rr.updated_at, rr.id
	loop
		if app_private.finance_record_refill_review_journal(refill_review.id, employee_id) then
			review_count := review_count + 1;
		end if;
	end loop;

	for payroll_review in
		select ec.employee_id
		from public.employee_compensation ec
		where coalesce(ec.base_salary, 0) > 0
		order by ec.updated_at, ec.employee_id
	loop
		if app_private.finance_record_payroll_review_journal(payroll_review.employee_id, employee_id) then
			review_count := review_count + 1;
		end if;
	end loop;

	perform public.log_activity(
		'finance_accounting',
		null,
		'finance_accounting_backfilled',
		jsonb_build_object(
			'employee_id', employee_id,
			'customer_payment_entries', customer_count,
			'supplier_payment_entries', supplier_count,
			'review_required_entries', review_count
		)
	);

	return jsonb_build_object(
		'customerPaymentEntries', customer_count,
		'supplierPaymentEntries', supplier_count,
		'reviewRequiredEntries', review_count
	);
end;
$$;

create or replace function public.finance_reverse_journal_entry(
	p_entry_id uuid,
	p_reason text
)
returns public.finance_journal_entries
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	employee_id uuid;
	target_entry public.finance_journal_entries%rowtype;
	reversal_entry public.finance_journal_entries%rowtype;
	clean_reason text := btrim(coalesce(p_reason, ''));
begin
	employee_id := public.require_panel('finance', true);
	if length(clean_reason) < 5 then
		raise exception 'finance_reversal_reason_required' using errcode = '23514';
	end if;

	select * into target_entry
	from public.finance_journal_entries
	where id = p_entry_id
	for update;

	if target_entry.id is null then
		raise exception 'finance_journal_entry_not_found' using errcode = '02000';
	end if;
	if target_entry.status <> 'posted' then
		raise exception 'only_posted_finance_journal_entries_can_be_reversed' using errcode = '23514';
	end if;

	insert into public.finance_journal_entries (
		accounting_date,
		source_type,
		source_id,
		description,
		actor_employee_id,
		reversed_from_entry_id
	)
	values (
		app_private.finance_cairo_date(now()),
		target_entry.source_type,
		target_entry.source_id,
		'Reversal of ' || target_entry.entry_number || ': ' || clean_reason,
		employee_id,
		target_entry.id
	)
	returning * into reversal_entry;

	insert into public.finance_journal_lines (
		entry_id,
		line_number,
		account_id,
		debit,
		credit,
		currency,
		memo,
		counterparty_type,
		counterparty_id,
		source_type,
		source_id
	)
	select
		reversal_entry.id,
		line_number,
		account_id,
		credit,
		debit,
		currency,
		coalesce('Reversal: ' || nullif(memo, ''), 'Reversal'),
		counterparty_type,
		counterparty_id,
		source_type,
		source_id
	from public.finance_journal_lines
	where entry_id = target_entry.id
	order by line_number;

	insert into public.finance_journal_source_links (
		entry_id,
		source_type,
		source_id,
		link_role,
		source_label
	)
	select
		reversal_entry.id,
		source_type,
		source_id,
		'reversal:' || target_entry.entry_number || ':' || link_role,
		source_label
	from public.finance_journal_source_links
	where entry_id = target_entry.id
	on conflict do nothing;

	update public.finance_journal_entries
	set
		status = 'posted',
		posted_at = now(),
		posted_by_employee_id = employee_id
	where id = reversal_entry.id
	returning * into reversal_entry;

	update public.finance_journal_entries
	set
		status = 'reversed',
		reversed_at = now(),
		reversed_by_employee_id = employee_id,
		reversal_entry_id = reversal_entry.id
	where id = target_entry.id;

	perform public.log_activity(
		'finance_journal_entry',
		target_entry.id,
		'finance_journal_reversed',
		jsonb_build_object(
			'employee_id', employee_id,
			'entry_number', target_entry.entry_number,
			'reversal_entry_number', reversal_entry.entry_number,
			'reason', clean_reason
		)
	);

	return reversal_entry;
end;
$$;

create or replace function public.finance_accounting_dashboard(
	p_period_start date default null,
	p_period_end date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	period_start date := coalesce(p_period_start, date_trunc('month', (now() at time zone 'Africa/Cairo'))::date);
	period_end date := coalesce(p_period_end, (now() at time zone 'Africa/Cairo')::date);
	can_view_salary_detail boolean;
	cash_account_id uuid := app_private.finance_account_id('1010');
	overview jsonb;
	income_statement jsonb;
	cash_flow jsonb;
	receivables jsonb;
	payables jsonb;
	payroll jsonb;
	adjustments jsonb;
	journal jsonb;
	inventory_assets jsonb;
	review_required_count integer;
	unposted_count integer;
	revenue_total numeric := 0;
	expense_total numeric := 0;
	customer_receipts numeric := 0;
	supplier_payments numeric := 0;
	manual_cash numeric := 0;
	cash_balance numeric := 0;
	receivables_total numeric := 0;
	payables_total numeric := 0;
	inventory_asset_total numeric := 0;
	inventory_asset_missing_cost_count integer := 0;
begin
	perform public.require_panel('finance', false);
	if period_start > period_end then
		raise exception 'finance_accounting_period_invalid' using errcode = '23514';
	end if;

	can_view_salary_detail := public.is_employee_with_role('ceo') or public.can_access_panel('admin');

	select count(*) into unposted_count
	from public.finance_journal_entries
	where status = 'draft';

	select count(*) into review_required_count
	from public.finance_journal_entries
	where status = 'draft'
	  and requires_accountant_signoff;

	select review_required_count + count(*) into review_required_count
	from public.finance_adjustments
	where status = 'review_required';

	select coalesce(sum(jl.debit - jl.credit), 0) into cash_balance
	from public.finance_journal_lines jl
	join public.finance_journal_entries je on je.id = jl.entry_id
	where je.status = 'posted'
	  and jl.account_id = cash_account_id;

	select coalesce(sum(jl.debit), 0) into customer_receipts
	from public.finance_journal_lines jl
	join public.finance_journal_entries je on je.id = jl.entry_id
	where je.status = 'posted'
	  and je.accounting_date between period_start and period_end
	  and jl.account_id = cash_account_id
	  and jl.source_type = 'customer_payment';

	select coalesce(sum(jl.credit), 0) into supplier_payments
	from public.finance_journal_lines jl
	join public.finance_journal_entries je on je.id = jl.entry_id
	where je.status = 'posted'
	  and je.accounting_date between period_start and period_end
	  and jl.account_id = cash_account_id
	  and jl.source_type = 'supplier_payment';

	select coalesce(sum(jl.debit - jl.credit), 0) into manual_cash
	from public.finance_journal_lines jl
	join public.finance_journal_entries je on je.id = jl.entry_id
	where je.status = 'posted'
	  and je.accounting_date between period_start and period_end
	  and jl.account_id = cash_account_id
	  and jl.source_type = 'manual_adjustment';

	with posted_lines as (
		select
			a.account_class,
			jl.debit,
			jl.credit
		from public.finance_journal_lines jl
		join public.finance_journal_entries je on je.id = jl.entry_id
		join public.finance_accounts a on a.id = jl.account_id
		where je.status = 'posted'
		  and je.accounting_date between period_start and period_end
	)
	select
		coalesce(sum(case when account_class = 'revenue' then credit - debit else 0 end), 0),
		coalesce(sum(case when account_class = 'expense' then debit - credit else 0 end), 0)
	into revenue_total, expense_total
	from posted_lines;

	with stock_costs as (
		select
			p.id as product_id,
			p.sku,
			p.name as product_name,
			s.on_hand_quantity,
			s.reserved_quantity,
			s.available_quantity,
			cost.raw_cost,
			cost.supplier_name,
			coalesce(cost.raw_cost, p.price_range_min, 0) as unit_cost,
			cost.raw_cost is null as needs_cost_review
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
		where s.on_hand_quantity > 0
	)
	select
		round(coalesce(sum(on_hand_quantity * unit_cost), 0), 2),
		count(*) filter (where needs_cost_review),
		coalesce(jsonb_agg(
			jsonb_build_object(
				'productId', product_id,
				'sku', sku,
				'productName', product_name,
				'onHand', on_hand_quantity,
				'reserved', reserved_quantity,
				'available', available_quantity,
				'unitCost', round(unit_cost, 2),
				'valuation', round(on_hand_quantity * unit_cost, 2),
				'supplierName', supplier_name,
				'needsCostReview', needs_cost_review
			)
			order by on_hand_quantity * unit_cost desc, product_name
		), '[]'::jsonb)
	into inventory_asset_total, inventory_asset_missing_cost_count, inventory_assets
	from stock_costs;

	with order_payment_totals as (
		select order_id, coalesce(sum(amount), 0) as paid
		from public.customer_payments
		where status = 'recorded'
		group by order_id
	)
	select coalesce(sum(greatest(o.total_amount - coalesce(opt.paid, 0), 0)), 0)
	into receivables_total
	from public.orders o
	left join order_payment_totals opt on opt.order_id = o.id
	where o.status not in ('rejected', 'canceled');

	with supplier_payment_totals as (
		select refill_request_id, coalesce(sum(amount), 0) as paid
		from public.supplier_payments
		where status = 'recorded'
		group by refill_request_id
	)
	select coalesce(sum(greatest((rr.quantity * rr.unit_cost) - coalesce(spt.paid, 0), 0)), 0)
	into payables_total
	from public.refill_requests rr
	left join supplier_payment_totals spt on spt.refill_request_id = rr.id
	where rr.status not in ('rejected', 'canceled');

	overview := jsonb_build_object(
		'basis', 'Egyptian Accounting Standards management subledger with live inventory asset valuation',
		'cashBalance', round(cash_balance, 2),
		'cashMovement', round(customer_receipts - supplier_payments + manual_cash, 2),
		'inventoryAssets', round(inventory_asset_total, 2),
		'totalAssets', round(cash_balance + receivables_total + inventory_asset_total, 2),
		'receivables', round(receivables_total, 2),
		'payables', round(payables_total, 2),
		'unpostedCount', unposted_count,
		'reviewRequiredCount', review_required_count,
		'inventoryCostReviewCount', inventory_asset_missing_cost_count
	);

	income_statement := jsonb_build_object(
		'revenue', round(revenue_total, 2),
		'expenses', round(expense_total, 2),
		'netPerformance', case when review_required_count = 0 then round(revenue_total - expense_total, 2) else null end,
		'warnings', jsonb_build_array(
			'Revenue, VAT, COGS, inventory valuation, payroll, refunds, damages, and write-offs require accountant sign-off before statutory use.',
			'Inventory assets use primary supplier raw cost when available and product minimum price only as a review fallback.',
			'Do not treat payment collections minus supplier payments as profit.'
		)
	);

	cash_flow := jsonb_build_object(
		'customerReceipts', round(customer_receipts, 2),
		'supplierPayments', round(supplier_payments, 2),
		'manualCashAdjustments', round(manual_cash, 2),
		'netCashMovement', round(customer_receipts - supplier_payments + manual_cash, 2)
	);

	with payment_totals as (
		select order_id, coalesce(sum(amount), 0) as paid
		from public.customer_payments
		where status = 'recorded'
		group by order_id
	)
	select coalesce(jsonb_agg(
		jsonb_build_object(
			'orderId', o.id,
			'orderNumber', o.order_number,
			'customerName', coalesce(c.company_name, 'Unassigned customer'),
			'total', round(o.total_amount, 2),
			'paid', round(coalesce(pt.paid, 0), 2),
			'remaining', round(greatest(o.total_amount - coalesce(pt.paid, 0), 0), 2),
			'ageDays', greatest((now() at time zone 'Africa/Cairo')::date - (o.created_at at time zone 'Africa/Cairo')::date, 0),
			'status', o.status,
			'isDelivered', o.status = 'delivered' or o.delivered_at is not null
		)
		order by greatest(o.total_amount - coalesce(pt.paid, 0), 0) desc, o.created_at
	), '[]'::jsonb)
	into receivables
	from public.orders o
	left join public.customers c on c.id = o.customer_id
	left join payment_totals pt on pt.order_id = o.id
	where o.status not in ('rejected', 'canceled')
	  and greatest(o.total_amount - coalesce(pt.paid, 0), 0) > 0;

	with payment_totals as (
		select refill_request_id, coalesce(sum(amount), 0) as paid
		from public.supplier_payments
		where status = 'recorded'
		group by refill_request_id
	)
	select coalesce(jsonb_agg(
		jsonb_build_object(
			'refillRequestId', rr.id,
			'supplierName', coalesce(s.name, 'Unknown supplier'),
			'productName', coalesce(p.name, 'Unknown product'),
			'total', round(rr.quantity * rr.unit_cost, 2),
			'paid', round(coalesce(pt.paid, 0), 2),
			'remaining', round(greatest((rr.quantity * rr.unit_cost) - coalesce(pt.paid, 0), 0), 2),
			'ageDays', greatest((now() at time zone 'Africa/Cairo')::date - (rr.created_at at time zone 'Africa/Cairo')::date, 0),
			'status', rr.status
		)
		order by greatest((rr.quantity * rr.unit_cost) - coalesce(pt.paid, 0), 0) desc, rr.created_at
	), '[]'::jsonb)
	into payables
	from public.refill_requests rr
	left join public.suppliers s on s.id = rr.supplier_id
	left join public.products p on p.id = rr.product_id
	left join payment_totals pt on pt.refill_request_id = rr.id
	where rr.status not in ('rejected', 'canceled')
	  and greatest((rr.quantity * rr.unit_cost) - coalesce(pt.paid, 0), 0) > 0;

	select jsonb_build_object(
		'canViewDetail', can_view_salary_detail,
		'employeeCount', count(*),
		'monthlyBaseSalary', round(coalesce(sum(coalesce(ec.base_salary, 0)), 0), 2),
		'monthlySocialInsuranceSalary', round(coalesce(sum(coalesce(ec.social_insurance_salary, 0)), 0), 2),
		'details', case
			when can_view_salary_detail then coalesce(jsonb_agg(
				jsonb_build_object(
					'employeeId', e.id,
					'employeeName', e.full_name,
					'department', ec.department,
					'title', ec.title,
					'baseSalary', ec.base_salary,
					'socialInsuranceSalary', ec.social_insurance_salary,
					'currency', ec.salary_currency
				)
				order by e.full_name
			), '[]'::jsonb)
			else '[]'::jsonb
		end
	)
	into payroll
	from public.employee_compensation ec
	join public.employees e on e.id = ec.employee_id
	where coalesce(ec.base_salary, 0) > 0
	   or coalesce(ec.social_insurance_salary, 0) > 0;

	select coalesce(jsonb_agg(
		jsonb_build_object(
			'id', fa.id,
			'type', fa.adjustment_type,
			'category', fa.category,
			'description', fa.description,
			'amount', fa.amount,
			'status', fa.status,
			'proofPath', fa.proof_path,
			'journalEntryId', fa.journal_entry_id,
			'createdAt', fa.created_at
		)
		order by fa.created_at desc
	), '[]'::jsonb)
	into adjustments
	from public.finance_adjustments fa
	where (fa.created_at at time zone 'Africa/Cairo')::date between period_start and period_end
	   or fa.status = 'review_required';

	select coalesce(jsonb_agg(
		jsonb_build_object(
			'id', je.id,
			'entryNumber', je.entry_number,
			'accountingDate', je.accounting_date,
			'accountingPeriod', je.accounting_period,
			'status', je.status,
			'description', je.description,
			'sourceType', je.source_type,
			'sourceId', je.source_id,
			'requiresAccountantSignoff', je.requires_accountant_signoff,
			'signoffReason', je.signoff_reason,
			'postedAt', je.posted_at,
			'lines', coalesce((
				select jsonb_agg(
					jsonb_build_object(
						'lineNumber', jl.line_number,
						'accountCode', fa.code,
						'accountName', fa.name,
						'debit', jl.debit,
						'credit', jl.credit,
						'memo', jl.memo
					)
					order by jl.line_number
				)
				from public.finance_journal_lines jl
				join public.finance_accounts fa on fa.id = jl.account_id
				where jl.entry_id = je.id
			), '[]'::jsonb),
			'sourceLinks', coalesce((
				select jsonb_agg(
					jsonb_build_object(
						'sourceType', link.source_type,
						'sourceId', link.source_id,
						'linkRole', link.link_role,
						'sourceLabel', link.source_label
					)
					order by link.created_at
				)
				from public.finance_journal_source_links link
				where link.entry_id = je.id
			), '[]'::jsonb),
			'proofLinks', coalesce((
				select jsonb_agg(
					jsonb_build_object(
						'proofDocumentId', proof.proof_document_id,
						'proofPath', proof.proof_path,
						'linkRole', proof.link_role
					)
					order by proof.created_at
				)
				from public.finance_journal_proof_links proof
				where proof.entry_id = je.id
			), '[]'::jsonb)
		)
		order by je.accounting_date desc, je.created_at desc
	), '[]'::jsonb)
	into journal
	from (
		select *
		from public.finance_journal_entries
		where accounting_date between period_start and period_end
		   or status = 'draft'
		order by accounting_date desc, created_at desc
		limit 120
	) je;

	return jsonb_build_object(
		'period', jsonb_build_object(
			'start', period_start,
			'end', period_end
		),
		'overview', overview,
		'incomeStatement', income_statement,
		'cashFlow', cash_flow,
		'receivables', receivables,
		'payables', payables,
		'payroll', payroll,
		'adjustments', adjustments,
		'journal', journal,
		'inventoryAssets', inventory_assets
	);
end;
$$;
