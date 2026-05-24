create or replace function public.send_support_reply(
	p_ticket_id uuid,
	p_body text,
	p_channel public.support_message_channel default 'email',
	p_metadata jsonb default '{}'::jsonb
)
returns public.support_messages
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	message public.support_messages%rowtype;
	message_metadata jsonb;
	event_context jsonb;
	provider_status text;
	provider_error text;
	external_message_id text;
begin
	employee_id := public.require_panel('customer_service', true);
	if p_body is null or length(trim(p_body)) = 0 or length(p_body) > 4000 then
		raise exception 'valid_support_reply_required' using errcode = '23514';
	end if;

	provider_status := coalesce(nullif(p_metadata->>'provider_status', ''), 'provider_not_configured');
	provider_error := nullif(p_metadata->>'provider_error', '');
	external_message_id := nullif(p_metadata->>'external_message_id', '');

	message_metadata := coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
		'employee_id', employee_id,
		'provider_status', provider_status
	);

	insert into public.support_messages (
		ticket_id,
		sender_type,
		sender_user_id,
		channel,
		body,
		external_message_id,
		provider_status,
		provider_error,
		metadata
	)
	values (
		p_ticket_id,
		'employee',
		auth.uid(),
		p_channel,
		trim(p_body),
		external_message_id,
		provider_status,
		provider_error,
		message_metadata
	)
	returning * into message;

	update public.support_tickets
	set status = 'pending',
		assigned_employee_id = coalesce(assigned_employee_id, employee_id)
	where id = p_ticket_id;

	event_context := jsonb_build_object(
		'employee_id', employee_id,
		'message_id', message.id,
		'channel', p_channel,
		'provider_status', provider_status,
		'external_message_id', external_message_id
	);

	perform public.log_activity(
		'support_ticket',
		p_ticket_id,
		'support_reply_sent',
		event_context
	);
	perform public.log_activity(
		'support_ticket',
		p_ticket_id,
		'support_ticket_reply_sent',
		event_context
	);
	return message;
end;
$$;

revoke all on function public.send_support_reply(uuid, text, public.support_message_channel, jsonb)
	from public, anon, authenticated;
grant execute on function public.send_support_reply(uuid, text, public.support_message_channel, jsonb)
	to service_role;
