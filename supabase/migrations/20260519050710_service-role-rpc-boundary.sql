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
	if coalesce(auth.role(), '') <> 'service_role' then
		raise exception 'service_role_required_for_whatsapp_ingest' using errcode = '42501';
	end if;
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

revoke all on function public.ingest_whatsapp_message(text, text, text) from public;
grant execute on function public.ingest_whatsapp_message(text, text, text) to anon, authenticated, service_role;
