set check_function_bodies = off;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create schema if not exists app_private;

create type public.account_type as enum ('customer', 'employee', 'driver');
create type public.profile_status as enum ('invited', 'active', 'disabled');
create type public.customer_status as enum ('unclaimed', 'claimed', 'active', 'inactive');
create type public.trade_license_status as enum ('not_uploaded', 'under_review', 'approved', 'rejected');
create type public.employee_role as enum (
	'admin',
	'sales',
	'inventory',
	'warehouse',
	'finance',
	'dispatch',
	'customer_service',
	'driver_manager',
	'ceo'
);
create type public.employee_panel as enum (
	'sales',
	'inventory',
	'warehouse',
	'finance',
	'dispatch',
	'customer_service',
	'admin',
	'search'
);
create type public.driver_status as enum ('invited', 'available', 'on_delivery', 'offline', 'disabled');
create type public.user_profile_type as enum ('customer', 'internal', 'driver');
create type public.user_role as enum (
	'customer',
	'approver',
	'admin',
	'sales',
	'inventory',
	'warehouse',
	'finance',
	'dispatch',
	'customer_service',
	'driver_manager',
	'driver',
	'ceo'
);
create type public.supplier_status as enum ('active', 'inactive', 'blocked');
create type public.price_tier as enum ('budget', 'mid_range', 'premium');
create type public.catalog_availability_status as enum ('available', 'low_stock', 'out_of_stock', 'hidden');
create type public.price_update_request_status as enum ('pending', 'resolved', 'canceled');
create type public.referral_status as enum ('pending', 'converted', 'credited', 'canceled');
create type public.quote_request_status as enum (
	'draft',
	'submitted',
	'assigned',
	'saved',
	'reviewing',
	'awaiting_clarification',
	'quoting',
	'quoted',
	'approved',
	'rejected',
	'declined',
	'expired',
	'canceled'
);
create type public.quote_request_urgency as enum ('standard', 'urgent');
create type public.approval_status as enum ('pending', 'approved', 'changes_requested', 'rejected', 'canceled');
create type public.sales_quote_version_status as enum ('draft', 'approved', 'sent', 'rejected');
create type public.quote_status as enum (
	'draft',
	'internal_review',
	'pending_approval',
	'approved',
	'sent',
	'viewed',
	'negotiating',
	'revised',
	'accepted',
	'declined',
	'expired',
	'canceled',
	'cancelled',
	'requires_re_quote'
);
create type public.quote_item_line_status as enum ('quoted', 'accepted', 'rejected', 'negotiate');
create type public.quote_counter_type as enum ('total', 'per_line');
create type public.order_workflow_status as enum (
	'confirmed_for_inventory',
	'inventory_reserved',
	'warehouse_loading',
	'dispatch_ready',
	'dispatch_assigned',
	'out_for_delivery',
	'delivered',
	'rejected',
	'canceled'
);
create type public.inventory_reservation_status as enum ('reserved', 'released', 'consumed');
create type public.refill_request_status as enum (
	'finance_pending',
	'finance_approved',
	'warehouse_receiving',
	'received',
	'rejected',
	'canceled'
);
create type public.payment_record_status as enum ('recorded', 'voided');
create type public.truck_status as enum ('available', 'loading', 'dispatched', 'maintenance');
create type public.loading_task_status as enum ('pending', 'loading', 'approved', 'rejected');
create type public.receiving_task_status as enum ('pending', 'approved', 'rejected');
create type public.delivery_status as enum ('assigned', 'accepted', 'in_transit', 'arrived', 'completed', 'rejected');
create type public.driver_online_status as enum ('online', 'offline');
create type public.driver_location_source as enum ('driver_app', 'dispatch', 'system');
create type public.delivery_proof_type as enum ('signature', 'photo', 'note');
create type public.support_ticket_status as enum ('open', 'pending', 'closed');
create type public.support_ticket_source as enum ('website', 'portal', 'whatsapp', 'internal');
create type public.support_channel as enum ('email', 'whatsapp');
create type public.support_conversation_status as enum ('open', 'closed');
create type public.support_sender_type as enum ('customer', 'employee', 'system', 'external');
create type public.support_message_channel as enum ('email', 'whatsapp', 'portal', 'website');
create type public.document_type as enum ('invoice', 'delivery_note', 'quote_pdf', 'certificate');
create type public.notification_channel as enum ('email', 'sms', 'whatsapp', 'push');
create type public.team_member_role as enum ('owner', 'admin', 'member');
create type public.team_invite_status as enum ('pending', 'accepted', 'revoked');
create type public.ai_agent_scope as enum ('website', 'portal', 'employee', 'search');
create type public.audit_event_type as enum (
	'quote_accepted',
	'customer_quote_accepted',
	'customer_quote_declined',
	'customer_quote_negotiation_requested',
	'customer_quote_line_response_submitted',
	'sales_order_claimed',
	'sales_order_requeued',
	'sales_quote_approved',
	'sales_order_confirmed',
	'sales_order_rejected',
	'manual_order_created',
	'price_update_requested',
	'supplier_refill_created',
	'customer_payment_recorded',
	'supplier_payment_recorded',
	'inventory_order_evaluated',
	'order_stock_reserved',
	'warehouse_loading_started',
	'warehouse_loading_approved',
	'warehouse_loading_rejected',
	'warehouse_receiving_approved',
	'warehouse_receiving_rejected',
	'dispatch_driver_assigned',
	'dispatch_delivery_completed',
	'dispatch_delivery_rejected',
	'driver_delivery_accepted',
	'driver_delivery_started',
	'driver_delivery_arrived',
	'driver_delivery_confirmed',
	'driver_delivery_rejected',
	'support_ticket_created',
	'support_reply_sent',
	'whatsapp_message_ingested'
);

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
	account_type public.account_type not null,
	display_name text not null,
	phone text,
	email text,
	status public.profile_status not null default 'active',
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
	status public.customer_status not null default 'active',
	trade_license_status public.trade_license_status not null default 'not_uploaded',
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
	status public.profile_status not null default 'active',
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
	role public.employee_role not null,
	created_at timestamptz not null default now(),
	unique (employee_id, role)
);

create table public.employee_panel_permissions (
	id uuid primary key default gen_random_uuid(),
	employee_id uuid not null references public.employees(id) on delete cascade,
	panel public.employee_panel not null,
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
	status public.driver_status not null default 'offline',
	vehicle_label text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.user_profiles (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null unique references auth.users(id) on delete cascade,
	user_type public.user_profile_type not null,
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
	role public.user_role not null,
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
	status public.supplier_status not null default 'active',
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
	price_tier public.price_tier,
	availability_status public.catalog_availability_status not null default 'available',
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
	status public.price_update_request_status not null default 'pending',
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
	status public.referral_status not null default 'pending',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.quote_requests (
	id uuid primary key default gen_random_uuid(),
	request_number text not null unique default public.next_quote_request_number(),
	customer_id uuid references public.customers(id) on delete restrict,
	status public.quote_request_status not null default 'draft',
	urgency public.quote_request_urgency not null default 'standard',
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
	status public.approval_status not null default 'pending',
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
	status public.sales_quote_version_status not null default 'draft',
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
	status public.quote_status not null default 'draft',
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
	status public.quote_status not null default 'draft',
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
	line_status public.quote_item_line_status not null default 'quoted',
	is_accepted boolean not null default false,
	reject_reason text,
	sort_order integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.quote_counter_offers (
	id uuid primary key default gen_random_uuid(),
	quote_id uuid not null references public.quotes(id) on delete cascade,
	counter_type public.quote_counter_type not null,
	total_discount numeric,
	self_pickup boolean not null default false,
	notes text,
	line_items jsonb,
	created_at timestamptz not null default now()
);

create table public.orders (
	id uuid primary key default gen_random_uuid(),
	order_number text not null unique default public.next_order_number(),
	quote_id uuid unique references public.quotes(id) on delete set null,
	quote_request_id uuid unique references public.quote_requests(id) on delete set null,
	customer_id uuid references public.customers(id) on delete restrict,
	status public.order_workflow_status not null default 'confirmed_for_inventory',
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
	status public.inventory_reservation_status not null default 'reserved',
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
	status public.refill_request_status not null default 'finance_pending',
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
	status public.payment_record_status not null default 'recorded',
	created_at timestamptz not null default now()
);

create table public.supplier_payments (
	id uuid primary key default gen_random_uuid(),
	refill_request_id uuid not null references public.refill_requests(id) on delete cascade,
	recorded_by_employee_id uuid references public.employees(id) on delete set null,
	amount numeric not null check (amount > 0),
	payment_fraction numeric not null check (payment_fraction in (0.5, 1.0)),
	proof_path text not null,
	status public.payment_record_status not null default 'recorded',
	created_at timestamptz not null default now()
);

create table public.trucks (
	id uuid primary key default gen_random_uuid(),
	plate_number text not null unique,
	driver_id uuid references public.drivers(id) on delete set null,
	capacity_tons numeric,
	status public.truck_status not null default 'available',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.loading_tasks (
	id uuid primary key default gen_random_uuid(),
	order_id uuid not null unique references public.orders(id) on delete cascade,
	advisor_employee_id uuid references public.employees(id) on delete set null,
	status public.loading_task_status not null default 'pending',
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
	refill_request_id uuid not null unique references public.refill_requests(id) on delete cascade,
	advisor_employee_id uuid references public.employees(id) on delete set null,
	status public.receiving_task_status not null default 'pending',
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
	status public.delivery_status not null default 'assigned',
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
	status public.driver_online_status not null default 'offline',
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
	source public.driver_location_source not null default 'driver_app',
	recorded_at timestamptz not null default now()
);

create index driver_locations_driver_recorded_idx
	on public.driver_locations (driver_id, recorded_at desc);

create table public.delivery_proofs (
	id uuid primary key default gen_random_uuid(),
	delivery_id uuid not null references public.deliveries(id) on delete cascade,
	driver_id uuid references public.drivers(id) on delete set null,
	proof_type public.delivery_proof_type not null,
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
	status public.support_ticket_status not null default 'open',
	source public.support_ticket_source not null default 'website',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.support_conversations (
	id uuid primary key default gen_random_uuid(),
	customer_id uuid references public.customers(id) on delete set null,
	channel public.support_channel not null,
	external_thread_id text,
	phone text,
	email text,
	status public.support_conversation_status not null default 'open',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.support_messages (
	id uuid primary key default gen_random_uuid(),
	ticket_id uuid references public.support_tickets(id) on delete cascade,
	conversation_id uuid references public.support_conversations(id) on delete cascade,
	sender_type public.support_sender_type not null,
	sender_user_id uuid references auth.users(id) on delete set null,
	channel public.support_message_channel not null,
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
	type public.document_type not null,
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
	channel public.notification_channel not null,
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
	role public.team_member_role not null default 'member',
	created_at timestamptz not null default now(),
	unique (customer_id, user_id)
);

create table public.team_invites (
	id uuid primary key default gen_random_uuid(),
	customer_id uuid not null references public.customers(id) on delete cascade,
	email text not null,
	role public.team_member_role not null default 'member',
	status public.team_invite_status not null default 'pending',
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
	action public.audit_event_type not null,
	details jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now()
);

create table public.ai_tool_call_audit (
	id uuid primary key default gen_random_uuid(),
	actor_user_id uuid references auth.users(id) on delete set null,
	actor_employee_id uuid references public.employees(id) on delete set null,
	agent_scope public.ai_agent_scope not null,
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
		  and (e.is_ceo or er.role::text = required_role or er.role = 'admin')
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
			or er.role::text = required_panel
			or (
				ep.panel::text = required_panel
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

create or replace function app_private.allow_workflow_state_change()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
	perform set_config('app.workflow_rpc', 'on', true);
end;
$$;

create or replace function public.prevent_direct_state_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	state_column text := tg_argv[0];
begin
	if tg_op = 'UPDATE'
		and to_jsonb(old)->>state_column is distinct from to_jsonb(new)->>state_column
		and coalesce(current_setting('app.workflow_rpc', true), '') <> 'on'
		and coalesce(auth.role(), '') <> 'service_role'
	then
		raise exception 'state_updates_must_use_rpc' using errcode = '42501';
	end if;

	return new;
end;
$$;

create or replace function public.log_activity(
	entity_type text,
	entity_id uuid,
	action public.audit_event_type,
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
		values (new.id, new.quote_request_id, new.customer_id, new.total, 'confirmed_for_inventory')
		on conflict (quote_id) do update
		set
			quote_request_id = excluded.quote_request_id,
			customer_id = excluded.customer_id,
			total_amount = excluded.total_amount
		where public.orders.status = 'confirmed_for_inventory';
		perform public.log_activity('quote', new.id, 'quote_accepted', '{}'::jsonb);
	end if;
	return new;
end;
$$;

create trigger quotes_create_order_after_accept
	after update of status on public.quotes
	for each row execute function public.create_order_from_accepted_quote();

create or replace function public.customer_accept_quote(p_quote_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
	v_customer_id uuid;
	accepted_quote public.quotes%rowtype;
	created_order public.orders%rowtype;
begin
	v_customer_id := public.current_customer_id();
	if v_customer_id is null then
		raise exception 'customer_required' using errcode = '42501';
	end if;

	perform app_private.allow_workflow_state_change();

	update public.quotes
	set status = 'accepted', accepted_at = now()
	where id = p_quote_id
	  and quotes.customer_id = v_customer_id
	  and status = 'sent'
	returning * into accepted_quote;

	if accepted_quote.id is null then
		raise exception 'quote_not_found_or_invalid_transition' using errcode = '02000';
	end if;

	insert into public.orders (quote_id, quote_request_id, customer_id, total_amount, status)
	values (
		accepted_quote.id,
		accepted_quote.quote_request_id,
		accepted_quote.customer_id,
		accepted_quote.total,
		'confirmed_for_inventory'
	)
	on conflict (quote_id) do update
	set
		quote_request_id = excluded.quote_request_id,
		customer_id = excluded.customer_id,
		total_amount = excluded.total_amount
	where public.orders.status = 'confirmed_for_inventory'
	returning * into created_order;

	if created_order.id is null then
		select * into created_order
		from public.orders
		where quote_id = accepted_quote.id;
	end if;

	perform public.log_activity(
		'quote',
		accepted_quote.id,
		'customer_quote_accepted',
		jsonb_build_object(
			'from_status', 'sent',
			'to_status', 'accepted',
			'order_id', created_order.id,
			'order_status', created_order.status
		)
	);

	return created_order;
end;
$$;

create or replace function public.customer_decline_quote(
	p_quote_id uuid,
	p_reason text default null,
	p_notes text default null
)
returns public.quotes
language plpgsql
security definer
set search_path = public
as $$
declare
	v_customer_id uuid;
	declined_quote public.quotes%rowtype;
begin
	v_customer_id := public.current_customer_id();
	if v_customer_id is null then
		raise exception 'customer_required' using errcode = '42501';
	end if;

	perform app_private.allow_workflow_state_change();

	update public.quotes
	set
		status = 'declined',
		decline_reason = p_reason,
		decline_notes = p_notes,
		declined_at = now()
	where id = p_quote_id
	  and quotes.customer_id = v_customer_id
	  and status = 'sent'
	returning * into declined_quote;

	if declined_quote.id is null then
		raise exception 'quote_not_found_or_invalid_transition' using errcode = '02000';
	end if;

	perform public.log_activity(
		'quote',
		declined_quote.id,
		'customer_quote_declined',
		jsonb_build_object('from_status', 'sent', 'to_status', 'declined', 'reason', p_reason)
	);

	return declined_quote;
end;
$$;

create or replace function public.customer_request_quote_negotiation(
	p_quote_id uuid,
	p_counter_type public.quote_counter_type,
	p_line_items jsonb default null,
	p_total_discount numeric default null,
	p_self_pickup boolean default false,
	p_notes text default null
)
returns public.quote_counter_offers
language plpgsql
security definer
set search_path = public
as $$
declare
	v_customer_id uuid;
	updated_quote public.quotes%rowtype;
	counter public.quote_counter_offers%rowtype;
begin
	v_customer_id := public.current_customer_id();
	if v_customer_id is null then
		raise exception 'customer_required' using errcode = '42501';
	end if;

	perform app_private.allow_workflow_state_change();

	update public.quotes
	set status = 'negotiating'
	where id = p_quote_id
	  and quotes.customer_id = v_customer_id
	  and status = 'sent'
	returning * into updated_quote;

	if updated_quote.id is null then
		raise exception 'quote_not_found_or_invalid_transition' using errcode = '02000';
	end if;

	insert into public.quote_counter_offers (
		quote_id,
		counter_type,
		total_discount,
		self_pickup,
		notes,
		line_items
	)
	values (
		updated_quote.id,
		p_counter_type,
		p_total_discount,
		coalesce(p_self_pickup, false),
		p_notes,
		p_line_items
	)
	returning * into counter;

	perform public.log_activity(
		'quote',
		updated_quote.id,
		'customer_quote_negotiation_requested',
		jsonb_build_object('from_status', 'sent', 'to_status', 'negotiating', 'counter_offer_id', counter.id)
	);

	return counter;
end;
$$;

create or replace function public.customer_submit_quote_line_response(
	p_quote_id uuid,
	p_line_responses jsonb
)
returns public.quotes
language plpgsql
security definer
set search_path = public
as $$
declare
	v_customer_id uuid;
	updated_quote public.quotes%rowtype;
	line jsonb;
	line_decision public.quote_item_line_status;
begin
	v_customer_id := public.current_customer_id();
	if v_customer_id is null then
		raise exception 'customer_required' using errcode = '42501';
	end if;

	perform app_private.allow_workflow_state_change();

	update public.quotes
	set status = 'negotiating'
	where id = p_quote_id
	  and quotes.customer_id = v_customer_id
	  and status = 'sent'
	returning * into updated_quote;

	if updated_quote.id is null then
		raise exception 'quote_not_found_or_invalid_transition' using errcode = '02000';
	end if;

	for line in select value from jsonb_array_elements(coalesce(p_line_responses, '[]'::jsonb))
	loop
		line_decision := (line->>'decision')::public.quote_item_line_status;

		update public.quote_items
		set
			line_status = line_decision,
			is_accepted = line_decision = 'accepted',
			reject_reason = case
				when line_decision = 'rejected' then coalesce(line->>'reject_reason', line->>'rejectReason')
				else reject_reason
			end,
			customer_counter_price = case
				when line_decision = 'negotiate' and line ? 'negotiated_price'
					then (line->>'negotiated_price')::numeric
				when line_decision = 'negotiate' and line ? 'negotiatedPrice'
					then (line->>'negotiatedPrice')::numeric
				else customer_counter_price
			end
		where id = nullif(coalesce(line->>'item_id', line->>'itemId'), '')::uuid
		  and quote_id = updated_quote.id;
	end loop;

	perform public.log_activity(
		'quote',
		updated_quote.id,
		'customer_quote_line_response_submitted',
		jsonb_build_object(
			'from_status', 'sent',
			'to_status', 'negotiating',
			'line_response_count', jsonb_array_length(coalesce(p_line_responses, '[]'::jsonb))
		)
	);

	return updated_quote;
end;
$$;

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

create trigger quote_requests_prevent_direct_status_update before update on public.quote_requests for each row execute function public.prevent_direct_state_update('status');
create trigger quotes_prevent_direct_status_update before update on public.quotes for each row execute function public.prevent_direct_state_update('status');
create trigger quote_items_prevent_direct_line_status_update before update on public.quote_items for each row execute function public.prevent_direct_state_update('line_status');
create trigger orders_prevent_direct_status_update before update on public.orders for each row execute function public.prevent_direct_state_update('status');
create trigger inventory_reservations_prevent_direct_status_update before update on public.inventory_reservations for each row execute function public.prevent_direct_state_update('status');
create trigger refill_requests_prevent_direct_status_update before update on public.refill_requests for each row execute function public.prevent_direct_state_update('status');
create trigger customer_payments_prevent_direct_status_update before update on public.customer_payments for each row execute function public.prevent_direct_state_update('status');
create trigger supplier_payments_prevent_direct_status_update before update on public.supplier_payments for each row execute function public.prevent_direct_state_update('status');
create trigger loading_tasks_prevent_direct_status_update before update on public.loading_tasks for each row execute function public.prevent_direct_state_update('status');
create trigger receiving_tasks_prevent_direct_status_update before update on public.receiving_tasks for each row execute function public.prevent_direct_state_update('status');
create trigger deliveries_prevent_direct_status_update before update on public.deliveries for each row execute function public.prevent_direct_state_update('status');
create trigger drivers_prevent_direct_status_update before update on public.drivers for each row execute function public.prevent_direct_state_update('status');

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
	perform app_private.allow_workflow_state_change();

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
		perform public.log_activity(
			'quote_request',
			claimed.id,
			'sales_order_claimed',
			jsonb_build_object('employee_id', employee_id, 'from_status', 'submitted', 'to_status', 'assigned')
		);
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
	perform app_private.allow_workflow_state_change();

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

	perform public.log_activity(
		'quote_request',
		updated.id,
		'sales_order_requeued',
		jsonb_build_object('from_status', 'assigned', 'to_status', 'submitted', 'note', p_note)
	);
	return updated;
end;
$$;

create or replace function public.sales_approve_quote(p_order_id uuid, p_quote_version_id uuid default null)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
begin
	return public.sales_confirm_order(p_order_id, p_quote_version_id);
end;
$$;

create or replace function public.sales_confirm_order(p_order_id uuid, p_quote_version_id uuid default null)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	source_request public.quote_requests%rowtype;
	created_order public.orders%rowtype;
	from_status text;
begin
	employee_id := public.require_panel('sales', true);
	perform app_private.allow_workflow_state_change();

	select * into source_request
	from public.quote_requests
	where id = p_order_id
	for update;

	if source_request.id is null then
		raise exception 'quote_request_not_found' using errcode = '02000';
	end if;

	if source_request.status not in ('assigned', 'submitted', 'saved') then
		raise exception 'invalid_sales_confirm_transition_%', source_request.status using errcode = '23514';
	end if;

	from_status := source_request.status::text;

	update public.quote_requests
	set status = 'approved'
	where id = p_order_id
	returning * into source_request;

	insert into public.orders (quote_request_id, customer_id, status, total_amount)
	values (source_request.id, source_request.customer_id, 'confirmed_for_inventory', 0)
	on conflict (quote_request_id) do update
	set
		customer_id = excluded.customer_id,
		total_amount = excluded.total_amount
	where public.orders.status = 'confirmed_for_inventory'
	returning * into created_order;

	if created_order.id is null then
		select * into created_order
		from public.orders
		where quote_request_id = source_request.id;
	end if;

	perform public.log_activity(
		'quote_request',
		source_request.id,
		'sales_order_confirmed',
		jsonb_build_object(
			'employee_id', employee_id,
			'quote_version_id', p_quote_version_id,
			'from_status', from_status,
			'to_status', 'approved',
			'order_status', created_order.status
		)
	);
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
	perform app_private.allow_workflow_state_change();

	update public.quote_requests
	set status = 'rejected', rejected_reason = p_reason, rejected_proof = p_proof
	where id = p_order_id
	returning * into updated;

	if updated.id is null then
		raise exception 'quote_request_not_found' using errcode = '02000';
	end if;

	perform public.log_activity(
		'quote_request',
		updated.id,
		'sales_order_rejected',
		jsonb_build_object('to_status', 'rejected', 'reason', p_reason, 'proof', p_proof)
	);
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
	target_order public.orders%rowtype;
begin
	employee_id := public.require_panel('finance', true);

	select * into target_order
	from public.orders
	where id = p_order_id
	for update;

	if target_order.id is null then
		raise exception 'order_not_found' using errcode = '02000';
	end if;

	if target_order.status in ('delivered', 'rejected', 'canceled') then
		raise exception 'invalid_customer_payment_order_status_%', target_order.status using errcode = '23514';
	end if;

	insert into public.customer_payments (
		order_id,
		recorded_by_employee_id,
		amount,
		payment_fraction,
		proof_path
	)
	values (p_order_id, employee_id, p_amount, p_payment_fraction, p_proof_path)
	returning * into payment;

	perform public.log_activity(
		'order',
		p_order_id,
		'customer_payment_recorded',
		jsonb_build_object(
			'amount', p_amount,
			'payment_fraction', p_payment_fraction,
			'order_status', target_order.status
		)
	);
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
	refill public.refill_requests%rowtype;
	from_status text;
begin
	employee_id := public.require_panel('finance', true);
	perform app_private.allow_workflow_state_change();

	select * into refill
	from public.refill_requests
	where id = p_refill_request_id
	for update;

	if refill.id is null then
		raise exception 'refill_request_not_found' using errcode = '02000';
	end if;

	if refill.status not in ('finance_pending', 'finance_approved') then
		raise exception 'invalid_supplier_payment_refill_status_%', refill.status using errcode = '23514';
	end if;

	from_status := refill.status::text;

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

	perform public.log_activity(
		'refill_request',
		p_refill_request_id,
		'supplier_payment_recorded',
		jsonb_build_object(
			'amount', p_amount,
			'payment_fraction', p_payment_fraction,
			'from_status', from_status,
			'to_status', 'warehouse_receiving'
		)
	);
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
	perform app_private.allow_workflow_state_change();

	select * into target_order
	from public.orders
	where id = p_order_id
	for update;

	if target_order.id is null then
		raise exception 'order_not_found' using errcode = '02000';
	end if;

	if target_order.status <> 'confirmed_for_inventory' then
		raise exception 'invalid_inventory_transition_%', target_order.status using errcode = '23514';
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
	set status = 'inventory_reserved', reserved_at = now()
	where id = p_order_id
	returning * into target_order;

	insert into public.loading_tasks (order_id)
	values (p_order_id)
	on conflict do nothing;

	perform public.log_activity(
		'order',
		p_order_id,
		'order_stock_reserved',
		jsonb_build_object(
			'employee_id', employee_id,
			'from_status', 'confirmed_for_inventory',
			'to_status', 'inventory_reserved'
		)
	);
	return target_order;
end;
$$;

create or replace function public.inventory_evaluate_order(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
begin
	return public.reserve_order_stock(p_order_id);
end;
$$;

create or replace function public.warehouse_start_loading(p_order_id uuid)
returns public.loading_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	target_order public.orders%rowtype;
	task public.loading_tasks%rowtype;
begin
	employee_id := public.require_panel('warehouse', true);
	perform app_private.allow_workflow_state_change();

	select * into target_order
	from public.orders
	where id = p_order_id
	for update;

	if target_order.id is null then
		raise exception 'order_not_found' using errcode = '02000';
	end if;

	if target_order.status <> 'inventory_reserved' then
		raise exception 'invalid_warehouse_loading_transition_%', target_order.status using errcode = '23514';
	end if;

	insert into public.loading_tasks (order_id, advisor_employee_id, status)
	values (p_order_id, employee_id, 'loading')
	on conflict (order_id) do update
	set
		advisor_employee_id = excluded.advisor_employee_id,
		status = 'loading'
	returning * into task;

	update public.orders
	set status = 'warehouse_loading'
	where id = p_order_id;

	perform public.log_activity(
		'order',
		p_order_id,
		'warehouse_loading_started',
		jsonb_build_object(
			'employee_id', employee_id,
			'loading_task_id', task.id,
			'from_status', 'inventory_reserved',
			'to_status', 'warehouse_loading'
		)
	);

	return task;
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
	target_order public.orders%rowtype;
begin
	perform public.require_panel('warehouse', true);
	perform app_private.allow_workflow_state_change();

	select o.* into target_order
	from public.orders o
	join public.loading_tasks lt on lt.order_id = o.id
	where lt.id = p_loading_task_id
	for update of o;

	if target_order.id is null then
		raise exception 'loading_task_not_found' using errcode = '02000';
	end if;

	if target_order.status <> 'warehouse_loading' then
		raise exception 'invalid_warehouse_approve_transition_%', target_order.status using errcode = '23514';
	end if;

	update public.loading_tasks
	set status = 'approved', proof = coalesce(p_proof, '{}'::jsonb)
	where id = p_loading_task_id
	returning * into updated;

	if updated.id is null then
		raise exception 'loading_task_not_found' using errcode = '02000';
	end if;

	update public.orders
	set status = 'dispatch_ready'
	where id = updated.order_id;

	perform public.log_activity(
		'loading_task',
		updated.id,
		'warehouse_loading_approved',
		jsonb_build_object(
			'from_status', 'warehouse_loading',
			'to_status', 'dispatch_ready',
			'proof', coalesce(p_proof, '{}'::jsonb)
		)
	);
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
	perform app_private.allow_workflow_state_change();

	update public.loading_tasks
	set status = 'rejected', rejection_reason = p_reason, proof = p_proof
	where id = p_loading_task_id
	returning * into updated;

	if updated.id is null then
		raise exception 'loading_task_not_found' using errcode = '02000';
	end if;

	update public.orders
	set status = 'rejected'
	where id = updated.order_id
	  and status in ('warehouse_loading', 'dispatch_ready');

	perform public.log_activity(
		'loading_task',
		updated.id,
		'warehouse_loading_rejected',
		jsonb_build_object('to_status', 'rejected', 'reason', p_reason, 'proof', p_proof)
	);
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
	perform app_private.allow_workflow_state_change();

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
	perform app_private.allow_workflow_state_change();

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

create or replace function public.dispatch_assign_driver(
	p_order_id uuid,
	p_driver_id uuid,
	p_truck_id uuid default null,
	p_loading_task_id uuid default null
)
returns public.deliveries
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	target_order public.orders%rowtype;
	delivery public.deliveries%rowtype;
	loading_task_id uuid;
begin
	employee_id := public.require_panel('dispatch', true);
	perform app_private.allow_workflow_state_change();

	select * into target_order
	from public.orders
	where id = p_order_id
	for update;

	if target_order.id is null then
		raise exception 'order_not_found' using errcode = '02000';
	end if;

	if target_order.status <> 'dispatch_ready' then
		raise exception 'invalid_dispatch_assignment_transition_%', target_order.status using errcode = '23514';
	end if;

	if not exists (
		select 1
		from public.drivers
		where id = p_driver_id
		  and status in ('available', 'offline')
	) then
		raise exception 'driver_not_available' using errcode = '23514';
	end if;

	if p_truck_id is not null and not exists (
		select 1
		from public.trucks
		where id = p_truck_id
		  and status = 'available'
	) then
		raise exception 'truck_not_available' using errcode = '23514';
	end if;

	if p_loading_task_id is not null then
		loading_task_id := p_loading_task_id;
	else
		select id into loading_task_id
		from public.loading_tasks
		where order_id = p_order_id
		order by created_at desc
		limit 1;
	end if;

	insert into public.deliveries (order_id, loading_task_id, driver_id, truck_id, status)
	values (p_order_id, loading_task_id, p_driver_id, p_truck_id, 'assigned')
	returning * into delivery;

	update public.orders
	set status = 'dispatch_assigned'
	where id = p_order_id;

	update public.drivers
	set status = 'on_delivery'
	where id = p_driver_id;

	if p_truck_id is not null then
		update public.trucks
		set status = 'dispatched'
		where id = p_truck_id;
	end if;

	perform public.log_activity(
		'order',
		p_order_id,
		'dispatch_driver_assigned',
		jsonb_build_object(
			'employee_id', employee_id,
			'delivery_id', delivery.id,
			'driver_id', p_driver_id,
			'truck_id', p_truck_id,
			'from_status', 'dispatch_ready',
			'to_status', 'dispatch_assigned'
		)
	);

	return delivery;
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
	perform app_private.allow_workflow_state_change();

	update public.deliveries
	set status = 'completed', completed_at = now()
	where id = p_delivery_id
	  and status in ('assigned', 'accepted', 'in_transit', 'arrived')
	returning * into updated;

	if updated.id is null then
		raise exception 'delivery_not_found_or_invalid_transition' using errcode = '02000';
	end if;

	update public.inventory_reservations
	set status = 'consumed'
	where order_id = updated.order_id
	  and status = 'reserved';

	update public.orders
	set status = 'delivered', delivered_at = now()
	where id = updated.order_id;

	update public.drivers
	set status = 'available'
	where id = updated.driver_id;

	update public.trucks
	set status = 'available'
	where id = updated.truck_id;

	perform public.log_activity(
		'delivery',
		updated.id,
		'dispatch_delivery_completed',
		jsonb_build_object('to_status', 'delivered', 'proof', coalesce(p_proof, '{}'::jsonb))
	);
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
	perform app_private.allow_workflow_state_change();

	update public.deliveries
	set status = 'rejected', rejection_reason = p_reason, rejection_proof = p_proof
	where id = p_delivery_id
	  and status in ('assigned', 'accepted', 'in_transit', 'arrived')
	returning * into updated;

	if updated.id is null then
		raise exception 'delivery_not_found_or_invalid_transition' using errcode = '02000';
	end if;

	update public.orders
	set status = 'rejected'
	where id = updated.order_id;

	update public.drivers
	set status = 'available'
	where id = updated.driver_id;

	update public.trucks
	set status = 'available'
	where id = updated.truck_id;

	perform public.log_activity(
		'delivery',
		updated.id,
		'dispatch_delivery_rejected',
		jsonb_build_object('to_status', 'rejected', 'reason', p_reason, 'proof', p_proof)
	);
	return updated;
end;
$$;

create or replace function public.driver_accept_delivery(p_delivery_id uuid)
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

	perform app_private.allow_workflow_state_change();

	update public.deliveries
	set status = 'accepted'
	where id = p_delivery_id
	  and deliveries.driver_id = v_driver_id
	  and status = 'assigned'
	returning * into updated;

	if updated.id is null then
		raise exception 'delivery_not_found_or_invalid_transition' using errcode = '02000';
	end if;

	update public.drivers
	set status = 'on_delivery'
	where id = v_driver_id;

	perform public.log_activity(
		'delivery',
		updated.id,
		'driver_delivery_accepted',
		jsonb_build_object('driver_id', v_driver_id, 'from_status', 'assigned', 'to_status', 'accepted')
	);

	return updated;
end;
$$;

create or replace function public.driver_start_delivery(p_delivery_id uuid)
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

	perform app_private.allow_workflow_state_change();

	update public.deliveries
	set status = 'in_transit', started_at = now()
	where id = p_delivery_id
	  and deliveries.driver_id = v_driver_id
	  and status = 'accepted'
	returning * into updated;

	if updated.id is null then
		raise exception 'delivery_not_found_or_invalid_transition' using errcode = '02000';
	end if;

	update public.orders
	set status = 'out_for_delivery'
	where id = updated.order_id;

	perform public.log_activity(
		'delivery',
		updated.id,
		'driver_delivery_started',
		jsonb_build_object('driver_id', v_driver_id, 'from_status', 'accepted', 'to_status', 'in_transit', 'order_status', 'out_for_delivery')
	);

	return updated;
end;
$$;

create or replace function public.driver_record_arrival(p_delivery_id uuid)
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

	perform app_private.allow_workflow_state_change();

	update public.deliveries
	set status = 'arrived', arrived_at = now()
	where id = p_delivery_id
	  and deliveries.driver_id = v_driver_id
	  and status = 'in_transit'
	returning * into updated;

	if updated.id is null then
		raise exception 'delivery_not_found_or_invalid_transition' using errcode = '02000';
	end if;

	perform public.log_activity(
		'delivery',
		updated.id,
		'driver_delivery_arrived',
		jsonb_build_object('driver_id', v_driver_id, 'from_status', 'in_transit', 'to_status', 'arrived')
	);

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
	perform app_private.allow_workflow_state_change();

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
	perform app_private.allow_workflow_state_change();

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

	update public.drivers
	set status = 'available'
	where id = v_driver_id;

	update public.trucks
	set status = 'available'
	where id = updated.truck_id;

	perform public.log_activity(
		'delivery',
		updated.id,
		'driver_delivery_confirmed',
		jsonb_build_object('driver_id', v_driver_id, 'to_status', 'delivered')
	);
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
	perform app_private.allow_workflow_state_change();

	update public.deliveries
	set status = 'rejected', rejection_reason = p_reason, rejection_proof = p_proof
	where id = p_delivery_id
	  and deliveries.driver_id = v_driver_id
	  and status in ('assigned', 'accepted', 'in_transit', 'arrived')
	returning * into updated;

	if updated.id is null then
		raise exception 'delivery_not_found_or_invalid_transition' using errcode = '02000';
	end if;

	update public.orders
	set status = 'rejected'
	where id = updated.order_id;

	update public.drivers
	set status = 'available'
	where id = v_driver_id;

	update public.trucks
	set status = 'available'
	where id = updated.truck_id;

	perform public.log_activity(
		'delivery',
		updated.id,
		'driver_delivery_rejected',
		jsonb_build_object('to_status', 'rejected', 'reason', p_reason, 'proof', p_proof)
	);
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
	v_customer_id uuid;
	ticket public.support_tickets%rowtype;
begin
	v_customer_id := public.current_customer_id();

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
		case when v_customer_id is null then 'website'::public.support_ticket_source else 'portal'::public.support_ticket_source end
	)
	returning * into ticket;

	insert into public.support_messages (
		ticket_id,
		sender_type,
		sender_user_id,
		channel,
		body
	)
	values (
		ticket.id,
		case when v_customer_id is null then 'external'::public.support_sender_type else 'customer'::public.support_sender_type end,
		auth.uid(),
		'website',
		p_message
	);

	perform public.log_activity('support_ticket', ticket.id, 'support_ticket_created', jsonb_build_object('source', ticket.source));
	return ticket;
end;
$$;

create or replace function public.send_support_reply(
	p_ticket_id uuid,
	p_body text,
	p_channel public.support_message_channel default 'email'
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
	status::text as subtitle,
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
	status::text as subtitle,
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

grant execute on function public.customer_accept_quote(uuid) to authenticated;
grant execute on function public.customer_decline_quote(uuid, text, text) to authenticated;
grant execute on function public.customer_request_quote_negotiation(uuid, public.quote_counter_type, jsonb, numeric, boolean, text) to authenticated;
grant execute on function public.customer_submit_quote_line_response(uuid, jsonb) to authenticated;
grant execute on function public.claim_next_sales_order() to authenticated;
grant execute on function public.sales_save_and_requeue(uuid, text) to authenticated;
grant execute on function public.sales_approve_quote(uuid, uuid) to authenticated;
grant execute on function public.sales_confirm_order(uuid, uuid) to authenticated;
grant execute on function public.sales_reject_order(uuid, text, jsonb) to authenticated;
grant execute on function public.create_manual_order(uuid, jsonb, text) to authenticated;
grant execute on function public.request_price_update(uuid, uuid, text) to authenticated;
grant execute on function public.create_supplier_refill(uuid, uuid, numeric, numeric, jsonb) to authenticated;
grant execute on function public.record_customer_payment(uuid, numeric, numeric, text) to authenticated;
grant execute on function public.record_supplier_payment(uuid, numeric, numeric, text) to authenticated;
grant execute on function public.reserve_order_stock(uuid) to authenticated;
grant execute on function public.inventory_evaluate_order(uuid) to authenticated;
grant execute on function public.warehouse_start_loading(uuid) to authenticated;
grant execute on function public.warehouse_approve_loading(uuid, jsonb) to authenticated;
grant execute on function public.warehouse_reject_loading(uuid, text, jsonb) to authenticated;
grant execute on function public.warehouse_approve_receiving(uuid, jsonb) to authenticated;
grant execute on function public.warehouse_reject_receiving(uuid, text, jsonb) to authenticated;
grant execute on function public.dispatch_assign_driver(uuid, uuid, uuid, uuid) to authenticated;
grant execute on function public.dispatch_complete_delivery(uuid, jsonb) to authenticated;
grant execute on function public.dispatch_reject_delivery(uuid, text, jsonb) to authenticated;
grant execute on function public.driver_accept_delivery(uuid) to authenticated;
grant execute on function public.driver_start_delivery(uuid) to authenticated;
grant execute on function public.driver_record_arrival(uuid) to authenticated;
grant execute on function public.driver_update_location(numeric, numeric, numeric, uuid, numeric, numeric) to authenticated;
grant execute on function public.driver_confirm_delivery(uuid, text, text, numeric, numeric) to authenticated;
grant execute on function public.driver_reject_delivery(uuid, text, jsonb) to authenticated;
grant execute on function public.create_support_ticket(text, text, text, text, text) to anon, authenticated;
grant execute on function public.send_support_reply(uuid, text, public.support_message_channel) to authenticated;
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
