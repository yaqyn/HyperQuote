create or replace function public.inventory_update_supplier_prices(
	p_supplier_id uuid,
	p_updates jsonb,
	p_proof_path text,
	p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	update_count integer;
	update_item jsonb;
	product_id uuid;
	new_price numeric;
	created_update public.price_updates%rowtype;
	created_updates jsonb := '[]'::jsonb;
begin
	employee_id := public.require_panel('inventory', true);
	if p_supplier_id is null then
		raise exception 'supplier_id_required' using errcode = '23514';
	end if;
	if p_updates is null or jsonb_typeof(p_updates) <> 'array' then
		raise exception 'supplier_price_updates_array_required' using errcode = '23514';
	end if;

	update_count := jsonb_array_length(p_updates);
	if update_count < 2 then
		raise exception 'supplier_price_batch_requires_multiple_items' using errcode = '23514';
	end if;

	for update_item in
		select value from jsonb_array_elements(p_updates)
	loop
		product_id := nullif(update_item->>'product_id', '')::uuid;
		new_price := nullif(update_item->>'new_price', '')::numeric;
		if product_id is null or new_price is null then
			raise exception 'supplier_price_update_item_invalid' using errcode = '23514';
		end if;

		select * into created_update
		from public.inventory_update_price(
			product_id,
			p_supplier_id,
			new_price,
			p_proof_path,
			coalesce(p_notes, 'Supplier batch price update')
		);

		created_updates := created_updates || jsonb_build_array(to_jsonb(created_update));
	end loop;

	return jsonb_build_object(
		'supplier_id', p_supplier_id,
		'updated_count', update_count,
		'updates', created_updates,
		'recorded_by_employee_id', employee_id
	);
end;
$$;

grant execute on function public.inventory_update_supplier_prices(uuid, jsonb, text, text) to authenticated;
