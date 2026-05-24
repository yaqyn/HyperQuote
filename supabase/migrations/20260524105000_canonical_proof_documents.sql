insert into storage.buckets (
	id,
	name,
	public,
	file_size_limit,
	allowed_mime_types
)
values (
	'proofs',
	'proofs',
	false,
	1048576,
	array['application/pdf', 'image/*']
)
on conflict (id) do update
set
	public = excluded.public,
	file_size_limit = excluded.file_size_limit,
	allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.proof_documents (
	id uuid primary key default gen_random_uuid(),
	bucket_id text not null default 'proofs',
	storage_path text not null unique,
	file_name text not null,
	mime_type text not null,
	file_size_bytes integer not null,
	panel public.employee_panel not null,
	proof_type text not null,
	title text,
	notes text,
	related_entity_type text,
	related_entity_id uuid,
	uploaded_by_user_id uuid references auth.users(id) on delete set null,
	uploaded_by_employee_id uuid references public.employees(id) on delete set null,
	created_at timestamptz not null default now(),
	check (bucket_id = 'proofs'),
	check (file_size_bytes between 1 and 1048576),
	check (mime_type = 'application/pdf' or mime_type like 'image/%'),
	check (storage_path !~ '(^/|\\.\\.|//)'),
	check (
		proof_type in (
			'price_change',
			'stock_change',
			'finance_in',
			'finance_out',
			'warehouse_loading',
			'warehouse_receiving',
			'dispatch_delivery',
			'dispatch_return',
			'sales_evaluation',
			'rejection',
			'advisor_signoff',
			'support',
			'other'
		)
	)
);

create table if not exists public.activity_event_proofs (
	activity_event_id uuid not null references public.activity_events(id) on delete cascade,
	proof_document_id uuid not null references public.proof_documents(id) on delete restrict,
	created_at timestamptz not null default now(),
	primary key (activity_event_id, proof_document_id)
);

create index if not exists proof_documents_related_idx
	on public.proof_documents (related_entity_type, related_entity_id, created_at desc)
	where related_entity_type is not null and related_entity_id is not null;

create index if not exists proof_documents_panel_created_idx
	on public.proof_documents (panel, created_at desc);

create index if not exists activity_event_proofs_proof_idx
	on public.activity_event_proofs (proof_document_id);

alter table public.proof_documents enable row level security;
alter table public.activity_event_proofs enable row level security;

drop policy if exists proof_documents_internal_read on public.proof_documents;
create policy proof_documents_internal_read
	on public.proof_documents for select
	to authenticated
	using (public.current_employee_id() is not null);

drop policy if exists activity_event_proofs_internal_read on public.activity_event_proofs;
create policy activity_event_proofs_internal_read
	on public.activity_event_proofs for select
	to authenticated
	using (public.current_employee_id() is not null);

create or replace function app_private.proof_document_id_from_text(p_value text)
returns uuid
language plpgsql
stable
security definer
set search_path = public, app_private
as $$
declare
	clean_value text := btrim(coalesce(p_value, ''));
	clean_path text;
	found_id uuid;
begin
	if clean_value = '' then
		return null;
	end if;

	if clean_value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
		select id into found_id
		from public.proof_documents
		where id = clean_value::uuid;
		if found_id is not null then
			return found_id;
		end if;
	end if;

	clean_path := regexp_replace(clean_value, '^storage://proofs/', '');
	clean_path := regexp_replace(clean_path, '^proofs/', '');

	select id into found_id
	from public.proof_documents
	where storage_path = clean_path
	limit 1;

	return found_id;
end;
$$;

create or replace function app_private.link_activity_event_proof_value(
	p_activity_event_id uuid,
	p_value text
)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	proof_id uuid;
begin
	proof_id := app_private.proof_document_id_from_text(p_value);
	if proof_id is null then
		return;
	end if;

	insert into public.activity_event_proofs (activity_event_id, proof_document_id)
	values (p_activity_event_id, proof_id)
	on conflict do nothing;
end;
$$;

create or replace function app_private.link_activity_event_proofs()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	proof_value text;
begin
	foreach proof_value in array array[
		new.details->>'proof_document_id',
		new.details->>'proof_path',
		new.details->>'proof_url',
		new.details#>>'{proof,proof_document_id}',
		new.details#>>'{proof,proof_path}',
		new.details#>>'{proof,proof_url}'
	] loop
		perform app_private.link_activity_event_proof_value(new.id, proof_value);
	end loop;

	if jsonb_typeof(new.details->'proof_document_ids') = 'array' then
		for proof_value in
			select jsonb_array_elements_text(new.details->'proof_document_ids')
		loop
			perform app_private.link_activity_event_proof_value(new.id, proof_value);
		end loop;
	end if;

	if jsonb_typeof(new.details->'proofs') = 'array' then
		for proof_value in
			select coalesce(
				proof_item->>'proof_document_id',
				proof_item->>'proof_path',
				proof_item->>'proof_url',
				proof_item->>'storage_path'
			)
			from jsonb_array_elements(new.details->'proofs') as proof_item
		loop
			perform app_private.link_activity_event_proof_value(new.id, proof_value);
		end loop;
	end if;

	return new;
end;
$$;

drop trigger if exists activity_events_link_proofs on public.activity_events;
create trigger activity_events_link_proofs
	after insert or update of details on public.activity_events
	for each row
	execute function app_private.link_activity_event_proofs();

create or replace function public.register_proof_document(
	p_storage_path text,
	p_file_name text,
	p_mime_type text,
	p_file_size_bytes integer,
	p_panel public.employee_panel,
	p_proof_type text,
	p_related_entity_type text default null,
	p_related_entity_id uuid default null,
	p_title text default null,
	p_notes text default null
)
returns public.proof_documents
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	employee_id uuid;
	clean_storage_path text := btrim(coalesce(p_storage_path, ''));
	inserted public.proof_documents%rowtype;
begin
	employee_id := public.require_panel(p_panel::text, true);

	if clean_storage_path = ''
		or clean_storage_path ~ '(^/|\\.\\.|//)'
		or clean_storage_path like 'storage://%'
	then
		raise exception 'invalid_proof_storage_path' using errcode = '23514';
	end if;

	if p_file_size_bytes is null or p_file_size_bytes < 1 or p_file_size_bytes > 1048576 then
		raise exception 'proof_file_size_limit_1mb' using errcode = '23514';
	end if;

	if p_mime_type is null or not (p_mime_type = 'application/pdf' or p_mime_type like 'image/%') then
		raise exception 'proof_file_type_not_allowed' using errcode = '23514';
	end if;

	insert into public.proof_documents (
		storage_path,
		file_name,
		mime_type,
		file_size_bytes,
		panel,
		proof_type,
		title,
		notes,
		related_entity_type,
		related_entity_id,
		uploaded_by_user_id,
		uploaded_by_employee_id
	)
	values (
		clean_storage_path,
		btrim(p_file_name),
		p_mime_type,
		p_file_size_bytes,
		p_panel,
		p_proof_type,
		nullif(btrim(coalesce(p_title, '')), ''),
		nullif(btrim(coalesce(p_notes, '')), ''),
		nullif(btrim(coalesce(p_related_entity_type, '')), ''),
		p_related_entity_id,
		app_private.current_actor_user_id(),
		employee_id
	)
	returning * into inserted;

	return inserted;
end;
$$;

revoke all on function public.register_proof_document(
	text,
	text,
	text,
	integer,
	public.employee_panel,
	text,
	text,
	uuid,
	text,
	text
) from public, anon;
grant execute on function public.register_proof_document(
	text,
	text,
	text,
	integer,
	public.employee_panel,
	text,
	text,
	uuid,
	text,
	text
) to authenticated;

create or replace function public.service_register_proof_document(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_storage_path text,
	p_file_name text,
	p_mime_type text,
	p_file_size_bytes integer,
	p_panel public.employee_panel,
	p_proof_type text,
	p_related_entity_type text default null,
	p_related_entity_id uuid default null,
	p_title text default null,
	p_notes text default null
)
returns public.proof_documents
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.register_proof_document(
		p_storage_path,
		p_file_name,
		p_mime_type,
		p_file_size_bytes,
		p_panel,
		p_proof_type,
		p_related_entity_type,
		p_related_entity_id,
		p_title,
		p_notes
	);
end;
$$;

revoke all on function public.service_register_proof_document(
	uuid,
	text,
	text,
	text,
	text,
	integer,
	public.employee_panel,
	text,
	text,
	uuid,
	text,
	text
) from public, anon, authenticated;

insert into public.activity_event_proofs (activity_event_id, proof_document_id)
select distinct ae.id, pd.id
from public.activity_events ae
join public.proof_documents pd
	on pd.id = app_private.proof_document_id_from_text(ae.details->>'proof_document_id')
	or pd.id = app_private.proof_document_id_from_text(ae.details->>'proof_path')
	or pd.id = app_private.proof_document_id_from_text(ae.details->>'proof_url')
	or pd.id = app_private.proof_document_id_from_text(ae.details#>>'{proof,proof_document_id}')
	or pd.id = app_private.proof_document_id_from_text(ae.details#>>'{proof,proof_path}')
	or pd.id = app_private.proof_document_id_from_text(ae.details#>>'{proof,proof_url}')
on conflict do nothing;

drop trigger if exists ceo_search_documents_dirty on public.proof_documents;
create trigger ceo_search_documents_dirty
	after insert or update or delete or truncate on public.proof_documents
	for each statement
	execute function app_private.mark_ceo_search_documents_dirty();

drop trigger if exists ceo_search_documents_dirty on public.activity_event_proofs;
create trigger ceo_search_documents_dirty
	after insert or update or delete or truncate on public.activity_event_proofs
	for each statement
	execute function app_private.mark_ceo_search_documents_dirty();

create or replace function public.record_customer_payment(
	p_order_id uuid,
	p_amount numeric,
	p_payment_fraction numeric,
	p_proof_path text
)
returns public.customer_payments
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	payment public.customer_payments%rowtype;
	target_order public.orders%rowtype;
	clean_proof_path text := btrim(coalesce(p_proof_path, ''));
	existing_paid numeric := 0;
	remaining_due numeric := 0;
	expected_first_amount numeric := 0;
	remaining_after numeric := 0;
	payment_amount numeric := round(p_amount::numeric, 2);
begin
	employee_id := public.require_panel('finance', true);

	select * into target_order
	from public.orders
	where id = p_order_id
	for update;

	if target_order.id is null then
		raise exception 'order_not_found' using errcode = '02000';
	end if;

	if target_order.status in ('rejected', 'canceled') then
		raise exception 'invalid_customer_payment_order_status_%', target_order.status using errcode = '23514';
	end if;

	if target_order.total_amount <= 0 then
		raise exception 'customer_payment_positive_total_required' using errcode = '23514';
	end if;

	if p_payment_fraction not in (0.5, 1.0) then
		raise exception 'invalid_customer_payment_fraction' using errcode = '23514';
	end if;

	if p_amount is null or p_amount <= 0 then
		raise exception 'customer_payment_amount_required' using errcode = '23514';
	end if;

	if clean_proof_path = '' then
		raise exception 'customer_payment_proof_required' using errcode = '23514';
	end if;

	select coalesce(sum(amount), 0) into existing_paid
	from public.customer_payments
	where order_id = p_order_id
	  and status = 'recorded';

	remaining_due := round((target_order.total_amount - existing_paid)::numeric, 2);

	if remaining_due <= 0 then
		raise exception 'customer_payment_already_settled' using errcode = '23514';
	end if;

	if existing_paid = 0 then
		expected_first_amount := round((target_order.total_amount * p_payment_fraction)::numeric, 2);
		if payment_amount <> expected_first_amount then
			raise exception 'customer_payment_amount_must_match_fraction' using errcode = '23514';
		end if;
	else
		if p_payment_fraction <> 1.0 then
			raise exception 'customer_final_payment_fraction_required' using errcode = '23514';
		end if;
		if payment_amount <> remaining_due then
			raise exception 'customer_payment_amount_must_match_remaining_due' using errcode = '23514';
		end if;
	end if;

	if payment_amount > remaining_due then
		raise exception 'customer_payment_exceeds_remaining_due' using errcode = '23514';
	end if;

	remaining_after := round((remaining_due - payment_amount)::numeric, 2);

	insert into public.customer_payments (
		order_id,
		recorded_by_employee_id,
		amount,
		payment_fraction,
		proof_path
	)
	values (
		p_order_id,
		employee_id,
		payment_amount,
		p_payment_fraction,
		clean_proof_path
	)
	returning * into payment;

	perform public.log_activity(
		'order',
		p_order_id,
		'customer_payment_recorded',
		jsonb_build_object(
			'employee_id', employee_id,
			'amount', payment.amount,
			'payment_fraction', payment.payment_fraction,
			'proof_path', clean_proof_path,
			'order_status', target_order.status,
			'remaining_amount', remaining_after
		)
	);
	return payment;
end;
$$;

create or replace function public.record_supplier_payment(
	p_refill_request_id uuid,
	p_amount numeric,
	p_payment_fraction numeric,
	p_proof_path text
)
returns public.supplier_payments
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	payment public.supplier_payments%rowtype;
	refill public.refill_requests%rowtype;
	from_status text;
	to_status text;
	total_due numeric;
	existing_paid numeric;
	remaining_due numeric;
	expected_first_amount numeric;
	payment_amount numeric;
	has_full_payment boolean;
	clean_proof_path text := btrim(coalesce(p_proof_path, ''));
begin
	employee_id := public.require_panel('finance', true);
	if p_amount is null or p_amount <= 0 then
		raise exception 'invalid_supplier_payment_amount' using errcode = '23514';
	end if;
	if p_payment_fraction not in (0.5, 1.0) then
		raise exception 'invalid_supplier_payment_fraction' using errcode = '23514';
	end if;
	if clean_proof_path = '' then
		raise exception 'supplier_payment_proof_required' using errcode = '23514';
	end if;

	payment_amount := round(p_amount::numeric, 2);
	perform app_private.allow_workflow_state_change();

	select * into refill
	from public.refill_requests
	where id = p_refill_request_id
	for update;

	if refill.id is null then
		raise exception 'refill_request_not_found' using errcode = '02000';
	end if;

	if refill.status not in ('finance_pending', 'finance_approved', 'warehouse_receiving', 'received') then
		raise exception 'invalid_supplier_payment_refill_status_%', refill.status using errcode = '23514';
	end if;

	from_status := refill.status::text;
	to_status := from_status;
	total_due := round((refill.quantity * refill.unit_cost)::numeric, 2);
	if total_due <= 0 then
		raise exception 'invalid_supplier_payment_total' using errcode = '23514';
	end if;

	select
		coalesce(sum(amount), 0),
		coalesce(bool_or(payment_fraction >= 1), false)
	into existing_paid, has_full_payment
	from public.supplier_payments
	where refill_request_id = p_refill_request_id
	  and status = 'recorded';

	remaining_due := round((total_due - existing_paid)::numeric, 2);
	if remaining_due <= 0 or has_full_payment then
		raise exception 'supplier_payment_already_settled' using errcode = '23514';
	end if;

	if existing_paid = 0 then
		expected_first_amount := round((total_due * p_payment_fraction)::numeric, 2);
		if payment_amount <> expected_first_amount then
			raise exception 'supplier_payment_amount_must_match_fraction' using errcode = '23514';
		end if;
	else
		if p_payment_fraction <> 1.0 then
			raise exception 'supplier_final_payment_fraction_required' using errcode = '23514';
		end if;
		if payment_amount <> remaining_due then
			raise exception 'supplier_payment_amount_must_match_remaining_due' using errcode = '23514';
		end if;
	end if;

	if payment_amount > remaining_due then
		raise exception 'supplier_payment_exceeds_remaining' using errcode = '23514';
	end if;

	insert into public.supplier_payments (
		refill_request_id,
		recorded_by_employee_id,
		amount,
		payment_fraction,
		proof_path
	)
	values (
		p_refill_request_id,
		employee_id,
		payment_amount,
		p_payment_fraction,
		clean_proof_path
	)
	returning * into payment;

	if refill.status in ('finance_pending', 'finance_approved') then
		update public.refill_requests
		set status = 'warehouse_receiving'
		where id = p_refill_request_id;

		insert into public.receiving_tasks (refill_request_id)
		values (p_refill_request_id)
		on conflict do nothing;

		to_status := 'warehouse_receiving';
	end if;

	perform public.log_activity(
		'refill_request',
		p_refill_request_id,
		'supplier_payment_recorded',
		jsonb_build_object(
			'amount', payment_amount,
			'payment_fraction', p_payment_fraction,
			'proof_path', clean_proof_path,
			'employee_id', employee_id,
			'total_due', total_due,
			'remaining_before', remaining_due,
			'remaining_after', round((remaining_due - payment_amount)::numeric, 2),
			'from_status', from_status,
			'to_status', to_status
		)
	);
	return payment;
end;
$$;
