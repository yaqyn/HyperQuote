alter type public.audit_event_type add value if not exists 'supplier_refill_canceled';

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
begin
	employee_id := public.require_panel('finance', true);
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
				'proof', coalesce(p_proof, '{}'::jsonb)
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
			'proof', coalesce(p_proof, '{}'::jsonb)
		)
	);

	return updated;
end;
$$;

revoke all on function public.finance_cancel_supplier_refill(uuid, text, jsonb)
	from public, anon;
grant execute on function public.finance_cancel_supplier_refill(uuid, text, jsonb)
	to authenticated;
