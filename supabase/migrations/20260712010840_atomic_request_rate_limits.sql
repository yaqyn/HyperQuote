create table app_private.request_rate_limits (
	rate_key_hash text primary key
		check (rate_key_hash ~ '^[0-9a-f]{64}$'),
	window_started_at timestamptz not null,
	attempts integer not null
		check (attempts >= 0),
	locked_until timestamptz,
	updated_at timestamptz not null
);

create index request_rate_limits_updated_at_idx
	on app_private.request_rate_limits (updated_at);

alter table app_private.request_rate_limits enable row level security;

revoke all privileges on table app_private.request_rate_limits
	from public, anon, authenticated;
grant usage on schema app_private to service_role;
grant select, insert, update, delete
	on table app_private.request_rate_limits
	to service_role;

create or replace function public.service_consume_request_rate_limit(
	p_key text,
	p_limit integer,
	p_window_seconds integer,
	p_lockout_seconds integer default 0
)
returns table (
	allowed boolean,
	remaining integer,
	retry_after integer
)
language plpgsql
security invoker
set search_path = public, app_private, extensions
as $$
declare
	normalized_key text;
	rate_key text;
	v_now timestamptz := clock_timestamp();
	current_row app_private.request_rate_limits%rowtype;
	current_attempts integer;
	retry_at timestamptz;
begin
	normalized_key := trim(coalesce(p_key, ''));
	if normalized_key = '' or char_length(normalized_key) > 512 then
		raise exception 'invalid_rate_limit_key' using errcode = '22023';
	end if;
	if p_limit < 1 or p_limit > 10000 then
		raise exception 'invalid_rate_limit_limit' using errcode = '22023';
	end if;
	if p_window_seconds < 1 or p_window_seconds > 86400 then
		raise exception 'invalid_rate_limit_window' using errcode = '22023';
	end if;
	if p_lockout_seconds < 0 or p_lockout_seconds > 86400 then
		raise exception 'invalid_rate_limit_lockout' using errcode = '22023';
	end if;

	rate_key := encode(extensions.digest(normalized_key, 'sha256'), 'hex');

	insert into app_private.request_rate_limits (
		rate_key_hash,
		window_started_at,
		attempts,
		locked_until,
		updated_at
	)
	values (rate_key, v_now, 0, null, v_now)
	on conflict (rate_key_hash) do nothing;

	select *
	into current_row
	from app_private.request_rate_limits
	where rate_key_hash = rate_key
	for update;

	if current_row.locked_until > v_now then
		return query
		select
			false,
			0,
			greatest(
				1,
				ceil(extract(epoch from current_row.locked_until - v_now))::integer
			);
		return;
	end if;

	if
		current_row.window_started_at
			<= v_now - make_interval(secs => p_window_seconds)
		or current_row.locked_until is not null
	then
		current_row.window_started_at := v_now;
		current_row.attempts := 0;
		current_row.locked_until := null;
	end if;

	current_attempts := least(current_row.attempts + 1, p_limit + 1);

	if current_attempts > p_limit then
		retry_at := current_row.window_started_at
			+ make_interval(secs => p_window_seconds);
		if p_lockout_seconds > 0 then
			retry_at := v_now + make_interval(secs => p_lockout_seconds);
			current_row.locked_until := retry_at;
		end if;

		update app_private.request_rate_limits
		set
			attempts = current_attempts,
			locked_until = current_row.locked_until,
			updated_at = v_now
		where rate_key_hash = rate_key;

		return query
		select
			false,
			0,
			greatest(
				1,
				ceil(extract(epoch from retry_at - v_now))::integer
			);
		return;
	end if;

	update app_private.request_rate_limits
	set
		window_started_at = current_row.window_started_at,
		attempts = current_attempts,
		locked_until = null,
		updated_at = v_now
	where rate_key_hash = rate_key;

	return query
	select true, p_limit - current_attempts, null::integer;
end;
$$;

create or replace function public.service_clear_request_rate_limit(p_key text)
returns void
language plpgsql
security invoker
set search_path = public, app_private, extensions
as $$
declare
	normalized_key text;
begin
	normalized_key := trim(coalesce(p_key, ''));
	if normalized_key = '' or char_length(normalized_key) > 512 then
		raise exception 'invalid_rate_limit_key' using errcode = '22023';
	end if;

	delete from app_private.request_rate_limits
	where rate_key_hash = encode(
		extensions.digest(normalized_key, 'sha256'),
		'hex'
	);
end;
$$;

revoke all on function public.service_consume_request_rate_limit(
	text,
	integer,
	integer,
	integer
) from public, anon, authenticated;
revoke all on function public.service_clear_request_rate_limit(text)
	from public, anon, authenticated;

grant execute on function public.service_consume_request_rate_limit(
	text,
	integer,
	integer,
	integer
) to service_role;
grant execute on function public.service_clear_request_rate_limit(text)
	to service_role;

select cron.schedule(
	'cleanup-request-rate-limits',
	'17 * * * *',
	$$
		delete from app_private.request_rate_limits
		where updated_at < now() - interval '1 day';
	$$
);
