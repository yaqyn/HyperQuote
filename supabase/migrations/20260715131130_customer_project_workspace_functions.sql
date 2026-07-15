create or replace function app_private.touch_project_activity()
returns trigger
language plpgsql
set search_path = public, app_private
as $$
begin
	if tg_op = 'INSERT' then
		if new.project_id is not null then
			update public.projects set last_activity_at = now()
			where id = new.project_id;
		end if;
		return new;
	end if;

	if old.project_id is distinct from new.project_id then
		if old.project_id is not null then
			update public.projects set last_activity_at = now()
			where id = old.project_id;
		end if;
		if new.project_id is not null then
			update public.projects set last_activity_at = now()
			where id = new.project_id;
		end if;
	elsif new.project_id is not null and (
		old.status is distinct from new.status
		or old.updated_at is distinct from new.updated_at
	) then
		update public.projects set last_activity_at = now()
		where id = new.project_id;
	end if;
	return new;
end;
$$;

drop trigger if exists quote_requests_touch_project_activity
	on public.quote_requests;
create trigger quote_requests_touch_project_activity
	after insert or update of project_id, status, updated_at on public.quote_requests
	for each row execute function app_private.touch_project_activity();

create or replace function app_private.record_project_created()
returns trigger
language plpgsql
set search_path = public, app_private
as $$
begin
	perform public.log_activity(
		'project', new.id, 'project_created',
		jsonb_build_object('name', new.name, 'customer_id', new.customer_id)
	);
	return new;
end;
$$;

drop trigger if exists projects_record_created on public.projects;
create trigger projects_record_created
	after insert on public.projects
	for each row execute function app_private.record_project_created();

create or replace function app_private.require_quote_delivery_snapshot_on_submit()
returns trigger
language plpgsql
set search_path = public, app_private
as $$
declare
	v_address public.customer_addresses%rowtype;
	v_site_id uuid;
begin
	if old.status = 'draft' and new.status <> 'draft' then
		if new.delivery_latitude is null or new.delivery_longitude is null then
			if new.delivery_address_id is not null then
				select * into v_address
				from public.customer_addresses
				where id = new.delivery_address_id
					and customer_id = new.customer_id;
			end if;
			if v_address.latitude is null or v_address.longitude is null then
				raise exception 'map_selected_delivery_point_required' using errcode = '23514';
			end if;
			new.delivery_address_text := coalesce(v_address.location_name, v_address.street);
			new.delivery_location_name := coalesce(v_address.location_name, v_address.street);
			new.delivery_location_name_ar := coalesce(v_address.location_name_ar, v_address.location_name, v_address.street);
			new.delivery_latitude := v_address.latitude;
			new.delivery_longitude := v_address.longitude;
		end if;

		if nullif(trim(new.delivery_location_name), '') is null
			or nullif(trim(new.delivery_location_name_ar), '') is null then
			raise exception 'map_location_name_required' using errcode = '23514';
		end if;

		select id into v_site_id
		from public.customer_addresses
		where customer_id = new.customer_id
			and source = 'quote_submission'
			and latitude = new.delivery_latitude
			and longitude = new.delivery_longitude
		order by last_used_at desc nulls last, created_at desc
		limit 1;

		perform set_config('app.quote_map_location_write', 'true', true);
		if v_site_id is null then
			insert into public.customer_addresses (
				customer_id, label, street, area, city, governorate,
				latitude, longitude, is_default, source, location_name,
				location_name_ar, last_used_at, use_count
			) values (
				new.customer_id, 'Sales quote site', new.delivery_location_name,
				null, '', '', new.delivery_latitude, new.delivery_longitude,
				false, 'quote_submission', new.delivery_location_name,
				new.delivery_location_name_ar, now(), 1
			) returning id into v_site_id;
		else
			update public.customer_addresses
			set street = new.delivery_location_name,
				location_name = new.delivery_location_name,
				location_name_ar = new.delivery_location_name_ar,
				last_used_at = now(), use_count = use_count + 1
			where id = v_site_id;
		end if;
		perform set_config('app.quote_map_location_write', 'false', true);
		new.delivery_address_id := v_site_id;
	end if;
	return new;
end;
$$;

create or replace function app_private.guard_sales_quote_site_location()
returns trigger
language plpgsql
set search_path = public, app_private
as $$
begin
	if coalesce(current_setting('app.quote_map_location_write', true), '') <> 'true'
		and (
			coalesce(new.source, '') = 'quote_submission'
			or coalesce(old.source, '') = 'quote_submission'
			or coalesce(new.label, '') = 'Sales quote site'
			or coalesce(old.label, '') = 'Sales quote site'
		) then
		raise exception 'sales_quote_location_map_required' using errcode = '42501';
	end if;
	return coalesce(new, old);
end;
$$;

create or replace function public.sales_set_quote_delivery_location(
	p_quote_request_id uuid,
	p_address_text text,
	p_street text,
	p_area text,
	p_city text,
	p_governorate text,
	p_latitude numeric,
	p_longitude numeric
)
returns public.quote_requests
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	v_request public.quote_requests%rowtype;
	v_address_id uuid;
begin
	perform public.require_panel('sales', true);
	if nullif(trim(p_address_text), '') is null
		or p_latitude not between 21.7 and 31.8
		or p_longitude not between 24.6 and 36.9 then
		raise exception 'invalid_delivery_point' using errcode = '22023';
	end if;

	select * into v_request
	from public.quote_requests
	where id = p_quote_request_id
	for update;
	if v_request.id is null or v_request.customer_id is null then
		raise exception 'quote_request_not_found' using errcode = '02000';
	end if;

	if v_request.delivery_address_id is not null then
		select id into v_address_id
		from public.customer_addresses
		where id = v_request.delivery_address_id
			and customer_id = v_request.customer_id
			and (source = 'quote_submission' or label = 'Sales quote site');
	end if;

	perform set_config('app.quote_map_location_write', 'true', true);
	if v_address_id is null then
		insert into public.customer_addresses (
			customer_id, label, street, area, city, governorate,
			latitude, longitude, is_default, source, location_name,
			location_name_ar, last_used_at, use_count
		) values (
			v_request.customer_id, 'Sales quote site', trim(p_street),
			nullif(trim(p_area), ''), trim(p_city), trim(p_governorate),
			p_latitude, p_longitude, false, 'quote_submission',
			trim(p_address_text), trim(p_address_text), now(), 1
		) returning id into v_address_id;
	else
		update public.customer_addresses
		set label = 'Sales quote site', street = trim(p_street),
			area = nullif(trim(p_area), ''), city = trim(p_city),
			governorate = trim(p_governorate), latitude = p_latitude,
			longitude = p_longitude, source = 'quote_submission',
			location_name = trim(p_address_text),
			location_name_ar = trim(p_address_text), last_used_at = now()
		where id = v_address_id;
	end if;

	update public.quote_requests
	set delivery_address_id = v_address_id,
		delivery_address_text = trim(p_address_text),
		delivery_location_name = trim(p_address_text),
		delivery_location_name_ar = trim(p_address_text),
		delivery_latitude = p_latitude,
		delivery_longitude = p_longitude
	where id = p_quote_request_id
	returning * into v_request;
	perform set_config('app.quote_map_location_write', 'false', true);

	return v_request;
end;
$$;

create or replace function public.customer_set_quote_request_project(
	p_quote_request_id uuid,
	p_project_id uuid
)
returns public.quote_requests
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	v_customer_id uuid := public.current_customer_id();
	v_previous_project_id uuid;
	v_request public.quote_requests%rowtype;
begin
	if v_customer_id is null then
		raise exception 'customer_required' using errcode = '42501';
	end if;
	if p_project_id is not null and not exists (
		select 1 from public.projects
		where id = p_project_id and customer_id = v_customer_id and not archived
	) then
		raise exception 'project_not_found' using errcode = '02000';
	end if;

	select project_id into v_previous_project_id
	from public.quote_requests
	where id = p_quote_request_id and customer_id = v_customer_id
	for update;
	if not found then
		raise exception 'quote_request_not_found' using errcode = '02000';
	end if;

	update public.quote_requests
	set project_id = p_project_id
	where id = p_quote_request_id and customer_id = v_customer_id
	returning * into v_request;

	update public.quotes
	set project_id = p_project_id
	where quote_request_id = p_quote_request_id and customer_id = v_customer_id;

	perform public.log_activity(
		'quote_request', p_quote_request_id, 'project_assignment_changed',
		jsonb_build_object(
			'from_project_id', v_previous_project_id,
			'to_project_id', p_project_id,
			'assigned_by', 'customer'
		)
	);
	return v_request;
end;
$$;

create or replace function public.sales_set_quote_request_project(
	p_quote_request_id uuid,
	p_project_id uuid
)
returns public.quote_requests
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	v_previous_project_id uuid;
	v_request public.quote_requests%rowtype;
begin
	perform public.require_panel('sales', true);
	select project_id into v_previous_project_id
	from public.quote_requests
	where id = p_quote_request_id
	for update;
	if not found then
		raise exception 'quote_request_not_found' using errcode = '02000';
	end if;
	if p_project_id is not null and not exists (
		select 1 from public.projects
		where id = p_project_id
			and customer_id = (select customer_id from public.quote_requests where id = p_quote_request_id)
			and not archived
	) then
		raise exception 'project_not_found' using errcode = '02000';
	end if;

	update public.quote_requests
	set project_id = p_project_id
	where id = p_quote_request_id
	returning * into v_request;
	update public.quotes set project_id = p_project_id
	where quote_request_id = p_quote_request_id;

	perform public.log_activity(
		'quote_request', p_quote_request_id, 'project_assignment_changed',
		jsonb_build_object(
			'from_project_id', v_previous_project_id,
			'to_project_id', p_project_id,
			'assigned_by', 'sales'
		)
	);
	return v_request;
end;
$$;

create or replace function public.service_customer_set_quote_request_project(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_quote_request_id uuid,
	p_project_id uuid
)
returns public.quote_requests
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.customer_set_quote_request_project(p_quote_request_id, p_project_id);
end;
$$;

create or replace function public.service_sales_set_quote_request_project(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_quote_request_id uuid,
	p_project_id uuid
)
returns public.quote_requests
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.sales_set_quote_request_project(p_quote_request_id, p_project_id);
end;
$$;

revoke all on function public.customer_set_quote_request_project(uuid, uuid)
	from public, anon, authenticated;
revoke all on function public.sales_set_quote_request_project(uuid, uuid)
	from public, anon, authenticated;
revoke all on function public.service_customer_set_quote_request_project(uuid, text, uuid, uuid)
	from public, anon, authenticated;
revoke all on function public.service_sales_set_quote_request_project(uuid, text, uuid, uuid)
	from public, anon, authenticated;
grant execute on function public.service_customer_set_quote_request_project(uuid, text, uuid, uuid)
	to service_role;
grant execute on function public.service_sales_set_quote_request_project(uuid, text, uuid, uuid)
	to service_role;
