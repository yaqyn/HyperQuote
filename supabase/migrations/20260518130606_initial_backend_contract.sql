set check_function_bodies = off;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create schema if not exists app_private;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

create or replace function public.next_quote_request_number()
returns text
language plpgsql
as $$
declare
	next_value bigint;
begin
	next_value := nextval('public.quote_request_number_seq');
	return 'QR-' || to_char(now(), 'YYYY') || '-' || lpad(next_value::text, 5, '0');
end;
$$;

create or replace function public.next_order_number()
returns text
language plpgsql
as $$
declare
	next_value bigint;
begin
	next_value := nextval('public.order_number_seq');
	return 'ORD-' || to_char(now(), 'YYYY') || '-' || lpad(next_value::text, 5, '0');
end;
$$;

create sequence if not exists public.quote_request_number_seq as bigint start with 1;
create sequence if not exists public.order_number_seq as bigint start with 1;

create table public.profiles (
	id uuid primary key default gen_random_uuid(),
	auth_user_id uuid not null unique references auth.users(id) on delete cascade,
	account_type text not null check (account_type in ('customer', 'employee', 'driver')),
	display_name text not null,
	phone text,
	email text,
	status text not null default 'active' check (status in ('invited', 'active', 'disabled')),
	locale text not null default 'en',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.customers (
	id uuid primary key default gen_random_uuid(),
	user_id uuid unique references auth.users(id) on delete set null,
	company_name text not null,
	contact_name text not null,
	phone text not null unique,
	email text,
	status text not null default 'active' check (status in ('unclaimed', 'claimed', 'active', 'inactive')),
	trade_license_status text not null default 'not_uploaded' check (
		trade_license_status in ('not_uploaded', 'under_review', 'approved', 'rejected')
	),
	profile_photo_url text,
	created_by_employee_id uuid,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.employees (
	id uuid primary key default gen_random_uuid(),
	user_id uuid unique references auth.users(id) on delete set null,
	full_name text not null,
	email text not null unique,
	phone text,
	status text not null default 'active' check (status in ('invited', 'active', 'disabled')),
	is_ceo boolean not null default false,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

alter table public.customers
	add constraint customers_created_by_employee_id_fkey
	foreign key (created_by_employee_id) references public.employees(id) on delete set null;

create table public.employee_roles (
	id uuid primary key default gen_random_uuid(),
	employee_id uuid not null references public.employees(id) on delete cascade,
	role text not null check (
		role in (
			'admin',
			'sales',
			'inventory',
			'warehouse',
			'finance',
			'dispatch',
			'customer_service',
			'driver_manager',
			'ceo'
		)
	),
	created_at timestamptz not null default now(),
	unique (employee_id, role)
);

create table public.employee_panel_permissions (
	id uuid primary key default gen_random_uuid(),
	employee_id uuid not null references public.employees(id) on delete cascade,
	panel text not null check (
		panel in (
			'sales',
			'inventory',
			'warehouse',
			'finance',
			'dispatch',
			'customer_service',
			'admin',
			'search'
		)
	),
	can_read boolean not null default true,
	can_write boolean not null default false,
	created_at timestamptz not null default now(),
	unique (employee_id, panel)
);

create table public.drivers (
	id uuid primary key default gen_random_uuid(),
	user_id uuid unique references auth.users(id) on delete set null,
	full_name text not null,
	email text unique,
	phone text not null unique,
	status text not null default 'offline' check (
		status in ('invited', 'available', 'on_delivery', 'offline', 'disabled')
	),
	vehicle_label text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.user_profiles (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null unique references auth.users(id) on delete cascade,
	user_type text not null check (user_type in ('customer', 'internal', 'driver')),
	customer_id uuid references public.customers(id) on delete cascade,
	employee_id uuid references public.employees(id) on delete cascade,
	driver_id uuid references public.drivers(id) on delete cascade,
	display_name text not null,
	email text,
	phone text,
	is_active boolean not null default true,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	check (
		(customer_id is not null)::int +
		(employee_id is not null)::int +
		(driver_id is not null)::int = 1
	)
);

create table public.user_roles (
	id uuid primary key default gen_random_uuid(),
	user_profile_id uuid not null references public.user_profiles(id) on delete cascade,
	role text not null,
	created_at timestamptz not null default now(),
	unique (user_profile_id, role)
);

create table public.categories (
	id uuid primary key default gen_random_uuid(),
	slug text not null unique,
	name text not null,
	name_ar text,
	parent_id uuid references public.categories(id) on delete set null,
	is_active boolean not null default true,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.suppliers (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	phone text,
	email text,
	status text not null default 'active' check (status in ('active', 'inactive', 'blocked')),
	notes text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.products (
	id uuid primary key default gen_random_uuid(),
	sku text not null unique,
	slug text not null unique,
	name text not null,
	name_ar text not null default '',
	description text,
	description_ar text,
	category text not null,
	subcategory text,
	brand text,
	manufacturer text,
	specifications jsonb not null default '{}'::jsonb,
	unit_of_measure text not null,
	weight_kg numeric,
	price_range_min numeric,
	price_range_max numeric,
	price_tier text check (price_tier in ('budget', 'mid_range', 'premium')),
	availability_status text not null default 'available' check (
		availability_status in ('available', 'low_stock', 'out_of_stock', 'hidden')
	),
	image_urls text[] not null default '{}',
	tags text[] not null default '{}',
	is_stockable boolean not null default true,
	is_active boolean not null default true,
	search_vector tsvector generated always as (
		setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
		setweight(to_tsvector('english', coalesce(name_ar, '')), 'A') ||
		setweight(to_tsvector('english', coalesce(sku, '')), 'B') ||
		setweight(to_tsvector('english', coalesce(category, '')), 'C')
	) stored,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index products_search_vector_idx on public.products using gin (search_vector);
create index products_category_idx on public.products (category) where is_active;
create index products_name_trgm_idx on public.products using gin (name gin_trgm_ops);

create table public.supplier_product_links (
	id uuid primary key default gen_random_uuid(),
	supplier_id uuid not null references public.suppliers(id) on delete cascade,
	product_id uuid not null references public.products(id) on delete cascade,
	raw_cost numeric not null check (raw_cost >= 0),
	lead_time_days integer not null default 1 check (lead_time_days >= 0),
	min_order_qty numeric not null default 1 check (min_order_qty > 0),
	is_primary boolean not null default false,
	last_quoted_at timestamptz,
	notes text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (supplier_id, product_id)
);

create table public.price_update_requests (
	id uuid primary key default gen_random_uuid(),
	product_id uuid not null references public.products(id) on delete restrict,
	quote_request_id uuid,
	requested_by_employee_id uuid references public.employees(id) on delete set null,
	assigned_employee_id uuid references public.employees(id) on delete set null,
	reason text not null,
	status text not null default 'pending' check (status in ('pending', 'resolved', 'canceled')),
	resolved_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.price_updates (
	id uuid primary key default gen_random_uuid(),
	product_id uuid not null references public.products(id) on delete restrict,
	supplier_id uuid not null references public.suppliers(id) on delete restrict,
	updated_by_employee_id uuid references public.employees(id) on delete set null,
	old_price numeric,
	new_price numeric not null check (new_price >= 0),
	proof_path text not null,
	notes text,
	created_at timestamptz not null default now()
);

create table public.customer_addresses (
	id uuid primary key default gen_random_uuid(),
	customer_id uuid not null references public.customers(id) on delete cascade,
	label text,
	street text not null,
	area text,
	city text not null,
	governorate text not null,
	landmark text,
	phone text,
	postal_code text,
	is_default boolean not null default false,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.projects (
	id uuid primary key default gen_random_uuid(),
	customer_id uuid not null references public.customers(id) on delete cascade,
	name text not null,
	description text,
	archived boolean not null default false,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.referrals (
	id uuid primary key default gen_random_uuid(),
	customer_id uuid not null references public.customers(id) on delete cascade,
	referral_code text not null unique,
	referred_email text,
	status text not null default 'pending' check (status in ('pending', 'converted', 'credited', 'canceled')),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.quote_requests (
	id uuid primary key default gen_random_uuid(),
	request_number text not null unique default public.next_quote_request_number(),
	customer_id uuid references public.customers(id) on delete restrict,
	status text not null default 'draft' check (
		status in (
			'draft',
			'submitted',
			'assigned',
			'saved',
			'approved',
			'rejected',
			'canceled',
			'finance',
			'inventory',
			'warehouse',
			'dispatch',
			'delivered'
		)
	),
	urgency text not null default 'standard' check (urgency in ('standard', 'urgent')),
	project_id uuid references public.projects(id) on delete set null,
	delivery_address_id uuid references public.customer_addresses(id) on delete set null,
	delivery_date date,
	notes text,
	attachment_urls text[] not null default '{}',
	submitted_at timestamptz,
	submitted_by uuid references auth.users(id) on delete set null,
	idempotency_key uuid unique,
	approval_required boolean not null default false,
	assigned_employee_id uuid references public.employees(id) on delete set null,
	assigned_at timestamptz,
	eligible_at timestamptz not null default now(),
	rejected_reason text,
	rejected_proof jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

alter table public.price_update_requests
	add constraint price_update_requests_quote_request_id_fkey
	foreign key (quote_request_id) references public.quote_requests(id) on delete cascade;

create index quote_requests_sales_queue_idx
	on public.quote_requests (eligible_at, created_at)
	where status = 'submitted';

create table public.quote_request_items (
	id uuid primary key default gen_random_uuid(),
	quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
	product_id uuid references public.products(id) on delete set null,
	customer_description text not null,
	quantity numeric not null check (quantity > 0),
	unit_of_measure text not null,
	notes text,
	match_confidence numeric check (match_confidence is null or (match_confidence >= 0 and match_confidence <= 1)),
	sort_order integer not null default 0,
	is_unmatched boolean not null default false,
	created_at timestamptz not null default now()
);

create table public.approvals (
	id uuid primary key default gen_random_uuid(),
	approval_type text not null,
	entity_type text not null,
	entity_id uuid not null,
	requested_by uuid references auth.users(id) on delete set null,
	assigned_to uuid references auth.users(id) on delete set null,
	status text not null default 'pending' check (status in ('pending', 'approved', 'changes_requested', 'rejected', 'canceled')),
	context jsonb not null default '{}'::jsonb,
	decided_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.sales_quote_versions (
	id uuid primary key default gen_random_uuid(),
	quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
	version_number integer not null,
	created_by_employee_id uuid references public.employees(id) on delete set null,
	status text not null default 'draft' check (status in ('draft', 'approved', 'sent', 'rejected')),
	subtotal numeric not null default 0,
	tax_amount numeric not null default 0,
	delivery_fee numeric not null default 0,
	discount_amount numeric not null default 0,
	total numeric not null default 0,
	notes text,
	created_at timestamptz not null default now(),
	unique (quote_request_id, version_number)
);

create table public.quotes (
	id uuid primary key default gen_random_uuid(),
	quote_number text not null unique default ('QT-' || to_char(now(), 'YYYY') || '-' || upper(substr(gen_random_uuid()::text, 1, 6))),
	quote_request_id uuid references public.quote_requests(id) on delete set null,
	customer_id uuid references public.customers(id) on delete restrict,
	project_id uuid references public.projects(id) on delete set null,
	version_number integer not null default 1,
	previous_version_id uuid references public.quotes(id) on delete set null,
	status text not null default 'draft' check (
		status in ('draft', 'sent', 'accepted', 'declined', 'negotiating', 'expired', 'revised')
	),
	subtotal numeric not null default 0,
	tax_amount numeric not null default 0,
	delivery_fee numeric not null default 0,
	discount_amount numeric not null default 0,
	total numeric not null default 0,
	currency text not null default 'EGP',
	payment_terms text,
	validity_days integer not null default 15,
	valid_until timestamptz not null default (now() + interval '15 days'),
	assigned_rep_name text,
	assigned_rep_phone text,
	accepted_at timestamptz,
	declined_at timestamptz,
	decline_reason text,
	decline_notes text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.quote_versions (
	id uuid primary key default gen_random_uuid(),
	quote_id uuid not null references public.quotes(id) on delete cascade,
	version_number integer not null,
	status text not null default 'draft',
	subtotal numeric not null default 0,
	total numeric not null default 0,
	notes text,
	created_at timestamptz not null default now(),
	unique (quote_id, version_number)
);

create table public.quote_items (
	id uuid primary key default gen_random_uuid(),
	quote_id uuid not null references public.quotes(id) on delete cascade,
	quote_version_id uuid references public.quote_versions(id) on delete cascade,
	product_id uuid references public.products(id) on delete set null,
	product_name text not null,
	product_name_ar text not null default '',
	quantity numeric not null check (quantity > 0),
	unit_of_measure text not null,
	unit_price numeric not null check (unit_price >= 0),
	line_total numeric not null check (line_total >= 0),
	margin_percent numeric,
	customer_counter_price numeric,
	line_status text not null default 'quoted' check (
		line_status in ('quoted', 'accepted', 'rejected', 'negotiate')
	),
	is_accepted boolean not null default false,
	reject_reason text,
	sort_order integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.quote_counter_offers (
	id uuid primary key default gen_random_uuid(),
	quote_id uuid not null references public.quotes(id) on delete cascade,
	counter_type text not null check (counter_type in ('total', 'per_line')),
	total_discount numeric,
	self_pickup boolean not null default false,
	notes text,
	line_items jsonb,
	created_at timestamptz not null default now()
);

create table public.orders (
	id uuid primary key default gen_random_uuid(),
	order_number text not null unique default public.next_order_number(),
	quote_id uuid references public.quotes(id) on delete set null,
	quote_request_id uuid references public.quote_requests(id) on delete set null,
	customer_id uuid references public.customers(id) on delete restrict,
	status text not null default 'confirmed' check (
		status in (
			'confirmed',
			'finance',
			'inventory',
			'reserved',
			'warehouse',
			'dispatch',
			'delivered',
			'rejected',
			'canceled'
		)
	),
	total_amount numeric not null default 0,
	reserved_at timestamptz,
	delivered_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.sales_call_notes (
	id uuid primary key default gen_random_uuid(),
	quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
	employee_id uuid references public.employees(id) on delete set null,
	outcome text not null,
	notes text,
	created_at timestamptz not null default now()
);

create table public.inventory_stock (
	id uuid primary key default gen_random_uuid(),
	product_id uuid not null unique references public.products(id) on delete cascade,
	on_hand_quantity numeric not null default 0 check (on_hand_quantity >= 0),
	reserved_quantity numeric not null default 0 check (reserved_quantity >= 0),
	available_quantity numeric generated always as (on_hand_quantity - reserved_quantity) stored,
	minimum_quantity numeric not null default 0 check (minimum_quantity >= 0),
	updated_at timestamptz not null default now(),
	check (reserved_quantity <= on_hand_quantity)
);

create table public.inventory_reservations (
	id uuid primary key default gen_random_uuid(),
	order_id uuid not null references public.orders(id) on delete cascade,
	product_id uuid not null references public.products(id) on delete restrict,
	quantity numeric not null check (quantity > 0),
	status text not null default 'reserved' check (status in ('reserved', 'released', 'consumed')),
	created_by_employee_id uuid references public.employees(id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (order_id, product_id, status)
);

create table public.refill_requests (
	id uuid primary key default gen_random_uuid(),
	product_id uuid not null references public.products(id) on delete restrict,
	supplier_id uuid not null references public.suppliers(id) on delete restrict,
	requested_by_employee_id uuid references public.employees(id) on delete set null,
	quantity numeric not null check (quantity > 0),
	unit_cost numeric not null check (unit_cost >= 0),
	status text not null default 'finance_pending' check (
		status in ('finance_pending', 'finance_approved', 'warehouse_receiving', 'received', 'rejected', 'canceled')
	),
	proof jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.customer_payments (
	id uuid primary key default gen_random_uuid(),
	order_id uuid not null references public.orders(id) on delete cascade,
	recorded_by_employee_id uuid references public.employees(id) on delete set null,
	amount numeric not null check (amount > 0),
	payment_fraction numeric not null check (payment_fraction in (0.5, 1.0)),
	proof_path text not null,
	status text not null default 'recorded' check (status in ('recorded', 'voided')),
	created_at timestamptz not null default now()
);

create table public.supplier_payments (
	id uuid primary key default gen_random_uuid(),
	refill_request_id uuid not null references public.refill_requests(id) on delete cascade,
	recorded_by_employee_id uuid references public.employees(id) on delete set null,
	amount numeric not null check (amount > 0),
	payment_fraction numeric not null check (payment_fraction in (0.5, 1.0)),
	proof_path text not null,
	status text not null default 'recorded' check (status in ('recorded', 'voided')),
	created_at timestamptz not null default now()
);

create table public.trucks (
	id uuid primary key default gen_random_uuid(),
	plate_number text not null unique,
	driver_id uuid references public.drivers(id) on delete set null,
	capacity_tons numeric,
	status text not null default 'available' check (status in ('available', 'loading', 'dispatched', 'maintenance')),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.loading_tasks (
	id uuid primary key default gen_random_uuid(),
	order_id uuid not null references public.orders(id) on delete cascade,
	advisor_employee_id uuid references public.employees(id) on delete set null,
	status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
	proof jsonb not null default '{}'::jsonb,
	rejection_reason text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.loading_task_drivers (
	id uuid primary key default gen_random_uuid(),
	loading_task_id uuid not null references public.loading_tasks(id) on delete cascade,
	driver_id uuid not null references public.drivers(id) on delete restrict,
	truck_id uuid references public.trucks(id) on delete set null,
	assigned_items jsonb not null default '[]'::jsonb,
	created_at timestamptz not null default now(),
	unique (loading_task_id, driver_id)
);

create table public.receiving_tasks (
	id uuid primary key default gen_random_uuid(),
	refill_request_id uuid not null references public.refill_requests(id) on delete cascade,
	advisor_employee_id uuid references public.employees(id) on delete set null,
	status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
	proof jsonb not null default '{}'::jsonb,
	rejection_reason text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.receiving_task_items (
	id uuid primary key default gen_random_uuid(),
	receiving_task_id uuid not null references public.receiving_tasks(id) on delete cascade,
	product_id uuid not null references public.products(id) on delete restrict,
	received_quantity numeric not null check (received_quantity >= 0),
	created_at timestamptz not null default now()
);

create table public.deliveries (
	id uuid primary key default gen_random_uuid(),
	delivery_number text not null unique default ('DL-' || to_char(now(), 'YYYY') || '-' || upper(substr(gen_random_uuid()::text, 1, 6))),
	order_id uuid references public.orders(id) on delete cascade,
	loading_task_id uuid references public.loading_tasks(id) on delete set null,
	driver_id uuid references public.drivers(id) on delete set null,
	truck_id uuid references public.trucks(id) on delete set null,
	status text not null default 'assigned' check (
		status in ('assigned', 'accepted', 'in_transit', 'arrived', 'completed', 'rejected')
	),
	rejection_reason text,
	rejection_proof jsonb,
	started_at timestamptz,
	arrived_at timestamptz,
	completed_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.driver_online_states (
	driver_id uuid primary key references public.drivers(id) on delete cascade,
	status text not null default 'offline' check (status in ('online', 'offline')),
	last_seen_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.driver_locations (
	id uuid primary key default gen_random_uuid(),
	driver_id uuid not null references public.drivers(id) on delete cascade,
	delivery_id uuid references public.deliveries(id) on delete set null,
	latitude numeric not null check (latitude between -90 and 90),
	longitude numeric not null check (longitude between -180 and 180),
	accuracy_meters numeric,
	heading numeric,
	speed_kmh numeric,
	source text not null default 'driver_app' check (source in ('driver_app', 'dispatch', 'system')),
	recorded_at timestamptz not null default now()
);

create index driver_locations_driver_recorded_idx
	on public.driver_locations (driver_id, recorded_at desc);

create table public.delivery_proofs (
	id uuid primary key default gen_random_uuid(),
	delivery_id uuid not null references public.deliveries(id) on delete cascade,
	driver_id uuid references public.drivers(id) on delete set null,
	proof_type text not null check (proof_type in ('signature', 'photo', 'note')),
	proof_path text,
	signer_name text,
	location jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now()
);

create table public.support_tickets (
	id uuid primary key default gen_random_uuid(),
	reference text not null unique default ('TK-' || to_char(now(), 'YYYY') || '-' || upper(substr(gen_random_uuid()::text, 1, 6))),
	customer_id uuid references public.customers(id) on delete set null,
	requester_name text,
	requester_email text not null,
	requester_phone text,
	subject text not null,
	status text not null default 'open' check (status in ('open', 'pending', 'closed')),
	source text not null default 'website' check (source in ('website', 'portal', 'whatsapp', 'internal')),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.support_conversations (
	id uuid primary key default gen_random_uuid(),
	customer_id uuid references public.customers(id) on delete set null,
	channel text not null check (channel in ('email', 'whatsapp')),
	external_thread_id text,
	phone text,
	email text,
	status text not null default 'open' check (status in ('open', 'closed')),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.support_messages (
	id uuid primary key default gen_random_uuid(),
	ticket_id uuid references public.support_tickets(id) on delete cascade,
	conversation_id uuid references public.support_conversations(id) on delete cascade,
	sender_type text not null check (sender_type in ('customer', 'employee', 'system', 'external')),
	sender_user_id uuid references auth.users(id) on delete set null,
	channel text not null check (channel in ('email', 'whatsapp', 'portal', 'website')),
	body text not null,
	external_message_id text,
	created_at timestamptz not null default now(),
	check (ticket_id is not null or conversation_id is not null)
);

create table public.support_attachments (
	id uuid primary key default gen_random_uuid(),
	message_id uuid not null references public.support_messages(id) on delete cascade,
	storage_path text not null,
	content_type text,
	created_at timestamptz not null default now()
);

create table public.documents (
	id uuid primary key default gen_random_uuid(),
	customer_id uuid references public.customers(id) on delete cascade,
	type text not null check (type in ('invoice', 'delivery_note', 'quote_pdf', 'certificate')),
	reference text not null,
	title text not null,
	file_size text,
	download_url text,
	storage_path text,
	related_order_ref text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.document_downloads (
	id uuid primary key default gen_random_uuid(),
	document_id uuid not null references public.documents(id) on delete cascade,
	user_id uuid references auth.users(id) on delete set null,
	downloaded_at timestamptz not null default now()
);

create table public.notifications (
	id uuid primary key default gen_random_uuid(),
	user_id uuid references auth.users(id) on delete cascade,
	customer_id uuid references public.customers(id) on delete cascade,
	type text not null,
	title text not null,
	body text not null,
	read boolean not null default false,
	target_type text,
	target_id uuid,
	created_at timestamptz not null default now()
);

create table public.notification_preferences (
	id uuid primary key default gen_random_uuid(),
	user_id uuid references auth.users(id) on delete cascade,
	customer_id uuid references public.customers(id) on delete cascade,
	channel text not null check (channel in ('email', 'sms', 'whatsapp', 'push')),
	enabled boolean not null default true,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create unique index notification_preferences_unique_target_channel_idx
	on public.notification_preferences (
		coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid),
		coalesce(customer_id, '00000000-0000-0000-0000-000000000000'::uuid),
		channel
	);

create table public.user_sessions (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users(id) on delete cascade,
	device text,
	location text,
	last_active timestamptz not null default now(),
	is_current boolean not null default false,
	created_at timestamptz not null default now()
);

create table public.team_members (
	id uuid primary key default gen_random_uuid(),
	customer_id uuid not null references public.customers(id) on delete cascade,
	user_id uuid references auth.users(id) on delete cascade,
	role text not null default 'member',
	created_at timestamptz not null default now(),
	unique (customer_id, user_id)
);

create table public.team_invites (
	id uuid primary key default gen_random_uuid(),
	customer_id uuid not null references public.customers(id) on delete cascade,
	email text not null,
	role text not null default 'member',
	status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.activity_events (
	id uuid primary key default gen_random_uuid(),
	actor_user_id uuid references auth.users(id) on delete set null,
	actor_employee_id uuid references public.employees(id) on delete set null,
	actor_customer_id uuid references public.customers(id) on delete set null,
	actor_driver_id uuid references public.drivers(id) on delete set null,
	entity_type text not null,
	entity_id uuid,
	action text not null,
	details jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now()
);

create table public.ai_tool_call_audit (
	id uuid primary key default gen_random_uuid(),
	actor_user_id uuid references auth.users(id) on delete set null,
	actor_employee_id uuid references public.employees(id) on delete set null,
	agent_scope text not null check (agent_scope in ('website', 'portal', 'employee', 'search')),
	tool_name text not null,
	read_entities text[] not null default '{}',
	write_entity_type text,
	write_entity_id uuid,
	approved_by_user boolean not null default false,
	input_summary jsonb not null default '{}'::jsonb,
	output_summary jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now()
);

create or replace function public.current_customer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
	select c.id
	from public.customers c
	where c.user_id = auth.uid()
	limit 1
$$;

create or replace function public.current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
	select e.id
	from public.employees e
	where e.user_id = auth.uid()
	  and e.status = 'active'
	limit 1
$$;

create or replace function public.current_driver_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
	select d.id
	from public.drivers d
	where d.user_id = auth.uid()
	  and d.status <> 'disabled'
	limit 1
$$;

create or replace function app_private.sync_customer_auth_metadata()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
	if new.user_id is null then
		return new;
	end if;

	update auth.users
	set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
		'pool', 'external',
		'roles', jsonb_build_array('customer'),
		'customer_id', new.id
	)
	where id = new.user_id;

	return new;
end;
$$;

create or replace function app_private.sync_employee_auth_metadata_for(target_employee_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
	target_user_id uuid;
	target_is_ceo boolean;
	target_roles jsonb;
begin
	select e.user_id, e.is_ceo
	into target_user_id, target_is_ceo
	from public.employees e
	where e.id = target_employee_id
	  and e.status = 'active';

	if target_user_id is null then
		return;
	end if;

	select coalesce(jsonb_agg(distinct er.role), '[]'::jsonb)
	into target_roles
	from public.employee_roles er
	where er.employee_id = target_employee_id;

	if target_is_ceo and not target_roles ? 'ceo' then
		target_roles := target_roles || jsonb_build_array('ceo');
	end if;

	if jsonb_array_length(target_roles) = 0 then
		target_roles := jsonb_build_array('admin');
	end if;

	update auth.users
	set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
		'pool', 'internal',
		'roles', target_roles,
		'employee_id', target_employee_id
	)
	where id = target_user_id;
end;
$$;

create or replace function app_private.sync_employee_auth_metadata()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
	perform app_private.sync_employee_auth_metadata_for(new.id);
	return new;
end;
$$;

create or replace function app_private.sync_employee_role_auth_metadata()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
	if tg_op = 'DELETE' then
		perform app_private.sync_employee_auth_metadata_for(old.employee_id);
		return old;
	end if;
	perform app_private.sync_employee_auth_metadata_for(new.employee_id);
	return new;
end;
$$;

create or replace function app_private.sync_driver_auth_metadata()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
	if new.user_id is null or new.status = 'disabled' then
		return new;
	end if;

	update auth.users
	set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
		'pool', 'driver',
		'roles', jsonb_build_array('driver'),
		'driver_id', new.id
	)
	where id = new.user_id;

	return new;
end;
$$;

create or replace function public.is_employee_with_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.employees e
		left join public.employee_roles er on er.employee_id = e.id
		where e.user_id = auth.uid()
		  and e.status = 'active'
		  and (e.is_ceo or er.role = required_role or er.role = 'admin')
	)
$$;

create or replace function public.can_access_panel(required_panel text, write_required boolean default false)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.employees e
		left join public.employee_roles er on er.employee_id = e.id
		left join public.employee_panel_permissions ep on ep.employee_id = e.id
		where e.user_id = auth.uid()
		  and e.status = 'active'
		  and (
			e.is_ceo
			or er.role = 'admin'
			or er.role = required_panel
			or (
				ep.panel = required_panel
				and ep.can_read
				and (not write_required or ep.can_write)
			)
		  )
	)
$$;

create or replace function public.require_panel(required_panel text, write_required boolean default true)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
	employee_id uuid;
begin
	employee_id := public.current_employee_id();
	if employee_id is null or not public.can_access_panel(required_panel, write_required) then
		raise exception 'insufficient_%_permission', required_panel using errcode = '42501';
	end if;
	return employee_id;
end;
$$;

create or replace function public.require_rejection_proof(proof jsonb)
returns void
language plpgsql
immutable
as $$
begin
	if proof is null or proof = '{}'::jsonb or proof = '[]'::jsonb then
		raise exception 'rejection_proof_required' using errcode = '23514';
	end if;
end;
$$;

create or replace function public.log_activity(
	entity_type text,
	entity_id uuid,
	action text,
	details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
	insert into public.activity_events (
		actor_user_id,
		actor_employee_id,
		actor_customer_id,
		actor_driver_id,
		entity_type,
		entity_id,
		action,
		details
	)
	values (
		auth.uid(),
		public.current_employee_id(),
		public.current_customer_id(),
		public.current_driver_id(),
		entity_type,
		entity_id,
		action,
		coalesce(details, '{}'::jsonb)
	);
end;
$$;

create or replace function public.assign_quote_request_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	if new.customer_id is null then
		new.customer_id := public.current_customer_id();
	end if;
	if new.submitted_by is null then
		new.submitted_by := auth.uid();
	end if;
	if new.status = 'submitted' and new.submitted_at is null then
		new.submitted_at := now();
	end if;
	return new;
end;
$$;

create trigger quote_requests_assign_customer
	before insert on public.quote_requests
	for each row execute function public.assign_quote_request_customer();

create or replace function public.create_order_from_accepted_quote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	if new.status = 'accepted' and old.status is distinct from new.status then
		insert into public.orders (quote_id, quote_request_id, customer_id, total_amount, status)
		values (new.id, new.quote_request_id, new.customer_id, new.total, 'finance')
		on conflict do nothing;
		perform public.log_activity('quote', new.id, 'quote_accepted', '{}'::jsonb);
	end if;
	return new;
end;
$$;

create trigger quotes_create_order_after_accept
	after update of status on public.quotes
	for each row execute function public.create_order_from_accepted_quote();

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger customers_set_updated_at before update on public.customers for each row execute function public.set_updated_at();
create trigger employees_set_updated_at before update on public.employees for each row execute function public.set_updated_at();
create trigger drivers_set_updated_at before update on public.drivers for each row execute function public.set_updated_at();
create trigger user_profiles_set_updated_at before update on public.user_profiles for each row execute function public.set_updated_at();
create trigger categories_set_updated_at before update on public.categories for each row execute function public.set_updated_at();
create trigger suppliers_set_updated_at before update on public.suppliers for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger supplier_product_links_set_updated_at before update on public.supplier_product_links for each row execute function public.set_updated_at();
create trigger price_update_requests_set_updated_at before update on public.price_update_requests for each row execute function public.set_updated_at();
create trigger customer_addresses_set_updated_at before update on public.customer_addresses for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger referrals_set_updated_at before update on public.referrals for each row execute function public.set_updated_at();
create trigger quote_requests_set_updated_at before update on public.quote_requests for each row execute function public.set_updated_at();
create trigger approvals_set_updated_at before update on public.approvals for each row execute function public.set_updated_at();
create trigger quotes_set_updated_at before update on public.quotes for each row execute function public.set_updated_at();
create trigger quote_items_set_updated_at before update on public.quote_items for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger inventory_stock_set_updated_at before update on public.inventory_stock for each row execute function public.set_updated_at();
create trigger inventory_reservations_set_updated_at before update on public.inventory_reservations for each row execute function public.set_updated_at();
create trigger refill_requests_set_updated_at before update on public.refill_requests for each row execute function public.set_updated_at();
create trigger trucks_set_updated_at before update on public.trucks for each row execute function public.set_updated_at();
create trigger loading_tasks_set_updated_at before update on public.loading_tasks for each row execute function public.set_updated_at();
create trigger receiving_tasks_set_updated_at before update on public.receiving_tasks for each row execute function public.set_updated_at();
create trigger deliveries_set_updated_at before update on public.deliveries for each row execute function public.set_updated_at();
create trigger driver_online_states_set_updated_at before update on public.driver_online_states for each row execute function public.set_updated_at();
create trigger support_tickets_set_updated_at before update on public.support_tickets for each row execute function public.set_updated_at();
create trigger support_conversations_set_updated_at before update on public.support_conversations for each row execute function public.set_updated_at();
create trigger documents_set_updated_at before update on public.documents for each row execute function public.set_updated_at();
create trigger notification_preferences_set_updated_at before update on public.notification_preferences for each row execute function public.set_updated_at();
create trigger team_invites_set_updated_at before update on public.team_invites for each row execute function public.set_updated_at();

create trigger customers_sync_auth_metadata after insert or update of user_id, status on public.customers for each row execute function app_private.sync_customer_auth_metadata();
create trigger employees_sync_auth_metadata after insert or update of user_id, status, is_ceo on public.employees for each row execute function app_private.sync_employee_auth_metadata();
create trigger employee_roles_sync_auth_metadata after insert or update or delete on public.employee_roles for each row execute function app_private.sync_employee_role_auth_metadata();
create trigger drivers_sync_auth_metadata after insert or update of user_id, status on public.drivers for each row execute function app_private.sync_driver_auth_metadata();

create or replace function public.claim_next_sales_order()
returns public.quote_requests
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	claimed public.quote_requests%rowtype;
begin
	employee_id := public.require_panel('sales', true);

	update public.quote_requests qr
	set
		status = 'assigned',
		assigned_employee_id = employee_id,
		assigned_at = now()
	where qr.id = (
		select id
		from public.quote_requests
		where status = 'submitted'
		  and eligible_at <= now()
		order by created_at, id
		for update skip locked
		limit 1
	)
	returning * into claimed;

	if claimed.id is not null then
		perform public.log_activity('quote_request', claimed.id, 'sales_order_claimed', jsonb_build_object('employee_id', employee_id));
	end if;

	return claimed;
end;
$$;

create or replace function public.sales_save_and_requeue(p_order_id uuid, p_note text default null)
returns public.quote_requests
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	updated public.quote_requests%rowtype;
begin
	employee_id := public.require_panel('sales', true);

	update public.quote_requests
	set
		status = 'submitted',
		assigned_employee_id = null,
		assigned_at = null,
		eligible_at = now() + interval '10 minutes',
		notes = coalesce(notes || E'\n', '') || coalesce(p_note, '')
	where id = p_order_id
	  and (assigned_employee_id = employee_id or public.can_access_panel('sales', true))
	returning * into updated;

	if updated.id is null then
		raise exception 'quote_request_not_found_or_not_assigned' using errcode = '02000';
	end if;

	perform public.log_activity('quote_request', updated.id, 'sales_order_requeued', jsonb_build_object('note', p_note));
	return updated;
end;
$$;

create or replace function public.sales_approve_quote(p_order_id uuid, p_quote_version_id uuid default null)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	source_request public.quote_requests%rowtype;
	created_order public.orders%rowtype;
begin
	employee_id := public.require_panel('sales', true);

	update public.quote_requests
	set status = 'approved'
	where id = p_order_id
	returning * into source_request;

	if source_request.id is null then
		raise exception 'quote_request_not_found' using errcode = '02000';
	end if;

	insert into public.orders (quote_request_id, customer_id, status, total_amount)
	values (source_request.id, source_request.customer_id, 'finance', 0)
	returning * into created_order;

	perform public.log_activity('quote_request', source_request.id, 'sales_quote_approved', jsonb_build_object('employee_id', employee_id, 'quote_version_id', p_quote_version_id));
	return created_order;
end;
$$;

create or replace function public.sales_reject_order(p_order_id uuid, p_reason text, p_proof jsonb)
returns public.quote_requests
language plpgsql
security definer
set search_path = public
as $$
declare
	updated public.quote_requests%rowtype;
begin
	perform public.require_panel('sales', true);
	perform public.require_rejection_proof(p_proof);

	update public.quote_requests
	set status = 'rejected', rejected_reason = p_reason, rejected_proof = p_proof
	where id = p_order_id
	returning * into updated;

	if updated.id is null then
		raise exception 'quote_request_not_found' using errcode = '02000';
	end if;

	perform public.log_activity('quote_request', updated.id, 'sales_order_rejected', jsonb_build_object('reason', p_reason, 'proof', p_proof));
	return updated;
end;
$$;

create or replace function public.create_manual_order(
	p_customer_id uuid,
	p_items jsonb,
	p_notes text default null
)
returns public.quote_requests
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	created_request public.quote_requests%rowtype;
	item jsonb;
begin
	employee_id := public.require_panel('sales', true);

	insert into public.quote_requests (
		customer_id,
		status,
		urgency,
		notes,
		submitted_at,
		assigned_employee_id,
		assigned_at
	)
	values (p_customer_id, 'assigned', 'standard', p_notes, now(), employee_id, now())
	returning * into created_request;

	for item in select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
	loop
		insert into public.quote_request_items (
			quote_request_id,
			product_id,
			customer_description,
			quantity,
			unit_of_measure,
			notes,
			sort_order,
			is_unmatched
		)
		values (
			created_request.id,
			nullif(item->>'product_id', '')::uuid,
			coalesce(item->>'customer_description', item->>'description', 'Manual item'),
			coalesce((item->>'quantity')::numeric, 1),
			coalesce(item->>'unit_of_measure', item->>'unit', 'unit'),
			item->>'notes',
			coalesce((item->>'sort_order')::integer, 0),
			coalesce((item->>'is_unmatched')::boolean, false)
		);
	end loop;

	perform public.log_activity('quote_request', created_request.id, 'manual_order_created', jsonb_build_object('employee_id', employee_id));
	return created_request;
end;
$$;

create or replace function public.request_price_update(p_product_id uuid, p_order_id uuid, p_reason text)
returns public.price_update_requests
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	created_request public.price_update_requests%rowtype;
begin
	employee_id := public.require_panel('sales', true);

	insert into public.price_update_requests (
		product_id,
		quote_request_id,
		requested_by_employee_id,
		reason
	)
	values (p_product_id, p_order_id, employee_id, p_reason)
	returning * into created_request;

	perform public.log_activity('price_update_request', created_request.id, 'price_update_requested', jsonb_build_object('product_id', p_product_id, 'quote_request_id', p_order_id));
	return created_request;
end;
$$;

create or replace function public.create_supplier_refill(
	p_product_id uuid,
	p_supplier_id uuid,
	p_quantity numeric,
	p_unit_cost numeric,
	p_proof jsonb default '{}'::jsonb
)
returns public.refill_requests
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	created_refill public.refill_requests%rowtype;
begin
	employee_id := public.require_panel('inventory', true);

	insert into public.refill_requests (
		product_id,
		supplier_id,
		requested_by_employee_id,
		quantity,
		unit_cost,
		proof
	)
	values (p_product_id, p_supplier_id, employee_id, p_quantity, p_unit_cost, coalesce(p_proof, '{}'::jsonb))
	returning * into created_refill;

	perform public.log_activity('refill_request', created_refill.id, 'supplier_refill_created', jsonb_build_object('product_id', p_product_id, 'supplier_id', p_supplier_id));
	return created_refill;
end;
$$;

create or replace function public.record_customer_payment(
	p_order_id uuid,
	p_amount numeric,
	p_payment_fraction numeric,
	p_proof_path text
)
returns public.customer_payments
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	payment public.customer_payments%rowtype;
begin
	employee_id := public.require_panel('finance', true);

	insert into public.customer_payments (
		order_id,
		recorded_by_employee_id,
		amount,
		payment_fraction,
		proof_path
	)
	values (p_order_id, employee_id, p_amount, p_payment_fraction, p_proof_path)
	returning * into payment;

	update public.orders
	set status = 'inventory'
	where id = p_order_id;

	perform public.log_activity('order', p_order_id, 'customer_payment_recorded', jsonb_build_object('amount', p_amount, 'payment_fraction', p_payment_fraction));
	return payment;
end;
$$;

create or replace function public.record_supplier_payment(
	p_refill_request_id uuid,
	p_amount numeric,
	p_payment_fraction numeric,
	p_proof_path text
)
returns public.supplier_payments
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	payment public.supplier_payments%rowtype;
begin
	employee_id := public.require_panel('finance', true);

	insert into public.supplier_payments (
		refill_request_id,
		recorded_by_employee_id,
		amount,
		payment_fraction,
		proof_path
	)
	values (p_refill_request_id, employee_id, p_amount, p_payment_fraction, p_proof_path)
	returning * into payment;

	update public.refill_requests
	set status = 'warehouse_receiving'
	where id = p_refill_request_id;

	insert into public.receiving_tasks (refill_request_id)
	values (p_refill_request_id)
	on conflict do nothing;

	perform public.log_activity('refill_request', p_refill_request_id, 'supplier_payment_recorded', jsonb_build_object('amount', p_amount, 'payment_fraction', p_payment_fraction));
	return payment;
end;
$$;

create or replace function public.reserve_order_stock(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	target_order public.orders%rowtype;
	line record;
begin
	employee_id := public.require_panel('inventory', true);

	select * into target_order
	from public.orders
	where id = p_order_id
	for update;

	if target_order.id is null then
		raise exception 'order_not_found' using errcode = '02000';
	end if;

	for line in
		select qi.product_id, sum(qi.quantity) as quantity
		from public.quote_request_items qi
		where qi.quote_request_id = target_order.quote_request_id
		  and qi.product_id is not null
		group by qi.product_id
	loop
		update public.inventory_stock
		set reserved_quantity = reserved_quantity + line.quantity
		where product_id = line.product_id
		  and available_quantity >= line.quantity;

		if not found then
			raise exception 'insufficient_stock_for_product_%', line.product_id using errcode = '23514';
		end if;

		insert into public.inventory_reservations (
			order_id,
			product_id,
			quantity,
			created_by_employee_id
		)
		values (p_order_id, line.product_id, line.quantity, employee_id)
		on conflict (order_id, product_id, status) do update
		set quantity = public.inventory_reservations.quantity + excluded.quantity;
	end loop;

	update public.orders
	set status = 'warehouse', reserved_at = now()
	where id = p_order_id
	returning * into target_order;

	insert into public.loading_tasks (order_id)
	values (p_order_id)
	on conflict do nothing;

	perform public.log_activity('order', p_order_id, 'order_stock_reserved', jsonb_build_object('employee_id', employee_id));
	return target_order;
end;
$$;

create or replace function public.warehouse_approve_loading(p_loading_task_id uuid, p_proof jsonb)
returns public.loading_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
	updated public.loading_tasks%rowtype;
begin
	perform public.require_panel('warehouse', true);

	update public.loading_tasks
	set status = 'approved', proof = coalesce(p_proof, '{}'::jsonb)
	where id = p_loading_task_id
	returning * into updated;

	if updated.id is null then
		raise exception 'loading_task_not_found' using errcode = '02000';
	end if;

	update public.orders set status = 'dispatch' where id = updated.order_id;

	insert into public.deliveries (order_id, loading_task_id, driver_id, truck_id)
	select updated.order_id, ltd.loading_task_id, ltd.driver_id, ltd.truck_id
	from public.loading_task_drivers ltd
	where ltd.loading_task_id = updated.id
	on conflict do nothing;

	perform public.log_activity('loading_task', updated.id, 'warehouse_loading_approved', p_proof);
	return updated;
end;
$$;

create or replace function public.warehouse_reject_loading(p_loading_task_id uuid, p_reason text, p_proof jsonb)
returns public.loading_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
	updated public.loading_tasks%rowtype;
begin
	perform public.require_panel('warehouse', true);
	perform public.require_rejection_proof(p_proof);

	update public.loading_tasks
	set status = 'rejected', rejection_reason = p_reason, proof = p_proof
	where id = p_loading_task_id
	returning * into updated;

	if updated.id is null then
		raise exception 'loading_task_not_found' using errcode = '02000';
	end if;

	perform public.log_activity('loading_task', updated.id, 'warehouse_loading_rejected', jsonb_build_object('reason', p_reason, 'proof', p_proof));
	return updated;
end;
$$;

create or replace function public.warehouse_approve_receiving(p_receiving_task_id uuid, p_proof jsonb)
returns public.receiving_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
	updated public.receiving_tasks%rowtype;
	item record;
begin
	perform public.require_panel('warehouse', true);

	update public.receiving_tasks
	set status = 'approved', proof = coalesce(p_proof, '{}'::jsonb)
	where id = p_receiving_task_id
	returning * into updated;

	if updated.id is null then
		raise exception 'receiving_task_not_found' using errcode = '02000';
	end if;

	for item in
		select product_id, sum(received_quantity) as received_quantity
		from public.receiving_task_items
		where receiving_task_id = p_receiving_task_id
		group by product_id
	loop
		insert into public.inventory_stock (product_id, on_hand_quantity)
		values (item.product_id, item.received_quantity)
		on conflict (product_id) do update
		set on_hand_quantity = public.inventory_stock.on_hand_quantity + excluded.on_hand_quantity;
	end loop;

	update public.refill_requests
	set status = 'received'
	where id = updated.refill_request_id;

	perform public.log_activity('receiving_task', updated.id, 'warehouse_receiving_approved', p_proof);
	return updated;
end;
$$;

create or replace function public.warehouse_reject_receiving(p_receiving_task_id uuid, p_reason text, p_proof jsonb)
returns public.receiving_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
	updated public.receiving_tasks%rowtype;
begin
	perform public.require_panel('warehouse', true);
	perform public.require_rejection_proof(p_proof);

	update public.receiving_tasks
	set status = 'rejected', rejection_reason = p_reason, proof = p_proof
	where id = p_receiving_task_id
	returning * into updated;

	if updated.id is null then
		raise exception 'receiving_task_not_found' using errcode = '02000';
	end if;

	update public.refill_requests
	set status = 'rejected'
	where id = updated.refill_request_id;

	perform public.log_activity('receiving_task', updated.id, 'warehouse_receiving_rejected', jsonb_build_object('reason', p_reason, 'proof', p_proof));
	return updated;
end;
$$;

create or replace function public.dispatch_complete_delivery(p_delivery_id uuid, p_proof jsonb)
returns public.deliveries
language plpgsql
security definer
set search_path = public
as $$
declare
	updated public.deliveries%rowtype;
begin
	perform public.require_panel('dispatch', true);

	update public.deliveries
	set status = 'completed', completed_at = now()
	where id = p_delivery_id
	returning * into updated;

	if updated.id is null then
		raise exception 'delivery_not_found' using errcode = '02000';
	end if;

	update public.inventory_reservations
	set status = 'consumed'
	where order_id = updated.order_id
	  and status = 'reserved';

	update public.orders
	set status = 'delivered', delivered_at = now()
	where id = updated.order_id;

	perform public.log_activity('delivery', updated.id, 'dispatch_delivery_completed', coalesce(p_proof, '{}'::jsonb));
	return updated;
end;
$$;

create or replace function public.dispatch_reject_delivery(p_delivery_id uuid, p_reason text, p_proof jsonb)
returns public.deliveries
language plpgsql
security definer
set search_path = public
as $$
declare
	updated public.deliveries%rowtype;
begin
	perform public.require_panel('dispatch', true);
	perform public.require_rejection_proof(p_proof);

	update public.deliveries
	set status = 'rejected', rejection_reason = p_reason, rejection_proof = p_proof
	where id = p_delivery_id
	returning * into updated;

	if updated.id is null then
		raise exception 'delivery_not_found' using errcode = '02000';
	end if;

	update public.orders
	set status = 'warehouse'
	where id = updated.order_id;

	perform public.log_activity('delivery', updated.id, 'dispatch_delivery_rejected', jsonb_build_object('reason', p_reason, 'proof', p_proof));
	return updated;
end;
$$;

create or replace function public.driver_update_location(
	p_latitude numeric,
	p_longitude numeric,
	p_accuracy_meters numeric default null,
	p_delivery_id uuid default null,
	p_heading numeric default null,
	p_speed_kmh numeric default null
)
returns public.driver_locations
language plpgsql
security definer
set search_path = public
as $$
declare
	v_driver_id uuid;
	location_row public.driver_locations%rowtype;
begin
	v_driver_id := public.current_driver_id();
	if v_driver_id is null then
		raise exception 'driver_required' using errcode = '42501';
	end if;

	if p_delivery_id is not null and not exists (
		select 1 from public.deliveries
		where id = p_delivery_id
		  and deliveries.driver_id = v_driver_id
		  and status in ('assigned', 'accepted', 'in_transit', 'arrived')
	) then
		raise exception 'delivery_not_assigned_to_driver' using errcode = '42501';
	end if;

	insert into public.driver_locations (
		driver_id,
		delivery_id,
		latitude,
		longitude,
		accuracy_meters,
		heading,
		speed_kmh
	)
	values (v_driver_id, p_delivery_id, p_latitude, p_longitude, p_accuracy_meters, p_heading, p_speed_kmh)
	returning * into location_row;

	insert into public.driver_online_states (driver_id, status, last_seen_at)
	values (v_driver_id, 'online', now())
	on conflict (driver_id) do update
	set status = 'online', last_seen_at = excluded.last_seen_at;

	update public.drivers
	set status = case when status = 'offline' then 'available' else status end
	where id = v_driver_id;

	return location_row;
end;
$$;

create or replace function public.driver_confirm_delivery(
	p_delivery_id uuid,
	p_signature_path text,
	p_signer_name text,
	p_latitude numeric,
	p_longitude numeric
)
returns public.deliveries
language plpgsql
security definer
set search_path = public
as $$
declare
	v_driver_id uuid;
	updated public.deliveries%rowtype;
begin
	v_driver_id := public.current_driver_id();
	if v_driver_id is null then
		raise exception 'driver_required' using errcode = '42501';
	end if;

	update public.deliveries
	set status = 'completed', completed_at = now()
	where id = p_delivery_id
	  and deliveries.driver_id = v_driver_id
	  and status in ('arrived', 'in_transit', 'accepted')
	returning * into updated;

	if updated.id is null then
		raise exception 'delivery_not_found_or_invalid_transition' using errcode = '02000';
	end if;

	insert into public.delivery_proofs (
		delivery_id,
		driver_id,
		proof_type,
		proof_path,
		signer_name,
		location
	)
	values (
		p_delivery_id,
		v_driver_id,
		'signature',
		p_signature_path,
		p_signer_name,
		jsonb_build_object('latitude', p_latitude, 'longitude', p_longitude)
	);

	update public.orders
	set status = 'delivered', delivered_at = now()
	where id = updated.order_id;

	update public.inventory_reservations
	set status = 'consumed'
	where order_id = updated.order_id
	  and status = 'reserved';

	perform public.log_activity('delivery', updated.id, 'driver_delivery_confirmed', jsonb_build_object('driver_id', v_driver_id));
	return updated;
end;
$$;

create or replace function public.driver_reject_delivery(p_delivery_id uuid, p_reason text, p_proof jsonb)
returns public.deliveries
language plpgsql
security definer
set search_path = public
as $$
declare
	v_driver_id uuid;
	updated public.deliveries%rowtype;
begin
	v_driver_id := public.current_driver_id();
	if v_driver_id is null then
		raise exception 'driver_required' using errcode = '42501';
	end if;
	perform public.require_rejection_proof(p_proof);

	update public.deliveries
	set status = 'rejected', rejection_reason = p_reason, rejection_proof = p_proof
	where id = p_delivery_id
	  and deliveries.driver_id = v_driver_id
	returning * into updated;

	if updated.id is null then
		raise exception 'delivery_not_found' using errcode = '02000';
	end if;

	update public.orders
	set status = 'warehouse'
	where id = updated.order_id;

	perform public.log_activity('delivery', updated.id, 'driver_delivery_rejected', jsonb_build_object('reason', p_reason, 'proof', p_proof));
	return updated;
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
declare
	customer_id uuid;
	ticket public.support_tickets%rowtype;
begin
	customer_id := public.current_customer_id();

	insert into public.support_tickets (
		customer_id,
		requester_name,
		requester_email,
		requester_phone,
		subject,
		source
	)
	values (customer_id, p_requester_name, p_requester_email, p_requester_phone, p_subject, case when customer_id is null then 'website' else 'portal' end)
	returning * into ticket;

	insert into public.support_messages (
		ticket_id,
		sender_type,
		sender_user_id,
		channel,
		body
	)
	values (ticket.id, case when customer_id is null then 'external' else 'customer' end, auth.uid(), 'website', p_message);

	perform public.log_activity('support_ticket', ticket.id, 'support_ticket_created', jsonb_build_object('source', ticket.source));
	return ticket;
end;
$$;

create or replace function public.send_support_reply(
	p_ticket_id uuid,
	p_body text,
	p_channel text default 'email'
)
returns public.support_messages
language plpgsql
security definer
set search_path = public
as $$
declare
	message public.support_messages%rowtype;
begin
	perform public.require_panel('customer_service', true);

	insert into public.support_messages (
		ticket_id,
		sender_type,
		sender_user_id,
		channel,
		body
	)
	values (p_ticket_id, 'employee', auth.uid(), p_channel, p_body)
	returning * into message;

	perform public.log_activity('support_ticket', p_ticket_id, 'support_reply_sent', jsonb_build_object('channel', p_channel));
	return message;
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
begin
	select id into customer_id
	from public.customers
	where phone = p_from_phone
	limit 1;

	insert into public.support_conversations (
		customer_id,
		channel,
		phone,
		external_thread_id
	)
	values (customer_id, 'whatsapp', p_from_phone, p_from_phone)
	on conflict do nothing;

	select id into conversation_id
	from public.support_conversations
	where channel = 'whatsapp'
	  and phone = p_from_phone
	order by created_at desc
	limit 1;

	if conversation_id is null then
		insert into public.support_conversations (customer_id, channel, phone, external_thread_id)
		values (customer_id, 'whatsapp', p_from_phone, p_from_phone)
		returning id into conversation_id;
	end if;

	insert into public.support_messages (
		conversation_id,
		sender_type,
		channel,
		body,
		external_message_id
	)
	values (conversation_id, 'external', 'whatsapp', p_body, p_external_message_id)
	returning * into message;

	perform public.log_activity('support_conversation', conversation_id, 'whatsapp_message_ingested', jsonb_build_object('phone', p_from_phone));
	return message;
end;
$$;

create or replace function public.transfer_team_ownership(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	v_customer_id uuid;
begin
	v_customer_id := public.current_customer_id();
	if v_customer_id is null then
		raise exception 'customer_required' using errcode = '42501';
	end if;

	update public.team_members
	set role = 'owner'
	where id = p_member_id
	  and team_members.customer_id = v_customer_id;

	update public.team_members
	set role = 'admin'
	where team_members.customer_id = v_customer_id
	  and user_id = auth.uid()
	  and id <> p_member_id;
end;
$$;

create view public.ceo_order_summary
with (security_invoker = true)
as
select
	o.id,
	o.order_number,
	o.status,
	o.total_amount,
	c.company_name,
	o.created_at,
	o.delivered_at
from public.orders o
join public.customers c on c.id = o.customer_id
where public.is_employee_with_role('ceo');

create view public.ceo_finance_summary
with (security_invoker = true)
as
select
	'customer_payment' as source,
	cp.id,
	cp.order_id as entity_id,
	cp.amount,
	cp.payment_fraction,
	cp.created_at
from public.customer_payments cp
where public.is_employee_with_role('ceo')
union all
select
	'supplier_payment' as source,
	sp.id,
	sp.refill_request_id as entity_id,
	sp.amount,
	sp.payment_fraction,
	sp.created_at
from public.supplier_payments sp
where public.is_employee_with_role('ceo');

create view public.ceo_inventory_summary
with (security_invoker = true)
as
select
	p.id as product_id,
	p.name,
	p.category,
	s.on_hand_quantity,
	s.reserved_quantity,
	s.available_quantity,
	s.minimum_quantity
from public.inventory_stock s
join public.products p on p.id = s.product_id
where public.is_employee_with_role('ceo');

create view public.ceo_dispatch_summary
with (security_invoker = true)
as
select
	d.id,
	d.delivery_number,
	d.status,
	d.order_id,
	drivers.full_name as driver_name,
	d.completed_at,
	d.updated_at
from public.deliveries d
left join public.drivers drivers on drivers.id = d.driver_id
where public.is_employee_with_role('ceo');

create view public.ceo_search_index
with (security_invoker = true)
as
select
	'order' as entity_type,
	id as entity_id,
	order_number as title,
	status as subtitle,
	jsonb_build_object('total_amount', total_amount, 'created_at', created_at) as metadata
from public.orders
where public.is_employee_with_role('ceo')
union all
select
	'customer' as entity_type,
	id as entity_id,
	company_name as title,
	contact_name as subtitle,
	jsonb_build_object('phone', phone, 'email', email, 'status', status) as metadata
from public.customers
where public.is_employee_with_role('ceo')
union all
select
	'support_ticket' as entity_type,
	id as entity_id,
	reference as title,
	status as subtitle,
	jsonb_build_object('subject', subject, 'requester_email', requester_email) as metadata
from public.support_tickets
where public.is_employee_with_role('ceo');

do $$
declare
	table_name text;
begin
	foreach table_name in array array[
		'profiles',
		'customers',
		'employees',
		'employee_roles',
		'employee_panel_permissions',
		'drivers',
		'user_profiles',
		'user_roles',
		'categories',
		'suppliers',
		'products',
		'supplier_product_links',
		'price_update_requests',
		'price_updates',
		'customer_addresses',
		'projects',
		'referrals',
		'quote_requests',
		'quote_request_items',
		'approvals',
		'sales_quote_versions',
		'quotes',
		'quote_versions',
		'quote_items',
		'quote_counter_offers',
		'orders',
		'sales_call_notes',
		'inventory_stock',
		'inventory_reservations',
		'refill_requests',
		'customer_payments',
		'supplier_payments',
		'trucks',
		'loading_tasks',
		'loading_task_drivers',
		'receiving_tasks',
		'receiving_task_items',
		'deliveries',
		'driver_online_states',
		'driver_locations',
		'delivery_proofs',
		'support_tickets',
		'support_conversations',
		'support_messages',
		'support_attachments',
		'documents',
		'document_downloads',
		'notifications',
		'notification_preferences',
		'user_sessions',
		'team_members',
		'team_invites',
		'activity_events',
		'ai_tool_call_audit'
	]
	loop
		execute format('alter table public.%I enable row level security', table_name);
		execute format('create policy service_role_all on public.%I for all to service_role using (true) with check (true)', table_name);
	end loop;
end $$;

create policy public_can_read_active_products
	on public.products for select
	to anon, authenticated
	using (is_active and availability_status <> 'hidden');

create policy customer_profiles_own
	on public.customers for select
	to authenticated
	using (user_id = auth.uid() or public.current_customer_id() = id or public.can_access_panel('customer_service') or public.can_access_panel('sales') or public.can_access_panel('admin'));

create policy customers_create_self
	on public.customers for insert
	to authenticated
	with check (user_id = auth.uid() or public.can_access_panel('sales', true) or public.can_access_panel('admin', true));

create policy customers_update_self_or_staff
	on public.customers for update
	to authenticated
	using (user_id = auth.uid() or user_id is null or public.can_access_panel('customer_service', true) or public.can_access_panel('sales', true) or public.can_access_panel('admin', true))
	with check (user_id = auth.uid() or public.can_access_panel('customer_service', true) or public.can_access_panel('sales', true) or public.can_access_panel('admin', true));

create policy employees_read_self_or_admin
	on public.employees for select
	to authenticated
	using (user_id = auth.uid() or public.can_access_panel('admin') or public.is_employee_with_role('ceo'));

create policy employees_admin_write
	on public.employees for all
	to authenticated
	using (public.can_access_panel('admin', true))
	with check (public.can_access_panel('admin', true));

create policy drivers_read_self_or_ops
	on public.drivers for select
	to authenticated
	using (user_id = auth.uid() or public.can_access_panel('dispatch') or public.can_access_panel('admin'));

create policy drivers_update_self_location_status
	on public.drivers for update
	to authenticated
	using (user_id = auth.uid() or public.can_access_panel('dispatch', true) or public.can_access_panel('admin', true))
	with check (user_id = auth.uid() or public.can_access_panel('dispatch', true) or public.can_access_panel('admin', true));

create policy customers_own_addresses
	on public.customer_addresses for all
	to authenticated
	using (customer_id = public.current_customer_id() or public.can_access_panel('customer_service') or public.can_access_panel('sales') or public.can_access_panel('admin'))
	with check (customer_id = public.current_customer_id() or public.can_access_panel('customer_service', true) or public.can_access_panel('sales', true) or public.can_access_panel('admin', true));

create policy customers_own_projects
	on public.projects for all
	to authenticated
	using (customer_id = public.current_customer_id() or public.can_access_panel('sales') or public.can_access_panel('admin'))
	with check (customer_id = public.current_customer_id() or public.can_access_panel('sales', true) or public.can_access_panel('admin', true));

create policy customers_own_quote_requests
	on public.quote_requests for all
	to authenticated
	using (customer_id = public.current_customer_id() or public.can_access_panel('sales') or public.can_access_panel('finance') or public.can_access_panel('inventory') or public.can_access_panel('warehouse') or public.can_access_panel('dispatch') or public.is_employee_with_role('ceo'))
	with check (customer_id = public.current_customer_id() or public.can_access_panel('sales', true) or public.can_access_panel('finance', true) or public.can_access_panel('inventory', true) or public.can_access_panel('warehouse', true) or public.can_access_panel('dispatch', true));

create policy quote_request_items_follow_parent
	on public.quote_request_items for all
	to authenticated
	using (exists (
		select 1 from public.quote_requests qr
		where qr.id = quote_request_id
		  and (qr.customer_id = public.current_customer_id() or public.can_access_panel('sales') or public.can_access_panel('inventory') or public.is_employee_with_role('ceo'))
	))
	with check (exists (
		select 1 from public.quote_requests qr
		where qr.id = quote_request_id
		  and (qr.customer_id = public.current_customer_id() or public.can_access_panel('sales', true) or public.can_access_panel('inventory', true))
	));

create policy customer_quote_visibility
	on public.quotes for select
	to authenticated
	using (customer_id = public.current_customer_id() or public.can_access_panel('sales') or public.can_access_panel('finance') or public.is_employee_with_role('ceo'));

create policy customer_quote_items_visibility
	on public.quote_items for select
	to authenticated
	using (exists (
		select 1 from public.quotes q
		where q.id = quote_id
		  and (q.customer_id = public.current_customer_id() or public.can_access_panel('sales') or public.can_access_panel('finance') or public.is_employee_with_role('ceo'))
	));

create policy customer_orders_visibility
	on public.orders for select
	to authenticated
	using (customer_id = public.current_customer_id() or public.can_access_panel('sales') or public.can_access_panel('finance') or public.can_access_panel('inventory') or public.can_access_panel('warehouse') or public.can_access_panel('dispatch') or public.is_employee_with_role('ceo'));

create policy internal_catalog_write
	on public.products for all
	to authenticated
	using (public.can_access_panel('admin', true) or public.can_access_panel('inventory', true))
	with check (public.can_access_panel('admin', true) or public.can_access_panel('inventory', true));

create policy internal_supplier_access
	on public.suppliers for all
	to authenticated
	using (public.can_access_panel('inventory') or public.can_access_panel('finance') or public.can_access_panel('admin') or public.is_employee_with_role('ceo'))
	with check (public.can_access_panel('inventory', true) or public.can_access_panel('finance', true) or public.can_access_panel('admin', true));

create policy internal_inventory_access
	on public.inventory_stock for all
	to authenticated
	using (public.can_access_panel('inventory') or public.can_access_panel('warehouse') or public.is_employee_with_role('ceo'))
	with check (public.can_access_panel('inventory', true) or public.can_access_panel('warehouse', true));

create policy support_public_insert_ticket
	on public.support_tickets for insert
	to anon, authenticated
	with check (true);

create policy support_public_insert_message
	on public.support_messages for insert
	to anon, authenticated
	with check (sender_type in ('customer', 'external'));

create policy support_visibility
	on public.support_tickets for select
	to authenticated
	using (customer_id = public.current_customer_id() or public.can_access_panel('customer_service') or public.is_employee_with_role('ceo'));

create policy support_message_visibility
	on public.support_messages for select
	to authenticated
	using (
		public.can_access_panel('customer_service')
		or public.is_employee_with_role('ceo')
		or exists (
			select 1 from public.support_tickets st
			where st.id = support_messages.ticket_id
			  and st.customer_id = public.current_customer_id()
		)
	);

create policy driver_delivery_visibility
	on public.deliveries for select
	to authenticated
	using (driver_id = public.current_driver_id() or public.can_access_panel('dispatch') or public.can_access_panel('warehouse') or public.is_employee_with_role('ceo'));

create policy driver_locations_insert_own
	on public.driver_locations for insert
	to authenticated
	with check (driver_id = public.current_driver_id() or public.can_access_panel('dispatch', true));

create policy dispatch_locations_read
	on public.driver_locations for select
	to authenticated
	using (driver_id = public.current_driver_id() or public.can_access_panel('dispatch') or public.is_employee_with_role('ceo'));

create policy customer_documents_visibility
	on public.documents for select
	to authenticated
	using (customer_id = public.current_customer_id() or public.can_access_panel('customer_service') or public.can_access_panel('finance') or public.is_employee_with_role('ceo'));

create policy customer_notifications_visibility
	on public.notifications for all
	to authenticated
	using (user_id = auth.uid() or customer_id = public.current_customer_id() or public.can_access_panel('customer_service'))
	with check (user_id = auth.uid() or customer_id = public.current_customer_id() or public.can_access_panel('customer_service', true));

create policy activity_events_internal_read
	on public.activity_events for select
	to authenticated
	using (public.current_employee_id() is not null);

create policy ai_audit_internal_read
	on public.ai_tool_call_audit for select
	to authenticated
	using (public.current_employee_id() is not null);

grant usage on schema public to anon, authenticated, service_role;
grant select on public.products to anon;
grant select, insert on public.support_tickets to anon;
grant insert on public.support_messages to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant select on public.ceo_order_summary to authenticated;
grant select on public.ceo_finance_summary to authenticated;
grant select on public.ceo_inventory_summary to authenticated;
grant select on public.ceo_dispatch_summary to authenticated;
grant select on public.ceo_search_index to authenticated;

grant execute on function public.claim_next_sales_order() to authenticated;
grant execute on function public.sales_save_and_requeue(uuid, text) to authenticated;
grant execute on function public.sales_approve_quote(uuid, uuid) to authenticated;
grant execute on function public.sales_reject_order(uuid, text, jsonb) to authenticated;
grant execute on function public.create_manual_order(uuid, jsonb, text) to authenticated;
grant execute on function public.request_price_update(uuid, uuid, text) to authenticated;
grant execute on function public.create_supplier_refill(uuid, uuid, numeric, numeric, jsonb) to authenticated;
grant execute on function public.record_customer_payment(uuid, numeric, numeric, text) to authenticated;
grant execute on function public.record_supplier_payment(uuid, numeric, numeric, text) to authenticated;
grant execute on function public.reserve_order_stock(uuid) to authenticated;
grant execute on function public.warehouse_approve_loading(uuid, jsonb) to authenticated;
grant execute on function public.warehouse_reject_loading(uuid, text, jsonb) to authenticated;
grant execute on function public.warehouse_approve_receiving(uuid, jsonb) to authenticated;
grant execute on function public.warehouse_reject_receiving(uuid, text, jsonb) to authenticated;
grant execute on function public.dispatch_complete_delivery(uuid, jsonb) to authenticated;
grant execute on function public.dispatch_reject_delivery(uuid, text, jsonb) to authenticated;
grant execute on function public.driver_update_location(numeric, numeric, numeric, uuid, numeric, numeric) to authenticated;
grant execute on function public.driver_confirm_delivery(uuid, text, text, numeric, numeric) to authenticated;
grant execute on function public.driver_reject_delivery(uuid, text, jsonb) to authenticated;
grant execute on function public.create_support_ticket(text, text, text, text, text) to anon, authenticated;
grant execute on function public.send_support_reply(uuid, text, text) to authenticated;
grant execute on function public.ingest_whatsapp_message(text, text, text) to service_role;
grant execute on function public.transfer_team_ownership(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
	('price-proofs', 'price-proofs', false, 10485760, array['image/jpeg', 'image/png', 'application/pdf']),
	('payment-proofs', 'payment-proofs', false, 10485760, array['image/jpeg', 'image/png', 'application/pdf']),
	('delivery-proofs', 'delivery-proofs', false, 10485760, array['image/jpeg', 'image/png', 'application/pdf']),
	('support-attachments', 'support-attachments', false, 10485760, array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do update
set
	public = excluded.public,
	file_size_limit = excluded.file_size_limit,
	allowed_mime_types = excluded.allowed_mime_types;

create policy storage_authenticated_uploads
	on storage.objects for insert
	to authenticated
	with check (
		bucket_id in ('price-proofs', 'payment-proofs', 'delivery-proofs', 'support-attachments')
	);

create policy storage_authenticated_reads
	on storage.objects for select
	to authenticated
	using (
		bucket_id in ('price-proofs', 'payment-proofs', 'delivery-proofs', 'support-attachments')
	);
