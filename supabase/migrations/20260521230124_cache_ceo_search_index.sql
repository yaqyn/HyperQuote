create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_trgm with schema extensions;

drop view if exists public.ceo_search_index;

create table if not exists public.ceo_search_documents (
	entity_type text not null,
	entity_id text not null,
	title text not null,
	subtitle text,
	metadata jsonb not null default '{}'::jsonb,
	sort_at timestamptz,
	search_text text not null default '',
	search_vector tsvector not null default ''::tsvector,
	refreshed_at timestamptz not null default now(),
	primary key (entity_type, entity_id)
);

alter table public.ceo_search_documents enable row level security;

drop policy if exists ceo_search_documents_select
	on public.ceo_search_documents;

create policy ceo_search_documents_select
	on public.ceo_search_documents for select
	using (public.can_access_ceo_search());

revoke all privileges on table public.ceo_search_documents
	from anon, authenticated, public;
grant select on table public.ceo_search_documents to authenticated;

create index if not exists ceo_search_documents_entity_sort_idx
	on public.ceo_search_documents (entity_type, sort_at desc nulls last, title asc);

create index if not exists ceo_search_documents_sort_idx
	on public.ceo_search_documents (sort_at desc nulls last, title asc);

create index if not exists ceo_search_documents_search_text_trgm_idx
	on public.ceo_search_documents using gin (search_text gin_trgm_ops);

create index if not exists ceo_search_documents_search_vector_idx
	on public.ceo_search_documents using gin (search_vector);

create index if not exists ceo_search_documents_metadata_idx
	on public.ceo_search_documents using gin (metadata jsonb_path_ops);

create or replace function app_private.refresh_ceo_search_documents()
returns integer
language plpgsql
security definer
set search_path = public, app_private, extensions
as $$
declare
	search_user_id uuid;
	refreshed_count integer := 0;
begin
	select e.user_id into search_user_id
	from public.employees e
	where e.user_id is not null
	  and e.status = 'active'
	  and (
		e.is_ceo
		or exists (
			select 1
			from public.employee_roles er
			where er.employee_id = e.id
			  and er.role = 'ceo'
		)
		or exists (
			select 1
			from public.employee_panel_permissions ep
			where ep.employee_id = e.id
			  and ep.panel = 'search'
			  and ep.can_read
		)
	  )
	order by e.is_ceo desc, e.created_at asc
	limit 1;

	if search_user_id is null then
		select count(*)::integer into refreshed_count
		from public.ceo_search_documents;
		return refreshed_count;
	end if;

	perform set_config('request.jwt.claim.sub', search_user_id::text, true);
	perform set_config(
		'request.jwt.claims',
		jsonb_build_object('sub', search_user_id::text, 'role', 'authenticated')::text,
		true
	);

	if to_regclass('pg_temp.ceo_search_refresh_source') is not null then
		drop table pg_temp.ceo_search_refresh_source;
	end if;

	create temporary table ceo_search_refresh_source on commit drop as
	select distinct on (source_rows.entity_type, source_rows.entity_id)
		source_rows.entity_type,
		source_rows.entity_id,
		coalesce(source_rows.title, source_rows.entity_type) as title,
		source_rows.subtitle,
		coalesce(source_rows.metadata, '{}'::jsonb) as metadata,
		source_rows.sort_at,
		coalesce(source_rows.search_text, '') as search_text,
		to_tsvector(
			'simple'::regconfig,
			concat_ws(
				' ',
				source_rows.entity_type,
				source_rows.entity_id,
				source_rows.title,
				source_rows.subtitle,
				source_rows.search_text,
				source_rows.metadata::text
			)
		) as search_vector
	from (
		select * from public.ceo_search_order_vtable
		union all
		select * from public.ceo_search_quote_request_vtable
		union all
		select * from public.ceo_search_customer_vtable
		union all
		select * from public.ceo_search_payment_vtable
		union all
		select * from public.ceo_search_inventory_vtable
		union all
		select * from public.ceo_search_warehouse_vtable
		union all
		select * from public.ceo_search_receiving_vtable
		union all
		select * from public.ceo_search_dispatch_vtable
		union all
		select * from public.ceo_search_driver_vtable
		union all
		select * from public.ceo_search_support_vtable
		union all
		select * from public.ceo_search_supplier_vtable
		union all
		select * from public.ceo_search_employee_vtable
		union all
		select * from public.ceo_search_activity_vtable
	) source_rows
	where source_rows.entity_type is not null
	  and source_rows.entity_id is not null
	order by source_rows.entity_type, source_rows.entity_id, source_rows.sort_at desc nulls last;

	insert into public.ceo_search_documents (
		entity_type,
		entity_id,
		title,
		subtitle,
		metadata,
		sort_at,
		search_text,
		search_vector,
		refreshed_at
	)
	select
		entity_type,
		entity_id,
		title,
		subtitle,
		metadata,
		sort_at,
		search_text,
		search_vector,
		now()
	from pg_temp.ceo_search_refresh_source
	on conflict (entity_type, entity_id) do update set
		title = excluded.title,
		subtitle = excluded.subtitle,
		metadata = excluded.metadata,
		sort_at = excluded.sort_at,
		search_text = excluded.search_text,
		search_vector = excluded.search_vector,
		refreshed_at = excluded.refreshed_at
	where public.ceo_search_documents.title is distinct from excluded.title
	   or public.ceo_search_documents.subtitle is distinct from excluded.subtitle
	   or public.ceo_search_documents.metadata is distinct from excluded.metadata
	   or public.ceo_search_documents.sort_at is distinct from excluded.sort_at
	   or public.ceo_search_documents.search_text is distinct from excluded.search_text
	   or public.ceo_search_documents.search_vector is distinct from excluded.search_vector;

	delete from public.ceo_search_documents documents
	where not exists (
		select 1
		from pg_temp.ceo_search_refresh_source source_rows
		where source_rows.entity_type = documents.entity_type
		  and source_rows.entity_id = documents.entity_id
	);

	select count(*)::integer into refreshed_count
	from pg_temp.ceo_search_refresh_source;

	return refreshed_count;
end;
$$;

revoke all privileges on function app_private.refresh_ceo_search_documents()
	from anon, authenticated, public;

select app_private.refresh_ceo_search_documents();

create or replace view public.ceo_search_index
with (security_invoker = true)
as
select
	entity_type,
	entity_id,
	title,
	subtitle,
	metadata,
	sort_at,
	search_text
from public.ceo_search_documents
where public.can_access_ceo_search();

revoke all privileges on table public.ceo_search_index
	from anon, authenticated, public;
grant select on table public.ceo_search_index to authenticated;

select cron.schedule(
	'refresh-ceo-search-documents',
	'15 seconds',
	$$select app_private.refresh_ceo_search_documents();$$
);
