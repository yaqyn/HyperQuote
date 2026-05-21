create or replace function public.set_employee_presence(
	p_status text,
	p_active_panel text default null
)
returns public.employee_presence
language plpgsql
security definer
set search_path = public
as $$
declare
	v_employee_id uuid;
	next_status public.employee_presence_status;
	next_panel public.employee_panel;
	presence public.employee_presence%rowtype;
begin
	v_employee_id := public.current_employee_id();
	if v_employee_id is null then
		raise exception 'employee_required' using errcode = '42501';
	end if;

	begin
		next_status := p_status::public.employee_presence_status;
	exception
		when invalid_text_representation then
			raise exception 'invalid_employee_presence_status_%', p_status using errcode = '23514';
	end;

	if next_status = 'online' then
		if p_active_panel is null or btrim(p_active_panel) = '' then
			raise exception 'active_panel_required_for_online_presence' using errcode = '23514';
		end if;
		begin
			next_panel := p_active_panel::public.employee_panel;
		exception
			when invalid_text_representation then
				raise exception 'invalid_employee_presence_panel_%', p_active_panel using errcode = '23514';
		end;
		if not public.can_access_panel(next_panel::text, false) then
			raise exception 'insufficient_%_permission', next_panel using errcode = '42501';
		end if;
	else
		next_panel := null;
	end if;

	insert into public.employee_presence (
		employee_id,
		status,
		active_panel,
		last_seen_at,
		updated_at
	)
	values (
		v_employee_id,
		next_status,
		next_panel,
		now(),
		now()
	)
	on conflict (employee_id) do update
	set
		status = excluded.status,
		active_panel = excluded.active_panel,
		last_seen_at = excluded.last_seen_at,
		updated_at = excluded.updated_at
	returning * into presence;

	return presence;
end;
$$;

grant execute on function public.set_employee_presence(text, text) to authenticated;
