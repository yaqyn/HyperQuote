-- Supplier records remain internal business data. These objects only powered
-- the deferred customer team/referral and fake session surfaces.
drop function if exists public.service_transfer_team_ownership(uuid, text, uuid);
drop function if exists public.transfer_team_ownership(uuid);

drop table if exists public.team_invites;
drop table if exists public.team_members;
drop table if exists public.referrals;
drop table if exists public.user_sessions;

drop type if exists public.referral_status;
drop type if exists public.team_member_role;
drop type if exists public.team_invite_status;

-- Notification settings were rendered per event but persisted only per channel.
-- Preserve existing channel choices while making the stored contract match the UI.
create type public.notification_event as enum (
	'quote_ready',
	'order_status',
	'delivery_update',
	'invoice_generated',
	'payment_confirmation',
	'support_response'
);

alter table public.notification_preferences
	add column event public.notification_event;

drop index if exists public.notification_preferences_unique_target_channel_idx;

update public.notification_preferences
set event = 'quote_ready';

insert into public.notification_preferences (
	user_id,
	customer_id,
	channel,
	event,
	enabled,
	created_at,
	updated_at
)
select
	preference.user_id,
	preference.customer_id,
	preference.channel,
	notification.notification_event,
	preference.enabled,
	preference.created_at,
	preference.updated_at
from public.notification_preferences as preference
cross join unnest(array[
	'order_status',
	'delivery_update',
	'invoice_generated',
	'payment_confirmation',
	'support_response'
]::public.notification_event[]) as notification(notification_event);

alter table public.notification_preferences
	alter column event set not null;

create unique index notification_preferences_unique_target_channel_event_idx
	on public.notification_preferences (
		user_id,
		customer_id,
		channel,
		event
	) nulls not distinct;
