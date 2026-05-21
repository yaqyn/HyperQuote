alter table public.trucks
	add column if not exists body_type text not null default 'flatbed';

alter table public.trucks
	drop constraint if exists trucks_body_type_check;

alter table public.trucks
	add constraint trucks_body_type_check
	check (body_type in ('flatbed', 'curtain-side', 'box', 'tipper'));
