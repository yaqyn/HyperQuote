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
		if round(p_amount::numeric, 2) <> expected_first_amount then
			raise exception 'customer_payment_amount_must_match_fraction' using errcode = '23514';
		end if;
	elsif round(p_amount::numeric, 2) <> remaining_due then
		raise exception 'customer_payment_amount_must_match_remaining_due' using errcode = '23514';
	end if;

	if round(p_amount::numeric, 2) > remaining_due then
		raise exception 'customer_payment_exceeds_remaining_due' using errcode = '23514';
	end if;

	remaining_after := round((remaining_due - p_amount)::numeric, 2);

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
		round(p_amount::numeric, 2),
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
