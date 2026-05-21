drop function if exists public.send_support_reply(uuid, text, public.support_message_channel);

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
begin
	employee_id := public.require_panel('customer_service', true);
	if p_body is null or length(trim(p_body)) = 0 or length(p_body) > 4000 then
		raise exception 'valid_support_reply_required' using errcode = '23514';
	end if;

	message_metadata := coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
		'employee_id', employee_id,
		'provider_status', 'provider_not_configured'
	);

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
		'provider_status', 'provider_not_configured'
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

grant execute on function public.send_support_reply(uuid, text, public.support_message_channel, jsonb) to authenticated;
