alter type public.support_ticket_source add value if not exists 'email';

create or replace function app_private.normalize_email_message_id(p_value text)
returns text
language sql
immutable
set search_path = public, app_private
as $$
	select nullif(btrim(coalesce(p_value, '')), '')
$$;

create or replace function app_private.normalize_support_email_subject(p_subject text)
returns text
language sql
immutable
set search_path = public, app_private
as $$
	select nullif(
		btrim(
			regexp_replace(
				regexp_replace(
					regexp_replace(
						lower(btrim(coalesce(p_subject, ''))),
						'\[[[:space:]]*tk-[0-9]{4}-[a-z0-9]{6}[[:space:]]*\]',
						'',
						'gi'
					),
					'^((re|fw|fwd)[[:space:]]*:[[:space:]]*)+',
					'',
					'gi'
				),
				'[[:space:]]+',
				' ',
				'g'
			)
		),
		''
	)
$$;

create table if not exists public.support_email_threads (
	id uuid primary key default gen_random_uuid(),
	ticket_id uuid not null references public.support_tickets(id) on delete cascade,
	support_message_id uuid not null references public.support_messages(id) on delete cascade,
	direction text not null check (direction in ('inbound', 'outbound')),
	provider text not null default 'resend',
	provider_email_id text not null,
	internet_message_id text,
	in_reply_to text,
	reference_message_ids text[] not null default '{}'::text[],
	sender_email text not null,
	recipient_emails text[] not null default '{}'::text[],
	cc_emails text[] not null default '{}'::text[],
	normalized_subject text not null,
	headers jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	unique (provider, provider_email_id)
);

create unique index if not exists support_email_threads_internet_message_id_unique
	on public.support_email_threads (internet_message_id)
	where internet_message_id is not null;

create index if not exists idx_support_email_threads_ticket_created
	on public.support_email_threads (ticket_id, created_at desc);

create index if not exists idx_support_email_threads_sender_subject
	on public.support_email_threads (lower(sender_email), normalized_subject, created_at desc);

alter table public.support_email_threads enable row level security;
revoke all on table public.support_email_threads from public, anon, authenticated;
grant select, insert, update, delete on table public.support_email_threads to service_role;

create or replace function public.ingest_support_email_message(
	p_provider text,
	p_provider_email_id text,
	p_internet_message_id text default null,
	p_in_reply_to text default null,
	p_references text[] default '{}'::text[],
	p_from_email text default null,
	p_from_name text default null,
	p_to_emails text[] default '{}'::text[],
	p_cc_emails text[] default '{}'::text[],
	p_subject text default null,
	p_body text default null,
	p_received_at timestamptz default now(),
	p_headers jsonb default '{}'::jsonb
)
returns table (
	ticket_id uuid,
	message_id uuid,
	ticket_reference text,
	created_ticket boolean,
	duplicate boolean
)
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	clean_provider text := lower(nullif(btrim(coalesce(p_provider, '')), ''));
	clean_provider_email_id text := nullif(btrim(coalesce(p_provider_email_id, '')), '');
	clean_message_id text := app_private.normalize_email_message_id(p_internet_message_id);
	clean_in_reply_to text := app_private.normalize_email_message_id(p_in_reply_to);
	clean_references text[] := '{}'::text[];
	clean_sender text := lower(nullif(btrim(coalesce(p_from_email, '')), ''));
	clean_to text[] := '{}'::text[];
	clean_cc text[] := '{}'::text[];
	clean_subject text := coalesce(
		app_private.normalize_support_email_subject(p_subject),
		'(no subject)'
	);
	body text := nullif(btrim(coalesce(p_body, '')), '');
	subject_for_ticket text := left(coalesce(nullif(btrim(p_subject), ''), '(no subject)'), 200);
	reference_match text[];
	matched_ticket public.support_tickets%rowtype;
	inserted_message public.support_messages%rowtype;
	existing_thread public.support_email_threads%rowtype;
	matched_customer_id uuid;
	should_create_ticket boolean := false;
begin
	if coalesce(auth.role(), '') <> 'service_role' then
		raise exception 'service_role_required' using errcode = '42501';
	end if;

	if clean_provider is null then
		clean_provider := 'resend';
	end if;
	if clean_provider_email_id is null then
		raise exception 'provider_email_id_required' using errcode = '23514';
	end if;
	if clean_sender is null or clean_sender !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
		raise exception 'valid_from_email_required' using errcode = '23514';
	end if;
	if body is null then
		raise exception 'support_email_body_required' using errcode = '23514';
	end if;

	select *
	into existing_thread
	from public.support_email_threads
	where provider = clean_provider
		and provider_email_id = clean_provider_email_id
	limit 1;

	if existing_thread.id is not null then
		select st.*
		into matched_ticket
		from public.support_tickets st
		where st.id = existing_thread.ticket_id;

		return query
		select
			existing_thread.ticket_id,
			existing_thread.support_message_id,
			matched_ticket.reference,
			false,
			true;
		return;
	end if;

	if clean_message_id is not null then
		select *
		into existing_thread
		from public.support_email_threads
		where internet_message_id = clean_message_id
		limit 1;

		if existing_thread.id is not null then
			select st.*
			into matched_ticket
			from public.support_tickets st
			where st.id = existing_thread.ticket_id;

			return query
			select
				existing_thread.ticket_id,
				existing_thread.support_message_id,
				matched_ticket.reference,
				false,
				true;
			return;
		end if;
	end if;

	select coalesce(array_agg(distinct normalized) filter (where normalized is not null), '{}'::text[])
	into clean_references
	from (
		select app_private.normalize_email_message_id(value) as normalized
		from unnest(coalesce(p_references, '{}'::text[]) || array[coalesce(clean_in_reply_to, '')]) as value
	) refs;

	select coalesce(array_agg(distinct lower(btrim(value))) filter (where btrim(value) <> ''), '{}'::text[])
	into clean_to
	from unnest(coalesce(p_to_emails, '{}'::text[])) as value;

	select coalesce(array_agg(distinct lower(btrim(value))) filter (where btrim(value) <> ''), '{}'::text[])
	into clean_cc
	from unnest(coalesce(p_cc_emails, '{}'::text[])) as value;

	if array_length(clean_references, 1) is not null then
		select st.*
		into matched_ticket
		from public.support_email_threads thread
		join public.support_tickets st on st.id = thread.ticket_id
		where thread.internet_message_id = any(clean_references)
		order by thread.created_at desc
		limit 1
		for update of st;
	end if;

	if matched_ticket.id is null then
		reference_match := regexp_match(
			coalesce(p_subject, ''),
			'\[?(TK-[0-9]{4}-[A-Z0-9]{6})\]?',
			'i'
		);
		if reference_match is not null then
			select *
			into matched_ticket
			from public.support_tickets
			where reference = upper(reference_match[1])
			limit 1
			for update;
		end if;
	end if;

	if matched_ticket.id is null then
		select *
		into matched_ticket
		from public.support_tickets
		where lower(requester_email) = clean_sender
			and status in ('open', 'pending')
			and created_at >= now() - interval '30 days'
			and app_private.normalize_support_email_subject(subject) = clean_subject
		order by updated_at desc
		limit 1
		for update;
	end if;

	select id
	into matched_customer_id
	from public.customers
	where lower(email) = clean_sender
		and status <> 'inactive'
	order by
		case when user_id is not null then 0 else 1 end,
		created_at desc
	limit 1;

	if matched_ticket.id is null then
		should_create_ticket := true;

		insert into public.support_tickets (
			customer_id,
			requester_name,
			requester_email,
			subject,
			status,
			source,
			updated_at
		)
		values (
			matched_customer_id,
			nullif(btrim(p_from_name), ''),
			clean_sender,
			subject_for_ticket,
			'open',
			'email',
			now()
		)
		returning * into matched_ticket;
	elsif matched_ticket.customer_id is null and matched_customer_id is not null then
		update public.support_tickets
		set customer_id = matched_customer_id,
			updated_at = now()
		where id = matched_ticket.id
		returning * into matched_ticket;
	end if;

	insert into public.support_messages (
		ticket_id,
		sender_type,
		sender_user_id,
		channel,
		body,
		external_message_id,
		provider_status,
		metadata
	)
	values (
		matched_ticket.id,
		case
			when matched_ticket.customer_id is null then 'external'::public.support_sender_type
			else 'customer'::public.support_sender_type
		end,
		null,
		'email',
		body,
		clean_provider_email_id,
		'received',
		jsonb_build_object(
			'provider', clean_provider,
			'provider_email_id', clean_provider_email_id,
			'message_id', clean_message_id,
			'in_reply_to', clean_in_reply_to,
			'references', clean_references,
			'from', clean_sender,
			'from_name', nullif(btrim(p_from_name), ''),
			'to', clean_to,
			'cc', clean_cc,
			'subject', nullif(btrim(p_subject), ''),
			'received_at', p_received_at,
			'headers', coalesce(p_headers, '{}'::jsonb)
		)
	)
	returning * into inserted_message;

	insert into public.support_email_threads (
		ticket_id,
		support_message_id,
		direction,
		provider,
		provider_email_id,
		internet_message_id,
		in_reply_to,
		reference_message_ids,
		sender_email,
		recipient_emails,
		cc_emails,
		normalized_subject,
		headers,
		created_at
	)
	values (
		matched_ticket.id,
		inserted_message.id,
		'inbound',
		clean_provider,
		clean_provider_email_id,
		clean_message_id,
		clean_in_reply_to,
		clean_references,
		clean_sender,
		clean_to,
		clean_cc,
		clean_subject,
		coalesce(p_headers, '{}'::jsonb),
		coalesce(p_received_at, now())
	);

	update public.support_tickets
	set status = 'open',
		updated_at = now(),
		requester_name = coalesce(requester_name, nullif(btrim(p_from_name), ''))
	where id = matched_ticket.id
	returning * into matched_ticket;

	if should_create_ticket then
		perform public.log_activity(
			'support_ticket',
			matched_ticket.id,
			'support_ticket_created',
			jsonb_build_object('source', 'email')
		);
	end if;

	return query
	select
		matched_ticket.id,
		inserted_message.id,
		matched_ticket.reference,
		should_create_ticket,
		false;
end;
$$;

create or replace function public.service_ingest_support_email_message(
	p_provider text,
	p_provider_email_id text,
	p_internet_message_id text default null,
	p_in_reply_to text default null,
	p_references text[] default '{}'::text[],
	p_from_email text default null,
	p_from_name text default null,
	p_to_emails text[] default '{}'::text[],
	p_cc_emails text[] default '{}'::text[],
	p_subject text default null,
	p_body text default null,
	p_received_at timestamptz default now(),
	p_headers jsonb default '{}'::jsonb
)
returns table (
	ticket_id uuid,
	message_id uuid,
	ticket_reference text,
	created_ticket boolean,
	duplicate boolean
)
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	return query
	select *
	from public.ingest_support_email_message(
		p_provider,
		p_provider_email_id,
		p_internet_message_id,
		p_in_reply_to,
		p_references,
		p_from_email,
		p_from_name,
		p_to_emails,
		p_cc_emails,
		p_subject,
		p_body,
		p_received_at,
		p_headers
	);
end;
$$;

revoke all on function public.ingest_support_email_message(
	text,
	text,
	text,
	text,
	text[],
	text,
	text,
	text[],
	text[],
	text,
	text,
	timestamptz,
	jsonb
) from public, anon, authenticated;

revoke all on function public.service_ingest_support_email_message(
	text,
	text,
	text,
	text,
	text[],
	text,
	text,
	text[],
	text[],
	text,
	text,
	timestamptz,
	jsonb
) from public, anon, authenticated;

grant execute on function public.ingest_support_email_message(
	text,
	text,
	text,
	text,
	text[],
	text,
	text,
	text[],
	text[],
	text,
	text,
	timestamptz,
	jsonb
) to service_role;

grant execute on function public.service_ingest_support_email_message(
	text,
	text,
	text,
	text,
	text[],
	text,
	text,
	text[],
	text[],
	text,
	text,
	timestamptz,
	jsonb
) to service_role;
