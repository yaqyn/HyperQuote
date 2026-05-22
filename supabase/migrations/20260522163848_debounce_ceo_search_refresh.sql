create table if not exists app_private.ceo_search_refresh_state (
	id boolean primary key default true check (id),
	dirty boolean not null default true,
	dirty_at timestamptz not null default now(),
	refreshed_at timestamptz,
	last_refreshed_count integer not null default 0
);

revoke all privileges on table app_private.ceo_search_refresh_state
	from anon, authenticated, public;

insert into app_private.ceo_search_refresh_state (id, dirty, dirty_at)
values (true, true, now())
on conflict (id) do nothing;

create or replace function app_private.mark_ceo_search_documents_dirty()
returns trigger
language plpgsql
security definer
set search_path = app_private, public
as $$
begin
	insert into app_private.ceo_search_refresh_state (id, dirty, dirty_at)
	values (true, true, now())
	on conflict (id) do update set
		dirty = true,
		dirty_at = excluded.dirty_at;

	return null;
end;
$$;

create or replace function app_private.refresh_ceo_search_documents_if_dirty(
	p_force boolean default false
)
returns integer
language plpgsql
security definer
set search_path = public, app_private, extensions
as $$
declare
	should_refresh boolean;
	refreshed_count integer := 0;
begin
	insert into app_private.ceo_search_refresh_state (id, dirty, dirty_at)
	values (true, true, now())
	on conflict (id) do nothing;

	select state.dirty or coalesce(p_force, false)
	into should_refresh
	from app_private.ceo_search_refresh_state state
	where state.id
	for update;

	if not should_refresh then
		return 0;
	end if;

	update app_private.ceo_search_refresh_state
	set dirty = false
	where id;

	refreshed_count := app_private.refresh_ceo_search_documents();

	update app_private.ceo_search_refresh_state
	set
		refreshed_at = now(),
		last_refreshed_count = refreshed_count
	where id;

	return refreshed_count;
end;
$$;

create or replace function public.service_refresh_ceo_search_documents_if_dirty(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_force boolean default false
)
returns integer
language plpgsql
security definer
set search_path = public, app_private, extensions
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	if not public.can_access_ceo_search() then
		raise exception 'ceo_search_required' using errcode = '42501';
	end if;

	return app_private.refresh_ceo_search_documents_if_dirty(coalesce(p_force, false));
end;
$$;

revoke all privileges on function app_private.mark_ceo_search_documents_dirty()
	from anon, authenticated, public;
revoke all privileges on function app_private.refresh_ceo_search_documents_if_dirty(boolean)
	from anon, authenticated, public;
revoke all privileges on function public.service_refresh_ceo_search_documents_if_dirty(uuid, text, boolean)
	from anon, authenticated, public;
grant execute on function public.service_refresh_ceo_search_documents_if_dirty(uuid, text, boolean)
	to service_role;

do $$
declare
	source_table text;
begin
	foreach source_table in array array[
		'activity_events',
		'customer_addresses',
		'customer_payments',
		'customers',
		'deliveries',
		'driver_online_states',
		'drivers',
		'employee_compensation',
		'employee_roles',
		'employees',
		'finance_payment_followups',
		'inventory_stock',
		'loading_task_drivers',
		'loading_tasks',
		'orders',
		'products',
		'projects',
		'quote_items',
		'quote_request_items',
		'quote_requests',
		'quotes',
		'receiving_task_items',
		'receiving_tasks',
		'refill_requests',
		'supplier_payments',
		'supplier_product_links',
		'supplier_specialties',
		'suppliers',
		'support_conversations',
		'support_tickets',
		'trucks',
		'user_profiles'
	] loop
		if to_regclass(format('public.%I', source_table)) is not null then
			execute format(
				'drop trigger if exists ceo_search_documents_dirty on public.%I',
				source_table
			);
			execute format(
				'create trigger ceo_search_documents_dirty after insert or update or delete or truncate on public.%I for each statement execute function app_private.mark_ceo_search_documents_dirty()',
				source_table
			);
		end if;
	end loop;
end
$$;

select app_private.refresh_ceo_search_documents_if_dirty(true);

do $$
declare
	existing_job_id bigint;
begin
	for existing_job_id in
		select jobid
		from cron.job
		where jobname = 'refresh-ceo-search-documents'
		order by jobid
	loop
		perform cron.unschedule(existing_job_id);
	end loop;
end
$$;

select cron.schedule(
	'refresh-ceo-search-documents',
	'30 seconds',
	$$select app_private.refresh_ceo_search_documents_if_dirty();$$
);
