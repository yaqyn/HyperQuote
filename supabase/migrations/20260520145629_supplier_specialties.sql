create table if not exists public.supplier_specialties (
	id uuid primary key default gen_random_uuid(),
	supplier_id uuid not null references public.suppliers(id) on delete cascade,
	category_slug text not null references public.categories(slug) on update cascade on delete restrict,
	product_slug text references public.products(slug) on update cascade on delete cascade,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint supplier_specialties_category_not_blank check (btrim(category_slug) <> ''),
	constraint supplier_specialties_product_not_blank check (product_slug is null or btrim(product_slug) <> '')
);

create unique index if not exists supplier_specialties_category_all_unique
	on public.supplier_specialties (supplier_id, category_slug)
	where product_slug is null;

create unique index if not exists supplier_specialties_product_unique
	on public.supplier_specialties (supplier_id, category_slug, product_slug)
	where product_slug is not null;

create index if not exists supplier_specialties_supplier_idx
	on public.supplier_specialties (supplier_id);

create index if not exists supplier_specialties_category_product_idx
	on public.supplier_specialties (category_slug, product_slug);

create or replace function app_private.validate_supplier_specialty_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	product_category text;
begin
	if not exists (
		select 1
		from public.categories c
		where c.slug = new.category_slug
	) then
		raise exception 'supplier_specialty_category_not_found' using errcode = '23503';
	end if;

	if new.product_slug is not null then
		select p.category into product_category
		from public.products p
		where p.slug = new.product_slug;

		if product_category is null then
			raise exception 'supplier_specialty_product_not_found' using errcode = '23503';
		end if;

		if product_category <> new.category_slug then
			raise exception 'supplier_specialty_product_category_mismatch' using errcode = '23514';
		end if;
	end if;

	return new;
end;
$$;

revoke all on function app_private.validate_supplier_specialty_scope() from public;
revoke all on function app_private.validate_supplier_specialty_scope() from anon, authenticated;

drop trigger if exists supplier_specialties_validate_scope
	on public.supplier_specialties;
create trigger supplier_specialties_validate_scope
	before insert or update of category_slug, product_slug
	on public.supplier_specialties
	for each row execute function app_private.validate_supplier_specialty_scope();

drop trigger if exists supplier_specialties_set_updated_at
	on public.supplier_specialties;
create trigger supplier_specialties_set_updated_at
	before update on public.supplier_specialties
	for each row execute function public.set_updated_at();

alter table public.supplier_specialties enable row level security;

drop policy if exists service_role_all on public.supplier_specialties;
create policy service_role_all
	on public.supplier_specialties for all
	to service_role
	using (true)
	with check (true);

drop policy if exists internal_supplier_specialty_access
	on public.supplier_specialties;
create policy internal_supplier_specialty_access
	on public.supplier_specialties for all
	to authenticated
	using (
		public.can_access_panel('admin')
		or public.can_access_panel('inventory')
		or public.can_access_panel('sales')
		or public.can_access_panel('warehouse')
		or public.is_employee_with_role('ceo')
	)
	with check (public.can_access_panel('admin', true));

grant select, insert, update, delete on public.supplier_specialties to authenticated;
grant all on public.supplier_specialties to service_role;

insert into public.supplier_specialties (supplier_id, category_slug, product_slug)
select spl.supplier_id, p.category, p.slug
from public.supplier_product_links spl
join public.products p on p.id = spl.product_id
where exists (
	select 1
	from public.categories c
	where c.slug = p.category
)
on conflict do nothing;

drop trigger if exists supplier_specialties_require_audited_registry_write
	on public.supplier_specialties;
create trigger supplier_specialties_require_audited_registry_write
	before insert or update or delete on public.supplier_specialties
	for each row execute function app_private.require_audited_registry_write();

do $$
begin
	if exists (
		select 1
		from pg_publication
		where pubname = 'supabase_realtime'
	)
	and not exists (
		select 1
		from pg_publication_tables
		where pubname = 'supabase_realtime'
		  and schemaname = 'public'
		  and tablename = 'supplier_specialties'
	) then
		alter publication supabase_realtime add table public.supplier_specialties;
	end if;
end $$;

create or replace function app_private.supplier_can_supply_product(
	p_supplier_id uuid,
	p_product_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.supplier_product_links spl
		where spl.supplier_id = p_supplier_id
		  and spl.product_id = p_product_id
	)
	or exists (
		select 1
		from public.products p
		join public.supplier_specialties ss
		  on ss.supplier_id = p_supplier_id
		 and ss.category_slug = p.category
		 and (ss.product_slug is null or ss.product_slug = p.slug)
		where p.id = p_product_id
	);
$$;

revoke all on function app_private.supplier_can_supply_product(uuid, uuid) from public;
revoke all on function app_private.supplier_can_supply_product(uuid, uuid) from anon, authenticated;

create or replace function public.inventory_update_price(
	p_product_id uuid,
	p_supplier_id uuid,
	p_new_price numeric,
	p_proof_path text,
	p_notes text default null
)
returns public.price_updates
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	target_product public.products%rowtype;
	target_supplier public.suppliers%rowtype;
	created_update public.price_updates%rowtype;
	proof_path text;
	old_price numeric;
	new_public_max numeric;
begin
	employee_id := public.require_panel('inventory', true);
	proof_path := nullif(btrim(coalesce(p_proof_path, '')), '');

	if p_new_price is null or p_new_price <= 0 then
		raise exception 'invalid_price_update_amount' using errcode = '23514';
	end if;
	if proof_path is null then
		raise exception 'price_proof_required' using errcode = '23514';
	end if;

	select * into target_product
	from public.products
	where id = p_product_id
	for update;

	if target_product.id is null then
		raise exception 'product_not_found' using errcode = '02000';
	end if;

	select * into target_supplier
	from public.suppliers
	where id = p_supplier_id
	  and status = 'active';

	if target_supplier.id is null then
		raise exception 'supplier_not_found' using errcode = '02000';
	end if;

	if not app_private.supplier_can_supply_product(p_supplier_id, p_product_id) then
		raise exception 'supplier_not_assigned_to_product' using errcode = '42501';
	end if;

	old_price := target_product.price_range_min;
	new_public_max := case
		when target_product.price_range_min is not null
			and target_product.price_range_min > 0
			and target_product.price_range_max is not null
			and target_product.price_range_max >= target_product.price_range_min
			then round(p_new_price * (target_product.price_range_max / target_product.price_range_min), 2)
		else p_new_price
	end;

	perform set_config('app.audited_registry_write', 'on', true);

	update public.supplier_product_links
	set is_primary = false
	where product_id = p_product_id;

	insert into public.supplier_product_links (
		supplier_id,
		product_id,
		raw_cost,
		lead_time_days,
		min_order_qty,
		is_primary,
		last_quoted_at,
		notes
	)
	values (p_supplier_id, p_product_id, p_new_price, 1, 1, true, now(), p_notes)
	on conflict (supplier_id, product_id) do update
	set
		raw_cost = excluded.raw_cost,
		is_primary = true,
		last_quoted_at = excluded.last_quoted_at,
		notes = excluded.notes;

	update public.products
	set
		price_range_min = p_new_price,
		price_range_max = new_public_max,
		updated_at = now()
	where id = p_product_id;

	insert into public.price_updates (
		product_id,
		supplier_id,
		updated_by_employee_id,
		old_price,
		new_price,
		proof_path,
		notes
	)
	values (
		p_product_id,
		p_supplier_id,
		employee_id,
		old_price,
		p_new_price,
		proof_path,
		p_notes
	)
	returning * into created_update;

	update public.price_update_requests
	set
		status = 'resolved',
		assigned_employee_id = employee_id,
		resolved_at = now()
	where product_id = p_product_id
	  and status = 'pending';

	perform public.log_activity(
		'price_update',
		created_update.id,
		'inventory_price_updated',
		jsonb_build_object(
			'employee_id', employee_id,
			'product_id', p_product_id,
			'supplier_id', p_supplier_id,
			'old_price', old_price,
			'new_price', p_new_price,
			'proof_path', proof_path
		)
	);

	return created_update;
end;
$$;

grant execute on function public.inventory_update_price(uuid, uuid, numeric, text, text) to authenticated;

create or replace function public.create_supplier_refill(
	p_product_id uuid,
	p_supplier_id uuid,
	p_quantity numeric,
	p_unit_cost numeric,
	p_proof jsonb default '{}'::jsonb
)
returns public.refill_requests
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	created_refill public.refill_requests%rowtype;
	old_price numeric;
	price_update_id uuid;
	proof_path text;
	target_product public.products%rowtype;
	target_supplier public.suppliers%rowtype;
begin
	employee_id := public.require_panel('inventory', true);

	if p_quantity is null or p_quantity <= 0 then
		raise exception 'invalid_refill_quantity' using errcode = '23514';
	end if;
	if p_unit_cost is null or p_unit_cost <= 0 then
		raise exception 'invalid_refill_unit_cost' using errcode = '23514';
	end if;
	if p_proof is null or p_proof = '{}'::jsonb or btrim(coalesce(p_proof->>'supplier_name', '')) = '' then
		raise exception 'supplier_refill_proof_required' using errcode = '23514';
	end if;

	select * into target_product
	from public.products
	where id = p_product_id
	  and is_active
	  and is_stockable
	for update;

	if target_product.id is null then
		raise exception 'product_not_found_or_not_stockable' using errcode = '02000';
	end if;

	select * into target_supplier
	from public.suppliers
	where id = p_supplier_id
	  and status = 'active';

	if target_supplier.id is null then
		raise exception 'supplier_not_found_or_inactive' using errcode = '02000';
	end if;

	if not app_private.supplier_can_supply_product(p_supplier_id, p_product_id) then
		raise exception 'supplier_not_assigned_to_product' using errcode = '42501';
	end if;

	select raw_cost into old_price
	from public.supplier_product_links
	where product_id = p_product_id
	  and supplier_id = p_supplier_id;

	if old_price is null then
		old_price := target_product.price_range_min;
	end if;

	insert into public.refill_requests (
		product_id,
		supplier_id,
		requested_by_employee_id,
		quantity,
		unit_cost,
		proof
	)
	values (p_product_id, p_supplier_id, employee_id, p_quantity, p_unit_cost, p_proof)
	returning * into created_refill;

	perform set_config('app.audited_registry_write', 'on', true);

	update public.supplier_product_links
	set is_primary = false
	where product_id = p_product_id
	  and supplier_id <> p_supplier_id;

	insert into public.supplier_product_links (
		product_id,
		supplier_id,
		raw_cost,
		last_quoted_at,
		is_primary
	)
	values (p_product_id, p_supplier_id, p_unit_cost, now(), true)
	on conflict (supplier_id, product_id) do update
	set
		raw_cost = excluded.raw_cost,
		last_quoted_at = excluded.last_quoted_at,
		is_primary = true,
		updated_at = now();

	update public.products
	set
		price_range_min = p_unit_cost,
		price_range_max = p_unit_cost,
		updated_at = now()
	where id = p_product_id;

	proof_path := 'refill-proofs/' || created_refill.id::text || '.json';

	insert into public.price_updates (
		product_id,
		supplier_id,
		updated_by_employee_id,
		old_price,
		new_price,
		proof_path,
		notes
	)
	values (
		p_product_id,
		p_supplier_id,
		employee_id,
		old_price,
		p_unit_cost,
		proof_path,
		coalesce(nullif(btrim(p_proof->>'notes'), ''), 'Supplier refill price update')
	)
	returning id into price_update_id;

	perform public.log_activity(
		'price_update',
		price_update_id,
		'inventory_price_updated',
		jsonb_build_object(
			'product_id', p_product_id,
			'supplier_id', p_supplier_id,
			'employee_id', employee_id,
			'old_price', old_price,
			'new_price', p_unit_cost,
			'proof_path', proof_path,
			'source', 'supplier_refill'
		)
	);

	perform public.log_activity(
		'refill_request',
		created_refill.id,
		'supplier_refill_created',
		jsonb_build_object(
			'product_id', p_product_id,
			'supplier_id', p_supplier_id,
			'employee_id', employee_id,
			'quantity', p_quantity,
			'unit_cost', p_unit_cost,
			'from_status', null,
			'to_status', 'finance_pending',
			'proof_path', proof_path
		)
	);
	return created_refill;
end;
$$;

grant execute on function public.create_supplier_refill(uuid, uuid, numeric, numeric, jsonb) to authenticated;
