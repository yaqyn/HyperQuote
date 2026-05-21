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
