create or replace function public.require_warehouse_receiving_proof(proof jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
	advisor_id uuid;
	advisor_id_text text;
	current_employee uuid;
	proof_url text;
	security_method text;
begin
	if proof is null or proof = '{}'::jsonb or proof = '[]'::jsonb then
		raise exception 'receiving_proof_required' using errcode = '23514';
	end if;

	advisor_id_text := btrim(coalesce(proof->>'advisor_id', ''));
	proof_url := btrim(coalesce(proof->>'proof_url', ''));
	security_method := btrim(coalesce(proof->>'security_method', ''));

	if advisor_id_text = '' or proof_url = '' or security_method not in ('password', 'qr') then
		raise exception 'receiving_proof_required' using errcode = '23514';
	end if;

	begin
		advisor_id := advisor_id_text::uuid;
	exception
		when invalid_text_representation then
			raise exception 'receiving_advisor_invalid' using errcode = '23514';
	end;

	current_employee := public.current_employee_id();
	if current_employee is null or advisor_id <> current_employee then
		raise exception 'receiving_advisor_must_match_session' using errcode = '42501';
	end if;

	if not exists (
		select 1
		from public.employees e
		where e.id = advisor_id
		  and e.status = 'active'
		  and (
			e.is_ceo
			or exists (
				select 1
				from public.employee_roles er
				where er.employee_id = e.id
				  and er.role in ('admin', 'warehouse')
			)
		  )
	) then
		raise exception 'receiving_advisor_not_authorized' using errcode = '42501';
	end if;

	return advisor_id;
end;
$$;

revoke all on function public.require_warehouse_receiving_proof(jsonb) from public;

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

create or replace function public.record_supplier_payment(
	p_refill_request_id uuid,
	p_amount numeric,
	p_payment_fraction numeric,
	p_proof_path text
)
returns public.supplier_payments
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	payment public.supplier_payments%rowtype;
	refill public.refill_requests%rowtype;
	from_status text;
	to_status text;
	total_due numeric;
	existing_paid numeric;
	remaining_due numeric;
	has_full_payment boolean;
begin
	employee_id := public.require_panel('finance', true);
	if p_amount is null or p_amount <= 0 then
		raise exception 'invalid_supplier_payment_amount' using errcode = '23514';
	end if;
	if p_payment_fraction not in (0.5, 1.0) then
		raise exception 'invalid_supplier_payment_fraction' using errcode = '23514';
	end if;
	if p_proof_path is null or btrim(p_proof_path) = '' then
		raise exception 'supplier_payment_proof_required' using errcode = '23514';
	end if;

	perform app_private.allow_workflow_state_change();

	select * into refill
	from public.refill_requests
	where id = p_refill_request_id
	for update;

	if refill.id is null then
		raise exception 'refill_request_not_found' using errcode = '02000';
	end if;

	if refill.status not in ('finance_pending', 'finance_approved', 'warehouse_receiving', 'received') then
		raise exception 'invalid_supplier_payment_refill_status_%', refill.status using errcode = '23514';
	end if;

	from_status := refill.status::text;
	to_status := from_status;
	total_due := round(refill.quantity * refill.unit_cost, 2);

	select
		coalesce(sum(amount), 0),
		coalesce(bool_or(payment_fraction >= 1), false)
	into existing_paid, has_full_payment
	from public.supplier_payments
	where refill_request_id = p_refill_request_id
	  and status = 'recorded';

	remaining_due := round(total_due - existing_paid, 2);
	if remaining_due <= 0 or has_full_payment then
		raise exception 'supplier_payment_already_settled' using errcode = '23514';
	end if;
	if p_amount > remaining_due + 0.01 then
		raise exception 'supplier_payment_exceeds_remaining' using errcode = '23514';
	end if;

	insert into public.supplier_payments (
		refill_request_id,
		recorded_by_employee_id,
		amount,
		payment_fraction,
		proof_path
	)
	values (p_refill_request_id, employee_id, p_amount, p_payment_fraction, btrim(p_proof_path))
	returning * into payment;

	if refill.status in ('finance_pending', 'finance_approved') then
		update public.refill_requests
		set status = 'warehouse_receiving'
		where id = p_refill_request_id;

		insert into public.receiving_tasks (refill_request_id)
		values (p_refill_request_id)
		on conflict do nothing;

		to_status := 'warehouse_receiving';
	end if;

	perform public.log_activity(
		'refill_request',
		p_refill_request_id,
		'supplier_payment_recorded',
		jsonb_build_object(
			'amount', p_amount,
			'payment_fraction', p_payment_fraction,
			'employee_id', employee_id,
			'total_due', total_due,
			'remaining_before', remaining_due,
			'remaining_after', round(remaining_due - p_amount, 2),
			'from_status', from_status,
			'to_status', to_status
		)
	);
	return payment;
end;
$$;

create or replace function public.warehouse_approve_receiving(p_receiving_task_id uuid, p_proof jsonb)
returns public.receiving_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
	updated public.receiving_tasks%rowtype;
	target public.receiving_tasks%rowtype;
	item record;
	advisor_id uuid;
begin
	perform public.require_panel('warehouse', true);
	advisor_id := public.require_warehouse_receiving_proof(p_proof);
	perform app_private.allow_workflow_state_change();

	select * into target
	from public.receiving_tasks
	where id = p_receiving_task_id
	for update;

	if target.id is null then
		raise exception 'receiving_task_not_found' using errcode = '02000';
	end if;
	if target.status not in ('pending', 'rejected') then
		raise exception 'invalid_receiving_task_status_%', target.status using errcode = '23514';
	end if;
	if not exists (
		select 1
		from public.receiving_task_items
		where receiving_task_id = p_receiving_task_id
		  and received_quantity > 0
	) then
		raise exception 'receiving_items_required' using errcode = '23514';
	end if;

	update public.receiving_tasks
	set status = 'approved', advisor_employee_id = advisor_id, proof = p_proof
	where id = p_receiving_task_id
	returning * into updated;

	for item in
		select product_id, sum(received_quantity) as received_quantity
		from public.receiving_task_items
		where receiving_task_id = p_receiving_task_id
		group by product_id
	loop
		insert into public.inventory_stock (product_id, on_hand_quantity)
		values (item.product_id, item.received_quantity)
		on conflict (product_id) do update
		set on_hand_quantity = public.inventory_stock.on_hand_quantity + excluded.on_hand_quantity;
	end loop;

	update public.refill_requests
	set status = 'received'
	where id = updated.refill_request_id
	  and status = 'warehouse_receiving';

	perform public.log_activity(
		'receiving_task',
		updated.id,
		'warehouse_receiving_approved',
		jsonb_build_object(
			'from_status', target.status,
			'to_status', 'approved',
			'advisor_employee_id', advisor_id,
			'proof', p_proof
		)
	);
	return updated;
end;
$$;

create or replace function public.warehouse_reject_receiving(p_receiving_task_id uuid, p_reason text, p_proof jsonb)
returns public.receiving_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
	updated public.receiving_tasks%rowtype;
	advisor_id uuid;
begin
	perform public.require_panel('warehouse', true);
	perform public.require_rejection_proof(p_proof);
	advisor_id := public.require_warehouse_receiving_proof(p_proof);
	if p_reason is null or length(btrim(p_reason)) < 3 then
		raise exception 'receiving_rejection_reason_required' using errcode = '23514';
	end if;
	perform app_private.allow_workflow_state_change();

	update public.receiving_tasks
	set
		status = 'rejected',
		advisor_employee_id = advisor_id,
		rejection_reason = btrim(p_reason),
		proof = p_proof
	where id = p_receiving_task_id
	  and status in ('pending', 'rejected')
	returning * into updated;

	if updated.id is null then
		raise exception 'receiving_task_not_found_or_already_approved' using errcode = '02000';
	end if;

	update public.refill_requests
	set status = 'warehouse_receiving'
	where id = updated.refill_request_id
	  and status = 'warehouse_receiving';

	perform public.log_activity(
		'receiving_task',
		updated.id,
		'warehouse_receiving_rejected',
		jsonb_build_object(
			'from_status', 'pending',
			'to_status', 'rejected',
			'advisor_employee_id', advisor_id,
			'reason', btrim(p_reason),
			'proof', p_proof
		)
	);
	return updated;
end;
$$;
