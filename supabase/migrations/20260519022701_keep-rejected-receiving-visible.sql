create or replace function public.warehouse_reject_receiving(p_receiving_task_id uuid, p_reason text, p_proof jsonb)
returns public.receiving_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
	updated public.receiving_tasks%rowtype;
begin
	perform public.require_panel('warehouse', true);
	perform public.require_rejection_proof(p_proof);
	perform app_private.allow_workflow_state_change();

	update public.receiving_tasks
	set status = 'rejected', rejection_reason = p_reason, proof = p_proof
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
		jsonb_build_object('reason', p_reason, 'proof', p_proof)
	);
	return updated;
end;
$$;
