do $$
begin
	if not exists (
		select 1
		from pg_type
		where typname = 'inventory_damage_lot_status'
		  and typnamespace = 'public'::regnamespace
	) then
		create type public.inventory_damage_lot_status as enum (
			'open',
			'sold',
			'disposed',
			'reversed',
			'closed'
		);
	end if;

	if not exists (
		select 1
		from pg_type
		where typname = 'inventory_damage_transaction_type'
		  and typnamespace = 'public'::regnamespace
	) then
		create type public.inventory_damage_transaction_type as enum (
			'recorded',
			'sold',
			'disposed',
			'reversed'
		);
	end if;
end $$;

create table if not exists public.inventory_damage_lots (
	id uuid primary key default gen_random_uuid(),
	damage_number text not null unique default (
		'DMG-'
		|| to_char(now() at time zone 'Africa/Cairo', 'YYYY')
		|| '-'
		|| upper(substr(gen_random_uuid()::text, 1, 6))
	),
	product_id uuid not null references public.products(id) on delete restrict,
	recorded_by_employee_id uuid references public.employees(id) on delete set null,
	reason text not null,
	original_quantity numeric not null,
	remaining_quantity numeric not null default 0,
	sold_quantity numeric not null default 0,
	disposed_quantity numeric not null default 0,
	reversed_quantity numeric not null default 0,
	original_unit_cost numeric(14, 2) not null,
	recovery_unit_value numeric(14, 2) not null,
	carrying_unit_value numeric(14, 2) not null,
	original_total_value numeric(14, 2) not null,
	carrying_total_value numeric(14, 2) not null,
	write_down_amount numeric(14, 2) not null,
	proof_document_id uuid references public.proof_documents(id) on delete restrict,
	proof_path text,
	status public.inventory_damage_lot_status not null default 'open',
	journal_entry_id uuid unique references public.finance_journal_entries(id) on delete restrict,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint inventory_damage_lots_quantity_positive
		check (original_quantity > 0),
	constraint inventory_damage_lots_quantities_nonnegative
		check (
			remaining_quantity >= 0
			and sold_quantity >= 0
			and disposed_quantity >= 0
			and reversed_quantity >= 0
		),
	constraint inventory_damage_lots_quantity_rollforward
		check (
			round(remaining_quantity + sold_quantity + disposed_quantity + reversed_quantity, 6)
			= round(original_quantity, 6)
		),
	constraint inventory_damage_lots_values_nonnegative
		check (
			original_unit_cost >= 0
			and recovery_unit_value >= 0
			and carrying_unit_value >= 0
			and original_total_value >= 0
			and carrying_total_value >= 0
			and write_down_amount >= 0
		),
	constraint inventory_damage_lots_carrying_not_above_cost
		check (carrying_unit_value <= original_unit_cost),
	constraint inventory_damage_lots_reason_present
		check (length(btrim(reason)) >= 5),
	constraint inventory_damage_lots_has_proof
		check (
			proof_document_id is not null
			or length(btrim(coalesce(proof_path, ''))) > 0
		)
);

create table if not exists public.inventory_damage_transactions (
	id uuid primary key default gen_random_uuid(),
	lot_id uuid not null references public.inventory_damage_lots(id) on delete restrict,
	transaction_type public.inventory_damage_transaction_type not null,
	quantity numeric not null,
	unit_price numeric(14, 2),
	amount numeric(14, 2) not null default 0,
	carrying_amount numeric(14, 2) not null default 0,
	write_down_reversal_amount numeric(14, 2) not null default 0,
	counterparty_name text,
	payment_status text,
	reason text,
	manager_employee_id uuid references public.employees(id) on delete restrict,
	proof_document_id uuid references public.proof_documents(id) on delete restrict,
	proof_path text,
	created_by_employee_id uuid references public.employees(id) on delete set null,
	journal_entry_id uuid unique references public.finance_journal_entries(id) on delete restrict,
	created_at timestamptz not null default now(),
	constraint inventory_damage_transactions_quantity_positive
		check (quantity > 0),
	constraint inventory_damage_transactions_values_nonnegative
		check (
			coalesce(unit_price, 0) >= 0
			and amount >= 0
			and carrying_amount >= 0
			and write_down_reversal_amount >= 0
		),
	constraint inventory_damage_transactions_payment_status
		check (
			payment_status is null
			or payment_status in ('paid', 'receivable')
		),
	constraint inventory_damage_transactions_has_proof
		check (
			proof_document_id is not null
			or length(btrim(coalesce(proof_path, ''))) > 0
		)
);

create index if not exists inventory_damage_lots_product_status_idx
	on public.inventory_damage_lots (product_id, status, created_at desc);
create index if not exists inventory_damage_transactions_lot_idx
	on public.inventory_damage_transactions (lot_id, created_at desc);

drop trigger if exists inventory_damage_lots_set_updated_at on public.inventory_damage_lots;
create trigger inventory_damage_lots_set_updated_at
	before update on public.inventory_damage_lots
	for each row execute function public.set_updated_at();

alter table public.inventory_damage_lots enable row level security;
alter table public.inventory_damage_transactions enable row level security;

drop policy if exists inventory_damage_lots_internal_read on public.inventory_damage_lots;
create policy inventory_damage_lots_internal_read
	on public.inventory_damage_lots for select
	to authenticated
	using (
		public.can_access_panel('inventory')
		or public.can_access_panel('finance')
		or public.is_employee_with_role('ceo')
	);

drop policy if exists inventory_damage_transactions_internal_read on public.inventory_damage_transactions;
create policy inventory_damage_transactions_internal_read
	on public.inventory_damage_transactions for select
	to authenticated
	using (
		public.can_access_panel('inventory')
		or public.can_access_panel('finance')
		or public.is_employee_with_role('ceo')
	);

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
		('1210', 'Good inventory asset - management valuation', 'asset'::public.finance_account_class, 'debit'::public.finance_normal_balance, '1000'),
		('1211', 'Damaged inventory asset - NRV', 'asset', 'debit', '1000'),
		('4110', 'Damaged inventory recovery revenue', 'revenue', 'credit', '4000'),
		('5110', 'Damaged inventory carrying cost', 'expense', 'debit', '5000'),
		('5410', 'Inventory damage write-down expense', 'expense', 'debit', '5000')
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

create or replace function app_private.inventory_damage_lot_status(
	p_remaining_quantity numeric,
	p_sold_quantity numeric,
	p_disposed_quantity numeric,
	p_reversed_quantity numeric
)
returns public.inventory_damage_lot_status
language sql
immutable
set search_path = public
as $$
	select case
		when coalesce(p_remaining_quantity, 0) > 0 then 'open'::public.inventory_damage_lot_status
		when coalesce(p_sold_quantity, 0) > 0
			and coalesce(p_disposed_quantity, 0) = 0
			and coalesce(p_reversed_quantity, 0) = 0
			then 'sold'::public.inventory_damage_lot_status
		when coalesce(p_disposed_quantity, 0) > 0
			and coalesce(p_sold_quantity, 0) = 0
			and coalesce(p_reversed_quantity, 0) = 0
			then 'disposed'::public.inventory_damage_lot_status
		when coalesce(p_reversed_quantity, 0) > 0
			and coalesce(p_sold_quantity, 0) = 0
			and coalesce(p_disposed_quantity, 0) = 0
			then 'reversed'::public.inventory_damage_lot_status
		else 'closed'::public.inventory_damage_lot_status
	end
$$;

create or replace function app_private.inventory_damage_employee_can_approve(
	p_employee_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.employees e
		where e.id = p_employee_id
		  and e.status = 'active'
		  and (
			e.is_ceo
			or exists (
				select 1
				from public.employee_roles er
				where er.employee_id = e.id
				  and er.role in ('admin', 'inventory')
			)
			or exists (
				select 1
				from public.employee_panel_permissions ep
				where ep.employee_id = e.id
				  and ep.panel = 'inventory'
				  and ep.can_write
			)
		  )
	)
$$;

create or replace function app_private.inventory_damage_unit_cost(
	p_product_id uuid
)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
	select round(coalesce(cost.raw_cost, p.price_range_min, p.price_range_max, 0), 2)
	from public.products p
	left join lateral (
		select spl.raw_cost
		from public.supplier_product_links spl
		left join public.suppliers s on s.id = spl.supplier_id
		where spl.product_id = p.id
		  and coalesce(s.status, 'active') = 'active'
		order by spl.is_primary desc, spl.updated_at desc
		limit 1
	) cost on true
	where p.id = p_product_id
$$;

create or replace function app_private.finance_add_inventory_damage_line(
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

create or replace function app_private.finance_link_inventory_damage_proof(
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
		case when p_proof_document_id is null then btrim(p_proof_path) else null end,
		p_link_role
	);
end;
$$;

create or replace function public.inventory_record_damage(
	p_product_id uuid,
	p_quantity numeric,
	p_reason text,
	p_recovery_unit_value numeric default null,
	p_recovery_percent numeric default null,
	p_proof_path text default null,
	p_proof_document_id uuid default null
)
returns public.inventory_damage_lots
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	employee_id uuid;
	product record;
	unit_cost numeric;
	recovery_unit_value numeric;
	carrying_unit_value numeric;
	original_value numeric;
	carrying_value numeric;
	write_down_value numeric;
	created_lot public.inventory_damage_lots%rowtype;
	entry_id uuid;
	line_number integer := 1;
begin
	employee_id := public.require_panel('inventory', true);

	if p_quantity is null or p_quantity <= 0 then
		raise exception 'invalid_damage_quantity' using errcode = '23514';
	end if;
	if length(btrim(coalesce(p_reason, ''))) < 5 then
		raise exception 'damage_reason_required' using errcode = '23514';
	end if;
	if p_proof_document_id is null
		and length(btrim(coalesce(p_proof_path, ''))) = 0
	then
		raise exception 'damage_proof_required' using errcode = '23514';
	end if;
	if p_recovery_percent is not null
		and (p_recovery_percent < 0 or p_recovery_percent > 100)
	then
		raise exception 'damage_recovery_percent_invalid' using errcode = '23514';
	end if;
	if p_recovery_unit_value is not null and p_recovery_unit_value < 0 then
		raise exception 'damage_recovery_value_invalid' using errcode = '23514';
	end if;

	select p.id, p.name, p.sku, p.unit_of_measure
	into product
	from public.products p
	where p.id = p_product_id
	  and p.is_active
	  and p.is_stockable
	for update;

	if product.id is null then
		raise exception 'damage_product_not_found' using errcode = '02000';
	end if;

	unit_cost := app_private.inventory_damage_unit_cost(p_product_id);
	if unit_cost is null or unit_cost <= 0 then
		raise exception 'damage_product_cost_required' using errcode = '23514';
	end if;

	recovery_unit_value := case
		when p_recovery_unit_value is not null then p_recovery_unit_value
		when p_recovery_percent is not null then unit_cost * (p_recovery_percent / 100)
		else 0
	end;
	carrying_unit_value := round(least(unit_cost, recovery_unit_value), 2);
	original_value := round(p_quantity * unit_cost, 2);
	carrying_value := round(p_quantity * carrying_unit_value, 2);
	write_down_value := round(greatest(original_value - carrying_value, 0), 2);

	update public.inventory_stock
	set on_hand_quantity = on_hand_quantity - p_quantity
	where product_id = p_product_id
	  and available_quantity >= p_quantity;

	if not found then
		raise exception 'insufficient_available_stock_for_damage' using errcode = '23514';
	end if;

	insert into public.finance_journal_entries (
		accounting_date,
		source_type,
		source_id,
		description,
		actor_employee_id
	)
	values (
		app_private.finance_cairo_date(now()),
		null,
		null,
		'Inventory damage recognition for ' || product.name,
		employee_id
	)
	returning id into entry_id;

	insert into public.inventory_damage_lots (
		product_id,
		recorded_by_employee_id,
		reason,
		original_quantity,
		remaining_quantity,
		original_unit_cost,
		recovery_unit_value,
		carrying_unit_value,
		original_total_value,
		carrying_total_value,
		write_down_amount,
		proof_document_id,
		proof_path,
		journal_entry_id
	)
	values (
		p_product_id,
		employee_id,
		btrim(p_reason),
		p_quantity,
		p_quantity,
		round(unit_cost, 2),
		round(recovery_unit_value, 2),
		carrying_unit_value,
		original_value,
		carrying_value,
		write_down_value,
		p_proof_document_id,
		nullif(btrim(coalesce(p_proof_path, '')), ''),
		entry_id
	)
	returning * into created_lot;

	update public.finance_journal_entries
	set source_type = 'inventory_damage_lot',
		source_id = created_lot.id
	where id = entry_id;

	line_number := app_private.finance_add_inventory_damage_line(
		entry_id,
		line_number,
		'1211',
		carrying_value,
		0,
		'Damaged inventory carried at NRV',
		'inventory_damage_lot',
		created_lot.id
	);
	line_number := app_private.finance_add_inventory_damage_line(
		entry_id,
		line_number,
		'5410',
		write_down_value,
		0,
		'Inventory write-down to damaged NRV',
		'inventory_damage_lot',
		created_lot.id
	);
	line_number := app_private.finance_add_inventory_damage_line(
		entry_id,
		line_number,
		'1210',
		0,
		original_value,
		'Good inventory removed from saleable stock',
		'inventory_damage_lot',
		created_lot.id
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
		'inventory_damage_lot',
		created_lot.id,
		'damage_recorded',
		created_lot.damage_number
	);

	perform app_private.finance_link_inventory_damage_proof(
		entry_id,
		p_proof_document_id,
		p_proof_path,
		'damage_proof'
	);

	update public.finance_journal_entries
	set
		status = 'posted',
		posted_at = now(),
		posted_by_employee_id = employee_id
	where id = entry_id;

	insert into public.inventory_damage_transactions (
		lot_id,
		transaction_type,
		quantity,
		unit_price,
		amount,
		carrying_amount,
		write_down_reversal_amount,
		reason,
		proof_document_id,
		proof_path,
		created_by_employee_id,
		journal_entry_id
	)
	values (
		created_lot.id,
		'recorded',
		p_quantity,
		carrying_unit_value,
		carrying_value,
		carrying_value,
		write_down_value,
		btrim(p_reason),
		p_proof_document_id,
		nullif(btrim(coalesce(p_proof_path, '')), ''),
		employee_id,
		entry_id
	);

	perform public.log_activity(
		'inventory_damage_lot',
		created_lot.id,
		'inventory_damage_recorded',
		jsonb_strip_nulls(jsonb_build_object(
			'employee_id', employee_id,
			'product_id', product.id,
			'product_name', product.name,
			'product_sku', product.sku,
			'unit', product.unit_of_measure,
			'quantity', p_quantity,
			'original_unit_cost', round(unit_cost, 2),
			'recovery_unit_value', carrying_unit_value,
			'original_value', original_value,
			'carrying_value', carrying_value,
			'write_down_amount', write_down_value,
			'reason', btrim(p_reason),
			'proof_document_id', p_proof_document_id,
			'proof_path', nullif(btrim(coalesce(p_proof_path, '')), '')
		))
	);

	return created_lot;
end;
$$;

create or replace function public.inventory_sell_damaged_inventory(
	p_lot_id uuid,
	p_quantity numeric,
	p_unit_sale_price numeric,
	p_counterparty_name text,
	p_payment_status text,
	p_proof_path text default null,
	p_proof_document_id uuid default null
)
returns public.inventory_damage_transactions
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	employee_id uuid;
	lot public.inventory_damage_lots%rowtype;
	product record;
	clean_payment_status text := lower(btrim(coalesce(p_payment_status, '')));
	sale_amount numeric;
	carrying_amount numeric;
	created_transaction public.inventory_damage_transactions%rowtype;
	entry_id uuid;
	line_number integer := 1;
begin
	employee_id := public.require_panel('inventory', true);

	if p_quantity is null or p_quantity <= 0 then
		raise exception 'invalid_damage_sale_quantity' using errcode = '23514';
	end if;
	if p_unit_sale_price is null or p_unit_sale_price <= 0 then
		raise exception 'invalid_damage_sale_price' using errcode = '23514';
	end if;
	if clean_payment_status not in ('paid', 'receivable') then
		raise exception 'invalid_damage_sale_payment_status' using errcode = '23514';
	end if;
	if length(btrim(coalesce(p_counterparty_name, ''))) < 2 then
		raise exception 'damage_sale_counterparty_required' using errcode = '23514';
	end if;
	if p_proof_document_id is null
		and length(btrim(coalesce(p_proof_path, ''))) = 0
	then
		raise exception 'damage_sale_proof_required' using errcode = '23514';
	end if;

	select * into lot
	from public.inventory_damage_lots
	where id = p_lot_id
	for update;

	if lot.id is null then
		raise exception 'inventory_damage_lot_not_found' using errcode = '02000';
	end if;
	if lot.remaining_quantity < p_quantity then
		raise exception 'insufficient_damaged_quantity' using errcode = '23514';
	end if;

	select p.id, p.name, p.sku, p.unit_of_measure
	into product
	from public.products p
	where p.id = lot.product_id;

	sale_amount := round(p_quantity * p_unit_sale_price, 2);
	carrying_amount := round(p_quantity * lot.carrying_unit_value, 2);

	insert into public.inventory_damage_transactions (
		lot_id,
		transaction_type,
		quantity,
		unit_price,
		amount,
		carrying_amount,
		counterparty_name,
		payment_status,
		proof_document_id,
		proof_path,
		created_by_employee_id
	)
	values (
		lot.id,
		'sold',
		p_quantity,
		round(p_unit_sale_price, 2),
		sale_amount,
		carrying_amount,
		btrim(p_counterparty_name),
		clean_payment_status,
		p_proof_document_id,
		nullif(btrim(coalesce(p_proof_path, '')), ''),
		employee_id
	)
	returning * into created_transaction;

	insert into public.finance_journal_entries (
		accounting_date,
		source_type,
		source_id,
		description,
		actor_employee_id
	)
	values (
		app_private.finance_cairo_date(now()),
		'inventory_damage_transaction',
		created_transaction.id,
		'Damaged inventory sale for ' || product.name,
		employee_id
	)
	returning id into entry_id;

	line_number := app_private.finance_add_inventory_damage_line(
		entry_id,
		line_number,
		case when clean_payment_status = 'paid' then '1010' else '1100' end,
		sale_amount,
		0,
		case when clean_payment_status = 'paid' then 'Cash received for damaged inventory sale' else 'Receivable for damaged inventory sale' end,
		'inventory_damage_transaction',
		created_transaction.id
	);
	line_number := app_private.finance_add_inventory_damage_line(
		entry_id,
		line_number,
		'5110',
		carrying_amount,
		0,
		'Damaged inventory carrying amount sold',
		'inventory_damage_transaction',
		created_transaction.id
	);
	line_number := app_private.finance_add_inventory_damage_line(
		entry_id,
		line_number,
		'4110',
		0,
		sale_amount,
		'Damaged inventory recovery revenue',
		'inventory_damage_transaction',
		created_transaction.id
	);
	line_number := app_private.finance_add_inventory_damage_line(
		entry_id,
		line_number,
		'1211',
		0,
		carrying_amount,
		'Damaged inventory asset released on sale',
		'inventory_damage_transaction',
		created_transaction.id
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
		'inventory_damage_transaction',
		created_transaction.id,
		'damage_sold',
		lot.damage_number
	);

	perform app_private.finance_link_inventory_damage_proof(
		entry_id,
		p_proof_document_id,
		p_proof_path,
		'damage_sale_proof'
	);

	update public.finance_journal_entries
	set
		status = 'posted',
		posted_at = now(),
		posted_by_employee_id = employee_id
	where id = entry_id;

	update public.inventory_damage_transactions
	set journal_entry_id = entry_id
	where id = created_transaction.id
	returning * into created_transaction;

	update public.inventory_damage_lots
	set
		remaining_quantity = remaining_quantity - p_quantity,
		sold_quantity = sold_quantity + p_quantity,
		status = app_private.inventory_damage_lot_status(
			remaining_quantity - p_quantity,
			sold_quantity + p_quantity,
			disposed_quantity,
			reversed_quantity
		)
	where id = lot.id;

	perform public.log_activity(
		'inventory_damage_transaction',
		created_transaction.id,
		'inventory_damage_sold',
		jsonb_strip_nulls(jsonb_build_object(
			'employee_id', employee_id,
			'product_id', product.id,
			'product_name', product.name,
			'product_sku', product.sku,
			'unit', product.unit_of_measure,
			'lot_id', lot.id,
			'damage_number', lot.damage_number,
			'quantity', p_quantity,
			'unit_sale_price', round(p_unit_sale_price, 2),
			'amount', sale_amount,
			'carrying_amount', carrying_amount,
			'counterparty_name', btrim(p_counterparty_name),
			'payment_status', clean_payment_status,
			'proof_document_id', p_proof_document_id,
			'proof_path', nullif(btrim(coalesce(p_proof_path, '')), '')
		))
	);

	return created_transaction;
end;
$$;

create or replace function public.inventory_dispose_damaged_inventory(
	p_lot_id uuid,
	p_quantity numeric,
	p_reason text,
	p_proof_path text default null,
	p_proof_document_id uuid default null
)
returns public.inventory_damage_transactions
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	employee_id uuid;
	lot public.inventory_damage_lots%rowtype;
	product record;
	carrying_amount numeric;
	created_transaction public.inventory_damage_transactions%rowtype;
	entry_id uuid;
	line_number integer := 1;
begin
	employee_id := public.require_panel('inventory', true);

	if p_quantity is null or p_quantity <= 0 then
		raise exception 'invalid_damage_disposal_quantity' using errcode = '23514';
	end if;
	if length(btrim(coalesce(p_reason, ''))) < 5 then
		raise exception 'damage_disposal_reason_required' using errcode = '23514';
	end if;
	if p_proof_document_id is null
		and length(btrim(coalesce(p_proof_path, ''))) = 0
	then
		raise exception 'damage_disposal_proof_required' using errcode = '23514';
	end if;

	select * into lot
	from public.inventory_damage_lots
	where id = p_lot_id
	for update;

	if lot.id is null then
		raise exception 'inventory_damage_lot_not_found' using errcode = '02000';
	end if;
	if lot.remaining_quantity < p_quantity then
		raise exception 'insufficient_damaged_quantity' using errcode = '23514';
	end if;

	select p.id, p.name, p.sku, p.unit_of_measure
	into product
	from public.products p
	where p.id = lot.product_id;

	carrying_amount := round(p_quantity * lot.carrying_unit_value, 2);

	insert into public.inventory_damage_transactions (
		lot_id,
		transaction_type,
		quantity,
		amount,
		carrying_amount,
		reason,
		proof_document_id,
		proof_path,
		created_by_employee_id
	)
	values (
		lot.id,
		'disposed',
		p_quantity,
		0,
		carrying_amount,
		btrim(p_reason),
		p_proof_document_id,
		nullif(btrim(coalesce(p_proof_path, '')), ''),
		employee_id
	)
	returning * into created_transaction;

	if carrying_amount > 0 then
		insert into public.finance_journal_entries (
			accounting_date,
			source_type,
			source_id,
			description,
			actor_employee_id
		)
		values (
			app_private.finance_cairo_date(now()),
			'inventory_damage_transaction',
			created_transaction.id,
			'Damaged inventory disposal for ' || product.name,
			employee_id
		)
		returning id into entry_id;

		line_number := app_private.finance_add_inventory_damage_line(
			entry_id,
			line_number,
			'5410',
			carrying_amount,
			0,
			'Damaged inventory disposal loss',
			'inventory_damage_transaction',
			created_transaction.id
		);
		line_number := app_private.finance_add_inventory_damage_line(
			entry_id,
			line_number,
			'1211',
			0,
			carrying_amount,
			'Damaged inventory asset disposed',
			'inventory_damage_transaction',
			created_transaction.id
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
			'inventory_damage_transaction',
			created_transaction.id,
			'damage_disposed',
			lot.damage_number
		);

		perform app_private.finance_link_inventory_damage_proof(
			entry_id,
			p_proof_document_id,
			p_proof_path,
			'damage_disposal_proof'
		);

		update public.finance_journal_entries
		set
			status = 'posted',
			posted_at = now(),
			posted_by_employee_id = employee_id
		where id = entry_id;

		update public.inventory_damage_transactions
		set journal_entry_id = entry_id
		where id = created_transaction.id
		returning * into created_transaction;
	end if;

	update public.inventory_damage_lots
	set
		remaining_quantity = remaining_quantity - p_quantity,
		disposed_quantity = disposed_quantity + p_quantity,
		status = app_private.inventory_damage_lot_status(
			remaining_quantity - p_quantity,
			sold_quantity,
			disposed_quantity + p_quantity,
			reversed_quantity
		)
	where id = lot.id;

	perform public.log_activity(
		'inventory_damage_transaction',
		created_transaction.id,
		'inventory_damage_disposed',
		jsonb_strip_nulls(jsonb_build_object(
			'employee_id', employee_id,
			'product_id', product.id,
			'product_name', product.name,
			'product_sku', product.sku,
			'unit', product.unit_of_measure,
			'lot_id', lot.id,
			'damage_number', lot.damage_number,
			'quantity', p_quantity,
			'amount', 0,
			'carrying_amount', carrying_amount,
			'reason', btrim(p_reason),
			'proof_document_id', p_proof_document_id,
			'proof_path', nullif(btrim(coalesce(p_proof_path, '')), '')
		))
	);

	return created_transaction;
end;
$$;

create or replace function public.inventory_reverse_damage(
	p_lot_id uuid,
	p_quantity numeric,
	p_reason text,
	p_manager_employee_id uuid,
	p_proof_path text default null,
	p_proof_document_id uuid default null
)
returns public.inventory_damage_transactions
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	employee_id uuid;
	lot public.inventory_damage_lots%rowtype;
	product record;
	original_amount numeric;
	carrying_amount numeric;
	reversal_amount numeric;
	manager_name text;
	created_transaction public.inventory_damage_transactions%rowtype;
	entry_id uuid;
	line_number integer := 1;
begin
	employee_id := public.require_panel('inventory', true);

	if p_quantity is null or p_quantity <= 0 then
		raise exception 'invalid_damage_reverse_quantity' using errcode = '23514';
	end if;
	if length(btrim(coalesce(p_reason, ''))) < 5 then
		raise exception 'damage_reverse_reason_required' using errcode = '23514';
	end if;
	if p_manager_employee_id is null then
		raise exception 'damage_reverse_manager_required' using errcode = '23514';
	end if;
	if p_manager_employee_id = employee_id then
		raise exception 'damage_reverse_manager_must_be_different' using errcode = '23514';
	end if;
	if not app_private.inventory_damage_employee_can_approve(p_manager_employee_id) then
		raise exception 'damage_reverse_manager_not_authorized' using errcode = '42501';
	end if;
	if p_proof_document_id is null
		and length(btrim(coalesce(p_proof_path, ''))) = 0
	then
		raise exception 'damage_reverse_proof_required' using errcode = '23514';
	end if;

	select * into lot
	from public.inventory_damage_lots
	where id = p_lot_id
	for update;

	if lot.id is null then
		raise exception 'inventory_damage_lot_not_found' using errcode = '02000';
	end if;
	if lot.remaining_quantity < p_quantity then
		raise exception 'insufficient_damaged_quantity' using errcode = '23514';
	end if;

	select p.id, p.name, p.sku, p.unit_of_measure
	into product
	from public.products p
	where p.id = lot.product_id;

	select e.full_name into manager_name
	from public.employees e
	where e.id = p_manager_employee_id;

	original_amount := round(p_quantity * lot.original_unit_cost, 2);
	carrying_amount := round(p_quantity * lot.carrying_unit_value, 2);
	reversal_amount := round(greatest(original_amount - carrying_amount, 0), 2);

	update public.inventory_stock
	set on_hand_quantity = on_hand_quantity + p_quantity
	where product_id = lot.product_id;

	if not found then
		insert into public.inventory_stock (product_id, on_hand_quantity)
		values (lot.product_id, p_quantity);
	end if;

	insert into public.inventory_damage_transactions (
		lot_id,
		transaction_type,
		quantity,
		amount,
		carrying_amount,
		write_down_reversal_amount,
		reason,
		manager_employee_id,
		proof_document_id,
		proof_path,
		created_by_employee_id
	)
	values (
		lot.id,
		'reversed',
		p_quantity,
		original_amount,
		carrying_amount,
		reversal_amount,
		btrim(p_reason),
		p_manager_employee_id,
		p_proof_document_id,
		nullif(btrim(coalesce(p_proof_path, '')), ''),
		employee_id
	)
	returning * into created_transaction;

	insert into public.finance_journal_entries (
		accounting_date,
		source_type,
		source_id,
		description,
		actor_employee_id
	)
	values (
		app_private.finance_cairo_date(now()),
		'inventory_damage_transaction',
		created_transaction.id,
		'Damaged inventory correction for ' || product.name,
		employee_id
	)
	returning id into entry_id;

	line_number := app_private.finance_add_inventory_damage_line(
		entry_id,
		line_number,
		'1210',
		original_amount,
		0,
		'Good inventory restored from damage correction',
		'inventory_damage_transaction',
		created_transaction.id
	);
	line_number := app_private.finance_add_inventory_damage_line(
		entry_id,
		line_number,
		'1211',
		0,
		carrying_amount,
		'Damaged inventory asset reversed',
		'inventory_damage_transaction',
		created_transaction.id
	);
	line_number := app_private.finance_add_inventory_damage_line(
		entry_id,
		line_number,
		'5410',
		0,
		reversal_amount,
		'Damage write-down reversed after manager approval',
		'inventory_damage_transaction',
		created_transaction.id
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
		'inventory_damage_transaction',
		created_transaction.id,
		'damage_reversed',
		lot.damage_number
	);

	perform app_private.finance_link_inventory_damage_proof(
		entry_id,
		p_proof_document_id,
		p_proof_path,
		'damage_reverse_proof'
	);

	update public.finance_journal_entries
	set
		status = 'posted',
		posted_at = now(),
		posted_by_employee_id = employee_id
	where id = entry_id;

	update public.inventory_damage_transactions
	set journal_entry_id = entry_id
	where id = created_transaction.id
	returning * into created_transaction;

	update public.inventory_damage_lots
	set
		remaining_quantity = remaining_quantity - p_quantity,
		reversed_quantity = reversed_quantity + p_quantity,
		status = app_private.inventory_damage_lot_status(
			remaining_quantity - p_quantity,
			sold_quantity,
			disposed_quantity,
			reversed_quantity + p_quantity
		)
	where id = lot.id;

	perform public.log_activity(
		'inventory_damage_transaction',
		created_transaction.id,
		'inventory_damage_reversed',
		jsonb_strip_nulls(jsonb_build_object(
			'employee_id', employee_id,
			'product_id', product.id,
			'product_name', product.name,
			'product_sku', product.sku,
			'unit', product.unit_of_measure,
			'lot_id', lot.id,
			'damage_number', lot.damage_number,
			'quantity', p_quantity,
			'original_value', original_amount,
			'carrying_amount', carrying_amount,
			'write_down_reversal_amount', reversal_amount,
			'reason', btrim(p_reason),
			'manager_employee_id', p_manager_employee_id,
			'manager_name', manager_name,
			'approval', jsonb_build_object(
				'manager_employee_id', p_manager_employee_id,
				'manager_name', manager_name,
				'source', 'inventory_damage_reverse'
			),
			'proof_document_id', p_proof_document_id,
			'proof_path', nullif(btrim(coalesce(p_proof_path, '')), '')
		))
	);

	return created_transaction;
end;
$$;

create or replace function public.service_inventory_record_damage(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_product_id uuid,
	p_quantity numeric,
	p_reason text,
	p_recovery_unit_value numeric default null,
	p_recovery_percent numeric default null,
	p_proof_path text default null,
	p_proof_document_id uuid default null
)
returns public.inventory_damage_lots
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.inventory_record_damage(
		p_product_id,
		p_quantity,
		p_reason,
		p_recovery_unit_value,
		p_recovery_percent,
		p_proof_path,
		p_proof_document_id
	);
end;
$$;

create or replace function public.service_inventory_sell_damaged_inventory(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_lot_id uuid,
	p_quantity numeric,
	p_unit_sale_price numeric,
	p_counterparty_name text,
	p_payment_status text,
	p_proof_path text default null,
	p_proof_document_id uuid default null
)
returns public.inventory_damage_transactions
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.inventory_sell_damaged_inventory(
		p_lot_id,
		p_quantity,
		p_unit_sale_price,
		p_counterparty_name,
		p_payment_status,
		p_proof_path,
		p_proof_document_id
	);
end;
$$;

create or replace function public.service_inventory_dispose_damaged_inventory(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_lot_id uuid,
	p_quantity numeric,
	p_reason text,
	p_proof_path text default null,
	p_proof_document_id uuid default null
)
returns public.inventory_damage_transactions
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.inventory_dispose_damaged_inventory(
		p_lot_id,
		p_quantity,
		p_reason,
		p_proof_path,
		p_proof_document_id
	);
end;
$$;

create or replace function public.service_inventory_reverse_damage(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_lot_id uuid,
	p_quantity numeric,
	p_reason text,
	p_manager_employee_id uuid,
	p_proof_path text default null,
	p_proof_document_id uuid default null
)
returns public.inventory_damage_transactions
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.inventory_reverse_damage(
		p_lot_id,
		p_quantity,
		p_reason,
		p_manager_employee_id,
		p_proof_path,
		p_proof_document_id
	);
end;
$$;

revoke all on table public.inventory_damage_lots from public, anon, authenticated;
revoke all on table public.inventory_damage_transactions from public, anon, authenticated;
revoke all on function public.inventory_record_damage(uuid, numeric, text, numeric, numeric, text, uuid) from public, anon, authenticated;
revoke all on function public.inventory_sell_damaged_inventory(uuid, numeric, numeric, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.inventory_dispose_damaged_inventory(uuid, numeric, text, text, uuid) from public, anon, authenticated;
revoke all on function public.inventory_reverse_damage(uuid, numeric, text, uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.service_inventory_record_damage(uuid, text, uuid, numeric, text, numeric, numeric, text, uuid) from public, anon, authenticated;
revoke all on function public.service_inventory_sell_damaged_inventory(uuid, text, uuid, numeric, numeric, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.service_inventory_dispose_damaged_inventory(uuid, text, uuid, numeric, text, text, uuid) from public, anon, authenticated;
revoke all on function public.service_inventory_reverse_damage(uuid, text, uuid, numeric, text, uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.service_inventory_record_damage(uuid, text, uuid, numeric, text, numeric, numeric, text, uuid) to service_role;
grant execute on function public.service_inventory_sell_damaged_inventory(uuid, text, uuid, numeric, numeric, text, text, text, uuid) to service_role;
grant execute on function public.service_inventory_dispose_damaged_inventory(uuid, text, uuid, numeric, text, text, uuid) to service_role;
grant execute on function public.service_inventory_reverse_damage(uuid, text, uuid, numeric, text, uuid, text, uuid) to service_role;

do $$
begin
	if to_regprocedure('public.finance_accounting_dashboard_without_damage(date,date)') is null then
		alter function public.finance_accounting_dashboard(date, date)
			rename to finance_accounting_dashboard_without_damage;
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
	dashboard jsonb;
	damage_total numeric := 0;
	damage_cost_review_count integer := 0;
	damage_assets jsonb := '[]'::jsonb;
	overview jsonb;
	current_inventory_assets numeric := 0;
	current_total_assets numeric := 0;
	current_cost_review_count integer := 0;
begin
	dashboard := public.finance_accounting_dashboard_without_damage(
		p_period_start,
		p_period_end
	);

	with damage_rows as (
		select
			lot.id,
			lot.damage_number,
			lot.product_id,
			p.sku,
			p.name as product_name,
			p.unit_of_measure,
			lot.remaining_quantity,
			lot.original_unit_cost,
			lot.carrying_unit_value,
			round(lot.remaining_quantity * lot.carrying_unit_value, 2) as valuation,
			lot.write_down_amount,
			lot.reason,
			lot.status
		from public.inventory_damage_lots lot
		join public.products p on p.id = lot.product_id
		where lot.remaining_quantity > 0
	)
	select
		round(coalesce(sum(valuation), 0), 2),
		count(*) filter (where carrying_unit_value is null or original_unit_cost <= 0)::integer,
		coalesce(jsonb_agg(
			jsonb_build_object(
				'productId', concat('damage:', id::text),
				'lotId', id,
				'damageNumber', damage_number,
				'sku', sku,
				'productName', product_name || ' (damaged)',
				'onHand', remaining_quantity,
				'reserved', 0,
				'available', 0,
				'unitCost', round(carrying_unit_value, 2),
				'valuation', valuation,
				'supplierName', 'Damaged NRV',
				'needsCostReview', false,
				'condition', 'damaged',
				'originalUnitCost', round(original_unit_cost, 2),
				'writeDownAmount', write_down_amount,
				'reason', reason,
				'status', status
			)
			order by valuation desc, product_name
		), '[]'::jsonb)
	into damage_total, damage_cost_review_count, damage_assets
	from damage_rows;

	overview := coalesce(dashboard->'overview', '{}'::jsonb);
	current_inventory_assets := coalesce((overview->>'inventoryAssets')::numeric, 0);
	current_total_assets := coalesce((overview->>'totalAssets')::numeric, 0);
	current_cost_review_count := coalesce((overview->>'inventoryCostReviewCount')::integer, 0);

	dashboard := jsonb_set(
		dashboard,
		'{overview}',
		overview
			|| jsonb_build_object(
				'inventoryAssets', round(current_inventory_assets + damage_total, 2),
				'totalAssets', round(current_total_assets + damage_total, 2),
				'damagedInventoryAssets', round(damage_total, 2),
				'damagedInventoryLotCount', jsonb_array_length(damage_assets),
				'inventoryCostReviewCount', current_cost_review_count + damage_cost_review_count
			),
		true
	);

	dashboard := jsonb_set(
		dashboard,
		'{inventoryAssets}',
		coalesce(dashboard->'inventoryAssets', '[]'::jsonb) || damage_assets,
		true
	);

	return dashboard;
end;
$$;

revoke all on function public.finance_accounting_dashboard_without_damage(date, date) from public, anon, authenticated;
revoke all on function public.finance_accounting_dashboard(date, date) from public, anon, authenticated;

create or replace view public.ceo_search_finance_damage_vtable
with (security_invoker = true)
as
select
	'finance'::text as entity_type,
	concat('inventory_damage_lot:', lot.id::text) as entity_id,
	concat('Damaged inventory - ', p.name) as title,
	concat(lot.status::text, ' · ', lot.remaining_quantity::text, ' ', p.unit_of_measure, ' remaining') as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'finance_inventory_damage_lot',
		'lot_id', lot.id,
		'damage_number', lot.damage_number,
		'product_id', p.id,
		'product', p.name,
		'sku', p.sku,
		'category', p.category,
		'unit', p.unit_of_measure,
		'status', lot.status,
		'original_quantity', lot.original_quantity,
		'remaining_quantity', lot.remaining_quantity,
		'sold_quantity', lot.sold_quantity,
		'disposed_quantity', lot.disposed_quantity,
		'reversed_quantity', lot.reversed_quantity,
		'original_unit_cost', lot.original_unit_cost,
		'recovery_unit_value', lot.recovery_unit_value,
		'carrying_unit_value', lot.carrying_unit_value,
		'original_total_value', lot.original_total_value,
		'carrying_value_remaining', round(lot.remaining_quantity * lot.carrying_unit_value, 2),
		'write_down_amount', lot.write_down_amount,
		'reason', lot.reason,
		'proof_path', lot.proof_path,
		'journal_entry_id', lot.journal_entry_id,
		'created_at', lot.created_at
	)) as metadata,
	lot.updated_at as sort_at,
	concat_ws(
		' ',
		'finance inventory damaged damage write down nrv asset stock',
		lot.damage_number,
		p.name,
		p.sku,
		p.category,
		lot.reason,
		lot.status::text,
		lot.original_quantity::text,
		lot.remaining_quantity::text,
		lot.write_down_amount::text
	) as search_text
from public.inventory_damage_lots lot
join public.products p on p.id = lot.product_id
where public.can_access_ceo_search()
union all
select
	'finance'::text as entity_type,
	concat('inventory_damage_transaction:', tx.id::text) as entity_id,
	concat('Damaged inventory ', tx.transaction_type::text, ' - ', p.name) as title,
	concat(tx.quantity::text, ' ', p.unit_of_measure, ' · ', lot.damage_number) as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'finance_inventory_damage_transaction',
		'transaction_id', tx.id,
		'transaction_type', tx.transaction_type,
		'lot_id', lot.id,
		'damage_number', lot.damage_number,
		'product_id', p.id,
		'product', p.name,
		'sku', p.sku,
		'category', p.category,
		'unit', p.unit_of_measure,
		'quantity', tx.quantity,
		'unit_price', tx.unit_price,
		'amount', tx.amount,
		'carrying_amount', tx.carrying_amount,
		'write_down_reversal_amount', tx.write_down_reversal_amount,
		'counterparty_name', tx.counterparty_name,
		'payment_status', tx.payment_status,
		'reason', tx.reason,
		'manager_employee_id', tx.manager_employee_id,
		'manager_name', manager.full_name,
		'proof_path', tx.proof_path,
		'journal_entry_id', tx.journal_entry_id,
		'created_at', tx.created_at
	)) as metadata,
	tx.created_at as sort_at,
	concat_ws(
		' ',
		'finance inventory damaged damage sale dispose reverse correction asset stock',
		tx.transaction_type::text,
		lot.damage_number,
		p.name,
		p.sku,
		p.category,
		tx.quantity::text,
		tx.amount::text,
		tx.carrying_amount::text,
		tx.reason,
		tx.counterparty_name,
		manager.full_name
	) as search_text
from public.inventory_damage_transactions tx
join public.inventory_damage_lots lot on lot.id = tx.lot_id
join public.products p on p.id = lot.product_id
left join public.employees manager on manager.id = tx.manager_employee_id
where public.can_access_ceo_search();

revoke all privileges on public.ceo_search_finance_damage_vtable from anon, authenticated, public;

do $$
begin
	if to_regprocedure('app_private.refresh_ceo_search_documents_without_damage()') is null then
		alter function app_private.refresh_ceo_search_documents()
			rename to refresh_ceo_search_documents_without_damage;
	end if;
end $$;

create or replace function app_private.refresh_ceo_search_documents()
returns integer
language plpgsql
security definer
set search_path = public, app_private, extensions
as $$
declare
	base_count integer := 0;
	damage_count integer := 0;
	search_user_id uuid;
begin
	base_count := app_private.refresh_ceo_search_documents_without_damage();

	select e.user_id into search_user_id
	from public.employees e
	where e.status = 'active'
	  and e.user_id is not null
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

	if search_user_id is null then
		return base_count;
	end if;

	perform set_config('request.jwt.claim.sub', search_user_id::text, true);
	perform set_config(
		'request.jwt.claims',
		jsonb_build_object('sub', search_user_id::text, 'role', 'authenticated')::text,
		true
	);

	with source_rows as materialized (
		select
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
		from public.ceo_search_finance_damage_vtable source_candidates
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
		where documents.entity_type = 'finance'
		  and documents.metadata->>'source' in (
			'finance_inventory_damage_lot',
			'finance_inventory_damage_transaction'
		  )
		  and not exists (
			select 1
			from source_rows
			where source_rows.entity_type = documents.entity_type
			  and source_rows.entity_id = documents.entity_id
		  )
		returning 1
	)
	select count(*)::integer into damage_count
	from source_rows;

	return base_count + damage_count;
end;
$$;

revoke all privileges on function app_private.refresh_ceo_search_documents()
	from anon, authenticated, public;

do $$
declare
	source_table text;
begin
	foreach source_table in array array[
		'inventory_damage_lots',
		'inventory_damage_transactions'
	] loop
		execute format(
			'drop trigger if exists ceo_search_documents_dirty on public.%I',
			source_table
		);
		execute format(
			'create trigger ceo_search_documents_dirty after insert or update or delete or truncate on public.%I for each statement execute function app_private.mark_ceo_search_documents_dirty()',
			source_table
		);
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
		'ceo_search_finance_damage_vtable',
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
				'driver_rejection_proof_uploaded',
				'draft_created',
				'draft_saved',
				'draft_submitted',
				'draft_updated',
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
