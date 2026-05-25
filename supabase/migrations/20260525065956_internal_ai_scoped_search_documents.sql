create or replace function app_private.internal_ai_search_documents(
	p_agent_scope public.ai_agent_scope,
	p_entity_types text[] default '{}',
	p_search_tokens text[] default '{}',
	p_limit_per_entity integer default 8
)
returns table (
	entity_type text,
	entity_id text,
	title text,
	subtitle text,
	metadata jsonb,
	sort_at timestamptz,
	search_text text
)
language plpgsql
security definer
set search_path = public, app_private, extensions
as $$
declare
	requested_limit integer := least(greatest(coalesce(p_limit_per_entity, 8), 1), 50);
begin
	if p_agent_scope not in ('employee', 'search') then
		raise exception 'internal_ai_scope_required' using errcode = '42501';
	end if;

	if public.current_employee_id() is null then
		raise exception 'employee_required_for_internal_ai' using errcode = '42501';
	end if;

	if p_agent_scope = 'search' and not public.can_access_ceo_search() then
		raise exception 'ceo_search_required_for_internal_ai' using errcode = '42501';
	end if;

	return query
	with allowed_entities(entity_type) as (
		select unnest(
			case
				when p_agent_scope = 'search' then array[
					'order',
					'customer',
					'payment',
					'approval',
					'inventory',
					'pricing',
					'category',
					'warehouse',
					'dispatch',
					'driver',
					'driver_location',
					'support',
					'support_message',
					'supplier',
					'sales_history',
					'document',
					'employee',
					'activity'
				]
				else array[
					'order',
					'customer',
					'payment',
					'approval',
					'inventory',
					'pricing',
					'category',
					'warehouse',
					'dispatch',
					'driver',
					'driver_location',
					'support',
					'support_message',
					'supplier',
					'sales_history',
					'document'
				]
			end
		)
	),
	requested_entities(entity_type) as (
		select distinct lower(btrim(requested_entity))
		from unnest(coalesce(p_entity_types, '{}')) requested_entity
		where btrim(requested_entity) <> ''
	),
	effective_entities(entity_type) as (
		select allowed_entities.entity_type
		from allowed_entities
		where not exists (select 1 from requested_entities)
		   or allowed_entities.entity_type in (select requested_entities.entity_type from requested_entities)
	),
	search_terms(term) as (
		select distinct lower(btrim(search_token))
		from unnest(coalesce(p_search_tokens, '{}')) search_token
		where btrim(search_token) <> ''
	),
	scoped_rows as (
		select documents.*
		from effective_entities
		join lateral (
			select
				d.entity_type,
				d.entity_id,
				d.title,
				d.subtitle,
				d.metadata,
				d.sort_at,
				d.search_text
			from public.ceo_search_documents d
			where d.entity_type = effective_entities.entity_type
			  and not exists (
				select 1
				from search_terms
				where d.search_text not ilike ('%' || search_terms.term || '%')
			  )
			order by d.sort_at desc nulls last, d.title asc
			limit requested_limit
		) documents on true
	)
	select
		scoped_rows.entity_type,
		scoped_rows.entity_id,
		scoped_rows.title,
		scoped_rows.subtitle,
		scoped_rows.metadata,
		scoped_rows.sort_at,
		scoped_rows.search_text
	from scoped_rows
	order by scoped_rows.sort_at desc nulls last, scoped_rows.title asc;
end;
$$;

revoke all privileges on function app_private.internal_ai_search_documents(
	public.ai_agent_scope,
	text[],
	text[],
	integer
) from anon, authenticated, public;

create or replace function public.service_internal_ai_search_documents(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_agent_scope public.ai_agent_scope,
	p_entity_types text[] default '{}',
	p_search_tokens text[] default '{}',
	p_limit_per_entity integer default 8
)
returns table (
	entity_type text,
	entity_id text,
	title text,
	subtitle text,
	metadata jsonb,
	sort_at timestamptz,
	search_text text
)
language plpgsql
security definer
set search_path = public, app_private, extensions
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	if p_actor_pool <> 'internal' then
		raise exception 'internal_actor_required_for_internal_ai' using errcode = '42501';
	end if;

	return query
	select *
	from app_private.internal_ai_search_documents(
		p_agent_scope,
		coalesce(p_entity_types, '{}'),
		coalesce(p_search_tokens, '{}'),
		p_limit_per_entity
	);
end;
$$;

revoke all privileges on function public.service_internal_ai_search_documents(
	uuid,
	text,
	public.ai_agent_scope,
	text[],
	text[],
	integer
) from anon, authenticated, public;
grant execute on function public.service_internal_ai_search_documents(
	uuid,
	text,
	public.ai_agent_scope,
	text[],
	text[],
	integer
) to service_role;
