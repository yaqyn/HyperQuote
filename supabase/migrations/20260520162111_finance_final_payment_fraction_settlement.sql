create or replace function public.record_customer_payment(
	p_order_id uuid,
	p_amount numeric,
	p_payment_fraction numeric,
	p_proof_path text
)
returns public.customer_payments
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	payment public.customer_payments%rowtype;
	target_order public.orders%rowtype;
	clean_proof_path text := btrim(coalesce(p_proof_path, ''));
	existing_paid numeric := 0;
	remaining_due numeric := 0;
	expected_first_amount numeric := 0;
	remaining_after numeric := 0;
	payment_amount numeric := round(p_amount::numeric, 2);
begin
	employee_id := public.require_panel('finance', true);

	select * into target_order
	from public.orders
	where id = p_order_id
	for update;

	if target_order.id is null then
		raise exception 'order_not_found' using errcode = '02000';
	end if;

	if target_order.status in ('rejected', 'canceled') then
		raise exception 'invalid_customer_payment_order_status_%', target_order.status using errcode = '23514';
	end if;

	if target_order.total_amount <= 0 then
		raise exception 'customer_payment_positive_total_required' using errcode = '23514';
	end if;

	if p_payment_fraction not in (0.5, 1.0) then
		raise exception 'invalid_customer_payment_fraction' using errcode = '23514';
	end if;

	if p_amount is null or p_amount <= 0 then
		raise exception 'customer_payment_amount_required' using errcode = '23514';
	end if;

	if clean_proof_path = '' then
		raise exception 'customer_payment_proof_required' using errcode = '23514';
	end if;

	select coalesce(sum(amount), 0) into existing_paid
	from public.customer_payments
	where order_id = p_order_id
	  and status = 'recorded';

	remaining_due := round((target_order.total_amount - existing_paid)::numeric, 2);

	if remaining_due <= 0 then
		raise exception 'customer_payment_already_settled' using errcode = '23514';
	end if;

	if existing_paid = 0 then
		expected_first_amount := round((target_order.total_amount * p_payment_fraction)::numeric, 2);
		if payment_amount <> expected_first_amount then
			raise exception 'customer_payment_amount_must_match_fraction' using errcode = '23514';
		end if;
	else
		if p_payment_fraction <> 1.0 then
			raise exception 'customer_final_payment_fraction_required' using errcode = '23514';
		end if;
		if payment_amount <> remaining_due then
			raise exception 'customer_payment_amount_must_match_remaining_due' using errcode = '23514';
		end if;
	end if;

	if payment_amount > remaining_due then
		raise exception 'customer_payment_exceeds_remaining_due' using errcode = '23514';
	end if;

	remaining_after := round((remaining_due - payment_amount)::numeric, 2);

	insert into public.customer_payments (
		order_id,
		recorded_by_employee_id,
		amount,
		payment_fraction,
		proof_path
	)
	values (
		p_order_id,
		employee_id,
		payment_amount,
		p_payment_fraction,
		clean_proof_path
	)
	returning * into payment;

	perform public.log_activity(
		'order',
		p_order_id,
		'customer_payment_recorded',
		jsonb_build_object(
			'employee_id', employee_id,
			'amount', payment.amount,
			'payment_fraction', payment.payment_fraction,
			'order_status', target_order.status,
			'remaining_amount', remaining_after
		)
	);
	return payment;
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
	else
		if p_payment_fraction <> 1.0 then
			raise exception 'supplier_final_payment_fraction_required' using errcode = '23514';
		end if;
		if payment_amount <> remaining_due then
			raise exception 'supplier_payment_amount_must_match_remaining_due' using errcode = '23514';
		end if;
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
