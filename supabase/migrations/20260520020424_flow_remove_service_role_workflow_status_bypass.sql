create or replace function public.prevent_direct_state_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	state_column text := tg_argv[0];
begin
	if tg_op = 'UPDATE'
		and to_jsonb(old)->>state_column is distinct from to_jsonb(new)->>state_column
		and not app_private.workflow_state_change_is_authorized()
	then
		raise exception 'state_updates_must_use_rpc' using errcode = '42501';
	end if;

	return new;
end;
$$;
