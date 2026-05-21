create or replace function public.create_support_ticket(
	p_subject text,
	p_message text,
	p_requester_email text,
	p_requester_name text default null,
	p_requester_phone text default null,
	p_client_key text default null,
	p_source text default null
)
returns public.support_tickets
language plpgsql
security definer
set search_path = public
as $$
declare
	v_customer_id uuid;
	ticket public.support_tickets%rowtype;
	ticket_source public.support_ticket_source;
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

	v_customer_id := public.current_customer_id();

	if p_client_key is not null and length(trim(p_client_key)) > 0 then
		perform app_private.check_support_ticket_rate_limit(
			'support:client:' || md5(lower(trim(p_client_key)))
		);
	end if;
	if v_customer_id is not null then
		perform app_private.check_support_ticket_rate_limit(
			'support:customer:' || v_customer_id::text
		);
	end if;
	perform app_private.check_support_ticket_rate_limit(
		'support:email:' || lower(trim(p_requester_email))
	);
	if p_requester_phone is not null and length(trim(p_requester_phone)) > 0 then
		perform app_private.check_support_ticket_rate_limit(
			'support:phone:' || regexp_replace(p_requester_phone, '[^0-9+]', '', 'g')
		);
	end if;

	ticket_source := case lower(trim(coalesce(p_source, '')))
		when 'portal' then 'portal'::public.support_ticket_source
		when 'whatsapp' then 'whatsapp'::public.support_ticket_source
		when 'internal' then 'internal'::public.support_ticket_source
		else 'website'::public.support_ticket_source
	end;
	message_channel := case ticket_source
		when 'portal' then 'portal'::public.support_message_channel
		when 'whatsapp' then 'whatsapp'::public.support_message_channel
		else 'website'::public.support_message_channel
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
		ticket_source
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

create or replace function public.create_support_ticket(
	p_subject text,
	p_message text,
	p_requester_email text,
	p_requester_name text default null,
	p_requester_phone text default null,
	p_client_key text default null
)
returns public.support_tickets
language plpgsql
security definer
set search_path = public
as $$
begin
	return public.create_support_ticket(
		p_subject,
		p_message,
		p_requester_email,
		p_requester_name,
		p_requester_phone,
		p_client_key,
		null
	);
end;
$$;

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
begin
	return public.create_support_ticket(
		p_subject,
		p_message,
		p_requester_email,
		p_requester_name,
		p_requester_phone,
		null,
		null
	);
end;
$$;

grant execute on function public.create_support_ticket(text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.create_support_ticket(text, text, text, text, text, text, text) to anon, authenticated;
