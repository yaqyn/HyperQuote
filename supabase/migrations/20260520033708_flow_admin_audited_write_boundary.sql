create or replace function app_private.require_audited_registry_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	if coalesce(auth.role(), '') = 'service_role'
		or coalesce(current_setting('app.audited_registry_write', true), '') = 'on'
	then
		if tg_op = 'DELETE' then
			return old;
		end if;
		return new;
	end if;

	raise exception 'registry_writes_must_use_audited_server_function'
		using errcode = '42501';
end;
$$;

drop trigger if exists products_require_audited_registry_write on public.products;
create trigger products_require_audited_registry_write
	before insert or update or delete on public.products
	for each row execute function app_private.require_audited_registry_write();

drop trigger if exists categories_require_audited_registry_write on public.categories;
create trigger categories_require_audited_registry_write
	before insert or update or delete on public.categories
	for each row execute function app_private.require_audited_registry_write();

drop trigger if exists suppliers_require_audited_registry_write on public.suppliers;
create trigger suppliers_require_audited_registry_write
	before insert or update or delete on public.suppliers
	for each row execute function app_private.require_audited_registry_write();

drop trigger if exists employees_require_audited_registry_write on public.employees;
create trigger employees_require_audited_registry_write
	before insert or update or delete on public.employees
	for each row execute function app_private.require_audited_registry_write();

drop trigger if exists supplier_product_links_require_audited_registry_write
	on public.supplier_product_links;
create trigger supplier_product_links_require_audited_registry_write
	before insert or update or delete on public.supplier_product_links
	for each row execute function app_private.require_audited_registry_write();

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
