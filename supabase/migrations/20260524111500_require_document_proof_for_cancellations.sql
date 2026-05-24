create or replace function app_private.require_document_proof_path(
	p_proof jsonb,
	p_error_code text
)
returns text
language plpgsql
immutable
set search_path = public, app_private
as $$
declare
	clean_proof_path text;
begin
	clean_proof_path := btrim(coalesce(p_proof->>'proof_path', p_proof->>'proof_url', ''));
	if clean_proof_path = '' then
		raise exception using message = p_error_code, errcode = '23514';
	end if;
	return clean_proof_path;
end;
$$;

revoke all on function app_private.require_document_proof_path(jsonb, text)
	from public;

create or replace function public.sales_reject_order(
	p_order_id uuid,
	p_reason text,
	p_proof jsonb
)
returns public.quote_requests
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	updated public.quote_requests%rowtype;
	clean_proof_path text;
	canonical_proof jsonb;
begin
	employee_id := public.require_panel('sales', true);
	clean_proof_path := app_private.require_document_proof_path(
		p_proof,
		'sales_rejection_proof_document_required'
	);
	canonical_proof := coalesce(p_proof, '{}'::jsonb)
		|| jsonb_build_object('proof_path', clean_proof_path);
	perform app_private.allow_workflow_state_change();

	update public.quote_requests
	set
		status = 'rejected',
		rejected_reason = p_reason,
		rejected_proof = canonical_proof
	where id = p_order_id
	returning * into updated;

	if updated.id is null then
		raise exception 'quote_request_not_found' using errcode = '02000';
	end if;

	perform public.log_activity(
		'quote_request',
		updated.id,
		'sales_order_rejected',
		jsonb_build_object(
			'employee_id', employee_id,
			'to_status', 'rejected',
			'reason', p_reason,
			'proof', canonical_proof
		)
	);
	return updated;
end;
$$;

create or replace function public.sales_cancel_order(
	p_order_id uuid,
	p_reason text,
	p_proof jsonb default '{}'::jsonb
)
returns public.quote_requests
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	target public.quote_requests%rowtype;
	updated public.quote_requests%rowtype;
	cancel_reason text;
	clean_proof_path text;
	canonical_proof jsonb;
begin
	employee_id := public.require_panel('sales', true);
	clean_proof_path := app_private.require_document_proof_path(
		p_proof,
		'sales_cancel_proof_document_required'
	);
	canonical_proof := coalesce(p_proof, '{}'::jsonb)
		|| jsonb_build_object('proof_path', clean_proof_path);
	perform app_private.allow_workflow_state_change();
	cancel_reason := nullif(btrim(coalesce(p_reason, '')), '');

	if cancel_reason is null or length(cancel_reason) < 3 then
		raise exception 'cancel_reason_required' using errcode = '23514';
	end if;

	select * into target
	from public.quote_requests
	where id = p_order_id
	for update;

	if target.id is null then
		raise exception 'quote_request_not_found' using errcode = '02000';
	end if;

	if target.status not in ('assigned', 'submitted', 'saved', 'reviewing', 'quoting') then
		raise exception 'invalid_sales_cancel_transition_%', target.status using errcode = '23514';
	end if;

	if target.assigned_employee_id is not null
		and target.assigned_employee_id <> employee_id
		and not public.is_employee_with_role('ceo')
	then
		raise exception 'quote_request_assigned_to_another_employee' using errcode = '42501';
	end if;

	update public.quote_requests
	set
		status = 'canceled',
		assigned_employee_id = null,
		assigned_at = null,
		rejected_reason = cancel_reason,
		rejected_proof = canonical_proof
	where id = p_order_id
	returning * into updated;

	perform public.log_activity(
		'quote_request',
		updated.id,
		'sales_order_canceled',
		jsonb_build_object(
			'employee_id', employee_id,
			'from_status', target.status,
			'to_status', 'canceled',
			'reason', cancel_reason,
			'proof', canonical_proof
		)
	);

	return updated;
end;
$$;

create or replace function public.finance_cancel_customer_order(
	p_order_id uuid,
	p_reason text,
	p_proof jsonb default '{}'::jsonb
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	target public.orders%rowtype;
	updated public.orders%rowtype;
	cancel_reason text;
	released jsonb := '[]'::jsonb;
	clean_proof_path text;
	canonical_proof jsonb;
begin
	employee_id := public.require_panel('finance', true);
	clean_proof_path := app_private.require_document_proof_path(
		p_proof,
		'finance_cancel_proof_document_required'
	);
	canonical_proof := coalesce(p_proof, '{}'::jsonb)
		|| jsonb_build_object('proof_path', clean_proof_path);
	perform app_private.allow_workflow_state_change();
	cancel_reason := nullif(btrim(coalesce(p_reason, '')), '');

	if cancel_reason is null or length(cancel_reason) < 3 then
		raise exception 'cancel_reason_required' using errcode = '23514';
	end if;

	select * into target
	from public.orders
	where id = p_order_id
	for update;

	if target.id is null then
		raise exception 'order_not_found' using errcode = '02000';
	end if;

	if target.status not in ('confirmed_for_inventory', 'inventory_reserved') then
		raise exception 'invalid_finance_cancel_order_transition_%', target.status using errcode = '23514';
	end if;

	if target.status = 'inventory_reserved' then
		released := app_private.release_order_reservations(p_order_id);
	end if;

	update public.orders
	set status = 'canceled'
	where id = p_order_id
	returning * into updated;

	perform public.log_activity(
		'order',
		p_order_id,
		'sales_order_canceled',
		jsonb_build_object(
			'employee_id', employee_id,
			'from_status', target.status,
			'to_status', 'canceled',
			'reason', cancel_reason,
			'proof', canonical_proof,
			'released_reservations', released
		)
	);

	return updated;
end;
$$;

create or replace function public.finance_cancel_supplier_refill(
	p_refill_request_id uuid,
	p_reason text,
	p_proof jsonb default '{}'::jsonb
)
returns public.refill_requests
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	target public.refill_requests%rowtype;
	updated public.refill_requests%rowtype;
	cancel_reason text;
	clean_proof_path text;
	canonical_proof jsonb;
begin
	employee_id := public.require_panel('finance', true);
	clean_proof_path := app_private.require_document_proof_path(
		p_proof,
		'finance_cancel_proof_document_required'
	);
	canonical_proof := coalesce(p_proof, '{}'::jsonb)
		|| jsonb_build_object('proof_path', clean_proof_path);
	perform app_private.allow_workflow_state_change();
	cancel_reason := nullif(btrim(coalesce(p_reason, '')), '');

	if cancel_reason is null or length(cancel_reason) < 3 then
		raise exception 'cancel_reason_required' using errcode = '23514';
	end if;

	select * into target
	from public.refill_requests
	where id = p_refill_request_id
	for update;

	if target.id is null then
		raise exception 'refill_request_not_found' using errcode = '02000';
	end if;

	if target.status not in ('finance_pending', 'finance_approved') then
		raise exception 'invalid_finance_cancel_refill_transition_%', target.status using errcode = '23514';
	end if;

	update public.refill_requests
	set
		status = 'canceled',
		proof = jsonb_set(
			coalesce(proof, '{}'::jsonb),
			'{finance_cancel}',
			jsonb_build_object(
				'employee_id', employee_id,
				'from_status', target.status,
				'to_status', 'canceled',
				'reason', cancel_reason,
				'proof', canonical_proof
			),
			true
		)
	where id = p_refill_request_id
	returning * into updated;

	perform public.log_activity(
		'refill_request',
		p_refill_request_id,
		'supplier_refill_canceled',
		jsonb_build_object(
			'employee_id', employee_id,
			'from_status', target.status,
			'to_status', 'canceled',
			'reason', cancel_reason,
			'proof', canonical_proof
		)
	);

	return updated;
end;
$$;
