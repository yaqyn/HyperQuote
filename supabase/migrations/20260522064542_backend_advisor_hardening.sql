create index if not exists idx_employee_compensation_updated_by_employee_id_fk
	on public.employee_compensation (updated_by_employee_id);

alter table app_private.order_delivery_secrets enable row level security;

revoke all privileges on table app_private.order_delivery_secrets
	from anon, authenticated, public;

drop policy if exists order_delivery_secrets_no_direct_access
	on app_private.order_delivery_secrets;

create policy order_delivery_secrets_no_direct_access
	on app_private.order_delivery_secrets
	as restrictive
	for all
	to public
	using (false)
	with check (false);

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

	with source_rows as materialized (
		select distinct on (source_candidates.entity_type, source_candidates.entity_id)
			source_candidates.entity_type,
			source_candidates.entity_id,
			coalesce(source_candidates.title, source_candidates.entity_type) as title,
			source_candidates.subtitle,
			coalesce(source_candidates.metadata, '{}'::jsonb) as metadata,
			source_candidates.sort_at,
			coalesce(source_candidates.search_text, '') as search_text,
			to_tsvector(
				'simple'::regconfig,
				concat_ws(
					' ',
					source_candidates.entity_type,
					source_candidates.entity_id,
					source_candidates.title,
					source_candidates.subtitle,
					source_candidates.search_text,
					source_candidates.metadata::text
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
		) source_candidates
		where source_candidates.entity_type is not null
		  and source_candidates.entity_id is not null
		order by source_candidates.entity_type, source_candidates.entity_id, source_candidates.sort_at desc nulls last
	),
	upserted as (
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
		from source_rows
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
		   or public.ceo_search_documents.search_vector is distinct from excluded.search_vector
		returning 1
	),
	deleted as (
		delete from public.ceo_search_documents documents
		where not exists (
			select 1
			from source_rows
			where source_rows.entity_type = documents.entity_type
			  and source_rows.entity_id = documents.entity_id
		)
		returning 1
	)
	select counted.source_count into refreshed_count
	from (
		select count(*)::integer as source_count
		from source_rows
	) counted
	cross join (
		select count(*) as upsert_count
		from upserted
	) upsert_summary
	cross join (
		select count(*) as delete_count
		from deleted
	) delete_summary;

	return refreshed_count;
end;
$$;

revoke all privileges on function app_private.refresh_ceo_search_documents()
	from anon, authenticated, public;
