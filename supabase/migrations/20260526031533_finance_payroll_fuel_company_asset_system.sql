do $$
begin
	if not exists (
		select 1 from pg_type
		where typname = 'finance_payroll_payment_type'
		  and typnamespace = 'public'::regnamespace
	) then
		create type public.finance_payroll_payment_type as enum ('salary', 'bonus');
	end if;

	if not exists (
		select 1 from pg_type
		where typname = 'finance_payroll_payment_status'
		  and typnamespace = 'public'::regnamespace
	) then
		create type public.finance_payroll_payment_status as enum ('paid', 'reversed');
	end if;

	if not exists (
		select 1 from pg_type
		where typname = 'truck_fuel_expense_status'
		  and typnamespace = 'public'::regnamespace
	) then
		create type public.truck_fuel_expense_status as enum ('submitted', 'posted', 'rejected', 'reversed');
	end if;

	if not exists (
		select 1 from pg_type
		where typname = 'company_asset_type'
		  and typnamespace = 'public'::regnamespace
	) then
		create type public.company_asset_type as enum (
			'building',
			'vehicle',
			'truck',
			'equipment',
			'furniture',
			'technology',
			'other'
		);
	end if;

	if not exists (
		select 1 from pg_type
		where typname = 'company_asset_status'
		  and typnamespace = 'public'::regnamespace
	) then
		create type public.company_asset_status as enum ('active', 'disposed');
	end if;

	if not exists (
		select 1 from pg_type
		where typname = 'company_asset_funding_source'
		  and typnamespace = 'public'::regnamespace
	) then
		create type public.company_asset_funding_source as enum (
			'cash_purchase',
			'opening_balance',
			'owner_contribution'
		);
	end if;
end $$;

create sequence if not exists public.company_asset_number_seq;

create table if not exists public.employee_payroll_payments (
	id uuid primary key default gen_random_uuid(),
	employee_id uuid not null references public.employees(id) on delete restrict,
	period_month date not null,
	payment_type public.finance_payroll_payment_type not null,
	amount numeric(14, 2) not null,
	currency text not null default 'EGP',
	payment_date date not null default ((now() at time zone 'Africa/Cairo')::date),
	reason text,
	proof_document_id uuid references public.proof_documents(id) on delete restrict,
	proof_path text,
	status public.finance_payroll_payment_status not null default 'paid',
	created_by_employee_id uuid references public.employees(id) on delete set null,
	journal_entry_id uuid unique references public.finance_journal_entries(id) on delete restrict,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint employee_payroll_payments_month_start
		check (period_month = date_trunc('month', period_month)::date),
	constraint employee_payroll_payments_amount_positive
		check (amount > 0),
	constraint employee_payroll_payments_currency_egp
		check (currency = 'EGP'),
	constraint employee_payroll_payments_has_proof
		check (
			proof_document_id is not null
			or length(btrim(coalesce(proof_path, ''))) > 0
		),
	constraint employee_payroll_payments_reason_for_bonus
		check (
			payment_type <> 'bonus'
			or length(btrim(coalesce(reason, ''))) >= 3
		)
);

create unique index if not exists employee_payroll_salary_once_per_month
	on public.employee_payroll_payments (employee_id, period_month)
	where payment_type = 'salary' and status = 'paid';

create index if not exists employee_payroll_payments_employee_period_idx
	on public.employee_payroll_payments (employee_id, period_month desc, created_at desc);

create table if not exists public.truck_fuel_expenses (
	id uuid primary key default gen_random_uuid(),
	truck_id uuid not null references public.trucks(id) on delete restrict,
	driver_id uuid not null references public.drivers(id) on delete restrict,
	delivery_id uuid references public.deliveries(id) on delete set null,
	expense_date date not null default ((now() at time zone 'Africa/Cairo')::date),
	amount numeric(14, 2),
	currency text not null default 'EGP',
	fuel_liters numeric(12, 3),
	odometer_km numeric(12, 1),
	receipt_image_data_url text not null,
	receipt_file_name text not null default 'fuel-receipt.jpg',
	receipt_mime_type text not null default 'image/jpeg',
	receipt_size_bytes integer,
	note text,
	status public.truck_fuel_expense_status not null default 'submitted',
	submitted_at timestamptz not null default now(),
	posted_by_employee_id uuid references public.employees(id) on delete set null,
	posted_at timestamptz,
	finance_note text,
	proof_document_id uuid references public.proof_documents(id) on delete restrict,
	proof_path text,
	journal_entry_id uuid unique references public.finance_journal_entries(id) on delete restrict,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint truck_fuel_expenses_amount_positive
		check (amount is null or amount > 0),
	constraint truck_fuel_expenses_currency_egp
		check (currency = 'EGP'),
	constraint truck_fuel_expenses_liters_positive
		check (fuel_liters is null or fuel_liters > 0),
	constraint truck_fuel_expenses_odometer_positive
		check (odometer_km is null or odometer_km >= 0),
	constraint truck_fuel_expenses_receipt_image
		check (
			receipt_image_data_url like 'data:image/%'
			and length(receipt_image_data_url) between 24 and 1500000
			and receipt_mime_type like 'image/%'
			and (receipt_size_bytes is null or receipt_size_bytes between 1 and 1048576)
		),
	constraint truck_fuel_expenses_posted_metadata
		check (
			status <> 'posted'
			or (amount is not null and posted_at is not null and posted_by_employee_id is not null and journal_entry_id is not null)
		)
);

create index if not exists truck_fuel_expenses_status_date_idx
	on public.truck_fuel_expenses (status, expense_date desc, created_at desc);
create index if not exists truck_fuel_expenses_truck_date_idx
	on public.truck_fuel_expenses (truck_id, expense_date desc);
create index if not exists truck_fuel_expenses_driver_date_idx
	on public.truck_fuel_expenses (driver_id, expense_date desc);

create table if not exists public.company_assets (
	id uuid primary key default gen_random_uuid(),
	asset_number text not null unique default (
		'AST-'
		|| to_char(now() at time zone 'Africa/Cairo', 'YYYY')
		|| '-'
		|| lpad(nextval('public.company_asset_number_seq'::regclass)::text, 6, '0')
	),
	asset_type public.company_asset_type not null,
	name text not null,
	acquisition_date date not null default ((now() at time zone 'Africa/Cairo')::date),
	acquisition_cost numeric(14, 2) not null,
	carrying_value numeric(14, 2) not null,
	currency text not null default 'EGP',
	funding_source public.company_asset_funding_source not null,
	location text,
	related_truck_id uuid references public.trucks(id) on delete set null,
	status public.company_asset_status not null default 'active',
	proof_document_id uuid references public.proof_documents(id) on delete restrict,
	proof_path text,
	notes text,
	created_by_employee_id uuid references public.employees(id) on delete set null,
	journal_entry_id uuid unique references public.finance_journal_entries(id) on delete restrict,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint company_assets_name_present
		check (length(btrim(name)) >= 2),
	constraint company_assets_values_nonnegative
		check (acquisition_cost > 0 and carrying_value >= 0 and carrying_value <= acquisition_cost),
	constraint company_assets_currency_egp
		check (currency = 'EGP'),
	constraint company_assets_has_proof
		check (
			proof_document_id is not null
			or length(btrim(coalesce(proof_path, ''))) > 0
		)
);

create index if not exists company_assets_status_type_idx
	on public.company_assets (status, asset_type, created_at desc);
create index if not exists company_assets_related_truck_idx
	on public.company_assets (related_truck_id)
	where related_truck_id is not null;

drop trigger if exists employee_payroll_payments_set_updated_at
	on public.employee_payroll_payments;
create trigger employee_payroll_payments_set_updated_at
	before update on public.employee_payroll_payments
	for each row execute function public.set_updated_at();

drop trigger if exists truck_fuel_expenses_set_updated_at
	on public.truck_fuel_expenses;
create trigger truck_fuel_expenses_set_updated_at
	before update on public.truck_fuel_expenses
	for each row execute function public.set_updated_at();

drop trigger if exists company_assets_set_updated_at
	on public.company_assets;
create trigger company_assets_set_updated_at
	before update on public.company_assets
	for each row execute function public.set_updated_at();

alter table public.employee_payroll_payments enable row level security;
alter table public.truck_fuel_expenses enable row level security;
alter table public.company_assets enable row level security;

drop policy if exists employee_payroll_payments_internal_read on public.employee_payroll_payments;
create policy employee_payroll_payments_internal_read
	on public.employee_payroll_payments for select
	to authenticated
	using (public.can_access_panel('finance') or public.is_employee_with_role('ceo'));

drop policy if exists truck_fuel_expenses_internal_read on public.truck_fuel_expenses;
create policy truck_fuel_expenses_internal_read
	on public.truck_fuel_expenses for select
	to authenticated
	using (
		public.can_access_panel('finance')
		or public.can_access_panel('dispatch')
		or public.is_employee_with_role('ceo')
	);

drop policy if exists company_assets_internal_read on public.company_assets;
create policy company_assets_internal_read
	on public.company_assets for select
	to authenticated
	using (public.can_access_panel('finance') or public.is_employee_with_role('ceo'));

revoke all on table public.employee_payroll_payments from anon, authenticated, public;
revoke all on table public.truck_fuel_expenses from anon, authenticated, public;
revoke all on table public.company_assets from anon, authenticated, public;
grant select, insert, update, delete on table public.employee_payroll_payments to service_role;
grant select, insert, update, delete on table public.truck_fuel_expenses to service_role;
grant select, insert, update, delete on table public.company_assets to service_role;
grant usage, select on sequence public.company_asset_number_seq to service_role;

insert into public.finance_accounts (
	code,
	name,
	account_class,
	normal_balance,
	parent_account_id,
	is_system
)
select
	seed.code,
	seed.name,
	seed.account_class,
	seed.normal_balance,
	parent.id,
	true
from (
	values
		('1300', 'Company assets - non-inventory', 'asset'::public.finance_account_class, 'debit'::public.finance_normal_balance, '1000'),
		('5210', 'Employee bonus expense', 'expense', 'debit', '5000'),
		('5220', 'Truck fuel expense', 'expense', 'debit', '5000')
) as seed(code, name, account_class, normal_balance, parent_code)
join public.finance_accounts parent on parent.code = seed.parent_code
on conflict (code) do update
set
	name = excluded.name,
	account_class = excluded.account_class,
	normal_balance = excluded.normal_balance,
	parent_account_id = excluded.parent_account_id,
	is_system = true,
	updated_at = now();

create or replace function app_private.finance_add_operating_line(
	p_entry_id uuid,
	p_line_number integer,
	p_account_code text,
	p_debit numeric,
	p_credit numeric,
	p_memo text,
	p_source_type public.finance_journal_source_type,
	p_source_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	account_id uuid := app_private.finance_account_id(p_account_code);
	clean_debit numeric := round(coalesce(p_debit, 0), 2);
	clean_credit numeric := round(coalesce(p_credit, 0), 2);
begin
	if clean_debit = 0 and clean_credit = 0 then
		return p_line_number;
	end if;
	if account_id is null then
		raise exception 'finance_account_missing_%', p_account_code using errcode = '23514';
	end if;

	insert into public.finance_journal_lines (
		entry_id,
		line_number,
		account_id,
		debit,
		credit,
		memo,
		source_type,
		source_id
	)
	values (
		p_entry_id,
		p_line_number,
		account_id,
		clean_debit,
		clean_credit,
		p_memo,
		p_source_type,
		p_source_id
	);

	return p_line_number + 1;
end;
$$;

create or replace function app_private.finance_link_operating_proof(
	p_entry_id uuid,
	p_proof_document_id uuid,
	p_proof_path text,
	p_link_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
	if p_proof_document_id is null
		and length(btrim(coalesce(p_proof_path, ''))) = 0
	then
		return;
	end if;

	insert into public.finance_journal_proof_links (
		entry_id,
		proof_document_id,
		proof_path,
		link_role
	)
	values (
		p_entry_id,
		p_proof_document_id,
		case
			when p_proof_document_id is null then nullif(btrim(coalesce(p_proof_path, '')), '')
			else null
		end,
		p_link_role
	)
	on conflict do nothing;
end;
$$;

create or replace function app_private.finance_post_operating_entry(
	p_source_type public.finance_journal_source_type,
	p_source_id uuid,
	p_description text,
	p_actor_employee_id uuid,
	p_debit_account_code text,
	p_credit_account_code text,
	p_amount numeric,
	p_debit_memo text,
	p_credit_memo text,
	p_source_label text,
	p_proof_document_id uuid default null,
	p_proof_path text default null,
	p_proof_link_role text default 'supporting'
)
returns public.finance_journal_entries
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	entry public.finance_journal_entries%rowtype;
	line_number integer := 1;
	clean_amount numeric := round(coalesce(p_amount, 0), 2);
begin
	if clean_amount <= 0 then
		raise exception 'finance_operating_entry_amount_required' using errcode = '23514';
	end if;

	insert into public.finance_journal_entries (
		accounting_date,
		source_type,
		source_id,
		description,
		actor_employee_id
	)
	values (
		(now() at time zone 'Africa/Cairo')::date,
		p_source_type,
		p_source_id,
		p_description,
		p_actor_employee_id
	)
	returning * into entry;

	line_number := app_private.finance_add_operating_line(
		entry.id,
		line_number,
		p_debit_account_code,
		clean_amount,
		0,
		p_debit_memo,
		p_source_type,
		p_source_id
	);
	line_number := app_private.finance_add_operating_line(
		entry.id,
		line_number,
		p_credit_account_code,
		0,
		clean_amount,
		p_credit_memo,
		p_source_type,
		p_source_id
	);

	insert into public.finance_journal_source_links (
		entry_id,
		source_type,
		source_id,
		link_role,
		source_label
	)
	values (
		entry.id,
		p_source_type,
		p_source_id,
		'primary',
		p_source_label
	);

	perform app_private.finance_link_operating_proof(
		entry.id,
		p_proof_document_id,
		p_proof_path,
		p_proof_link_role
	);

	update public.finance_journal_entries
	set
		status = 'posted',
		posted_at = now(),
		posted_by_employee_id = p_actor_employee_id
	where id = entry.id
	returning * into entry;

	return entry;
end;
$$;

create or replace function public.finance_update_employee_compensation(
	p_employee_id uuid,
	p_base_salary numeric,
	p_social_insurance_salary numeric default null,
	p_department text default null,
	p_title text default null,
	p_salary_currency text default 'EGP',
	p_proof_path text default null,
	p_proof_document_id uuid default null
)
returns public.employee_compensation
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	employee_id uuid;
	target_employee public.employees%rowtype;
	old_comp public.employee_compensation%rowtype;
	updated_comp public.employee_compensation%rowtype;
	clean_proof_path text := nullif(btrim(coalesce(p_proof_path, '')), '');
	clean_currency text := upper(btrim(coalesce(p_salary_currency, 'EGP')));
begin
	employee_id := public.require_panel('finance', true);

	if p_base_salary is null or p_base_salary < 0 then
		raise exception 'employee_base_salary_required' using errcode = '23514';
	end if;
	if coalesce(p_social_insurance_salary, 0) < 0 then
		raise exception 'employee_social_insurance_salary_invalid' using errcode = '23514';
	end if;
	if clean_currency <> 'EGP' then
		raise exception 'employee_salary_currency_egp_required' using errcode = '23514';
	end if;
	if clean_proof_path is null and p_proof_document_id is null then
		raise exception 'employee_salary_change_proof_required' using errcode = '23514';
	end if;

	select * into target_employee
	from public.employees
	where id = p_employee_id
	for update;

	if target_employee.id is null or target_employee.status <> 'active' then
		raise exception 'active_employee_required_for_salary_update' using errcode = '02000';
	end if;

	select * into old_comp
	from public.employee_compensation
	where employee_compensation.employee_id = p_employee_id;

	insert into public.employee_compensation (
		employee_id,
		department,
		title,
		base_salary,
		social_insurance_salary,
		salary_currency,
		updated_by_employee_id
	)
	values (
		p_employee_id,
		nullif(btrim(coalesce(p_department, old_comp.department, '')), ''),
		nullif(btrim(coalesce(p_title, old_comp.title, '')), ''),
		round(p_base_salary, 2),
		round(coalesce(p_social_insurance_salary, old_comp.social_insurance_salary, 0), 2),
		clean_currency,
		employee_id
	)
	on conflict on constraint employee_compensation_pkey do update
	set
		department = excluded.department,
		title = excluded.title,
		base_salary = excluded.base_salary,
		social_insurance_salary = excluded.social_insurance_salary,
		salary_currency = excluded.salary_currency,
		updated_by_employee_id = excluded.updated_by_employee_id,
		updated_at = now()
	returning * into updated_comp;

	perform public.log_activity(
		'employee',
		p_employee_id,
		'finance_salary_updated',
		jsonb_strip_nulls(jsonb_build_object(
			'employee_id', employee_id,
			'employee_name', target_employee.full_name,
			'old_base_salary', old_comp.base_salary,
			'new_base_salary', updated_comp.base_salary,
			'old_social_insurance_salary', old_comp.social_insurance_salary,
			'new_social_insurance_salary', updated_comp.social_insurance_salary,
			'department', updated_comp.department,
			'title', updated_comp.title,
			'proof_document_id', p_proof_document_id,
			'proof_path', clean_proof_path
		))
	);

	return updated_comp;
end;
$$;

create or replace function public.finance_pay_employee_salary(
	p_employee_id uuid,
	p_period_month date default null,
	p_proof_path text default null,
	p_proof_document_id uuid default null,
	p_note text default null
)
returns public.employee_payroll_payments
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	employee_id uuid;
	target_employee public.employees%rowtype;
	comp public.employee_compensation%rowtype;
	payment public.employee_payroll_payments%rowtype;
	entry public.finance_journal_entries%rowtype;
	period_month date := date_trunc(
		'month',
		coalesce(p_period_month, (now() at time zone 'Africa/Cairo')::date)
	)::date;
	clean_proof_path text := nullif(btrim(coalesce(p_proof_path, '')), '');
begin
	employee_id := public.require_panel('finance', true);
	if clean_proof_path is null and p_proof_document_id is null then
		raise exception 'employee_salary_payment_proof_required' using errcode = '23514';
	end if;

	select * into target_employee
	from public.employees
	where id = p_employee_id
	for update;
	if target_employee.id is null or target_employee.status <> 'active' then
		raise exception 'active_employee_required_for_salary_payment' using errcode = '02000';
	end if;

	select * into comp
	from public.employee_compensation
	where employee_compensation.employee_id = p_employee_id;
	if comp.employee_id is null or coalesce(comp.base_salary, 0) <= 0 then
		raise exception 'employee_salary_not_configured' using errcode = '23514';
	end if;

	insert into public.employee_payroll_payments (
		employee_id,
		period_month,
		payment_type,
		amount,
		reason,
		proof_document_id,
		proof_path,
		created_by_employee_id
	)
	values (
		p_employee_id,
		period_month,
		'salary',
		round(comp.base_salary, 2),
		nullif(btrim(coalesce(p_note, '')), ''),
		p_proof_document_id,
		clean_proof_path,
		employee_id
	)
	returning * into payment;

	entry := app_private.finance_post_operating_entry(
		'employee_payroll_payment',
		payment.id,
		'Salary payment for ' || target_employee.full_name || ' - ' || to_char(period_month, 'YYYY-MM'),
		employee_id,
		'5200',
		'1010',
		payment.amount,
		'Salary expense paid',
		'Cash paid to employee',
		target_employee.full_name,
		p_proof_document_id,
		clean_proof_path,
		'payroll_payment_proof'
	);

	update public.employee_payroll_payments
	set journal_entry_id = entry.id
	where id = payment.id
	returning * into payment;

	perform public.log_activity(
		'employee_payroll_payment',
		payment.id,
		'finance_payroll_paid',
		jsonb_strip_nulls(jsonb_build_object(
			'employee_id', employee_id,
			'paid_employee_id', target_employee.id,
			'paid_employee_name', target_employee.full_name,
			'period_month', period_month,
			'amount', payment.amount,
			'journal_entry_id', entry.id,
			'entry_number', entry.entry_number,
			'proof_document_id', p_proof_document_id,
			'proof_path', clean_proof_path
		))
	);

	return payment;
exception
	when unique_violation then
		raise exception 'employee_salary_already_paid_for_month' using errcode = '23505';
end;
$$;

create or replace function public.finance_pay_employee_bonus(
	p_employee_id uuid,
	p_amount numeric,
	p_period_month date default null,
	p_reason text default null,
	p_proof_path text default null,
	p_proof_document_id uuid default null
)
returns public.employee_payroll_payments
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	employee_id uuid;
	target_employee public.employees%rowtype;
	payment public.employee_payroll_payments%rowtype;
	entry public.finance_journal_entries%rowtype;
	period_month date := date_trunc(
		'month',
		coalesce(p_period_month, (now() at time zone 'Africa/Cairo')::date)
	)::date;
	clean_reason text := btrim(coalesce(p_reason, ''));
	clean_proof_path text := nullif(btrim(coalesce(p_proof_path, '')), '');
	clean_amount numeric := round(coalesce(p_amount, 0), 2);
begin
	employee_id := public.require_panel('finance', true);
	if clean_amount <= 0 then
		raise exception 'employee_bonus_amount_required' using errcode = '23514';
	end if;
	if length(clean_reason) < 3 then
		raise exception 'employee_bonus_reason_required' using errcode = '23514';
	end if;
	if clean_proof_path is null and p_proof_document_id is null then
		raise exception 'employee_bonus_payment_proof_required' using errcode = '23514';
	end if;

	select * into target_employee
	from public.employees
	where id = p_employee_id
	for update;
	if target_employee.id is null or target_employee.status <> 'active' then
		raise exception 'active_employee_required_for_bonus_payment' using errcode = '02000';
	end if;

	insert into public.employee_payroll_payments (
		employee_id,
		period_month,
		payment_type,
		amount,
		reason,
		proof_document_id,
		proof_path,
		created_by_employee_id
	)
	values (
		p_employee_id,
		period_month,
		'bonus',
		clean_amount,
		clean_reason,
		p_proof_document_id,
		clean_proof_path,
		employee_id
	)
	returning * into payment;

	entry := app_private.finance_post_operating_entry(
		'employee_payroll_payment',
		payment.id,
		'Bonus payment for ' || target_employee.full_name || ' - ' || to_char(period_month, 'YYYY-MM'),
		employee_id,
		'5210',
		'1010',
		payment.amount,
		'Employee bonus expense',
		'Cash paid as bonus',
		target_employee.full_name,
		p_proof_document_id,
		clean_proof_path,
		'bonus_payment_proof'
	);

	update public.employee_payroll_payments
	set journal_entry_id = entry.id
	where id = payment.id
	returning * into payment;

	perform public.log_activity(
		'employee_payroll_payment',
		payment.id,
		'finance_bonus_paid',
		jsonb_strip_nulls(jsonb_build_object(
			'employee_id', employee_id,
			'paid_employee_id', target_employee.id,
			'paid_employee_name', target_employee.full_name,
			'period_month', period_month,
			'amount', payment.amount,
			'reason', clean_reason,
			'journal_entry_id', entry.id,
			'entry_number', entry.entry_number,
			'proof_document_id', p_proof_document_id,
			'proof_path', clean_proof_path
		))
	);

	return payment;
end;
$$;

create or replace function public.driver_submit_fuel_receipt(
	p_truck_id uuid default null,
	p_delivery_id uuid default null,
	p_expense_date date default null,
	p_amount numeric default null,
	p_fuel_liters numeric default null,
	p_odometer_km numeric default null,
	p_receipt_image_data_url text default null,
	p_receipt_file_name text default null,
	p_receipt_mime_type text default null,
	p_receipt_size_bytes integer default null,
	p_note text default null
)
returns public.truck_fuel_expenses
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	actor_driver_id uuid := public.current_driver_id();
	target_truck public.trucks%rowtype;
	target_delivery public.deliveries%rowtype;
	expense public.truck_fuel_expenses%rowtype;
	clean_receipt text := btrim(coalesce(p_receipt_image_data_url, ''));
	clean_file_name text := coalesce(nullif(btrim(coalesce(p_receipt_file_name, '')), ''), 'fuel-receipt.jpg');
	clean_mime_type text := coalesce(nullif(btrim(coalesce(p_receipt_mime_type, '')), ''), 'image/jpeg');
	clean_amount numeric := case when p_amount is null then null else round(p_amount, 2) end;
begin
	if actor_driver_id is null then
		raise exception 'driver_session_required' using errcode = '42501';
	end if;
	if clean_receipt = '' or clean_receipt not like 'data:image/%' then
		raise exception 'fuel_receipt_photo_required' using errcode = '23514';
	end if;
	if length(clean_receipt) > 1500000 then
		raise exception 'fuel_receipt_photo_too_large' using errcode = '23514';
	end if;
	if clean_mime_type not like 'image/%' then
		raise exception 'fuel_receipt_photo_type_required' using errcode = '23514';
	end if;
	if p_receipt_size_bytes is not null and (p_receipt_size_bytes < 1 or p_receipt_size_bytes > 1048576) then
		raise exception 'fuel_receipt_photo_size_invalid' using errcode = '23514';
	end if;
	if clean_amount is not null and clean_amount <= 0 then
		raise exception 'fuel_amount_must_be_positive' using errcode = '23514';
	end if;
	if p_fuel_liters is not null and p_fuel_liters <= 0 then
		raise exception 'fuel_liters_must_be_positive' using errcode = '23514';
	end if;
	if p_odometer_km is not null and p_odometer_km < 0 then
		raise exception 'fuel_odometer_invalid' using errcode = '23514';
	end if;

	if p_delivery_id is not null then
		select * into target_delivery
		from public.deliveries
		where id = p_delivery_id
		  and deliveries.driver_id = actor_driver_id;
		if target_delivery.id is null then
			raise exception 'driver_delivery_not_found_for_fuel' using errcode = '02000';
		end if;
	end if;

	if p_truck_id is not null then
		select * into target_truck
		from public.trucks
		where id = p_truck_id;
	elsif target_delivery.truck_id is not null then
		select * into target_truck
		from public.trucks
		where id = target_delivery.truck_id;
	else
		select * into target_truck
		from public.trucks
		where trucks.driver_id = actor_driver_id
		order by updated_at desc
		limit 1;
	end if;

	if target_truck.id is null then
		raise exception 'fuel_truck_required' using errcode = '23514';
	end if;
	if target_truck.driver_id is not null
		and target_truck.driver_id <> actor_driver_id
		and coalesce(target_delivery.driver_id, actor_driver_id) <> actor_driver_id
	then
		raise exception 'fuel_truck_not_assigned_to_driver' using errcode = '42501';
	end if;

	insert into public.truck_fuel_expenses (
		truck_id,
		driver_id,
		delivery_id,
		expense_date,
		amount,
		fuel_liters,
		odometer_km,
		receipt_image_data_url,
		receipt_file_name,
		receipt_mime_type,
		receipt_size_bytes,
		note
	)
	values (
		target_truck.id,
		actor_driver_id,
		target_delivery.id,
		coalesce(p_expense_date, (now() at time zone 'Africa/Cairo')::date),
		clean_amount,
		case when p_fuel_liters is null then null else round(p_fuel_liters, 3) end,
		case when p_odometer_km is null then null else round(p_odometer_km, 1) end,
		clean_receipt,
		clean_file_name,
		clean_mime_type,
		p_receipt_size_bytes,
		nullif(btrim(coalesce(p_note, '')), '')
	)
	returning * into expense;

	perform public.log_activity(
		'truck_fuel_expense',
		expense.id,
		'driver_fuel_receipt_submitted',
		jsonb_strip_nulls(jsonb_build_object(
			'driver_id', actor_driver_id,
			'truck_id', target_truck.id,
			'truck_plate', target_truck.plate_number,
			'delivery_id', target_delivery.id,
			'expense_date', expense.expense_date,
			'amount', expense.amount,
			'fuel_liters', expense.fuel_liters,
			'odometer_km', expense.odometer_km,
			'source', 'driver_app'
		))
	);

	return expense;
end;
$$;

create or replace function public.finance_post_truck_fuel_expense(
	p_expense_id uuid,
	p_amount numeric default null,
	p_proof_path text default null,
	p_proof_document_id uuid default null,
	p_note text default null
)
returns public.truck_fuel_expenses
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	employee_id uuid;
	expense public.truck_fuel_expenses%rowtype;
	posted_expense public.truck_fuel_expenses%rowtype;
	entry public.finance_journal_entries%rowtype;
	target_truck public.trucks%rowtype;
	target_driver public.drivers%rowtype;
	clean_amount numeric;
	clean_proof_path text := nullif(btrim(coalesce(p_proof_path, '')), '');
begin
	employee_id := public.require_panel('finance', true);

	select * into expense
	from public.truck_fuel_expenses
	where id = p_expense_id
	for update;
	if expense.id is null then
		raise exception 'fuel_expense_not_found' using errcode = '02000';
	end if;
	if expense.status <> 'submitted' then
		raise exception 'fuel_expense_not_submitted' using errcode = '23514';
	end if;

	clean_amount := round(coalesce(p_amount, expense.amount, 0), 2);
	if clean_amount <= 0 then
		raise exception 'fuel_expense_amount_required' using errcode = '23514';
	end if;

	select * into target_truck from public.trucks where id = expense.truck_id;
	select * into target_driver from public.drivers where id = expense.driver_id;

	entry := app_private.finance_post_operating_entry(
		'truck_fuel_expense',
		expense.id,
		'Truck fuel expense for ' || coalesce(target_truck.plate_number, 'truck') || ' - ' || expense.expense_date::text,
		employee_id,
		'5220',
		'1010',
		clean_amount,
		'Truck fuel expense',
		'Cash paid for truck fuel',
		coalesce(target_truck.plate_number, target_driver.full_name, 'Truck fuel'),
		p_proof_document_id,
		clean_proof_path,
		'fuel_payment_proof'
	);

	update public.truck_fuel_expenses
	set
		amount = clean_amount,
		status = 'posted',
		posted_by_employee_id = employee_id,
		posted_at = now(),
		finance_note = nullif(btrim(coalesce(p_note, '')), ''),
		proof_document_id = p_proof_document_id,
		proof_path = clean_proof_path,
		journal_entry_id = entry.id
	where id = expense.id
	returning * into posted_expense;

	perform public.log_activity(
		'truck_fuel_expense',
		posted_expense.id,
		'finance_fuel_expense_posted',
		jsonb_strip_nulls(jsonb_build_object(
			'employee_id', employee_id,
			'driver_id', posted_expense.driver_id,
			'driver_name', target_driver.full_name,
			'truck_id', posted_expense.truck_id,
			'truck_plate', target_truck.plate_number,
			'amount', posted_expense.amount,
			'expense_date', posted_expense.expense_date,
			'journal_entry_id', entry.id,
			'entry_number', entry.entry_number,
			'proof_document_id', p_proof_document_id,
			'proof_path', clean_proof_path
		))
	);

	return posted_expense;
end;
$$;

create or replace function public.finance_record_company_asset(
	p_asset_type text,
	p_name text,
	p_acquisition_cost numeric,
	p_funding_source text,
	p_acquisition_date date default null,
	p_location text default null,
	p_related_truck_id uuid default null,
	p_proof_path text default null,
	p_proof_document_id uuid default null,
	p_notes text default null
)
returns public.company_assets
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	employee_id uuid;
	asset public.company_assets%rowtype;
	entry public.finance_journal_entries%rowtype;
	clean_asset_type text := lower(btrim(coalesce(p_asset_type, '')));
	clean_funding_source text := lower(btrim(coalesce(p_funding_source, '')));
	clean_name text := btrim(coalesce(p_name, ''));
	clean_cost numeric := round(coalesce(p_acquisition_cost, 0), 2);
	clean_proof_path text := nullif(btrim(coalesce(p_proof_path, '')), '');
	credit_account_code text;
	credit_memo text;
begin
	employee_id := public.require_panel('finance', true);

	if clean_asset_type not in ('building', 'vehicle', 'truck', 'equipment', 'furniture', 'technology', 'other') then
		raise exception 'company_asset_type_invalid' using errcode = '23514';
	end if;
	if clean_funding_source not in ('cash_purchase', 'opening_balance', 'owner_contribution') then
		raise exception 'company_asset_funding_source_invalid' using errcode = '23514';
	end if;
	if length(clean_name) < 2 then
		raise exception 'company_asset_name_required' using errcode = '23514';
	end if;
	if clean_cost <= 0 then
		raise exception 'company_asset_cost_required' using errcode = '23514';
	end if;
	if clean_proof_path is null and p_proof_document_id is null then
		raise exception 'company_asset_proof_required' using errcode = '23514';
	end if;
	if p_related_truck_id is not null and not exists (
		select 1 from public.trucks where id = p_related_truck_id
	) then
		raise exception 'company_asset_truck_not_found' using errcode = '02000';
	end if;

	insert into public.company_assets (
		asset_type,
		name,
		acquisition_date,
		acquisition_cost,
		carrying_value,
		funding_source,
		location,
		related_truck_id,
		proof_document_id,
		proof_path,
		notes,
		created_by_employee_id
	)
	values (
		clean_asset_type::public.company_asset_type,
		clean_name,
		coalesce(p_acquisition_date, (now() at time zone 'Africa/Cairo')::date),
		clean_cost,
		clean_cost,
		clean_funding_source::public.company_asset_funding_source,
		nullif(btrim(coalesce(p_location, '')), ''),
		p_related_truck_id,
		p_proof_document_id,
		clean_proof_path,
		nullif(btrim(coalesce(p_notes, '')), ''),
		employee_id
	)
	returning * into asset;

	if clean_funding_source = 'cash_purchase' then
		credit_account_code := '1010';
		credit_memo := 'Cash paid for company asset';
	else
		credit_account_code := '3100';
		credit_memo := case
			when clean_funding_source = 'opening_balance' then 'Opening balance asset recognition'
			else 'Owner contribution asset recognition'
		end;
	end if;

	entry := app_private.finance_post_operating_entry(
		'company_asset',
		asset.id,
		'Company asset recorded: ' || asset.name,
		employee_id,
		'1300',
		credit_account_code,
		asset.acquisition_cost,
		'Company non-inventory asset',
		credit_memo,
		asset.name,
		p_proof_document_id,
		clean_proof_path,
		'asset_proof'
	);

	update public.company_assets
	set journal_entry_id = entry.id
	where id = asset.id
	returning * into asset;

	perform public.log_activity(
		'company_asset',
		asset.id,
		'finance_company_asset_recorded',
		jsonb_strip_nulls(jsonb_build_object(
			'employee_id', employee_id,
			'asset_number', asset.asset_number,
			'asset_type', asset.asset_type,
			'name', asset.name,
			'acquisition_cost', asset.acquisition_cost,
			'funding_source', asset.funding_source,
			'journal_entry_id', entry.id,
			'entry_number', entry.entry_number,
			'proof_document_id', p_proof_document_id,
			'proof_path', clean_proof_path
		))
	);

	return asset;
end;
$$;

create or replace function public.is_important_activity(
	p_action public.audit_event_type,
	p_entity_type text,
	p_details jsonb default '{}'::jsonb
)
returns boolean
language sql
immutable
set search_path = public
as $$
	select
		not (coalesce(p_details, '{}'::jsonb) ? 'source_action')
		and (
			p_action in (
				'admin_export_created',
				'customer_profile_claimed',
				'customer_payment_followup_recorded',
				'customer_payment_recorded',
				'customer_quote_accepted',
				'customer_quote_declined',
				'customer_quote_line_response_submitted',
				'customer_quote_negotiation_requested',
				'customer_order_saved_as_draft',
				'customer_signature_captured',
				'customer_signed_in',
				'customer_signed_up',
				'delivery_returned_to_warehouse_loading',
				'dispatch_delivery_completed',
				'dispatch_delivery_rejected',
				'dispatch_driver_assigned',
				'driver_assigned_delivery',
				'driver_delivery_accepted',
				'driver_delivery_arrived',
				'driver_delivery_confirmed',
				'driver_delivery_rejected',
				'driver_delivery_route_reopened',
				'driver_delivery_started',
				'driver_fuel_receipt_submitted',
				'driver_rejection_proof_uploaded',
				'draft_created',
				'draft_saved',
				'draft_submitted',
				'draft_updated',
				'finance_bonus_paid',
				'finance_company_asset_disposed',
				'finance_company_asset_recorded',
				'finance_company_asset_revalued',
				'finance_fuel_expense_posted',
				'finance_payroll_paid',
				'finance_salary_updated',
				'internal_employee_created',
				'internal_employee_role_assigned',
				'internal_employee_role_removed',
				'inventory_availability_updated',
				'inventory_damage_recorded',
				'inventory_damage_sold',
				'inventory_damage_disposed',
				'inventory_damage_reversed',
				'inventory_order_evaluated',
				'inventory_price_marked_outdated',
				'inventory_price_updated',
				'manual_order_created',
				'order_stock_reserved',
				'order_submitted',
				'price_update_requested',
				'provisional_customer_created',
				'provisional_customer_confirmed',
				'sales_call_note_recorded',
				'sales_customer_called',
				'sales_order_canceled',
				'sales_order_claimed',
				'sales_order_confirmed',
				'sales_order_opened',
				'sales_order_rejected',
				'sales_order_requeued',
				'sales_quote_approved',
				'sales_quote_draft_saved',
				'sales_quote_edited',
				'supplier_payment_followup_recorded',
				'supplier_payment_recorded',
				'supplier_refill_canceled',
				'supplier_refill_created',
				'support_assigned',
				'support_conversation_linked_to_customer',
				'support_reply_sent',
				'support_status_updated',
				'support_ticket_created',
				'support_ticket_reply_sent',
				'portal_draft_saved',
				'portal_order_viewed',
				'quote_request_submitted',
				'admin_role_assigned',
				'admin_role_removed',
				'admin_database_exported',
				'warehouse_loading_approved',
				'warehouse_loading_driver_assigned',
				'warehouse_loading_driver_removed',
				'warehouse_loading_marked_ready',
				'warehouse_loading_rejected',
				'warehouse_loading_reset',
				'warehouse_loading_started',
				'warehouse_receiving_approved',
				'warehouse_receiving_rejected',
				'whatsapp_message_ingested',
				'website_draft_saved'
			)
			or (
				p_action in (
					'admin_record_created',
					'admin_record_updated',
					'admin_record_deactivated'
				)
				and p_entity_type in (
					'customer',
					'driver',
					'employee',
					'pricing_rule',
					'product',
					'supplier',
					'supplier_product_link',
					'truck'
				)
			)
			or (
				p_action in ('employee_role_assigned', 'employee_role_removed')
				and p_entity_type = 'employee'
			)
		)
$$;

grant execute on function public.is_important_activity(
	public.audit_event_type,
	text,
	jsonb
) to authenticated;

create or replace function app_private.keep_only_business_activity_events()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	if new.action in (
		'finance_salary_updated',
		'finance_payroll_paid',
		'finance_bonus_paid',
		'driver_fuel_receipt_submitted',
		'finance_fuel_expense_posted',
		'finance_company_asset_recorded',
		'finance_company_asset_revalued',
		'finance_company_asset_disposed'
	) then
		return new;
	end if;

	if public.is_important_activity(new.action, new.entity_type, new.details) then
		return new;
	end if;

	return null;
end;
$$;

create or replace function public.ceo_activity_action_label(
	p_action public.audit_event_type
)
returns text
language sql
immutable
set search_path = public
as $$
	select case p_action::text
		when 'inventory_damage_recorded' then 'marked damaged stock'
		when 'inventory_damage_sold' then 'sold damaged stock'
		when 'inventory_damage_disposed' then 'disposed damaged stock'
		when 'inventory_damage_reversed' then 'restored damaged stock'
		when 'finance_salary_updated' then 'Employee salary updated'
		when 'finance_payroll_paid' then 'Employee salary paid'
		when 'finance_bonus_paid' then 'Employee bonus paid'
		when 'driver_fuel_receipt_submitted' then 'Driver submitted fuel receipt'
		when 'finance_fuel_expense_posted' then 'Fuel expense posted'
		when 'finance_company_asset_recorded' then 'Company asset recorded'
		when 'finance_company_asset_revalued' then 'Company asset revalued'
		when 'finance_company_asset_disposed' then 'Company asset disposed'
		when 'admin_record_created' then 'Admin record created'
		when 'admin_record_deactivated' then 'Admin record deactivated'
		when 'admin_record_updated' then 'Admin record updated'
		when 'admin_database_exported' then 'Database export created'
		when 'admin_role_assigned' then 'Admin role assigned'
		when 'admin_role_removed' then 'Admin role removed'
		when 'customer_profile_claimed' then 'Customer profile claimed'
		when 'customer_payment_followup_recorded' then 'Customer payment follow-up recorded'
		when 'customer_payment_recorded' then 'Customer payment recorded'
		when 'customer_quote_accepted' then 'Customer accepted quote'
		when 'customer_quote_declined' then 'Customer declined quote'
		when 'customer_quote_line_response_submitted' then 'Customer responded to quote lines'
		when 'customer_quote_negotiation_requested' then 'Customer requested negotiation'
		when 'customer_signature_captured' then 'Customer signature captured'
		when 'delivery_returned_to_warehouse_loading' then 'Delivery returned to warehouse'
		when 'dispatch_delivery_completed' then 'Delivery completed'
		when 'dispatch_delivery_rejected' then 'Delivery rejected'
		when 'dispatch_driver_assigned' then 'Driver assigned'
		when 'driver_assigned_delivery' then 'Driver received assignment'
		when 'driver_delivery_accepted' then 'Driver accepted delivery'
		when 'driver_delivery_arrived' then 'Driver arrived'
		when 'driver_delivery_confirmed' then 'Driver confirmed delivery'
		when 'driver_delivery_rejected' then 'Driver rejected delivery'
		when 'driver_delivery_route_reopened' then 'Delivery route reopened'
		when 'driver_delivery_started' then 'Driver started delivery'
		when 'driver_rejection_proof_uploaded' then 'Driver uploaded rejection proof'
		when 'employee_role_assigned' then 'Employee role assigned'
		when 'employee_role_removed' then 'Employee role removed'
		when 'internal_employee_created' then 'Employee created'
		when 'internal_employee_role_assigned' then 'Employee role assigned'
		when 'internal_employee_role_removed' then 'Employee role removed'
		when 'inventory_availability_updated' then 'Inventory availability updated'
		when 'inventory_order_evaluated' then 'Inventory evaluated order'
		when 'inventory_price_marked_outdated' then 'Inventory marked price outdated'
		when 'inventory_price_updated' then 'Inventory price updated'
		when 'manual_order_created' then 'Manual order created'
		when 'order_stock_reserved' then 'Stock reserved'
		when 'order_submitted' then 'Order submitted'
		when 'price_update_requested' then 'Price update requested'
		when 'provisional_customer_created' then 'Provisional customer created'
		when 'provisional_customer_confirmed' then 'Provisional customer confirmed'
		when 'quote_accepted' then 'Quote accepted'
		when 'sales_call_note_recorded' then 'Sales call recorded'
		when 'sales_customer_called' then 'Sales called customer'
		when 'sales_order_canceled' then 'Sales canceled order'
		when 'sales_order_claimed' then 'Sales claimed order'
		when 'sales_order_confirmed' then 'Sales confirmed order'
		when 'sales_order_rejected' then 'Sales rejected order'
		when 'sales_order_requeued' then 'Sales requeued order'
		when 'sales_quote_approved' then 'Sales quote approved'
		when 'supplier_payment_followup_recorded' then 'Supplier payment follow-up recorded'
		when 'supplier_payment_recorded' then 'Supplier payment recorded'
		when 'supplier_refill_canceled' then 'Supplier refill canceled'
		when 'supplier_refill_created' then 'Supplier refill created'
		when 'support_assigned' then 'Support assigned'
		when 'support_conversation_linked_to_customer' then 'Support linked conversation to customer'
		when 'support_reply_sent' then 'Support replied'
		when 'support_status_updated' then 'Support status updated'
		when 'support_ticket_created' then 'Support ticket created'
		when 'support_ticket_reply_sent' then 'Support replied'
		when 'warehouse_loading_approved' then 'Warehouse approved loading'
		when 'warehouse_loading_driver_assigned' then 'Warehouse assigned driver'
		when 'warehouse_loading_driver_removed' then 'Warehouse removed driver'
		when 'warehouse_loading_marked_ready' then 'Warehouse marked loading ready'
		when 'warehouse_loading_rejected' then 'Warehouse rejected loading'
		when 'warehouse_loading_reset' then 'Warehouse reset loading'
		when 'warehouse_loading_started' then 'Warehouse started loading'
		when 'warehouse_receiving_approved' then 'Warehouse approved receiving'
		when 'warehouse_receiving_rejected' then 'Warehouse rejected receiving'
		when 'whatsapp_message_ingested' then 'WhatsApp message received'
		else initcap(replace(p_action::text, '_', ' '))
	end
$$;

grant execute on function public.ceo_activity_action_label(public.audit_event_type)
	to authenticated;

create or replace function public.ceo_activity_area(
	p_action public.audit_event_type,
	p_entity_type text
)
returns text
language sql
immutable
set search_path = public
as $$
	select case
		when p_action::text like 'sales_%'
			or p_action in (
				'manual_order_created',
				'order_submitted',
				'quote_accepted',
				'customer_quote_accepted',
				'customer_quote_declined',
				'customer_quote_line_response_submitted',
				'customer_quote_negotiation_requested'
			)
			then 'Sales'
		when p_action::text like 'finance_%'
			or p_action = 'driver_fuel_receipt_submitted'
			or p_action::text like 'customer_payment_%'
			or p_action::text like 'supplier_payment_%'
			then 'Finance'
		when p_action::text like 'inventory_%'
			or p_action in ('order_stock_reserved', 'price_update_requested')
			then 'Inventory'
		when p_action::text like 'warehouse_%'
			then 'Warehouse'
		when p_action::text like 'dispatch_%'
			or p_action::text like 'driver_delivery_%'
			or p_action::text like 'driver_assigned_%'
			or p_action::text like 'driver_rejection_%'
			or p_action in (
				'customer_signature_captured',
				'delivery_returned_to_warehouse_loading'
			)
			then 'Dispatch'
		when p_action::text like 'support_%'
			or p_action = 'whatsapp_message_ingested'
			then 'Customer service'
		when p_action::text like 'admin_%'
			or p_action::text like 'employee_%'
			or p_action::text like 'internal_employee_%'
			or p_entity_type in ('employee', 'driver', 'truck')
			then 'Admin'
		when p_action::text like 'supplier_%'
			then 'Procurement'
		else initcap(replace(coalesce(nullif(p_entity_type, ''), 'activity'), '_', ' '))
	end
$$;

do $$
begin
	if to_regprocedure('public.finance_accounting_dashboard_without_operating_finance(date,date)') is null then
		alter function public.finance_accounting_dashboard(date, date)
			rename to finance_accounting_dashboard_without_operating_finance;
	end if;
end $$;

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
	payroll_due_count integer := 0;
	salary_paid_total numeric := 0;
	bonus_paid_total numeric := 0;
	fuel_paid_total numeric := 0;
	company_asset_cash_total numeric := 0;
	cash_net_movement numeric := 0;
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
	into pending_fuel_count, fuel_paid_total, fuel_expenses
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
		  and status = 'active'
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

	overview := coalesce(dashboard->'overview', '{}'::jsonb);
	dashboard := jsonb_set(
		dashboard,
		'{overview}',
		overview
			|| jsonb_build_object(
				'totalAssets', round(coalesce((overview->>'totalAssets')::numeric, 0) + company_asset_total, 2),
				'companyAssets', company_asset_total,
				'companyAssetCount', company_asset_count,
				'pendingFuelExpenseCount', pending_fuel_count,
				'payrollDueCount', payroll_due_count
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

create or replace view public.ceo_search_finance_payroll_vtable
with (security_invoker = true)
as
with latest_salary_payment as (
	select distinct on (employee_id)
		employee_id,
		period_month,
		amount,
		payment_date,
		created_at
	from public.employee_payroll_payments
	where payment_type = 'salary'
	  and status = 'paid'
	order by employee_id, period_month desc, created_at desc
),
bonus_totals as (
	select
		employee_id,
		period_month,
		coalesce(sum(amount), 0) as amount
	from public.employee_payroll_payments
	where payment_type = 'bonus'
	  and status = 'paid'
	group by employee_id, period_month
)
select
	'finance_payroll'::text as entity_type,
	concat('finance_payroll:', e.id::text) as entity_id,
	concat('Payroll - ', e.full_name) as title,
	coalesce(ec.department, 'Payroll') as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'finance_payroll',
		'employee_id', e.id,
		'employee_name', e.full_name,
		'employee_status', e.status,
		'department', ec.department,
		'title', ec.title,
		'hire_date', ec.hire_date,
		'base_salary', coalesce(ec.base_salary, 0),
		'social_insurance_salary', coalesce(ec.social_insurance_salary, 0),
		'salary_currency', coalesce(ec.salary_currency, 'EGP'),
		'latest_salary_period', lsp.period_month,
		'latest_salary_paid_amount', lsp.amount,
		'latest_salary_paid_at', lsp.payment_date,
		'latest_bonus_period', bt.period_month,
		'latest_bonus_amount', bt.amount,
		'updated_by', updater.full_name,
		'created_at', coalesce(ec.created_at, e.created_at),
		'updated_at', greatest(e.updated_at, coalesce(ec.updated_at, e.updated_at))
	)) as metadata,
	greatest(e.updated_at, coalesce(ec.updated_at, e.updated_at), coalesce(lsp.created_at, e.updated_at)) as sort_at,
	concat_ws(
		' ',
		'finance',
		'payroll',
		'salary',
		'salaries',
		'bonus',
		'social insurance',
		e.full_name,
		e.status::text,
		ec.department,
		ec.title,
		coalesce(ec.base_salary, 0)::text,
		coalesce(ec.social_insurance_salary, 0)::text,
		coalesce(ec.salary_currency, 'EGP'),
		lsp.amount::text,
		bt.amount::text,
		updater.full_name,
		public.ceo_search_date_terms(ec.hire_date),
		public.ceo_search_date_terms(coalesce(ec.created_at, e.created_at)),
		public.ceo_search_date_terms(greatest(e.updated_at, coalesce(ec.updated_at, e.updated_at)))
	) as search_text
from public.employees e
left join public.employee_compensation ec on ec.employee_id = e.id
left join public.employees updater on updater.id = ec.updated_by_employee_id
left join latest_salary_payment lsp on lsp.employee_id = e.id
left join lateral (
	select period_month, amount
	from bonus_totals bt_inner
	where bt_inner.employee_id = e.id
	order by period_month desc
	limit 1
) bt on true
where public.can_access_ceo_search()
  and e.status = 'active';

create or replace view public.ceo_search_finance_payroll_payment_vtable
with (security_invoker = true)
as
select
	'finance_payroll_payment'::text as entity_type,
	concat('finance_payroll_payment:', p.id::text) as entity_id,
	concat(
		case when p.payment_type = 'bonus' then 'Bonus paid - ' else 'Salary paid - ' end,
		e.full_name
	) as title,
	to_char(p.period_month, 'YYYY-MM') as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'finance_payroll_payment',
		'payment_id', p.id,
		'employee_id', p.employee_id,
		'employee_name', e.full_name,
		'payment_type', p.payment_type,
		'period_month', p.period_month,
		'amount', p.amount,
		'currency', p.currency,
		'payment_date', p.payment_date,
		'reason', p.reason,
		'status', p.status,
		'proof_document_id', p.proof_document_id,
		'proof_path', p.proof_path,
		'journal_entry_id', p.journal_entry_id,
		'created_by', creator.full_name,
		'created_at', p.created_at
	)) as metadata,
	p.created_at as sort_at,
	concat_ws(
		' ',
		'finance',
		'payroll',
		'salary',
		'bonus',
		'payment',
		e.full_name,
		p.payment_type::text,
		p.amount::text,
		p.currency,
		p.reason,
		creator.full_name,
		public.ceo_search_date_terms(p.period_month),
		public.ceo_search_date_terms(p.payment_date),
		public.ceo_search_date_terms(p.created_at)
	) as search_text
from public.employee_payroll_payments p
join public.employees e on e.id = p.employee_id
left join public.employees creator on creator.id = p.created_by_employee_id
where public.can_access_ceo_search();

create or replace view public.ceo_search_finance_fuel_vtable
with (security_invoker = true)
as
select
	'finance_fuel_expense'::text as entity_type,
	concat('finance_fuel_expense:', fe.id::text) as entity_id,
	concat('Fuel expense - ', coalesce(t.plate_number, d.full_name, 'truck')) as title,
	fe.status::text as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'finance_fuel_expense',
		'expense_id', fe.id,
		'truck_id', fe.truck_id,
		'truck_plate', t.plate_number,
		'driver_id', fe.driver_id,
		'driver_name', d.full_name,
		'delivery_id', fe.delivery_id,
		'expense_date', fe.expense_date,
		'amount', fe.amount,
		'fuel_liters', fe.fuel_liters,
		'odometer_km', fe.odometer_km,
		'note', fe.note,
		'finance_note', fe.finance_note,
		'status', fe.status,
		'posted_by', poster.full_name,
		'posted_at', fe.posted_at,
		'journal_entry_id', fe.journal_entry_id,
		'created_at', fe.created_at
	)) as metadata,
	coalesce(fe.posted_at, fe.created_at) as sort_at,
	concat_ws(
		' ',
		'finance',
		'fuel',
		'truck fuel',
		'expense',
		t.plate_number,
		d.full_name,
		fe.amount::text,
		fe.fuel_liters::text,
		fe.odometer_km::text,
		fe.status::text,
		fe.note,
		fe.finance_note,
		poster.full_name,
		public.ceo_search_date_terms(fe.expense_date),
		public.ceo_search_date_terms(fe.created_at),
		public.ceo_search_date_terms(fe.posted_at)
	) as search_text
from public.truck_fuel_expenses fe
left join public.trucks t on t.id = fe.truck_id
left join public.drivers d on d.id = fe.driver_id
left join public.employees poster on poster.id = fe.posted_by_employee_id
where public.can_access_ceo_search();

create or replace view public.ceo_search_finance_company_asset_vtable
with (security_invoker = true)
as
select
	'finance_company_asset'::text as entity_type,
	concat('finance_company_asset:', ca.id::text) as entity_id,
	concat('Company asset - ', ca.name) as title,
	ca.asset_number as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'finance_company_asset',
		'asset_id', ca.id,
		'asset_number', ca.asset_number,
		'asset_type', ca.asset_type,
		'name', ca.name,
		'acquisition_date', ca.acquisition_date,
		'acquisition_cost', ca.acquisition_cost,
		'carrying_value', ca.carrying_value,
		'funding_source', ca.funding_source,
		'location', ca.location,
		'related_truck_id', ca.related_truck_id,
		'truck_plate', t.plate_number,
		'status', ca.status,
		'proof_document_id', ca.proof_document_id,
		'proof_path', ca.proof_path,
		'journal_entry_id', ca.journal_entry_id,
		'created_by', creator.full_name,
		'created_at', ca.created_at,
		'updated_at', ca.updated_at
	)) as metadata,
	ca.updated_at as sort_at,
	concat_ws(
		' ',
		'finance',
		'company asset',
		'asset',
		ca.asset_number,
		ca.asset_type::text,
		ca.name,
		ca.acquisition_cost::text,
		ca.carrying_value::text,
		ca.funding_source::text,
		ca.location,
		t.plate_number,
		ca.status::text,
		creator.full_name,
		public.ceo_search_date_terms(ca.acquisition_date),
		public.ceo_search_date_terms(ca.created_at),
		public.ceo_search_date_terms(ca.updated_at)
	) as search_text
from public.company_assets ca
left join public.trucks t on t.id = ca.related_truck_id
left join public.employees creator on creator.id = ca.created_by_employee_id
where public.can_access_ceo_search();

revoke all privileges on table public.ceo_search_finance_payroll_vtable
	from anon, authenticated, public;
revoke all privileges on table public.ceo_search_finance_payroll_payment_vtable
	from anon, authenticated, public;
revoke all privileges on table public.ceo_search_finance_fuel_vtable
	from anon, authenticated, public;
revoke all privileges on table public.ceo_search_finance_company_asset_vtable
	from anon, authenticated, public;

do $$
begin
	if to_regprocedure('app_private.refresh_ceo_search_documents_without_operating_finance()') is null then
		alter function app_private.refresh_ceo_search_documents()
			rename to refresh_ceo_search_documents_without_operating_finance;
	end if;
end $$;

create or replace function app_private.refresh_ceo_search_documents()
returns integer
language plpgsql
security definer
set search_path = public, app_private, extensions
as $$
declare
	search_user_id uuid;
	base_count integer := 0;
	source_count integer := 0;
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
			  and er.role in ('ceo', 'admin')
		)
	  )
	order by e.is_ceo desc, e.created_at
	limit 1;

	if search_user_id is not null then
		perform set_config('app.actor_user_id', search_user_id::text, true);
		perform set_config('app.actor_pool', 'internal', true);
		perform set_config('request.jwt.claim.sub', search_user_id::text, true);
		perform set_config(
			'request.jwt.claims',
			jsonb_build_object('sub', search_user_id::text, 'role', 'authenticated')::text,
			true
		);
	end if;

	base_count := app_private.refresh_ceo_search_documents_without_operating_finance();

	if search_user_id is null then
		return base_count;
	end if;

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
			select * from public.ceo_search_finance_payroll_vtable
			union all
			select * from public.ceo_search_finance_payroll_payment_vtable
			union all
			select * from public.ceo_search_finance_fuel_vtable
			union all
			select * from public.ceo_search_finance_company_asset_vtable
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
		where documents.entity_type in (
			'finance_payroll',
			'finance_payroll_payment',
			'finance_fuel_expense',
			'finance_company_asset'
		)
		  and not exists (
			select 1
			from source_rows
			where source_rows.entity_type = documents.entity_type
			  and source_rows.entity_id = documents.entity_id
		)
		returning 1
	)
	select counted.source_count into source_count
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

	return base_count + source_count;
end;
$$;

revoke all privileges on function app_private.refresh_ceo_search_documents()
	from anon, authenticated, public;

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
		'ceo_search_finance_damage_vtable',
		'ceo_search_finance_payroll_vtable',
		'ceo_search_finance_payroll_payment_vtable',
		'ceo_search_finance_fuel_vtable',
		'ceo_search_finance_company_asset_vtable',
		'ceo_search_inventory_damage_activity_vtable',
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
			if entity in (
				'ceo_search_finance_payroll_vtable',
				'ceo_search_finance_payroll_payment_vtable',
				'finance_payroll',
				'finance_payroll_payment',
				'payroll',
				'salary',
				'salaries',
				'employee_salary',
				'social_insurance'
			) and not public.can_access_panel('finance') then
				raise exception 'employee_ai_finance_scope_denied' using errcode = '42501';
			end if;
			if entity like 'ceo_%' or entity like 'search_%' then
				if entity <> all(employee_allowed_vtables) then
					raise exception 'employee_ai_read_scope_denied' using errcode = '42501';
				end if;
			end if;
			if entity in (
				'finance',
				'customer_payments',
				'supplier_payments',
				'private_finance',
				'fuel_expenses',
				'company_assets'
			) and not public.can_access_panel('finance') then
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
					'finance_payroll',
					'finance_payroll_payment',
					'finance_fuel_expense',
					'finance_company_asset',
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
					'activity'
				]
				else array[
					'order',
					'customer',
					'payment',
					'finance',
					'finance_payroll',
					'finance_payroll_payment',
					'finance_fuel_expense',
					'finance_company_asset',
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

create or replace function public.service_finance_update_employee_compensation(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_employee_id uuid,
	p_base_salary numeric,
	p_social_insurance_salary numeric default null,
	p_department text default null,
	p_title text default null,
	p_salary_currency text default 'EGP',
	p_proof_path text default null,
	p_proof_document_id uuid default null
)
returns public.employee_compensation
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.finance_update_employee_compensation(
		p_employee_id,
		p_base_salary,
		p_social_insurance_salary,
		p_department,
		p_title,
		p_salary_currency,
		p_proof_path,
		p_proof_document_id
	);
end;
$$;

create or replace function public.service_finance_pay_employee_salary(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_employee_id uuid,
	p_period_month date default null,
	p_proof_path text default null,
	p_proof_document_id uuid default null,
	p_note text default null
)
returns public.employee_payroll_payments
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.finance_pay_employee_salary(
		p_employee_id,
		p_period_month,
		p_proof_path,
		p_proof_document_id,
		p_note
	);
end;
$$;

create or replace function public.service_finance_pay_employee_bonus(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_employee_id uuid,
	p_amount numeric,
	p_period_month date default null,
	p_reason text default null,
	p_proof_path text default null,
	p_proof_document_id uuid default null
)
returns public.employee_payroll_payments
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.finance_pay_employee_bonus(
		p_employee_id,
		p_amount,
		p_period_month,
		p_reason,
		p_proof_path,
		p_proof_document_id
	);
end;
$$;

create or replace function public.service_driver_submit_fuel_receipt(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_truck_id uuid default null,
	p_delivery_id uuid default null,
	p_expense_date date default null,
	p_amount numeric default null,
	p_fuel_liters numeric default null,
	p_odometer_km numeric default null,
	p_receipt_image_data_url text default null,
	p_receipt_file_name text default null,
	p_receipt_mime_type text default null,
	p_receipt_size_bytes integer default null,
	p_note text default null
)
returns public.truck_fuel_expenses
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.driver_submit_fuel_receipt(
		p_truck_id,
		p_delivery_id,
		p_expense_date,
		p_amount,
		p_fuel_liters,
		p_odometer_km,
		p_receipt_image_data_url,
		p_receipt_file_name,
		p_receipt_mime_type,
		p_receipt_size_bytes,
		p_note
	);
end;
$$;

create or replace function public.service_finance_post_truck_fuel_expense(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_expense_id uuid,
	p_amount numeric default null,
	p_proof_path text default null,
	p_proof_document_id uuid default null,
	p_note text default null
)
returns public.truck_fuel_expenses
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.finance_post_truck_fuel_expense(
		p_expense_id,
		p_amount,
		p_proof_path,
		p_proof_document_id,
		p_note
	);
end;
$$;

create or replace function public.service_finance_record_company_asset(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_asset_type text,
	p_name text,
	p_acquisition_cost numeric,
	p_funding_source text,
	p_acquisition_date date default null,
	p_location text default null,
	p_related_truck_id uuid default null,
	p_proof_path text default null,
	p_proof_document_id uuid default null,
	p_notes text default null
)
returns public.company_assets
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.finance_record_company_asset(
		p_asset_type,
		p_name,
		p_acquisition_cost,
		p_funding_source,
		p_acquisition_date,
		p_location,
		p_related_truck_id,
		p_proof_path,
		p_proof_document_id,
		p_notes
	);
end;
$$;

revoke all on function public.finance_accounting_dashboard_without_operating_finance(date, date) from public, anon, authenticated;
revoke all on function public.finance_accounting_dashboard(date, date) from public, anon, authenticated;
revoke all on function public.finance_update_employee_compensation(uuid, numeric, numeric, text, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.finance_pay_employee_salary(uuid, date, text, uuid, text) from public, anon, authenticated;
revoke all on function public.finance_pay_employee_bonus(uuid, numeric, date, text, text, uuid) from public, anon, authenticated;
revoke all on function public.driver_submit_fuel_receipt(uuid, uuid, date, numeric, numeric, numeric, text, text, text, integer, text) from public, anon, authenticated;
revoke all on function public.finance_post_truck_fuel_expense(uuid, numeric, text, uuid, text) from public, anon, authenticated;
revoke all on function public.finance_record_company_asset(text, text, numeric, text, date, text, uuid, text, uuid, text) from public, anon, authenticated;

revoke all on function public.service_finance_update_employee_compensation(uuid, text, uuid, numeric, numeric, text, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.service_finance_pay_employee_salary(uuid, text, uuid, date, text, uuid, text) from public, anon, authenticated;
revoke all on function public.service_finance_pay_employee_bonus(uuid, text, uuid, numeric, date, text, text, uuid) from public, anon, authenticated;
revoke all on function public.service_driver_submit_fuel_receipt(uuid, text, uuid, uuid, date, numeric, numeric, numeric, text, text, text, integer, text) from public, anon, authenticated;
revoke all on function public.service_finance_post_truck_fuel_expense(uuid, text, uuid, numeric, text, uuid, text) from public, anon, authenticated;
revoke all on function public.service_finance_record_company_asset(uuid, text, text, text, numeric, text, date, text, uuid, text, uuid, text) from public, anon, authenticated;

grant execute on function public.service_finance_update_employee_compensation(uuid, text, uuid, numeric, numeric, text, text, text, text, uuid) to service_role;
grant execute on function public.service_finance_pay_employee_salary(uuid, text, uuid, date, text, uuid, text) to service_role;
grant execute on function public.service_finance_pay_employee_bonus(uuid, text, uuid, numeric, date, text, text, uuid) to service_role;
grant execute on function public.service_driver_submit_fuel_receipt(uuid, text, uuid, uuid, date, numeric, numeric, numeric, text, text, text, integer, text) to service_role;
grant execute on function public.service_finance_post_truck_fuel_expense(uuid, text, uuid, numeric, text, uuid, text) to service_role;
grant execute on function public.service_finance_record_company_asset(uuid, text, text, text, numeric, text, date, text, uuid, text, uuid, text) to service_role;

insert into app_private.ceo_search_refresh_state (id, dirty, dirty_at)
values (true, true, now())
on conflict (id) do update set
	dirty = true,
	dirty_at = excluded.dirty_at;
