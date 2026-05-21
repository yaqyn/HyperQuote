do $$
begin
	create type public.employee_presence_status as enum ('online', 'away', 'offline');
exception
	when duplicate_object then null;
end $$;

create table if not exists public.employee_presence (
	employee_id uuid primary key references public.employees(id) on delete cascade,
	status public.employee_presence_status not null default 'offline',
	active_panel public.employee_panel,
	last_seen_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint employee_presence_panel_when_online check (
		(status = 'online' and active_panel is not null)
		or (status <> 'online' and active_panel is null)
	)
);

create index if not exists employee_presence_online_panel_idx
	on public.employee_presence (active_panel, status, last_seen_at desc)
	where status = 'online';

alter table public.employee_presence enable row level security;

drop policy if exists employee_presence_internal_select on public.employee_presence;
create policy employee_presence_internal_select
	on public.employee_presence for select
	to authenticated
	using (public.current_employee_id() is not null);

grant select on public.employee_presence to authenticated;
grant all on public.employee_presence to service_role;
revoke insert, update, delete on public.employee_presence from anon, authenticated;

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

create or replace function public.current_employee_is_online(
	required_panel text default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.employee_presence ep
		where ep.employee_id = public.current_employee_id()
		  and ep.status = 'online'
		  and ep.last_seen_at >= now() - interval '2 minutes'
		  and (
			required_panel is null
			or ep.active_panel::text = required_panel
		  )
	)
$$;

create or replace function public.claim_next_sales_order()
returns public.quote_requests
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	target_id uuid;
	claimed public.quote_requests%rowtype;
	source_queue_position integer;
	event_details jsonb;
begin
	employee_id := public.require_panel('sales', true);
	if not public.current_employee_is_online('sales') then
		return null;
	end if;

	perform app_private.allow_workflow_state_change();

	select qr.id, queued.source_queue_position
	into target_id, source_queue_position
	from public.quote_requests qr
	join (
		select
			id,
			row_number() over (
				order by greatest(created_at, coalesce(submitted_at, created_at), eligible_at), id
			)::integer as source_queue_position
		from public.quote_requests
		where status = 'submitted'
		  and eligible_at <= now()
	) queued on queued.id = qr.id
	where qr.status = 'submitted'
	  and qr.eligible_at <= now()
	order by queued.source_queue_position
	for update of qr skip locked
	limit 1;

	if target_id is null then
		return null;
	end if;

	update public.quote_requests
	set
		status = 'assigned',
		assigned_employee_id = employee_id,
		assigned_at = now()
	where id = target_id
	returning * into claimed;

	event_details := jsonb_build_object(
		'employee_id', employee_id,
		'order_id', claimed.id,
		'assigned_at', claimed.assigned_at,
		'from_status', 'submitted',
		'to_status', 'assigned',
		'source_queue_position', source_queue_position
	);

	perform public.log_activity(
		'quote_request',
		claimed.id,
		'sales_order_claimed',
		event_details
	);

	perform public.log_activity(
		'quote_request',
		claimed.id,
		'sales_order_opened',
		event_details
	);

	return claimed;
end;
$$;

create or replace function public.sales_claim_order(p_order_id uuid)
returns public.quote_requests
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	target public.quote_requests%rowtype;
	source_queue_position integer;
	target_queue_entered_at timestamptz;
	event_details jsonb;
begin
	employee_id := public.require_panel('sales', true);
	if not public.current_employee_is_online('sales') then
		raise exception 'sales_employee_not_online' using errcode = '42501';
	end if;

	perform app_private.allow_workflow_state_change();

	select * into target
	from public.quote_requests
	where id = p_order_id
	for update;

	if target.id is null then
		raise exception 'quote_request_not_found' using errcode = '02000';
	end if;

	if target.status = 'assigned' and target.assigned_employee_id = employee_id then
		perform public.log_activity(
			'quote_request',
			target.id,
			'sales_order_opened',
			jsonb_build_object(
				'employee_id', employee_id,
				'order_id', target.id,
				'assigned_at', target.assigned_at,
				'from_status', 'assigned',
				'to_status', 'assigned',
				'source_queue_position', null
			)
		);
		return target;
	end if;

	if target.status <> 'submitted' or target.eligible_at > now() then
		raise exception 'invalid_sales_claim_transition_%', target.status using errcode = '23514';
	end if;

	target_queue_entered_at := greatest(
		target.created_at,
		coalesce(target.submitted_at, target.created_at),
		target.eligible_at
	);

	select count(*)::integer + 1
	into source_queue_position
	from public.quote_requests queued
	where queued.status = 'submitted'
	  and queued.eligible_at <= now()
	  and (
		greatest(
			queued.created_at,
			coalesce(queued.submitted_at, queued.created_at),
			queued.eligible_at
		) < target_queue_entered_at
		or (
			greatest(
				queued.created_at,
				coalesce(queued.submitted_at, queued.created_at),
				queued.eligible_at
			) = target_queue_entered_at
			and queued.id < target.id
		)
	  );

	update public.quote_requests
	set
		status = 'assigned',
		assigned_employee_id = employee_id,
		assigned_at = now()
	where id = target.id
	returning * into target;

	event_details := jsonb_build_object(
		'employee_id', employee_id,
		'order_id', target.id,
		'assigned_at', target.assigned_at,
		'from_status', 'submitted',
		'to_status', 'assigned',
		'source_queue_position', source_queue_position
	);

	perform public.log_activity(
		'quote_request',
		target.id,
		'sales_order_claimed',
		event_details
	);

	perform public.log_activity(
		'quote_request',
		target.id,
		'sales_order_opened',
		event_details
	);

	return target;
end;
$$;

grant execute on function public.set_employee_presence(text, text) to authenticated;
grant execute on function public.current_employee_is_online(text) to authenticated;
grant execute on function public.claim_next_sales_order() to authenticated;
grant execute on function public.sales_claim_order(uuid) to authenticated;
