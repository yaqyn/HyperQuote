create or replace view public.ceo_search_activity_vtable
with (security_invoker = true)
as
with base as (
	select
		ba.*,
		ae.details as event_details
	from public.ceo_business_activity_vtable ba
	join public.activity_events ae on ae.id = ba.id
),
change_candidates as (
	select
		base.*,
		case
			when nullif(base.event_details->>'old_price', '') is not null
				or nullif(base.event_details->>'new_price', '') is not null
				or nullif(base.event_details->>'from_price', '') is not null
				or nullif(base.event_details->>'to_price', '') is not null
				or nullif(base.event_details->>'previous_price', '') is not null
				or nullif(base.event_details->>'updated_price', '') is not null
				then 'Price'
			when nullif(base.event_details->>'old_last_quoted_at', '') is not null
				or nullif(base.event_details->>'new_last_quoted_at', '') is not null
				then 'Price freshness'
			when nullif(base.from_status, '') is not null
				or nullif(base.to_status, '') is not null
				or nullif(base.event_details->>'old_status', '') is not null
				or nullif(base.event_details->>'new_status', '') is not null
				or nullif(base.event_details->>'from_status', '') is not null
				or nullif(base.event_details->>'to_status', '') is not null
				then 'Status'
			when nullif(base.event_details->>'old_quantity', '') is not null
				or nullif(base.event_details->>'new_quantity', '') is not null
				or nullif(base.event_details->>'from_quantity', '') is not null
				or nullif(base.event_details->>'to_quantity', '') is not null
				then 'Quantity'
			else null
		end as changed_field,
		coalesce(
			nullif(base.event_details->>'old_price', ''),
			nullif(base.event_details->>'from_price', ''),
			nullif(base.event_details->>'previous_price', ''),
			nullif(base.event_details->>'old_last_quoted_at', ''),
			nullif(base.event_details->>'old_status', ''),
			nullif(base.event_details->>'from_status', ''),
			nullif(base.from_status, ''),
			nullif(base.event_details->>'old_quantity', ''),
			nullif(base.event_details->>'from_quantity', '')
		) as raw_from_value,
		coalesce(
			nullif(base.event_details->>'new_price', ''),
			nullif(base.event_details->>'to_price', ''),
			nullif(base.event_details->>'updated_price', ''),
			nullif(base.event_details->>'new_last_quoted_at', ''),
			nullif(base.event_details->>'new_status', ''),
			nullif(base.event_details->>'to_status', ''),
			nullif(base.to_status, ''),
			nullif(base.event_details->>'new_quantity', ''),
			nullif(base.event_details->>'to_quantity', '')
		) as raw_to_value
	from base
),
formatted_changes as (
	select
		change_candidates.*,
		case
			when change_candidates.raw_from_value is null then null
			when change_candidates.raw_from_value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
				then null
			when change_candidates.changed_field = 'Price'
				and change_candidates.raw_from_value ~ '^-?[0-9]+(\.[0-9]+)?$'
				then concat(
					to_char(change_candidates.raw_from_value::numeric, 'FM999G999G999G990D00'),
					' LE'
				)
			when change_candidates.changed_field = 'Price freshness'
				and change_candidates.raw_from_value ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
				then to_char(
					change_candidates.raw_from_value::timestamptz at time zone 'Africa/Cairo',
					'FMMonth FMDD, YYYY, HH12:MI AM'
				)
			when change_candidates.changed_field = 'Status'
				then initcap(replace(change_candidates.raw_from_value, '_', ' '))
			else change_candidates.raw_from_value
		end as from_value,
		case
			when change_candidates.raw_to_value is null then null
			when change_candidates.raw_to_value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
				then null
			when change_candidates.changed_field = 'Price'
				and change_candidates.raw_to_value ~ '^-?[0-9]+(\.[0-9]+)?$'
				then concat(
					to_char(change_candidates.raw_to_value::numeric, 'FM999G999G999G990D00'),
					' LE'
				)
			when change_candidates.changed_field = 'Price freshness'
				and change_candidates.raw_to_value ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
				then to_char(
					change_candidates.raw_to_value::timestamptz at time zone 'Africa/Cairo',
					'FMMonth FMDD, YYYY, HH12:MI AM'
				)
			when change_candidates.changed_field = 'Status'
				then initcap(replace(change_candidates.raw_to_value, '_', ' '))
			else change_candidates.raw_to_value
		end as to_value
	from change_candidates
),
targets as (
	select
		formatted_changes.*,
		coalesce(
			nullif(formatted_changes.target, ''),
			nullif(formatted_changes.product_name, ''),
			nullif(formatted_changes.order_number, ''),
			nullif(formatted_changes.request_number, ''),
			nullif(formatted_changes.quote_number, ''),
			nullif(formatted_changes.delivery_number, ''),
			nullif(formatted_changes.customer_name, ''),
			nullif(formatted_changes.supplier_name, ''),
			nullif(initcap(replace(formatted_changes.source_entity_type, '_', ' ')), ''),
			'the record'
		) as target_label,
		to_char(
			formatted_changes.created_at at time zone 'Africa/Cairo',
			'FMMonth FMDD, YYYY, HH12:MI AM'
		) as when_label
	from formatted_changes
),
descriptions as (
	select
		targets.*,
		coalesce(
			case
				when targets.changed_field = 'Price'
					and targets.from_value is not null
					and targets.to_value is not null
					then concat(
						'Changed price of ',
						targets.target_label,
						' from ',
						targets.from_value,
						' to ',
						targets.to_value
					)
				when targets.changed_field = 'Price freshness'
					and targets.from_value is not null
					and targets.to_value is not null
					then concat(
						'Marked price freshness for ',
						targets.target_label,
						' from ',
						targets.from_value,
						' to ',
						targets.to_value
					)
				when targets.changed_field = 'Status'
					and targets.from_value is not null
					and targets.to_value is not null
					then concat(
						'Changed status of ',
						targets.target_label,
						' from ',
						targets.from_value,
						' to ',
						targets.to_value
					)
				when targets.changed_field is not null
					and targets.from_value is not null
					and targets.to_value is not null
					then concat(
						'Changed ',
						lower(targets.changed_field),
						' of ',
						targets.target_label,
						' from ',
						targets.from_value,
						' to ',
						targets.to_value
					)
				when targets.action = 'price_update_requested'
					then concat('Requested a price update for ', targets.target_label)
				else null
			end,
			case
				when targets.actor_label is not null
					and left(targets.headline, char_length(targets.actor_label) + 1) = concat(targets.actor_label, ' ')
					then nullif(substr(targets.headline, char_length(targets.actor_label) + 2), '')
				else nullif(targets.headline, '')
			end,
			targets.action_label
		) as what_happened
	from targets
),
narratives as (
	select
		descriptions.*,
		concat_ws(
			' ',
			nullif(descriptions.actor_label, ''),
			case
				when descriptions.actor_type = 'Employee'
					and nullif(descriptions.area, '') is not null
					then concat('from ', descriptions.area)
				else null
			end,
			case
				when descriptions.what_happened is not null
					then concat(
						lower(left(descriptions.what_happened, 1)),
						substr(descriptions.what_happened, 2)
					)
				else null
			end,
			case when descriptions.when_label is not null then 'on' else null end,
			descriptions.when_label
		) as activity_sentence
	from descriptions
)
select
	'activity'::text as entity_type,
	n.id::text as entity_id,
	coalesce(nullif(n.activity_sentence, ''), n.headline) as title,
	n.area as subtitle,
	jsonb_strip_nulls(
		jsonb_build_object(
			'action', n.action,
			'action_label', n.action_label,
			'area', n.area,
			'department', case when n.actor_type = 'Employee' then n.area else null end,
			'headline', n.headline,
			'activity_sentence', n.activity_sentence,
			'who', n.actor_label,
			'what', n.what_happened,
			'when', n.when_label,
			'changed_field', n.changed_field,
			'from_value', n.from_value,
			'to_value', n.to_value,
			'actor', n.actor_label,
			'actor_type', n.actor_type,
			'source', n.source,
			'target', n.target_label,
			'customer', n.customer_name,
			'contact', n.customer_contact,
			'phone', n.customer_phone,
			'email', n.customer_email
		) ||
		jsonb_build_object(
			'request_number', n.request_number,
			'order_number', n.order_number,
			'quote_number', n.quote_number,
			'delivery_number', n.delivery_number,
			'delivery_address', n.delivery_address,
			'items', n.item_summary,
			'product', n.product_name,
			'product_sku', n.product_sku,
			'product_category', n.product_category,
			'supplier', n.supplier_name,
			'driver', n.driver_name,
			'driver_phone', n.driver_phone,
			'truck', n.truck_plate,
			'truck_type', n.truck_type,
			'support_reference', n.support_reference,
			'support_subject', n.support_subject,
			'role', n.role,
			'scope', n.scope,
			'row_count', n.row_count,
			'contact_channel', n.contact_channel,
			'from_status', n.from_status,
			'to_status', n.to_status,
			'reason', n.reason,
			'outcome', n.outcome,
			'notes', n.notes,
			'follow_up_state', n.follow_up_state,
			'follow_up_due_at', n.follow_up_due_at,
			'amount', n.amount,
			'payment_fraction', n.payment_fraction,
			'total_amount', n.total_amount,
			'created_at', n.created_at
		)
	) as metadata,
	n.created_at as sort_at,
	concat_ws(
		' ',
		'activity',
		n.area,
		n.action,
		n.action_label,
		n.headline,
		n.activity_sentence,
		n.actor_label,
		n.actor_type,
		n.what_happened,
		n.changed_field,
		n.from_value,
		n.to_value,
		n.source,
		n.target_label,
		n.customer_name,
		n.customer_contact,
		n.customer_phone,
		n.customer_email,
		n.request_number,
		n.order_number,
		n.quote_number,
		n.delivery_number,
		n.delivery_address,
		n.item_summary,
		n.product_name,
		n.product_sku,
		n.product_category,
		n.supplier_name,
		n.driver_name,
		n.driver_phone,
		n.truck_plate,
		n.truck_type,
		n.support_reference,
		n.support_subject,
		n.role,
		n.scope,
		n.row_count::text,
		n.contact_channel,
		n.from_status,
		n.to_status,
		n.reason,
		n.outcome,
		n.notes,
		n.follow_up_state,
		n.follow_up_due_at::text,
		n.amount::text,
		n.payment_fraction::text,
		n.total_amount::text,
		public.ceo_search_date_terms(n.created_at)
	) as search_text
from narratives n;

select app_private.refresh_ceo_search_documents_if_dirty(true);
