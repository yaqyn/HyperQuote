create or replace function app_private.sync_customer_auth_metadata()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
	next_metadata jsonb;
begin
	if tg_op = 'UPDATE'
		and old.user_id is not null
		and old.user_id is distinct from new.user_id
	then
		update auth.users
		set raw_app_meta_data =
			(coalesce(raw_app_meta_data, '{}'::jsonb) - 'customer_id')
			|| jsonb_build_object(
				'pool', 'external',
				'roles', jsonb_build_array('customer')
			)
		where id = old.user_id
		  and raw_app_meta_data ->> 'customer_id' = old.id::text;
	end if;

	if new.user_id is null then
		return new;
	end if;

	next_metadata := coalesce(
		(select raw_app_meta_data from auth.users where id = new.user_id),
		'{}'::jsonb
	);

	if new.status in ('active', 'claimed') then
		next_metadata := next_metadata || jsonb_build_object(
			'pool', 'external',
			'roles', jsonb_build_array('customer'),
			'customer_id', new.id
		);
	else
		if next_metadata ->> 'customer_id' = new.id::text then
			next_metadata := next_metadata - 'customer_id';
		end if;
		next_metadata := next_metadata || jsonb_build_object(
			'pool', 'external',
			'roles', jsonb_build_array('customer')
		);
	end if;

	update auth.users
	set raw_app_meta_data = next_metadata
	where id = new.user_id;

	return new;
end;
$$;
