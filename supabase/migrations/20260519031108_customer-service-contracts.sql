alter type public.audit_event_type add value if not exists 'whatsapp_message_ingested';
alter type public.audit_event_type add value if not exists 'support_status_updated';
alter type public.audit_event_type add value if not exists 'support_assigned';

alter table public.support_tickets
	add column if not exists assigned_employee_id uuid references public.employees(id) on delete set null;

alter table public.support_conversations
	add column if not exists assigned_employee_id uuid references public.employees(id) on delete set null;

alter table public.support_messages
	add column if not exists provider_status text not null default 'recorded',
	add column if not exists provider_error text,
	add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists support_conversations_whatsapp_phone_unique
	on public.support_conversations (channel, phone)
	where channel = 'whatsapp' and phone is not null;

drop policy if exists support_conversation_visibility on public.support_conversations;
create policy support_conversation_visibility
	on public.support_conversations for select
	to authenticated
	using (
		public.can_access_panel('customer_service')
		or public.is_employee_with_role('ceo')
		or customer_id = public.current_customer_id()
	);

create or replace function public.create_support_ticket(
	p_subject text,
	p_message text,
	p_requester_email text,
	p_requester_name text default null,
	p_requester_phone text default null
)
returns public.support_tickets
language plpgsql
security definer
set search_path = public
as $$
declare
	v_customer_id uuid;
	ticket public.support_tickets%rowtype;
	message_channel public.support_message_channel;
begin
	if p_requester_email is null or p_requester_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
		raise exception 'valid_requester_email_required' using errcode = '23514';
	end if;
	if p_subject is null or length(trim(p_subject)) = 0 or length(p_subject) > 200 then
		raise exception 'valid_support_subject_required' using errcode = '23514';
	end if;
	if p_message is null or length(trim(p_message)) < 10 or length(p_message) > 2000 then
		raise exception 'valid_support_message_required' using errcode = '23514';
	end if;

	perform app_private.check_support_ticket_rate_limit(
		'support:email:' || lower(trim(p_requester_email))
	);
	if p_requester_phone is not null and length(trim(p_requester_phone)) > 0 then
		perform app_private.check_support_ticket_rate_limit(
			'support:phone:' || regexp_replace(p_requester_phone, '[^0-9+]', '', 'g')
		);
	end if;

	v_customer_id := public.current_customer_id();
	message_channel := case
		when v_customer_id is null then 'website'::public.support_message_channel
		else 'portal'::public.support_message_channel
	end;

	insert into public.support_tickets (
		customer_id,
		requester_name,
		requester_email,
		requester_phone,
		subject,
		source
	)
	values (
		v_customer_id,
		p_requester_name,
		p_requester_email,
		p_requester_phone,
		p_subject,
		case when v_customer_id is null then 'website'::public.support_ticket_source else 'portal'::public.support_ticket_source end
	)
	returning * into ticket;

	insert into public.support_messages (
		ticket_id,
		sender_type,
		sender_user_id,
		channel,
		body,
		provider_status,
		metadata
	)
	values (
		ticket.id,
		case when v_customer_id is null then 'external'::public.support_sender_type else 'customer'::public.support_sender_type end,
		auth.uid(),
		message_channel,
		trim(p_message),
		'recorded',
		jsonb_build_object(
			'from', lower(trim(p_requester_email)),
			'to', 'support@hyperquote.net',
			'subject', trim(p_subject),
			'requester_name', p_requester_name,
			'requester_phone', p_requester_phone
		)
	);

	perform public.log_activity('support_ticket', ticket.id, 'support_ticket_created', jsonb_build_object('source', ticket.source));
	return ticket;
end;
$$;

create or replace function public.send_support_reply(
	p_ticket_id uuid,
	p_body text,
	p_channel public.support_message_channel default 'email'
)
returns public.support_messages
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	message public.support_messages%rowtype;
begin
	employee_id := public.require_panel('customer_service', true);
	if p_body is null or length(trim(p_body)) = 0 or length(p_body) > 4000 then
		raise exception 'valid_support_reply_required' using errcode = '23514';
	end if;

	insert into public.support_messages (
		ticket_id,
		sender_type,
		sender_user_id,
		channel,
		body,
		provider_status,
		metadata
	)
	values (
		p_ticket_id,
		'employee',
		auth.uid(),
		p_channel,
		trim(p_body),
		'provider_not_configured',
		jsonb_build_object('employee_id', employee_id, 'provider_status', 'provider_not_configured')
	)
	returning * into message;

	update public.support_tickets
	set status = 'pending',
		assigned_employee_id = coalesce(assigned_employee_id, employee_id)
	where id = p_ticket_id;

	perform public.log_activity(
		'support_ticket',
		p_ticket_id,
		'support_reply_sent',
		jsonb_build_object(
			'employee_id', employee_id,
			'message_id', message.id,
			'channel', p_channel,
			'provider_status', 'provider_not_configured'
		)
	);
	return message;
end;
$$;

create or replace function public.send_support_conversation_reply(
	p_conversation_id uuid,
	p_body text,
	p_channel public.support_message_channel default 'whatsapp'
)
returns public.support_messages
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	message public.support_messages%rowtype;
begin
	employee_id := public.require_panel('customer_service', true);
	if p_body is null or length(trim(p_body)) = 0 or length(p_body) > 4000 then
		raise exception 'valid_support_reply_required' using errcode = '23514';
	end if;

	insert into public.support_messages (
		conversation_id,
		sender_type,
		sender_user_id,
		channel,
		body,
		provider_status,
		metadata
	)
	values (
		p_conversation_id,
		'employee',
		auth.uid(),
		p_channel,
		trim(p_body),
		'provider_not_configured',
		jsonb_build_object('employee_id', employee_id, 'provider_status', 'provider_not_configured')
	)
	returning * into message;

	update public.support_conversations
	set status = 'open',
		assigned_employee_id = coalesce(assigned_employee_id, employee_id)
	where id = p_conversation_id;

	perform public.log_activity(
		'support_conversation',
		p_conversation_id,
		'support_reply_sent',
		jsonb_build_object(
			'employee_id', employee_id,
			'message_id', message.id,
			'channel', p_channel,
			'provider_status', 'provider_not_configured'
		)
	);
	return message;
end;
$$;

create or replace function public.set_support_ticket_status(
	p_ticket_id uuid,
	p_status public.support_ticket_status
)
returns public.support_tickets
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	updated public.support_tickets%rowtype;
begin
	employee_id := public.require_panel('customer_service', true);

	update public.support_tickets
	set status = p_status,
		assigned_employee_id = coalesce(assigned_employee_id, employee_id)
	where id = p_ticket_id
	returning * into updated;

	if updated.id is null then
		raise exception 'support_ticket_not_found' using errcode = '02000';
	end if;

	perform public.log_activity(
		'support_ticket',
		p_ticket_id,
		'support_status_updated',
		jsonb_build_object('employee_id', employee_id, 'to_status', p_status)
	);
	return updated;
end;
$$;

create or replace function public.set_support_conversation_status(
	p_conversation_id uuid,
	p_status public.support_conversation_status
)
returns public.support_conversations
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	updated public.support_conversations%rowtype;
begin
	employee_id := public.require_panel('customer_service', true);

	update public.support_conversations
	set status = p_status,
		assigned_employee_id = coalesce(assigned_employee_id, employee_id)
	where id = p_conversation_id
	returning * into updated;

	if updated.id is null then
		raise exception 'support_conversation_not_found' using errcode = '02000';
	end if;

	perform public.log_activity(
		'support_conversation',
		p_conversation_id,
		'support_status_updated',
		jsonb_build_object('employee_id', employee_id, 'to_status', p_status)
	);
	return updated;
end;
$$;

create or replace function public.assign_support_ticket(p_ticket_id uuid)
returns public.support_tickets
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	updated public.support_tickets%rowtype;
begin
	employee_id := public.require_panel('customer_service', true);
	update public.support_tickets
	set assigned_employee_id = employee_id
	where id = p_ticket_id
	returning * into updated;
	if updated.id is null then
		raise exception 'support_ticket_not_found' using errcode = '02000';
	end if;
	perform public.log_activity('support_ticket', p_ticket_id, 'support_assigned', jsonb_build_object('employee_id', employee_id));
	return updated;
end;
$$;

create or replace function public.assign_support_conversation(p_conversation_id uuid)
returns public.support_conversations
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	updated public.support_conversations%rowtype;
begin
	employee_id := public.require_panel('customer_service', true);
	update public.support_conversations
	set assigned_employee_id = employee_id
	where id = p_conversation_id
	returning * into updated;
	if updated.id is null then
		raise exception 'support_conversation_not_found' using errcode = '02000';
	end if;
	perform public.log_activity('support_conversation', p_conversation_id, 'support_assigned', jsonb_build_object('employee_id', employee_id));
	return updated;
end;
$$;

create or replace function public.ingest_whatsapp_message(
	p_from_phone text,
	p_body text,
	p_external_message_id text default null
)
returns public.support_messages
language plpgsql
security definer
set search_path = public
as $$
declare
	customer_id uuid;
	conversation_id uuid;
	message public.support_messages%rowtype;
	normalized_phone text;
begin
	if p_from_phone is null or length(trim(p_from_phone)) = 0 then
		raise exception 'whatsapp_phone_required' using errcode = '23514';
	end if;
	if p_body is null or length(trim(p_body)) = 0 or length(p_body) > 4000 then
		raise exception 'valid_whatsapp_body_required' using errcode = '23514';
	end if;
	normalized_phone := regexp_replace(p_from_phone, '[^0-9+]', '', 'g');

	select id into customer_id
	from public.customers
	where regexp_replace(phone, '[^0-9+]', '', 'g') = normalized_phone
	limit 1;

	insert into public.support_conversations (
		customer_id,
		channel,
		phone,
		external_thread_id
	)
	values (customer_id, 'whatsapp', normalized_phone, normalized_phone)
	on conflict (channel, phone) where channel = 'whatsapp' and phone is not null do update
	set customer_id = coalesce(public.support_conversations.customer_id, excluded.customer_id),
		status = 'open'
	returning id into conversation_id;

	insert into public.support_messages (
		conversation_id,
		sender_type,
		channel,
		body,
		external_message_id,
		provider_status,
		metadata
	)
	values (
		conversation_id,
		'external',
		'whatsapp',
		trim(p_body),
		p_external_message_id,
		'received',
		jsonb_build_object('phone', normalized_phone)
	)
	returning * into message;

	perform public.log_activity('support_conversation', conversation_id, 'whatsapp_message_ingested', jsonb_build_object('phone', normalized_phone, 'customer_id', customer_id));
	return message;
end;
$$;

grant execute on function public.send_support_conversation_reply(uuid, text, public.support_message_channel) to authenticated;
grant execute on function public.set_support_ticket_status(uuid, public.support_ticket_status) to authenticated;
grant execute on function public.set_support_conversation_status(uuid, public.support_conversation_status) to authenticated;
grant execute on function public.assign_support_ticket(uuid) to authenticated;
grant execute on function public.assign_support_conversation(uuid) to authenticated;
grant execute on function public.create_support_ticket(text, text, text, text, text) to anon, authenticated;
