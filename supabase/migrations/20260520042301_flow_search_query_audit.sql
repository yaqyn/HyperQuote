alter type public.audit_event_type add value if not exists 'search_query_executed';

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

	perform public.log_activity(
		'ceo_search',
		null,
		'search_query_executed',
		jsonb_build_object(
			'employee_id', employee_id,
			'query', left(query_text, 160),
			'result_count', greatest(coalesce(p_result_count, 0), 0),
			'table_count', greatest(coalesce(p_table_count, 0), 0)
		) || coalesce(p_context, '{}'::jsonb)
	);
end;
$$;

grant execute on function public.record_search_query_executed(text, integer, integer, jsonb) to authenticated;
