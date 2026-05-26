do $$
begin
	if to_regclass('public.ceo_search_finance_vtable_without_open_work_filter') is null then
		alter view public.ceo_search_finance_vtable
			rename to ceo_search_finance_vtable_without_open_work_filter;
	end if;
end $$;

create or replace view public.ceo_search_finance_vtable
with (security_invoker = true)
as
select *
from public.ceo_search_finance_vtable_without_open_work_filter
where case
	when metadata->>'source' in ('finance_receivable', 'finance_payable') then
		coalesce((metadata->>'remaining_due')::numeric, 0) > 0
	else true
end;

revoke all privileges on table public.ceo_search_finance_vtable
	from anon, authenticated, public;
revoke all privileges on table public.ceo_search_finance_vtable_without_open_work_filter
	from anon, authenticated, public;

insert into app_private.ceo_search_refresh_state (id, dirty, dirty_at)
values (true, true, now())
on conflict (id) do update set
	dirty = true,
	dirty_at = excluded.dirty_at;
