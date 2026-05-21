alter table public.quote_requests
	add column if not exists draft_name text;

do $$
begin
	if not exists (
		select 1
		from pg_constraint
		where conname = 'quote_requests_draft_name_length'
	) then
		alter table public.quote_requests
			add constraint quote_requests_draft_name_length
			check (
				draft_name is null
				or char_length(btrim(draft_name)) between 1 and 120
			);
	end if;
end;
$$;
