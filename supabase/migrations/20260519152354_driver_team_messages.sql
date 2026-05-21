alter type public.audit_event_type add value if not exists 'driver_team_message_sent';

create table if not exists public.driver_team_messages (
	id uuid primary key default gen_random_uuid(),
	author_driver_id uuid not null references public.drivers(id) on delete cascade,
	body text not null check (length(trim(body)) between 1 and 1000),
	created_at timestamptz not null default now()
);

create index if not exists driver_team_messages_created_at_idx
	on public.driver_team_messages (created_at desc);

create index if not exists driver_team_messages_author_driver_id_idx
	on public.driver_team_messages (author_driver_id, created_at desc);

alter table public.driver_team_messages enable row level security;

create policy driver_team_messages_read
	on public.driver_team_messages for select
	to authenticated
	using (
		public.current_driver_id() is not null
		or public.can_access_panel('dispatch')
		or public.is_employee_with_role('ceo')
	);

create policy driver_team_messages_insert_own
	on public.driver_team_messages for insert
	to authenticated
	with check (author_driver_id = public.current_driver_id());

grant select, insert on public.driver_team_messages to authenticated;

create or replace function app_private.driver_team_message_payload(message public.driver_team_messages)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
	select jsonb_build_object(
		'id', message.id,
		'authorDriverId', message.author_driver_id,
		'authorName', app_private.driver_localized_text(coalesce(d.full_name, '')),
		'body', app_private.driver_localized_text(message.body),
		'createdAt', message.created_at
	)
	from public.drivers d
	where d.id = message.author_driver_id
$$;

create or replace function app_private.driver_profile_payload(driver public.drivers)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
	select jsonb_build_object(
		'id', driver.id,
		'email', driver.email,
		'name', app_private.driver_localized_text(driver.full_name),
		'phone', driver.phone,
		'status', driver.status::text,
		'onlineStatus', coalesce(
			(
				select state.status::text
				from public.driver_online_states state
				where state.driver_id = driver.id
			),
			'offline'
		),
		'vehicle', app_private.driver_localized_text(coalesce(driver.vehicle_label, '')),
		'location', (
			select jsonb_build_object(
				'accuracyMeters', location.accuracy_meters,
				'heading', location.heading,
				'latitude', location.latitude,
				'longitude', location.longitude,
				'recordedAt', location.recorded_at,
				'source', location.source::text,
				'speedKmh', location.speed_kmh
			)
			from public.driver_locations location
			where location.driver_id = driver.id
			order by location.recorded_at desc
			limit 1
		)
	)
$$;

create or replace function public.driver_list_team_messages(p_limit integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
	v_driver_id uuid;
	v_limit integer;
	messages jsonb;
begin
	v_driver_id := public.current_driver_id();
	if v_driver_id is null then
		raise exception 'driver_required' using errcode = '42501';
	end if;

	v_limit := least(greatest(coalesce(p_limit, 50), 1), 100);

	select coalesce(
		jsonb_agg(app_private.driver_team_message_payload(recent) order by recent.created_at asc),
		'[]'::jsonb
	)
	into messages
	from (
		select *
		from public.driver_team_messages
		order by created_at desc
		limit v_limit
	) recent;

	return messages;
end;
$$;

create or replace function public.driver_list_active_drivers()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
	v_driver_id uuid;
	drivers jsonb;
begin
	v_driver_id := public.current_driver_id();
	if v_driver_id is null then
		raise exception 'driver_required' using errcode = '42501';
	end if;

	select coalesce(
		jsonb_agg(app_private.driver_profile_payload(d) order by d.full_name),
		'[]'::jsonb
	)
	into drivers
	from public.drivers d
	where d.status not in ('invited', 'disabled');

	return drivers;
end;
$$;

create or replace function public.driver_send_team_message(p_body text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_driver_id uuid;
	message public.driver_team_messages%rowtype;
	trimmed_body text;
begin
	v_driver_id := public.current_driver_id();
	if v_driver_id is null then
		raise exception 'driver_required' using errcode = '42501';
	end if;

	trimmed_body := trim(coalesce(p_body, ''));
	if length(trimmed_body) < 1 or length(trimmed_body) > 1000 then
		raise exception 'valid_driver_message_required' using errcode = '23514';
	end if;

	insert into public.driver_team_messages (author_driver_id, body)
	values (v_driver_id, trimmed_body)
	returning * into message;

	perform public.log_activity(
		'driver',
		v_driver_id,
		'driver_team_message_sent',
		jsonb_build_object('message_id', message.id)
	);

	return app_private.driver_team_message_payload(message);
end;
$$;

revoke all on function public.driver_list_team_messages(integer) from public;
revoke all on function public.driver_list_active_drivers() from public;
revoke all on function public.driver_send_team_message(text) from public;
grant execute on function public.driver_list_team_messages(integer) to authenticated;
grant execute on function public.driver_list_active_drivers() to authenticated;
grant execute on function public.driver_send_team_message(text) to authenticated;
