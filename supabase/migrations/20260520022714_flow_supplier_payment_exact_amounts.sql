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
	expected_first_amount numeric;
	payment_amount numeric;
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

	payment_amount := round(p_amount::numeric, 2);
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
	total_due := round((refill.quantity * refill.unit_cost)::numeric, 2);
	if total_due <= 0 then
		raise exception 'invalid_supplier_payment_total' using errcode = '23514';
	end if;

	select
		coalesce(sum(amount), 0),
		coalesce(bool_or(payment_fraction >= 1), false)
	into existing_paid, has_full_payment
	from public.supplier_payments
	where refill_request_id = p_refill_request_id
	  and status = 'recorded';

	remaining_due := round((total_due - existing_paid)::numeric, 2);
	if remaining_due <= 0 or has_full_payment then
		raise exception 'supplier_payment_already_settled' using errcode = '23514';
	end if;

	if existing_paid = 0 then
		expected_first_amount := round((total_due * p_payment_fraction)::numeric, 2);
		if payment_amount <> expected_first_amount then
			raise exception 'supplier_payment_amount_must_match_fraction' using errcode = '23514';
		end if;
	elsif payment_amount <> remaining_due then
		raise exception 'supplier_payment_amount_must_match_remaining_due' using errcode = '23514';
	end if;

	if payment_amount > remaining_due then
		raise exception 'supplier_payment_exceeds_remaining' using errcode = '23514';
	end if;

	insert into public.supplier_payments (
		refill_request_id,
		recorded_by_employee_id,
		amount,
		payment_fraction,
		proof_path
	)
	values (
		p_refill_request_id,
		employee_id,
		payment_amount,
		p_payment_fraction,
		btrim(p_proof_path)
	)
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
			'amount', payment_amount,
			'payment_fraction', p_payment_fraction,
			'employee_id', employee_id,
			'total_due', total_due,
			'remaining_before', remaining_due,
			'remaining_after', round((remaining_due - payment_amount)::numeric, 2),
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
