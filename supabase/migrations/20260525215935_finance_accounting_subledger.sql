alter type public.audit_event_type add value if not exists 'finance_adjustment_created';
alter type public.audit_event_type add value if not exists 'finance_journal_posted';
alter type public.audit_event_type add value if not exists 'finance_journal_reversed';
alter type public.audit_event_type add value if not exists 'finance_journal_voided';
alter type public.audit_event_type add value if not exists 'finance_accounting_backfilled';

do $$
begin
	if not exists (
		select 1 from pg_type
		where typname = 'finance_account_class'
		  and typnamespace = 'public'::regnamespace
	) then
		create type public.finance_account_class as enum (
			'asset',
			'liability',
			'equity',
			'revenue',
			'expense'
		);
	end if;
	if not exists (
		select 1 from pg_type
		where typname = 'finance_normal_balance'
		  and typnamespace = 'public'::regnamespace
	) then
		create type public.finance_normal_balance as enum ('debit', 'credit');
	end if;
	if not exists (
		select 1 from pg_type
		where typname = 'finance_journal_status'
		  and typnamespace = 'public'::regnamespace
	) then
		create type public.finance_journal_status as enum (
			'draft',
			'posted',
			'voided',
			'reversed'
		);
	end if;
	if not exists (
		select 1 from pg_type
		where typname = 'finance_journal_source_type'
		  and typnamespace = 'public'::regnamespace
	) then
		create type public.finance_journal_source_type as enum (
			'customer_payment',
			'supplier_payment',
			'order',
			'refill_request',
			'employee_compensation',
			'proof_document',
			'activity_event',
			'manual_adjustment',
			'warehouse_receiving',
			'dispatch_delivery'
		);
	end if;
	if not exists (
		select 1 from pg_type
		where typname = 'finance_adjustment_type'
		  and typnamespace = 'public'::regnamespace
	) then
		create type public.finance_adjustment_type as enum (
			'company_expense',
			'damage',
			'refund',
			'write_off',
			'credit_adjustment',
			'debit_adjustment'
		);
	end if;
	if not exists (
		select 1 from pg_type
		where typname = 'finance_adjustment_status'
		  and typnamespace = 'public'::regnamespace
	) then
		create type public.finance_adjustment_status as enum (
			'draft',
			'review_required',
			'posted',
			'voided'
		);
	end if;
end $$;

create sequence if not exists public.finance_journal_entry_number_seq;

create table if not exists public.finance_accounts (
	id uuid primary key default gen_random_uuid(),
	code text not null unique,
	name text not null,
	account_class public.finance_account_class not null,
	normal_balance public.finance_normal_balance not null,
	parent_account_id uuid references public.finance_accounts(id) on delete restrict,
	is_active boolean not null default true,
	is_system boolean not null default false,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint finance_accounts_code_shape
		check (code ~ '^[0-9]{4,8}$'),
	constraint finance_accounts_name_present
		check (length(btrim(name)) >= 2),
	constraint finance_accounts_normal_matches_class
		check (
			(account_class in ('asset', 'expense') and normal_balance = 'debit')
			or (account_class in ('liability', 'equity', 'revenue') and normal_balance = 'credit')
		)
);

create table if not exists public.finance_journal_entries (
	id uuid primary key default gen_random_uuid(),
	entry_number text not null unique default (
		'JE-'
		|| to_char(now() at time zone 'Africa/Cairo', 'YYYY')
		|| '-'
		|| lpad(nextval('public.finance_journal_entry_number_seq'::regclass)::text, 6, '0')
	),
	accounting_date date not null default current_date,
	accounting_period text not null default to_char(current_date, 'YYYY-MM'),
	status public.finance_journal_status not null default 'draft',
	source_type public.finance_journal_source_type,
	source_id uuid,
	description text not null,
	actor_employee_id uuid references public.employees(id) on delete set null,
	requires_accountant_signoff boolean not null default false,
	signoff_reason text,
	posted_at timestamptz,
	posted_by_employee_id uuid references public.employees(id) on delete set null,
	voided_at timestamptz,
	voided_by_employee_id uuid references public.employees(id) on delete set null,
	void_reason text,
	reversed_at timestamptz,
	reversed_by_employee_id uuid references public.employees(id) on delete set null,
	reversal_entry_id uuid references public.finance_journal_entries(id) on delete restrict,
	reversed_from_entry_id uuid references public.finance_journal_entries(id) on delete restrict,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint finance_journal_entries_period_shape
		check (accounting_period ~ '^[0-9]{4}-[0-9]{2}$'),
	constraint finance_journal_entries_description_present
		check (length(btrim(description)) >= 3),
	constraint finance_journal_entries_source_pair
		check ((source_type is null and source_id is null) or (source_type is not null and source_id is not null)),
	constraint finance_journal_entries_signoff_reason_present
		check (not requires_accountant_signoff or length(btrim(coalesce(signoff_reason, ''))) >= 5),
	constraint finance_journal_entries_posted_metadata
		check (status <> 'posted' or (posted_at is not null and posted_by_employee_id is not null)),
	constraint finance_journal_entries_voided_metadata
		check (status <> 'voided' or (voided_at is not null and voided_by_employee_id is not null)),
	constraint finance_journal_entries_reversed_metadata
		check (status <> 'reversed' or (reversed_at is not null and reversed_by_employee_id is not null and reversal_entry_id is not null))
);

create table if not exists public.finance_journal_lines (
	id uuid primary key default gen_random_uuid(),
	entry_id uuid not null references public.finance_journal_entries(id) on delete cascade,
	line_number integer not null,
	account_id uuid not null references public.finance_accounts(id) on delete restrict,
	debit numeric(14, 2) not null default 0,
	credit numeric(14, 2) not null default 0,
	currency text not null default 'EGP',
	memo text,
	counterparty_type text,
	counterparty_id uuid,
	source_type public.finance_journal_source_type,
	source_id uuid,
	created_at timestamptz not null default now(),
	constraint finance_journal_lines_line_number_positive
		check (line_number > 0),
	constraint finance_journal_lines_nonnegative
		check (debit >= 0 and credit >= 0),
	constraint finance_journal_lines_one_side
		check ((debit > 0 and credit = 0) or (credit > 0 and debit = 0)),
	constraint finance_journal_lines_currency_egp
		check (currency = 'EGP'),
	constraint finance_journal_lines_source_pair
		check ((source_type is null and source_id is null) or (source_type is not null and source_id is not null)),
	unique (entry_id, line_number)
);

create table if not exists public.finance_journal_source_links (
	id uuid primary key default gen_random_uuid(),
	entry_id uuid not null references public.finance_journal_entries(id) on delete cascade,
	source_type public.finance_journal_source_type not null,
	source_id uuid not null,
	link_role text not null default 'primary',
	source_label text,
	created_at timestamptz not null default now(),
	constraint finance_journal_source_links_role_present
		check (length(btrim(link_role)) >= 2),
	unique (entry_id, source_type, source_id, link_role),
	unique (source_type, source_id, link_role)
);

create table if not exists public.finance_journal_proof_links (
	id uuid primary key default gen_random_uuid(),
	entry_id uuid not null references public.finance_journal_entries(id) on delete cascade,
	proof_document_id uuid references public.proof_documents(id) on delete restrict,
	proof_path text,
	link_role text not null default 'supporting',
	created_at timestamptz not null default now(),
	constraint finance_journal_proof_links_has_target
		check (proof_document_id is not null or length(btrim(coalesce(proof_path, ''))) > 0),
	constraint finance_journal_proof_links_role_present
		check (length(btrim(link_role)) >= 2)
);

create unique index if not exists finance_journal_proof_links_document_uniq
	on public.finance_journal_proof_links (entry_id, proof_document_id)
	where proof_document_id is not null;

create table if not exists public.finance_adjustments (
	id uuid primary key default gen_random_uuid(),
	adjustment_type public.finance_adjustment_type not null,
	category text not null,
	description text not null,
	amount numeric(14, 2) not null,
	currency text not null default 'EGP',
	counterparty_type text,
	counterparty_id uuid,
	proof_document_id uuid references public.proof_documents(id) on delete restrict,
	proof_path text,
	status public.finance_adjustment_status not null default 'review_required',
	journal_entry_id uuid unique references public.finance_journal_entries(id) on delete restrict,
	created_by_employee_id uuid references public.employees(id) on delete set null,
	posted_by_employee_id uuid references public.employees(id) on delete set null,
	posted_at timestamptz,
	voided_by_employee_id uuid references public.employees(id) on delete set null,
	voided_at timestamptz,
	void_reason text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint finance_adjustments_amount_positive
		check (amount > 0),
	constraint finance_adjustments_currency_egp
		check (currency = 'EGP'),
	constraint finance_adjustments_category_present
		check (length(btrim(category)) >= 2),
	constraint finance_adjustments_description_present
		check (length(btrim(description)) >= 5),
	constraint finance_adjustments_posted_link
		check (status <> 'posted' or (journal_entry_id is not null and posted_at is not null)),
	constraint finance_adjustments_voided_metadata
		check (status <> 'voided' or (voided_at is not null and voided_by_employee_id is not null))
);

create index if not exists finance_accounts_parent_idx
	on public.finance_accounts (parent_account_id);
create index if not exists finance_journal_entries_status_date_idx
	on public.finance_journal_entries (status, accounting_date desc);
create index if not exists finance_journal_entries_source_idx
	on public.finance_journal_entries (source_type, source_id)
	where source_type is not null and source_id is not null;
create index if not exists finance_journal_lines_entry_idx
	on public.finance_journal_lines (entry_id, line_number);
create index if not exists finance_journal_lines_account_idx
	on public.finance_journal_lines (account_id);
create index if not exists finance_journal_source_links_source_idx
	on public.finance_journal_source_links (source_type, source_id);
create index if not exists finance_journal_proof_links_entry_idx
	on public.finance_journal_proof_links (entry_id);
create index if not exists finance_adjustments_status_created_idx
	on public.finance_adjustments (status, created_at desc);

drop trigger if exists finance_accounts_set_updated_at on public.finance_accounts;
create trigger finance_accounts_set_updated_at
	before update on public.finance_accounts
	for each row execute function public.set_updated_at();

drop trigger if exists finance_journal_entries_set_updated_at on public.finance_journal_entries;
create trigger finance_journal_entries_set_updated_at
	before update on public.finance_journal_entries
	for each row execute function public.set_updated_at();

drop trigger if exists finance_adjustments_set_updated_at on public.finance_adjustments;
create trigger finance_adjustments_set_updated_at
	before update on public.finance_adjustments
	for each row execute function public.set_updated_at();

create or replace function app_private.set_finance_accounting_period()
returns trigger
language plpgsql
set search_path = public
as $$
begin
	new.accounting_period := to_char(new.accounting_date, 'YYYY-MM');
	return new;
end;
$$;

drop trigger if exists finance_journal_entries_set_period on public.finance_journal_entries;
create trigger finance_journal_entries_set_period
	before insert or update of accounting_date on public.finance_journal_entries
	for each row execute function app_private.set_finance_accounting_period();

insert into public.finance_accounts (
	code,
	name,
	account_class,
	normal_balance,
	is_system
)
values
	('1000', 'Assets', 'asset', 'debit', true),
	('2000', 'Liabilities', 'liability', 'credit', true),
	('3000', 'Equity', 'equity', 'credit', true),
	('4000', 'Revenue', 'revenue', 'credit', true),
	('5000', 'Expenses', 'expense', 'debit', true)
on conflict (code) do update
set
	name = excluded.name,
	account_class = excluded.account_class,
	normal_balance = excluded.normal_balance,
	is_system = excluded.is_system,
	updated_at = now();

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
	seed.is_system
from (
	values
		('1010', 'Cash and bank', 'asset'::public.finance_account_class, 'debit'::public.finance_normal_balance, '1000', true),
		('1100', 'Accounts receivable control', 'asset', 'debit', '1000', true),
		('1200', 'Supplier advances clearing', 'asset', 'debit', '1000', true),
		('1990', 'Accounting suspense clearing', 'asset', 'debit', '1000', true),
		('2100', 'Customer receipts clearing', 'liability', 'credit', '2000', true),
		('2200', 'Accounts payable control', 'liability', 'credit', '2000', true),
		('3100', 'Retained earnings', 'equity', 'credit', '3000', true),
		('4100', 'Sales revenue - accountant review', 'revenue', 'credit', '4000', true),
		('5100', 'Cost of goods sold - accountant review', 'expense', 'debit', '5000', true),
		('5200', 'Payroll expense - accountant review', 'expense', 'debit', '5000', true),
		('5300', 'Operating expenses - accountant review', 'expense', 'debit', '5000', true),
		('5400', 'Damages, refunds, and write-offs - accountant review', 'expense', 'debit', '5000', true)
) as seed(code, name, account_class, normal_balance, parent_code, is_system)
join public.finance_accounts parent on parent.code = seed.parent_code
on conflict (code) do update
set
	name = excluded.name,
	account_class = excluded.account_class,
	normal_balance = excluded.normal_balance,
	parent_account_id = excluded.parent_account_id,
	is_system = excluded.is_system,
	updated_at = now();

alter table public.finance_accounts enable row level security;
alter table public.finance_journal_entries enable row level security;
alter table public.finance_journal_lines enable row level security;
alter table public.finance_journal_source_links enable row level security;
alter table public.finance_journal_proof_links enable row level security;
alter table public.finance_adjustments enable row level security;

drop policy if exists finance_accounts_internal_read on public.finance_accounts;
create policy finance_accounts_internal_read
	on public.finance_accounts for select
	to authenticated
	using (public.can_access_panel('finance') or public.is_employee_with_role('ceo'));

drop policy if exists finance_journal_entries_internal_read on public.finance_journal_entries;
create policy finance_journal_entries_internal_read
	on public.finance_journal_entries for select
	to authenticated
	using (public.can_access_panel('finance') or public.is_employee_with_role('ceo'));

drop policy if exists finance_journal_lines_internal_read on public.finance_journal_lines;
create policy finance_journal_lines_internal_read
	on public.finance_journal_lines for select
	to authenticated
	using (public.can_access_panel('finance') or public.is_employee_with_role('ceo'));

drop policy if exists finance_journal_source_links_internal_read on public.finance_journal_source_links;
create policy finance_journal_source_links_internal_read
	on public.finance_journal_source_links for select
	to authenticated
	using (public.can_access_panel('finance') or public.is_employee_with_role('ceo'));

drop policy if exists finance_journal_proof_links_internal_read on public.finance_journal_proof_links;
create policy finance_journal_proof_links_internal_read
	on public.finance_journal_proof_links for select
	to authenticated
	using (public.can_access_panel('finance') or public.is_employee_with_role('ceo'));

drop policy if exists finance_adjustments_internal_read on public.finance_adjustments;
create policy finance_adjustments_internal_read
	on public.finance_adjustments for select
	to authenticated
	using (public.can_access_panel('finance') or public.is_employee_with_role('ceo'));

revoke all on table public.finance_accounts from anon, authenticated, public;
revoke all on table public.finance_journal_entries from anon, authenticated, public;
revoke all on table public.finance_journal_lines from anon, authenticated, public;
revoke all on table public.finance_journal_source_links from anon, authenticated, public;
revoke all on table public.finance_journal_proof_links from anon, authenticated, public;
revoke all on table public.finance_adjustments from anon, authenticated, public;
grant select, insert, update, delete on table public.finance_accounts to service_role;
grant select, insert, update, delete on table public.finance_journal_entries to service_role;
grant select, insert, update, delete on table public.finance_journal_lines to service_role;
grant select, insert, update, delete on table public.finance_journal_source_links to service_role;
grant select, insert, update, delete on table public.finance_journal_proof_links to service_role;
grant select, insert, update, delete on table public.finance_adjustments to service_role;
grant usage, select on sequence public.finance_journal_entry_number_seq to service_role;

create or replace function app_private.finance_account_id(p_code text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
	select id
	from public.finance_accounts
	where code = p_code
	  and is_active
	limit 1
$$;

create or replace function app_private.finance_journal_entry_is_balanced(p_entry_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select
		coalesce(round(sum(debit), 2), 0) = coalesce(round(sum(credit), 2), 0)
		and coalesce(round(sum(debit), 2), 0) > 0
	from public.finance_journal_lines
	where entry_id = p_entry_id
$$;

create or replace function app_private.finance_enforce_posted_entry_balance()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	if new.status = 'posted' and (
		tg_op = 'INSERT'
		or old.status is distinct from new.status
	) then
		if new.requires_accountant_signoff then
			raise exception 'finance_accountant_signoff_required' using errcode = '23514';
		end if;
		if not app_private.finance_journal_entry_is_balanced(new.id) then
			raise exception 'finance_journal_entry_unbalanced' using errcode = '23514';
		end if;
		new.posted_at := coalesce(new.posted_at, now());
		new.posted_by_employee_id := coalesce(new.posted_by_employee_id, public.current_employee_id());
		if new.posted_by_employee_id is null then
			raise exception 'finance_post_actor_required' using errcode = '42501';
		end if;
	end if;
	return new;
end;
$$;

drop trigger if exists finance_journal_entries_enforce_posted_balance
	on public.finance_journal_entries;
create trigger finance_journal_entries_enforce_posted_balance
	before insert or update of status on public.finance_journal_entries
	for each row execute function app_private.finance_enforce_posted_entry_balance();

create or replace function app_private.finance_guard_posted_journal_lines()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	target_entry_id uuid;
	target_status public.finance_journal_status;
begin
	target_entry_id := case when tg_op = 'DELETE' then old.entry_id else new.entry_id end;
	select status into target_status
	from public.finance_journal_entries
	where id = target_entry_id;

	if target_status in ('posted', 'voided', 'reversed') then
		raise exception 'finance_posted_journal_lines_are_locked' using errcode = '42501';
	end if;

	return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists finance_journal_lines_guard_posted_entry
	on public.finance_journal_lines;
create trigger finance_journal_lines_guard_posted_entry
	before insert or update or delete on public.finance_journal_lines
	for each row execute function app_private.finance_guard_posted_journal_lines();

create or replace function public.finance_create_adjustment(
	p_adjustment_type text,
	p_category text,
	p_description text,
	p_amount numeric,
	p_proof_path text default null,
	p_proof_document_id uuid default null
)
returns public.finance_adjustments
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	employee_id uuid;
	created_adjustment public.finance_adjustments%rowtype;
	clean_type text := lower(btrim(coalesce(p_adjustment_type, '')));
	clean_category text := btrim(coalesce(p_category, ''));
	clean_description text := btrim(coalesce(p_description, ''));
	clean_proof_path text := nullif(btrim(coalesce(p_proof_path, '')), '');
begin
	employee_id := public.require_panel('finance', true);

	if clean_type not in (
		'company_expense',
		'damage',
		'refund',
		'write_off',
		'credit_adjustment',
		'debit_adjustment'
	) then
		raise exception 'invalid_finance_adjustment_type' using errcode = '23514';
	end if;
	if length(clean_category) < 2 then
		raise exception 'finance_adjustment_category_required' using errcode = '23514';
	end if;
	if length(clean_description) < 5 then
		raise exception 'finance_adjustment_description_required' using errcode = '23514';
	end if;
	if p_amount is null or p_amount <= 0 then
		raise exception 'finance_adjustment_amount_required' using errcode = '23514';
	end if;

	insert into public.finance_adjustments (
		adjustment_type,
		category,
		description,
		amount,
		proof_document_id,
		proof_path,
		created_by_employee_id
	)
	values (
		clean_type::public.finance_adjustment_type,
		clean_category,
		clean_description,
		round(p_amount, 2),
		p_proof_document_id,
		clean_proof_path,
		employee_id
	)
	returning * into created_adjustment;

	perform public.log_activity(
		'finance_adjustment',
		created_adjustment.id,
		'finance_adjustment_created',
		jsonb_build_object(
			'employee_id', employee_id,
			'adjustment_type', created_adjustment.adjustment_type,
			'amount', created_adjustment.amount,
			'status', created_adjustment.status
		)
	);

	return created_adjustment;
end;
$$;

create or replace function public.finance_post_journal_entry(p_entry_id uuid)
returns public.finance_journal_entries
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	employee_id uuid;
	posted_entry public.finance_journal_entries%rowtype;
begin
	employee_id := public.require_panel('finance', true);

	select * into posted_entry
	from public.finance_journal_entries
	where id = p_entry_id
	for update;

	if posted_entry.id is null then
		raise exception 'finance_journal_entry_not_found' using errcode = '02000';
	end if;
	if posted_entry.status <> 'draft' then
		raise exception 'finance_journal_entry_not_draft' using errcode = '23514';
	end if;
	if posted_entry.requires_accountant_signoff then
		raise exception 'finance_accountant_signoff_required' using errcode = '23514';
	end if;
	if not app_private.finance_journal_entry_is_balanced(p_entry_id) then
		raise exception 'finance_journal_entry_unbalanced' using errcode = '23514';
	end if;

	update public.finance_journal_entries
	set
		status = 'posted',
		posted_at = now(),
		posted_by_employee_id = employee_id
	where id = p_entry_id
	returning * into posted_entry;

	perform public.log_activity(
		'finance_journal_entry',
		posted_entry.id,
		'finance_journal_posted',
		jsonb_build_object(
			'employee_id', employee_id,
			'entry_number', posted_entry.entry_number,
			'source_type', posted_entry.source_type,
			'source_id', posted_entry.source_id
		)
	);

	return posted_entry;
end;
$$;

create or replace function public.finance_void_draft_journal_entry(
	p_entry_id uuid,
	p_reason text
)
returns public.finance_journal_entries
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	voided_entry public.finance_journal_entries%rowtype;
	clean_reason text := btrim(coalesce(p_reason, ''));
begin
	employee_id := public.require_panel('finance', true);
	if length(clean_reason) < 5 then
		raise exception 'finance_void_reason_required' using errcode = '23514';
	end if;

	select * into voided_entry
	from public.finance_journal_entries
	where id = p_entry_id
	for update;

	if voided_entry.id is null then
		raise exception 'finance_journal_entry_not_found' using errcode = '02000';
	end if;
	if voided_entry.status <> 'draft' then
		raise exception 'only_draft_finance_journal_entries_can_be_voided' using errcode = '23514';
	end if;

	update public.finance_journal_entries
	set
		status = 'voided',
		voided_at = now(),
		voided_by_employee_id = employee_id,
		void_reason = clean_reason
	where id = p_entry_id
	returning * into voided_entry;

	perform public.log_activity(
		'finance_journal_entry',
		voided_entry.id,
		'finance_journal_voided',
		jsonb_build_object(
			'employee_id', employee_id,
			'entry_number', voided_entry.entry_number,
			'reason', clean_reason
		)
	);

	return voided_entry;
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
		current_date,
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

create or replace function public.finance_backfill_accounting_sources()
returns jsonb
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	employee_id uuid;
	cash_account_id uuid := app_private.finance_account_id('1010');
	customer_clearing_account_id uuid := app_private.finance_account_id('2100');
	supplier_clearing_account_id uuid := app_private.finance_account_id('1200');
	customer_payment record;
	supplier_payment record;
	order_review record;
	refill_review record;
	payroll_review record;
	entry_id uuid;
	customer_count integer := 0;
	supplier_count integer := 0;
	review_count integer := 0;
	proof_id uuid;
begin
	employee_id := public.require_panel('finance', true);
	if cash_account_id is null
		or customer_clearing_account_id is null
		or supplier_clearing_account_id is null
	then
		raise exception 'finance_chart_of_accounts_missing' using errcode = '23514';
	end if;

	for customer_payment in
		select
			cp.id,
			cp.order_id,
			cp.amount,
			cp.proof_path,
			cp.created_at,
			o.order_number,
			c.company_name
		from public.customer_payments cp
		join public.orders o on o.id = cp.order_id
		left join public.customers c on c.id = o.customer_id
		where cp.status = 'recorded'
		  and not exists (
			select 1
			from public.finance_journal_source_links link
			where link.source_type = 'customer_payment'
			  and link.source_id = cp.id
			  and link.link_role = 'cash_movement'
		  )
		order by cp.created_at, cp.id
	loop
		insert into public.finance_journal_entries (
			accounting_date,
			source_type,
			source_id,
			description,
			actor_employee_id
		)
		values (
			customer_payment.created_at::date,
			'customer_payment',
			customer_payment.id,
			'Customer receipt clearing for ' || customer_payment.order_number,
			employee_id
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
				null,
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
				null,
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
			posted_by_employee_id = employee_id
		where id = entry_id;

		customer_count := customer_count + 1;
	end loop;

	for supplier_payment in
		select
			sp.id,
			sp.refill_request_id,
			sp.amount,
			sp.proof_path,
			sp.created_at,
			s.name as supplier_name
		from public.supplier_payments sp
		join public.refill_requests rr on rr.id = sp.refill_request_id
		left join public.suppliers s on s.id = rr.supplier_id
		where sp.status = 'recorded'
		  and not exists (
			select 1
			from public.finance_journal_source_links link
			where link.source_type = 'supplier_payment'
			  and link.source_id = sp.id
			  and link.link_role = 'cash_movement'
		  )
		order by sp.created_at, sp.id
	loop
		insert into public.finance_journal_entries (
			accounting_date,
			source_type,
			source_id,
			description,
			actor_employee_id
		)
		values (
			supplier_payment.created_at::date,
			'supplier_payment',
			supplier_payment.id,
			'Supplier payment clearing for ' || coalesce(supplier_payment.supplier_name, supplier_payment.refill_request_id::text),
			employee_id
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
				null,
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
				null,
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
			posted_by_employee_id = employee_id
		where id = entry_id;

		supplier_count := supplier_count + 1;
	end loop;

	for order_review in
		select o.id, o.order_number, o.created_at
		from public.orders o
		where o.status in ('dispatch_ready', 'dispatch_assigned', 'out_for_delivery', 'delivered')
		  and not exists (
			select 1
			from public.finance_journal_source_links link
			where link.source_type = 'order'
			  and link.source_id = o.id
			  and link.link_role = 'revenue_recognition_review'
		  )
		order by o.created_at, o.id
	loop
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
			order_review.created_at::date,
			'order',
			order_review.id,
			'Revenue recognition review for ' || order_review.order_number,
			employee_id,
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
		review_count := review_count + 1;
	end loop;

	for refill_review in
		select rr.id, rr.created_at, s.name as supplier_name
		from public.refill_requests rr
		left join public.suppliers s on s.id = rr.supplier_id
		where rr.status = 'received'
		  and not exists (
			select 1
			from public.finance_journal_source_links link
			where link.source_type = 'refill_request'
			  and link.source_id = rr.id
			  and link.link_role = 'inventory_cogs_review'
		  )
		order by rr.created_at, rr.id
	loop
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
			refill_review.created_at::date,
			'refill_request',
			refill_review.id,
			'Inventory and COGS review for ' || coalesce(refill_review.supplier_name, refill_review.id::text),
			employee_id,
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
		review_count := review_count + 1;
	end loop;

	for payroll_review in
		select ec.employee_id, e.full_name, ec.created_at
		from public.employee_compensation ec
		join public.employees e on e.id = ec.employee_id
		where coalesce(ec.base_salary, 0) > 0
		  and not exists (
			select 1
			from public.finance_journal_source_links link
			where link.source_type = 'employee_compensation'
			  and link.source_id = ec.employee_id
			  and link.link_role = 'payroll_accrual_review'
		  )
		order by ec.created_at, ec.employee_id
	loop
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
			payroll_review.created_at::date,
			'employee_compensation',
			payroll_review.employee_id,
			'Payroll accrual review for ' || payroll_review.full_name,
			employee_id,
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
		review_count := review_count + 1;
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
	employee_id uuid;
	period_start date := coalesce(p_period_start, date_trunc('month', current_date)::date);
	period_end date := coalesce(p_period_end, current_date);
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
begin
	employee_id := public.require_panel('finance', false);
	if period_start > period_end then
		raise exception 'finance_accounting_period_invalid' using errcode = '23514';
	end if;

	can_view_salary_detail := public.is_employee_with_role('ceo') or public.can_access_panel('admin');

	select count(*) into unposted_count
	from public.finance_journal_entries
	where status = 'draft';

	select
		count(*)
	into review_required_count
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
		'basis', 'Egyptian Accounting Standards management subledger',
		'cashBalance', round(cash_balance, 2),
		'cashMovement', round(customer_receipts - supplier_payments + manual_cash, 2),
		'receivables', round(receivables_total, 2),
		'payables', round(payables_total, 2),
		'unpostedCount', unposted_count,
		'reviewRequiredCount', review_required_count
	);

	income_statement := jsonb_build_object(
		'revenue', round(revenue_total, 2),
		'expenses', round(expense_total, 2),
		'netPerformance', case when review_required_count = 0 then round(revenue_total - expense_total, 2) else null end,
		'warnings', jsonb_build_array(
			'Revenue, VAT, COGS, inventory valuation, payroll, refunds, damages, and write-offs require accountant sign-off before statutory use.',
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
			'ageDays', greatest(current_date - o.created_at::date, 0),
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
			'ageDays', greatest(current_date - rr.created_at::date, 0),
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
	where fa.created_at::date between period_start and period_end
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
		'journal', journal
	);
end;
$$;

create or replace function public.service_finance_accounting_dashboard(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_period_start date default null,
	p_period_end date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.finance_accounting_dashboard(p_period_start, p_period_end);
end;
$$;

create or replace function public.service_finance_create_adjustment(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_adjustment_type text,
	p_category text,
	p_description text,
	p_amount numeric,
	p_proof_path text default null,
	p_proof_document_id uuid default null
)
returns public.finance_adjustments
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.finance_create_adjustment(
		p_adjustment_type,
		p_category,
		p_description,
		p_amount,
		p_proof_path,
		p_proof_document_id
	);
end;
$$;

create or replace function public.service_finance_post_journal_entry(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_entry_id uuid
)
returns public.finance_journal_entries
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.finance_post_journal_entry(p_entry_id);
end;
$$;

create or replace function public.service_finance_reverse_journal_entry(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_entry_id uuid,
	p_reason text
)
returns public.finance_journal_entries
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.finance_reverse_journal_entry(p_entry_id, p_reason);
end;
$$;

create or replace function public.service_finance_void_draft_journal_entry(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_entry_id uuid,
	p_reason text
)
returns public.finance_journal_entries
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.finance_void_draft_journal_entry(p_entry_id, p_reason);
end;
$$;

create or replace function public.service_finance_backfill_accounting_sources(
	p_actor_user_id uuid,
	p_actor_pool text
)
returns jsonb
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.finance_backfill_accounting_sources();
end;
$$;

revoke all on function public.finance_accounting_dashboard(date, date) from public, anon, authenticated;
revoke all on function public.finance_create_adjustment(text, text, text, numeric, text, uuid) from public, anon, authenticated;
revoke all on function public.finance_post_journal_entry(uuid) from public, anon, authenticated;
revoke all on function public.finance_reverse_journal_entry(uuid, text) from public, anon, authenticated;
revoke all on function public.finance_void_draft_journal_entry(uuid, text) from public, anon, authenticated;
revoke all on function public.finance_backfill_accounting_sources() from public, anon, authenticated;
revoke all on function public.service_finance_accounting_dashboard(uuid, text, date, date) from public, anon, authenticated;
revoke all on function public.service_finance_create_adjustment(uuid, text, text, text, text, numeric, text, uuid) from public, anon, authenticated;
revoke all on function public.service_finance_post_journal_entry(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.service_finance_reverse_journal_entry(uuid, text, uuid, text) from public, anon, authenticated;
revoke all on function public.service_finance_void_draft_journal_entry(uuid, text, uuid, text) from public, anon, authenticated;
revoke all on function public.service_finance_backfill_accounting_sources(uuid, text) from public, anon, authenticated;

grant execute on function public.service_finance_accounting_dashboard(uuid, text, date, date) to service_role;
grant execute on function public.service_finance_create_adjustment(uuid, text, text, text, text, numeric, text, uuid) to service_role;
grant execute on function public.service_finance_post_journal_entry(uuid, text, uuid) to service_role;
grant execute on function public.service_finance_reverse_journal_entry(uuid, text, uuid, text) to service_role;
grant execute on function public.service_finance_void_draft_journal_entry(uuid, text, uuid, text) to service_role;
grant execute on function public.service_finance_backfill_accounting_sources(uuid, text) to service_role;
