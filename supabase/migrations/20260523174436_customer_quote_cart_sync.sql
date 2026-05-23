create table if not exists public.customer_quote_carts (
	customer_id uuid primary key references public.customers(id) on delete cascade,
	items jsonb not null default '[]'::jsonb,
	global_note text not null default '',
	source text not null default 'unknown',
	version bigint not null default 1,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now()),
	constraint customer_quote_carts_items_array check (jsonb_typeof(items) = 'array'),
	constraint customer_quote_carts_global_note_length check (char_length(global_note) <= 2000),
	constraint customer_quote_carts_source_check check (source in ('portal', 'website', 'unknown')),
	constraint customer_quote_carts_version_positive check (version >= 1)
);

create index if not exists customer_quote_carts_updated_at_idx
	on public.customer_quote_carts (updated_at desc);

drop trigger if exists customer_quote_carts_set_updated_at
	on public.customer_quote_carts;

create trigger customer_quote_carts_set_updated_at
	before update on public.customer_quote_carts
	for each row execute function public.set_updated_at();

alter table public.customer_quote_carts enable row level security;

revoke all on table public.customer_quote_carts from public, anon, authenticated;
grant select, insert, update, delete on table public.customer_quote_carts to service_role;
