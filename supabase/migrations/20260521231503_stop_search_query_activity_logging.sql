create or replace function public.record_search_query_executed(
	p_query text,
	p_result_count integer,
	p_table_count integer,
	p_context jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	query_text text := btrim(coalesce(p_query, ''));
begin
	if not public.can_access_ceo_search() then
		raise exception 'ceo_search_required' using errcode = '42501';
	end if;
	employee_id := public.current_employee_id();
	if employee_id is null then
		raise exception 'search_employee_session_required' using errcode = '42501';
	end if;
	if query_text = '' then
		raise exception 'search_query_required' using errcode = '23514';
	end if;

	-- Search usage is intentionally not a company activity. Keep this RPC
	-- as a no-op for stale clients, but do not write activity_events rows.
	perform p_result_count, p_table_count, p_context;
end;
$$;

grant execute on function public.record_search_query_executed(text, integer, integer, jsonb)
	to authenticated;

create or replace view public.ceo_search_activity_vtable
with (security_invoker = true)
as
select
	'activity'::text as entity_type,
	ae.id::text as entity_id,
	ae.action::text as title,
	ae.entity_type as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'entity_id', ae.entity_id,
		'details', ae.details,
		'created_at', ae.created_at
	)) as metadata,
	ae.created_at as sort_at,
	concat_ws(
		' ',
		'activity',
		ae.action::text,
		ae.entity_type,
		ae.entity_id::text,
		ae.details::text,
		public.ceo_search_date_terms(ae.created_at)
	) as search_text
from public.activity_events ae
where public.can_access_ceo_search()
  and ae.action <> 'search_query_executed';

revoke all privileges on table public.ceo_search_activity_vtable
	from anon, authenticated, public;
grant select on table public.ceo_search_activity_vtable to authenticated;

delete from public.ceo_search_documents
where entity_type = 'activity'
  and title = 'search_query_executed';

do $$
begin
	if to_regprocedure('app_private.refresh_ceo_search_documents()') is not null then
		perform app_private.refresh_ceo_search_documents();
	end if;
end $$;
