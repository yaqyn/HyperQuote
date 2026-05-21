alter type public.audit_event_type add value if not exists 'support_conversation_linked_to_customer';

create or replace function public.link_support_conversation_to_customer(
	p_conversation_id uuid
)
returns public.support_conversations
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	matched_customer_id uuid;
	normalized_phone text;
	conversation_row public.support_conversations%rowtype;
	updated public.support_conversations%rowtype;
begin
	employee_id := public.require_panel('customer_service', true);

	select *
	into conversation_row
	from public.support_conversations
	where id = p_conversation_id
	for update;

	if conversation_row.id is null then
		raise exception 'support_conversation_not_found' using errcode = '02000';
	end if;
	if conversation_row.channel <> 'whatsapp' then
		raise exception 'support_conversation_not_whatsapp' using errcode = '23514';
	end if;
	if conversation_row.customer_id is not null then
		return conversation_row;
	end if;
	if conversation_row.phone is null or length(trim(conversation_row.phone)) = 0 then
		raise exception 'support_conversation_phone_required' using errcode = '23514';
	end if;

	normalized_phone := regexp_replace(conversation_row.phone, '[^0-9+]', '', 'g');

	select id
	into matched_customer_id
	from public.customers
	where status <> 'inactive'
		and regexp_replace(phone, '[^0-9+]', '', 'g') = normalized_phone
	order by
		case when user_id is not null then 0 else 1 end,
		created_at desc
	limit 1;

	if matched_customer_id is null then
		raise exception 'support_customer_phone_not_found' using errcode = '02000';
	end if;

	update public.support_conversations
	set customer_id = matched_customer_id,
		status = 'open'
	where id = p_conversation_id
	returning * into updated;

	perform public.log_activity(
		'support_conversation',
		p_conversation_id,
		'support_conversation_linked_to_customer',
		jsonb_build_object(
			'employee_id', employee_id,
			'customer_id', matched_customer_id,
			'phone', normalized_phone
		)
	);

	return updated;
end;
$$;

revoke all on function public.link_support_conversation_to_customer(uuid) from public;
grant execute on function public.link_support_conversation_to_customer(uuid) to authenticated;
