drop function if exists public.service_finance_post_journal_entry(uuid, text, uuid);
drop function if exists public.service_finance_reverse_journal_entry(uuid, text, uuid, text);
drop function if exists public.service_finance_void_draft_journal_entry(uuid, text, uuid, text);
drop function if exists public.finance_post_journal_entry(uuid);
drop function if exists public.finance_reverse_journal_entry(uuid, text);
drop function if exists public.finance_void_draft_journal_entry(uuid, text);

create or replace function app_private.finance_link_journal_action_proof(
	p_entry_id uuid,
	p_proof_path text,
	p_proof_document_id uuid,
	p_link_role text
)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	clean_proof_path text := nullif(btrim(coalesce(p_proof_path, '')), '');
	clean_link_role text := nullif(btrim(coalesce(p_link_role, '')), '');
begin
	if p_entry_id is null then
		raise exception 'finance_journal_entry_required' using errcode = '23514';
	end if;

	if clean_proof_path is null and p_proof_document_id is null then
		return;
	end if;

	if clean_link_role is null then
		raise exception 'finance_journal_proof_role_required' using errcode = '23514';
	end if;

	insert into public.finance_journal_proof_links (
		entry_id,
		proof_document_id,
		proof_path,
		link_role
	)
	values (
		p_entry_id,
		p_proof_document_id,
		clean_proof_path,
		clean_link_role
	)
	on conflict do nothing;
end;
$$;

revoke all privileges on function app_private.finance_link_journal_action_proof(uuid, text, uuid, text)
	from public, anon, authenticated;

create or replace function public.finance_post_journal_entry(
	p_entry_id uuid,
	p_proof_path text default null,
	p_proof_document_id uuid default null
)
returns public.finance_journal_entries
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	employee_id uuid;
	posted_entry public.finance_journal_entries%rowtype;
	clean_proof_path text := nullif(btrim(coalesce(p_proof_path, '')), '');
begin
	employee_id := public.require_panel('finance', true);

	select * into posted_entry
	from public.finance_journal_entries
	where id = p_entry_id
	for update;

	if posted_entry.id is null then
		raise exception 'finance_journal_entry_not_found' using errcode = '02000';
	end if;
	if posted_entry.status <> 'draft' then
		raise exception 'finance_journal_entry_not_draft' using errcode = '23514';
	end if;
	if posted_entry.requires_accountant_signoff then
		raise exception 'finance_accountant_signoff_required' using errcode = '23514';
	end if;
	if not app_private.finance_journal_entry_is_balanced(p_entry_id) then
		raise exception 'finance_journal_entry_unbalanced' using errcode = '23514';
	end if;

	update public.finance_journal_entries
	set
		status = 'posted',
		posted_at = now(),
		posted_by_employee_id = employee_id
	where id = p_entry_id
	returning * into posted_entry;

	perform app_private.finance_link_journal_action_proof(
		posted_entry.id,
		clean_proof_path,
		p_proof_document_id,
		'journal_post_approval'
	);

	perform public.log_activity(
		'finance_journal_entry',
		posted_entry.id,
		'finance_journal_posted',
		jsonb_strip_nulls(jsonb_build_object(
			'employee_id', employee_id,
			'entry_number', posted_entry.entry_number,
			'source_type', posted_entry.source_type,
			'source_id', posted_entry.source_id,
			'proof_document_id', p_proof_document_id,
			'proof_path', clean_proof_path
		))
	);

	return posted_entry;
end;
$$;

create or replace function public.finance_void_draft_journal_entry(
	p_entry_id uuid,
	p_reason text,
	p_proof_path text default null,
	p_proof_document_id uuid default null
)
returns public.finance_journal_entries
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	employee_id uuid;
	voided_entry public.finance_journal_entries%rowtype;
	clean_reason text := btrim(coalesce(p_reason, ''));
	clean_proof_path text := nullif(btrim(coalesce(p_proof_path, '')), '');
begin
	employee_id := public.require_panel('finance', true);
	if length(clean_reason) < 5 then
		raise exception 'finance_void_reason_required' using errcode = '23514';
	end if;
	if clean_proof_path is null and p_proof_document_id is null then
		raise exception 'finance_journal_action_proof_required' using errcode = '23514';
	end if;

	select * into voided_entry
	from public.finance_journal_entries
	where id = p_entry_id
	for update;

	if voided_entry.id is null then
		raise exception 'finance_journal_entry_not_found' using errcode = '02000';
	end if;
	if voided_entry.status <> 'draft' then
		raise exception 'only_draft_finance_journal_entries_can_be_voided' using errcode = '23514';
	end if;

	update public.finance_journal_entries
	set
		status = 'voided',
		voided_at = now(),
		voided_by_employee_id = employee_id,
		void_reason = clean_reason
	where id = p_entry_id
	returning * into voided_entry;

	perform app_private.finance_link_journal_action_proof(
		voided_entry.id,
		clean_proof_path,
		p_proof_document_id,
		'journal_void_approval'
	);

	perform public.log_activity(
		'finance_journal_entry',
		voided_entry.id,
		'finance_journal_voided',
		jsonb_strip_nulls(jsonb_build_object(
			'employee_id', employee_id,
			'entry_number', voided_entry.entry_number,
			'reason', clean_reason,
			'proof_document_id', p_proof_document_id,
			'proof_path', clean_proof_path
		))
	);

	return voided_entry;
end;
$$;

create or replace function public.finance_reverse_journal_entry(
	p_entry_id uuid,
	p_reason text,
	p_proof_path text default null,
	p_proof_document_id uuid default null
)
returns public.finance_journal_entries
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	employee_id uuid;
	target_entry public.finance_journal_entries%rowtype;
	reversal_entry public.finance_journal_entries%rowtype;
	clean_reason text := btrim(coalesce(p_reason, ''));
	clean_proof_path text := nullif(btrim(coalesce(p_proof_path, '')), '');
begin
	employee_id := public.require_panel('finance', true);
	if length(clean_reason) < 5 then
		raise exception 'finance_reversal_reason_required' using errcode = '23514';
	end if;
	if clean_proof_path is null and p_proof_document_id is null then
		raise exception 'finance_journal_action_proof_required' using errcode = '23514';
	end if;

	select * into target_entry
	from public.finance_journal_entries
	where id = p_entry_id
	for update;

	if target_entry.id is null then
		raise exception 'finance_journal_entry_not_found' using errcode = '02000';
	end if;
	if target_entry.status <> 'posted' then
		raise exception 'only_posted_finance_journal_entries_can_be_reversed' using errcode = '23514';
	end if;

	insert into public.finance_journal_entries (
		accounting_date,
		source_type,
		source_id,
		description,
		actor_employee_id,
		reversed_from_entry_id
	)
	values (
		current_date,
		target_entry.source_type,
		target_entry.source_id,
		'Reversal of ' || target_entry.entry_number || ': ' || clean_reason,
		employee_id,
		target_entry.id
	)
	returning * into reversal_entry;

	insert into public.finance_journal_lines (
		entry_id,
		line_number,
		account_id,
		debit,
		credit,
		currency,
		memo,
		counterparty_type,
		counterparty_id,
		source_type,
		source_id
	)
	select
		reversal_entry.id,
		line_number,
		account_id,
		credit,
		debit,
		currency,
		coalesce('Reversal: ' || nullif(memo, ''), 'Reversal'),
		counterparty_type,
		counterparty_id,
		source_type,
		source_id
	from public.finance_journal_lines
	where entry_id = target_entry.id
	order by line_number;

	insert into public.finance_journal_source_links (
		entry_id,
		source_type,
		source_id,
		link_role,
		source_label
	)
	select
		reversal_entry.id,
		source_type,
		source_id,
		'reversal:' || target_entry.entry_number || ':' || link_role,
		source_label
	from public.finance_journal_source_links
	where entry_id = target_entry.id
	on conflict do nothing;

	update public.finance_journal_entries
	set
		status = 'posted',
		posted_at = now(),
		posted_by_employee_id = employee_id
	where id = reversal_entry.id
	returning * into reversal_entry;

	update public.finance_journal_entries
	set
		status = 'reversed',
		reversed_at = now(),
		reversed_by_employee_id = employee_id,
		reversal_entry_id = reversal_entry.id
	where id = target_entry.id;

	perform app_private.finance_link_journal_action_proof(
		target_entry.id,
		clean_proof_path,
		p_proof_document_id,
		'journal_reversal_request'
	);
	perform app_private.finance_link_journal_action_proof(
		reversal_entry.id,
		clean_proof_path,
		p_proof_document_id,
		'journal_reversal_approval'
	);

	perform public.log_activity(
		'finance_journal_entry',
		target_entry.id,
		'finance_journal_reversed',
		jsonb_strip_nulls(jsonb_build_object(
			'employee_id', employee_id,
			'entry_number', target_entry.entry_number,
			'reversal_entry_number', reversal_entry.entry_number,
			'reason', clean_reason,
			'proof_document_id', p_proof_document_id,
			'proof_path', clean_proof_path
		))
	);

	return reversal_entry;
end;
$$;

create or replace function public.service_finance_post_journal_entry(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_entry_id uuid,
	p_proof_path text default null,
	p_proof_document_id uuid default null
)
returns public.finance_journal_entries
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.finance_post_journal_entry(
		p_entry_id,
		p_proof_path,
		p_proof_document_id
	);
end;
$$;

create or replace function public.service_finance_reverse_journal_entry(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_entry_id uuid,
	p_reason text,
	p_proof_path text default null,
	p_proof_document_id uuid default null
)
returns public.finance_journal_entries
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.finance_reverse_journal_entry(
		p_entry_id,
		p_reason,
		p_proof_path,
		p_proof_document_id
	);
end;
$$;

create or replace function public.service_finance_void_draft_journal_entry(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_entry_id uuid,
	p_reason text,
	p_proof_path text default null,
	p_proof_document_id uuid default null
)
returns public.finance_journal_entries
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.finance_void_draft_journal_entry(
		p_entry_id,
		p_reason,
		p_proof_path,
		p_proof_document_id
	);
end;
$$;

revoke all on function public.finance_post_journal_entry(uuid, text, uuid)
	from public, anon, authenticated;
revoke all on function public.finance_reverse_journal_entry(uuid, text, text, uuid)
	from public, anon, authenticated;
revoke all on function public.finance_void_draft_journal_entry(uuid, text, text, uuid)
	from public, anon, authenticated;
revoke all on function public.service_finance_post_journal_entry(uuid, text, uuid, text, uuid)
	from public, anon, authenticated;
revoke all on function public.service_finance_reverse_journal_entry(uuid, text, uuid, text, text, uuid)
	from public, anon, authenticated;
revoke all on function public.service_finance_void_draft_journal_entry(uuid, text, uuid, text, text, uuid)
	from public, anon, authenticated;

grant execute on function public.service_finance_post_journal_entry(uuid, text, uuid, text, uuid)
	to service_role;
grant execute on function public.service_finance_reverse_journal_entry(uuid, text, uuid, text, text, uuid)
	to service_role;
grant execute on function public.service_finance_void_draft_journal_entry(uuid, text, uuid, text, text, uuid)
	to service_role;
