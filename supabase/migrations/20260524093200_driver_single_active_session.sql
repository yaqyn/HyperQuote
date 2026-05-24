create table if not exists public.driver_app_sessions (
	driver_id uuid primary key references public.drivers(id) on delete cascade,
	user_id uuid not null references auth.users(id) on delete cascade,
	session_id uuid not null,
	source text not null default 'driver_app',
	claimed_at timestamptz not null default now(),
	last_seen_at timestamptz not null default now(),
	constraint driver_app_sessions_source_check check (source = 'driver_app')
);

alter table public.driver_app_sessions enable row level security;

create index if not exists driver_app_sessions_user_session_idx
	on public.driver_app_sessions (user_id, session_id);
