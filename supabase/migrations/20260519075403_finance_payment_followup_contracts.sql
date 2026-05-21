create table if not exists public.finance_payment_followups (
	id uuid primary key default gen_random_uuid(),
	target_type text not null check (target_type in ('customer_order', 'supplier_refill')),
	order_id uuid references public.orders(id) on delete cascade,
	refill_request_id uuid references public.refill_requests(id) on delete cascade,
	recorded_by_employee_id uuid references public.employees(id) on delete set null,
	contact_channel text not null check (contact_channel in ('phone', 'whatsapp', 'email', 'bank', 'other')),
	outcome text not null check (length(btrim(outcome)) >= 2),
	notes text not null check (length(btrim(notes)) >= 5),
	follow_up_state text not null default 'open' check (follow_up_state in ('open', 'waiting', 'closed')),
	follow_up_due_at timestamptz not null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	check (
		(
			target_type = 'customer_order'
			and order_id is not null
			and refill_request_id is null
		)
		or (
			target_type = 'supplier_refill'
			and refill_request_id is not null
			and order_id is null
		)
	)
);

create index if not exists finance_payment_followups_order_created_idx
	on public.finance_payment_followups (order_id, created_at desc)
	where order_id is not null;

create index if not exists finance_payment_followups_refill_created_idx
	on public.finance_payment_followups (refill_request_id, created_at desc)
	where refill_request_id is not null;

create index if not exists finance_payment_followups_due_idx
	on public.finance_payment_followups (follow_up_due_at, follow_up_state);

alter table public.finance_payment_followups enable row level security;

drop policy if exists finance_payment_followups_internal_read
	on public.finance_payment_followups;

create policy finance_payment_followups_internal_read
	on public.finance_payment_followups for select
	to authenticated
	using (
		public.can_access_panel('finance')
		or public.is_employee_with_role('ceo')
	);

drop trigger if exists finance_payment_followups_set_updated_at
	on public.finance_payment_followups;

create trigger finance_payment_followups_set_updated_at
	before update on public.finance_payment_followups
	for each row execute function public.set_updated_at();

revoke all on table public.finance_payment_followups from anon, authenticated;
grant select on table public.finance_payment_followups to authenticated;
grant select, insert, update, delete on table public.finance_payment_followups to service_role;

create or replace function public.record_customer_payment_followup(
	p_order_id uuid,
	p_contact_channel text,
	p_outcome text,
	p_notes text,
	p_follow_up_state text,
	p_follow_up_due_at timestamptz
)
returns public.finance_payment_followups
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	target_order public.orders%rowtype;
	followup public.finance_payment_followups%rowtype;
	clean_channel text := lower(btrim(coalesce(p_contact_channel, '')));
	clean_outcome text := btrim(coalesce(p_outcome, ''));
	clean_notes text := btrim(coalesce(p_notes, ''));
	clean_state text := lower(btrim(coalesce(p_follow_up_state, 'open')));
begin
	employee_id := public.require_panel('finance', true);

	select * into target_order
	from public.orders
	where id = p_order_id;

	if target_order.id is null then
		raise exception 'order_not_found' using errcode = '02000';
	end if;

	if target_order.status in ('rejected', 'canceled') then
		raise exception 'invalid_customer_followup_order_status_%', target_order.status using errcode = '23514';
	end if;

	if clean_channel not in ('phone', 'whatsapp', 'email', 'bank', 'other') then
		raise exception 'invalid_finance_followup_channel' using errcode = '23514';
	end if;

	if clean_state not in ('open', 'waiting', 'closed') then
		raise exception 'invalid_finance_followup_state' using errcode = '23514';
	end if;

	if length(clean_outcome) < 2 then
		raise exception 'finance_followup_outcome_required' using errcode = '23514';
	end if;

	if length(clean_notes) < 5 then
		raise exception 'finance_followup_notes_required' using errcode = '23514';
	end if;

	if p_follow_up_due_at is null then
		raise exception 'finance_followup_due_at_required' using errcode = '23514';
	end if;

	if clean_state <> 'closed' and p_follow_up_due_at < now() - interval '1 minute' then
		raise exception 'finance_followup_due_at_in_past' using errcode = '23514';
	end if;

	insert into public.finance_payment_followups (
		target_type,
		order_id,
		recorded_by_employee_id,
		contact_channel,
		outcome,
		notes,
		follow_up_state,
		follow_up_due_at
	)
	values (
		'customer_order',
		p_order_id,
		employee_id,
		clean_channel,
		clean_outcome,
		clean_notes,
		clean_state,
		p_follow_up_due_at
	)
	returning * into followup;

	perform public.log_activity(
		'order',
		p_order_id,
		'customer_payment_followup_recorded',
		jsonb_build_object(
			'finance_followup_id', followup.id,
			'contact_channel', followup.contact_channel,
			'outcome', followup.outcome,
			'follow_up_state', followup.follow_up_state,
			'follow_up_due_at', followup.follow_up_due_at
		)
	);

	return followup;
end;
$$;

create or replace function public.record_supplier_payment_followup(
	p_refill_request_id uuid,
	p_contact_channel text,
	p_outcome text,
	p_notes text,
	p_follow_up_state text,
	p_follow_up_due_at timestamptz
)
returns public.finance_payment_followups
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	refill public.refill_requests%rowtype;
	followup public.finance_payment_followups%rowtype;
	clean_channel text := lower(btrim(coalesce(p_contact_channel, '')));
	clean_outcome text := btrim(coalesce(p_outcome, ''));
	clean_notes text := btrim(coalesce(p_notes, ''));
	clean_state text := lower(btrim(coalesce(p_follow_up_state, 'open')));
begin
	employee_id := public.require_panel('finance', true);

	select * into refill
	from public.refill_requests
	where id = p_refill_request_id;

	if refill.id is null then
		raise exception 'refill_request_not_found' using errcode = '02000';
	end if;

	if refill.status in ('rejected', 'canceled') then
		raise exception 'invalid_supplier_followup_refill_status_%', refill.status using errcode = '23514';
	end if;

	if clean_channel not in ('phone', 'whatsapp', 'email', 'bank', 'other') then
		raise exception 'invalid_finance_followup_channel' using errcode = '23514';
	end if;

	if clean_state not in ('open', 'waiting', 'closed') then
		raise exception 'invalid_finance_followup_state' using errcode = '23514';
	end if;

	if length(clean_outcome) < 2 then
		raise exception 'finance_followup_outcome_required' using errcode = '23514';
	end if;

	if length(clean_notes) < 5 then
		raise exception 'finance_followup_notes_required' using errcode = '23514';
	end if;

	if p_follow_up_due_at is null then
		raise exception 'finance_followup_due_at_required' using errcode = '23514';
	end if;

	if clean_state <> 'closed' and p_follow_up_due_at < now() - interval '1 minute' then
		raise exception 'finance_followup_due_at_in_past' using errcode = '23514';
	end if;

	insert into public.finance_payment_followups (
		target_type,
		refill_request_id,
		recorded_by_employee_id,
		contact_channel,
		outcome,
		notes,
		follow_up_state,
		follow_up_due_at
	)
	values (
		'supplier_refill',
		p_refill_request_id,
		employee_id,
		clean_channel,
		clean_outcome,
		clean_notes,
		clean_state,
		p_follow_up_due_at
	)
	returning * into followup;

	perform public.log_activity(
		'refill_request',
		p_refill_request_id,
		'supplier_payment_followup_recorded',
		jsonb_build_object(
			'finance_followup_id', followup.id,
			'contact_channel', followup.contact_channel,
			'outcome', followup.outcome,
			'follow_up_state', followup.follow_up_state,
			'follow_up_due_at', followup.follow_up_due_at
		)
	);

	return followup;
end;
$$;

revoke all on function public.record_customer_payment_followup(uuid, text, text, text, text, timestamptz) from public, anon;
revoke all on function public.record_supplier_payment_followup(uuid, text, text, text, text, timestamptz) from public, anon;
grant execute on function public.record_customer_payment_followup(uuid, text, text, text, text, timestamptz) to authenticated;
grant execute on function public.record_supplier_payment_followup(uuid, text, text, text, text, timestamptz) to authenticated;
