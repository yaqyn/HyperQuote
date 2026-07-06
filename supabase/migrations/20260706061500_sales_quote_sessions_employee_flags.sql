create table if not exists public.employee_quote_sessions (
	id uuid primary key default gen_random_uuid(),
	quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
	employee_id uuid not null references public.employees(id) on delete cascade,
	client_session_id uuid not null unique,
	status text not null default 'open',
	opened_at timestamptz not null default now(),
	last_seen_at timestamptz not null default now(),
	closed_at timestamptz,
	close_reason text,
	threshold_seconds integer not null default 1800,
	flagged_at timestamptz,
	flag_reason text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint employee_quote_sessions_status_check
		check (status in ('open', 'closed')),
	constraint employee_quote_sessions_close_check
		check (
			(status = 'open' and closed_at is null)
			or (status = 'closed' and closed_at is not null)
		),
	constraint employee_quote_sessions_threshold_check
		check (threshold_seconds between 300 and 28800)
);

create index if not exists employee_quote_sessions_employee_open_idx
	on public.employee_quote_sessions (employee_id, last_seen_at desc)
	where status = 'open';

create index if not exists employee_quote_sessions_quote_idx
	on public.employee_quote_sessions (quote_request_id, opened_at desc);

create index if not exists employee_quote_sessions_flagged_idx
	on public.employee_quote_sessions (flagged_at desc)
	where flagged_at is not null;

drop trigger if exists employee_quote_sessions_set_updated_at
	on public.employee_quote_sessions;
create trigger employee_quote_sessions_set_updated_at
	before update on public.employee_quote_sessions
	for each row execute function public.set_updated_at();

create table if not exists public.employee_management_flags (
	id uuid primary key default gen_random_uuid(),
	employee_id uuid not null references public.employees(id) on delete cascade,
	source_panel text not null,
	source_entity_type text not null,
	source_entity_id uuid not null,
	source_session_id uuid references public.employee_quote_sessions(id) on delete set null,
	flag_type text not null,
	severity text not null default 'warning',
	title text not null,
	description text,
	details jsonb not null default '{}'::jsonb,
	status text not null default 'open',
	first_seen_at timestamptz not null default now(),
	last_seen_at timestamptz not null default now(),
	resolved_at timestamptz,
	resolution_note text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint employee_management_flags_panel_check
		check (source_panel in (
			'sales',
			'inventory',
			'warehouse',
			'finance',
			'dispatch',
			'customer_service',
			'admin',
			'search',
			'hr'
		)),
	constraint employee_management_flags_severity_check
		check (severity in ('info', 'warning', 'critical')),
	constraint employee_management_flags_status_check
		check (status in ('open', 'acknowledged', 'resolved', 'dismissed')),
	constraint employee_management_flags_resolved_check
		check (
			(status not in ('resolved', 'dismissed') and resolved_at is null)
			or (status in ('resolved', 'dismissed') and resolved_at is not null)
		)
);

create unique index if not exists employee_management_flags_open_session_idx
	on public.employee_management_flags (employee_id, flag_type, source_session_id)
	where status = 'open' and source_session_id is not null;

create index if not exists employee_management_flags_employee_open_idx
	on public.employee_management_flags (employee_id, last_seen_at desc)
	where status = 'open';

create index if not exists employee_management_flags_panel_idx
	on public.employee_management_flags (source_panel, status, last_seen_at desc);

drop trigger if exists employee_management_flags_set_updated_at
	on public.employee_management_flags;
create trigger employee_management_flags_set_updated_at
	before update on public.employee_management_flags
	for each row execute function public.set_updated_at();

alter table public.employee_quote_sessions enable row level security;
alter table public.employee_management_flags enable row level security;

revoke all on public.employee_quote_sessions from anon, authenticated;
revoke all on public.employee_management_flags from anon, authenticated;
grant all on public.employee_quote_sessions to service_role;
grant all on public.employee_management_flags to service_role;

create or replace function public.sales_start_quote_session(
	p_order_id uuid,
	p_client_session_id uuid,
	p_threshold_seconds integer default 1800
)
returns public.employee_quote_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
	v_employee_id uuid;
	v_order public.quote_requests%rowtype;
	v_threshold_seconds integer;
	v_session public.employee_quote_sessions%rowtype;
begin
	v_employee_id := public.require_panel('sales', true);
	v_threshold_seconds := greatest(300, least(coalesce(p_threshold_seconds, 1800), 28800));

	select * into v_order
	from public.quote_requests
	where id = p_order_id
	for update;

	if v_order.id is null then
		raise exception 'quote_request_not_found' using errcode = '02000';
	end if;

	if v_order.assigned_employee_id is not null
		and v_order.assigned_employee_id <> v_employee_id
		and not public.is_employee_with_role('ceo')
	then
		raise exception 'quote_request_assigned_to_another_employee' using errcode = '42501';
	end if;

	if v_order.status not in ('assigned', 'submitted', 'saved') then
		raise exception 'invalid_quote_session_status_%', v_order.status using errcode = '23514';
	end if;

	update public.employee_quote_sessions
	set
		status = 'closed',
		closed_at = now(),
		close_reason = 'superseded'
	where employee_id = v_employee_id
	  and status = 'open'
	  and client_session_id <> p_client_session_id;

	insert into public.employee_quote_sessions (
		quote_request_id,
		employee_id,
		client_session_id,
		status,
		opened_at,
		last_seen_at,
		threshold_seconds
	)
	values (
		p_order_id,
		v_employee_id,
		p_client_session_id,
		'open',
		now(),
		now(),
		v_threshold_seconds
	)
	on conflict (client_session_id) do update
	set
		status = 'open',
		last_seen_at = now(),
		closed_at = null,
		close_reason = null,
		threshold_seconds = excluded.threshold_seconds
	returning * into v_session;

	return v_session;
end;
$$;

create or replace function public.sales_heartbeat_quote_session(
	p_session_id uuid,
	p_client_session_id uuid,
	p_threshold_seconds integer default 1800
)
returns public.employee_quote_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
	v_employee_id uuid;
	v_threshold_seconds integer;
	v_elapsed_seconds integer;
	v_session public.employee_quote_sessions%rowtype;
begin
	v_employee_id := public.require_panel('sales', true);
	v_threshold_seconds := greatest(300, least(coalesce(p_threshold_seconds, 1800), 28800));

	select * into v_session
	from public.employee_quote_sessions
	where id = p_session_id
	  and client_session_id = p_client_session_id
	  and employee_id = v_employee_id
	for update;

	if v_session.id is null then
		raise exception 'quote_session_not_found' using errcode = '02000';
	end if;

	if v_session.status <> 'open' then
		return v_session;
	end if;

	v_elapsed_seconds := greatest(0, floor(extract(epoch from (now() - v_session.opened_at)))::integer);

	update public.employee_quote_sessions
	set
		last_seen_at = now(),
		threshold_seconds = v_threshold_seconds,
		flagged_at = case
			when v_elapsed_seconds >= v_threshold_seconds and flagged_at is null
				then now()
			else flagged_at
		end,
		flag_reason = case
			when v_elapsed_seconds >= v_threshold_seconds and flag_reason is null
				then 'quote_open_too_long'
			else flag_reason
		end
	where id = v_session.id
	returning * into v_session;

	if v_session.flagged_at is not null then
		insert into public.employee_management_flags (
			employee_id,
			source_panel,
			source_entity_type,
			source_entity_id,
			source_session_id,
			flag_type,
			severity,
			title,
			description,
			details,
			first_seen_at,
			last_seen_at
		)
		values (
			v_employee_id,
			'sales',
			'quote_request',
			v_session.quote_request_id,
			v_session.id,
			'quote_open_too_long',
			case when v_elapsed_seconds >= v_threshold_seconds * 2 then 'critical' else 'warning' end,
			'Sales quote left open',
			'Quote builder stayed open beyond the allowed review window.',
			jsonb_build_object(
				'quote_request_id', v_session.quote_request_id,
				'session_id', v_session.id,
				'opened_at', v_session.opened_at,
				'last_seen_at', v_session.last_seen_at,
				'elapsed_seconds', v_elapsed_seconds,
				'threshold_seconds', v_threshold_seconds
			),
			coalesce(v_session.flagged_at, now()),
			now()
		)
		on conflict (employee_id, flag_type, source_session_id)
			where status = 'open' and source_session_id is not null
		do update
		set
			last_seen_at = excluded.last_seen_at,
			severity = excluded.severity,
			details = excluded.details;
	end if;

	return v_session;
end;
$$;

create or replace function public.sales_close_quote_session(
	p_session_id uuid,
	p_client_session_id uuid,
	p_close_reason text default 'closed'
)
returns public.employee_quote_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
	v_employee_id uuid;
	v_elapsed_seconds integer;
	v_session public.employee_quote_sessions%rowtype;
begin
	v_employee_id := public.require_panel('sales', true);

	select * into v_session
	from public.employee_quote_sessions
	where id = p_session_id
	  and client_session_id = p_client_session_id
	  and employee_id = v_employee_id
	for update;

	if v_session.id is null then
		raise exception 'quote_session_not_found' using errcode = '02000';
	end if;

	if v_session.status <> 'open' then
		return v_session;
	end if;

	v_elapsed_seconds := greatest(0, floor(extract(epoch from (now() - v_session.opened_at)))::integer);

	if v_elapsed_seconds >= v_session.threshold_seconds then
		update public.employee_quote_sessions
		set
			flagged_at = coalesce(flagged_at, now()),
			flag_reason = coalesce(flag_reason, 'quote_open_too_long')
		where id = v_session.id
		returning * into v_session;

		insert into public.employee_management_flags (
			employee_id,
			source_panel,
			source_entity_type,
			source_entity_id,
			source_session_id,
			flag_type,
			severity,
			title,
			description,
			details,
			first_seen_at,
			last_seen_at
		)
		values (
			v_employee_id,
			'sales',
			'quote_request',
			v_session.quote_request_id,
			v_session.id,
			'quote_open_too_long',
			case when v_elapsed_seconds >= v_session.threshold_seconds * 2 then 'critical' else 'warning' end,
			'Sales quote left open',
			'Quote builder stayed open beyond the allowed review window.',
			jsonb_build_object(
				'quote_request_id', v_session.quote_request_id,
				'session_id', v_session.id,
				'opened_at', v_session.opened_at,
				'last_seen_at', now(),
				'elapsed_seconds', v_elapsed_seconds,
				'threshold_seconds', v_session.threshold_seconds,
				'closed_by', 'sales_close_quote_session'
			),
			coalesce(v_session.flagged_at, now()),
			now()
		)
		on conflict (employee_id, flag_type, source_session_id)
			where status = 'open' and source_session_id is not null
		do update
		set
			last_seen_at = excluded.last_seen_at,
			severity = excluded.severity,
			details = excluded.details;
	end if;

	update public.employee_quote_sessions
	set
		status = 'closed',
		last_seen_at = now(),
		closed_at = now(),
		close_reason = left(coalesce(nullif(btrim(p_close_reason), ''), 'closed'), 80)
	where id = v_session.id
	returning * into v_session;

	return v_session;
end;
$$;

create or replace function public.service_sales_start_quote_session(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_order_id uuid,
	p_client_session_id uuid,
	p_threshold_seconds integer default 1800
)
returns public.employee_quote_sessions
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.sales_start_quote_session(p_order_id, p_client_session_id, p_threshold_seconds);
end;
$$;

create or replace function public.service_sales_heartbeat_quote_session(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_session_id uuid,
	p_client_session_id uuid,
	p_threshold_seconds integer default 1800
)
returns public.employee_quote_sessions
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.sales_heartbeat_quote_session(p_session_id, p_client_session_id, p_threshold_seconds);
end;
$$;

create or replace function public.service_sales_close_quote_session(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_session_id uuid,
	p_client_session_id uuid,
	p_close_reason text default 'closed'
)
returns public.employee_quote_sessions
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.sales_close_quote_session(p_session_id, p_client_session_id, p_close_reason);
end;
$$;

revoke all on function public.sales_start_quote_session(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.sales_heartbeat_quote_session(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.sales_close_quote_session(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.service_sales_start_quote_session(uuid, text, uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.service_sales_heartbeat_quote_session(uuid, text, uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.service_sales_close_quote_session(uuid, text, uuid, uuid, text) from public, anon, authenticated;

grant execute on function public.service_sales_start_quote_session(uuid, text, uuid, uuid, integer) to service_role;
grant execute on function public.service_sales_heartbeat_quote_session(uuid, text, uuid, uuid, integer) to service_role;
grant execute on function public.service_sales_close_quote_session(uuid, text, uuid, uuid, text) to service_role;
