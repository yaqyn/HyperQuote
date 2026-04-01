> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# HyperQuote -- Complete Supabase Database Design
## B2B Building Materials Distribution Platform

**Date:** 2026-03-28
**Stack:** Supabase (PostgreSQL 15+) + Cloudflare Workers + pgvector + pg_cron
**Scope:** Every table, enum, relationship, RLS policy, trigger, index, edge function, and cron job needed for the entire platform.

---

## Table of Contents

1. [All Enums](#1-all-enums)
2. [All Tables by Domain](#2-all-tables-by-domain)
3. [Key Relationships and Foreign Keys](#3-key-relationships-and-foreign-keys)
4. [RLS Policies Pattern](#4-rls-policies-pattern)
5. [Database Triggers](#5-database-triggers)
6. [Indexes for Performance](#6-indexes-for-performance)
7. [pgvector Tables for AI](#7-pgvector-tables-for-ai)
8. [Edge Functions](#8-edge-functions)
9. [Real-Time Subscriptions](#9-real-time-subscriptions)
10. [Cron Jobs via pg_cron](#10-cron-jobs-via-pg_cron)
11. [Data Retention and Archiving](#11-data-retention-and-archiving)
12. [Migration Strategy](#12-migration-strategy)
13. [Complete SQL Schema](#13-complete-sql-schema)

---

## 1. ALL ENUMS

### Auth and Users

```sql
CREATE TYPE public.app_role AS ENUM (
  'ceo',
  'admin',
  'sales_director',
  'sales_manager',
  'sales_rep',
  'quoting_specialist',
  'bdr',                       -- Business Development Rep
  'procurement_manager',
  'procurement_officer',
  'warehouse_manager',
  'warehouse_worker',
  'quality_inspector',
  'dispatcher',
  'driver',
  'accountant',
  'ar_clerk',
  'ap_clerk',
  'credit_manager',
  'cs_agent',                  -- Customer Service
  'cs_manager',
  'customer',                  -- External: customer portal user
  'supplier'                   -- External: supplier portal user
);

CREATE TYPE public.app_permission AS ENUM (
  -- Quote Requests
  'quote_requests.create', 'quote_requests.read', 'quote_requests.read_own',
  'quote_requests.update', 'quote_requests.delete',
  -- Quotes
  'quotes.create', 'quotes.read', 'quotes.read_own', 'quotes.update',
  'quotes.approve', 'quotes.send',
  -- Orders
  'orders.create', 'orders.read', 'orders.read_own', 'orders.update',
  'orders.cancel', 'orders.delete',
  -- Purchase Orders
  'purchase_orders.create', 'purchase_orders.read', 'purchase_orders.read_own',
  'purchase_orders.update', 'purchase_orders.approve', 'purchase_orders.send',
  -- Inventory
  'inventory.read', 'inventory.update', 'inventory.transfer', 'inventory.adjust',
  -- Deliveries
  'deliveries.create', 'deliveries.read', 'deliveries.read_assigned',
  'deliveries.update', 'deliveries.update_status', 'deliveries.dispatch',
  -- Invoices
  'invoices.create', 'invoices.read', 'invoices.read_own',
  'invoices.update', 'invoices.approve', 'invoices.void',
  -- Payments
  'payments.create', 'payments.read', 'payments.read_own',
  'payments.apply', 'payments.reconcile',
  -- Credit
  'credit.read', 'credit.approve', 'credit.update',
  -- Returns
  'returns.create', 'returns.read', 'returns.read_own',
  'returns.approve', 'returns.update',
  -- Customers
  'customers.create', 'customers.read', 'customers.read_own',
  'customers.update', 'customers.delete',
  -- Suppliers
  'suppliers.create', 'suppliers.read', 'suppliers.update', 'suppliers.delete',
  -- Products
  'products.create', 'products.read', 'products.update', 'products.delete',
  -- Drivers
  'drivers.create', 'drivers.read', 'drivers.update',
  -- Vehicles
  'vehicles.create', 'vehicles.read', 'vehicles.update',
  -- Support Tickets
  'tickets.create', 'tickets.read', 'tickets.read_own',
  'tickets.update', 'tickets.assign', 'tickets.escalate',
  -- Reports
  'reports.read', 'reports.financial', 'reports.operational',
  -- Users & Settings
  'users.manage', 'users.read', 'settings.manage',
  -- AI
  'ai.chat', 'ai.admin'
);

CREATE TYPE public.user_type AS ENUM (
  'employee', 'customer', 'supplier', 'driver'
);
```

### Quote and Order Lifecycle

```sql
CREATE TYPE public.quote_request_status AS ENUM (
  'draft', 'submitted', 'under_review', 'sourcing',
  'quote_ready', 'on_hold', 'rejected', 'withdrawn', 'cancelled'
);

CREATE TYPE public.quote_status AS ENUM (
  'draft', 'internal_review', 'pending_approval', 'approved',
  'sent', 'viewed', 'negotiating', 'revised',
  'accepted', 'declined', 'expired', 'cancelled', 'requires_re_quote'
);

CREATE TYPE public.order_status AS ENUM (
  'confirmed', 'processing', 'partially_fulfilled', 'fulfilled',
  'completed', 'on_hold', 'cancellation_requested',
  'cancelled', 'back_ordered'
);

CREATE TYPE public.supplier_po_status AS ENUM (
  'draft', 'sent', 'confirmed', 'in_production', 'shipped',
  'partially_received', 'received', 'inspected', 'closed',
  'rejected', 'cancelled'
);
```

### Delivery and Logistics

```sql
CREATE TYPE public.delivery_status AS ENUM (
  'scheduled', 'picking_loading', 'dispatched', 'in_transit',
  'at_site', 'delivered', 'partially_delivered',
  'failed', 'rescheduled', 'returned', 'cancelled'
);

CREATE TYPE public.driver_type AS ENUM (
  'internal_w2',           -- Full-time employee driver
  'contracted_recurring',  -- Regular contracted driver
  'on_demand_gig'          -- On-demand / gig driver
);

CREATE TYPE public.vehicle_type AS ENUM (
  'flatbed_semi', 'flatbed_straight', 'boom_truck',
  'moffett_truck', 'box_truck', 'pickup_trailer',
  'dump_truck', 'concrete_mixer', 'cargo_van'
);

CREATE TYPE public.vehicle_status AS ENUM (
  'available', 'in_use', 'maintenance', 'out_of_service', 'retired'
);

CREATE TYPE public.cdl_class AS ENUM ('class_a', 'class_b', 'non_cdl');

CREATE TYPE public.delivery_failure_reason AS ENUM (
  'site_not_ready', 'customer_not_present', 'access_blocked',
  'wrong_address', 'vehicle_breakdown', 'weather', 'safety_concern',
  'equipment_unavailable', 'other'
);
```

### Finance

```sql
CREATE TYPE public.invoice_status AS ENUM (
  'draft', 'sent', 'viewed', 'partially_paid', 'paid',
  'overdue', 'collections', 'disputed', 'resolved',
  'adjusted', 'cancelled', 'written_off'
);

CREATE TYPE public.invoice_type AS ENUM (
  'standard',           -- Per-delivery invoice
  'progress',           -- Milestone / progress billing
  'consolidated',       -- Monthly consolidated
  'proforma',           -- Pro-forma (advance)
  'credit_note',        -- Credit note
  'debit_note',         -- Debit note (cancellation fees, adjustments)
  'cancellation'        -- Order cancellation fee
);

CREATE TYPE public.payment_status AS ENUM (
  'expected', 'received', 'matched', 'partially_applied',
  'fully_applied', 'overpayment', 'unmatched',
  'bounced', 'reversed', 'refunded'
);

CREATE TYPE public.payment_method AS ENUM (
  'wire_transfer', 'certified_check', 'company_check',
  'ach', 'letter_of_credit', 'bank_guarantee',
  'cash_advance', 'credit_card'
);

CREATE TYPE public.payment_terms AS ENUM (
  'cod', 'cia',         -- Cash on delivery, Cash in advance
  'net_15', 'net_30', 'net_45', 'net_60', 'net_90',
  '2_10_net_30',        -- 2% discount if paid within 10 days
  '1_10_net_30',
  'progress_billing',
  'milestone',
  'lc_at_sight',        -- Letter of credit at sight
  'lc_30_days',
  'lc_60_days',
  'custom'
);

CREATE TYPE public.credit_status AS ENUM (
  'pending_review', 'approved', 'conditionally_approved',
  'declined', 'suspended', 'on_hold', 'expired'
);

CREATE TYPE public.credit_note_status AS ENUM (
  'draft', 'approved', 'issued', 'applied',
  'partially_applied', 'cancelled'
);

CREATE TYPE public.return_status AS ENUM (
  'requested', 'approved', 'denied', 'pickup_scheduled',
  'received', 'inspected', 'credit_approved',
  'replacement_ordered', 'rejected', 'closed'
);
```

### Products and Inventory

```sql
CREATE TYPE public.product_category AS ENUM (
  'structural_steel', 'rebar', 'steel_sections',
  'cement', 'concrete_products', 'aggregates',
  'lumber', 'engineered_wood', 'plywood_osb',
  'drywall', 'insulation',
  'roofing', 'waterproofing',
  'plumbing', 'hvac', 'piping_fittings',
  'electrical', 'lighting',
  'tile_flooring', 'fixtures_hardware',
  'adhesives_sealants', 'paint_coatings',
  'safety_equipment', 'fasteners',
  'windows_doors', 'glass',
  'other'
);

CREATE TYPE public.unit_of_measure AS ENUM (
  -- Weight
  'kg', 'ton', 'metric_ton', 'lb',
  -- Length
  'meter', 'foot', 'inch', 'yard',
  -- Area
  'sqm', 'sqft',
  -- Volume
  'cubic_meter', 'cubic_yard', 'liter', 'gallon',
  -- Count
  'piece', 'bag', 'bundle', 'pallet', 'roll',
  'sheet', 'box', 'carton', 'set', 'pair',
  -- Building-specific
  'board_foot', 'linear_foot', 'linear_meter',
  'square', 'truck_load'
);

CREATE TYPE public.inventory_status AS ENUM (
  'available', 'reserved', 'allocated', 'picked',
  'in_transit', 'damaged', 'quarantine',
  'expired', 'returned'
);

CREATE TYPE public.stock_movement_type AS ENUM (
  'purchase_receipt', 'sales_shipment', 'transfer_in', 'transfer_out',
  'adjustment_positive', 'adjustment_negative', 'return_from_customer',
  'return_to_supplier', 'damage_write_off', 'cycle_count_adjustment',
  'initial_stock'
);

CREATE TYPE public.inspection_result AS ENUM (
  'pass', 'fail', 'conditional', 'pending'
);
```

### Support Tickets

```sql
CREATE TYPE public.ticket_status AS ENUM (
  'new', 'assigned', 'in_progress', 'waiting_on_customer',
  'waiting_on_internal', 'waiting_on_supplier',
  'escalated', 'resolved', 'closed', 'reopened'
);

CREATE TYPE public.ticket_priority AS ENUM (
  'low', 'normal', 'high', 'critical', 'urgent'
);

CREATE TYPE public.ticket_category AS ENUM (
  'order_issue', 'quote_issue', 'delivery_issue',
  'payment_billing', 'account_issue', 'product_inquiry',
  'platform_technical', 'supplier_issue', 'return_claim'
);
```

### System

```sql
CREATE TYPE public.notification_channel AS ENUM (
  'in_app', 'email', 'sms', 'whatsapp', 'push'
);

CREATE TYPE public.notification_priority AS ENUM (
  'low', 'normal', 'high', 'urgent'
);

CREATE TYPE public.approval_status AS ENUM (
  'pending', 'approved', 'rejected', 'escalated', 'expired'
);

CREATE TYPE public.approval_type AS ENUM (
  'quote_approval', 'credit_approval', 'po_approval',
  'payment_approval', 'return_approval', 'credit_note_approval',
  'price_override', 'discount_override', 'cancellation_approval'
);

CREATE TYPE public.audit_action AS ENUM (
  'create', 'update', 'delete', 'status_change',
  'approval', 'rejection', 'login', 'logout',
  'export', 'view_sensitive', 'bulk_update'
);

CREATE TYPE public.urgency AS ENUM ('standard', 'rush', 'emergency');

CREATE TYPE public.customer_tier AS ENUM (
  'standard', 'silver', 'gold', 'platinum', 'strategic'
);

CREATE TYPE public.address_type AS ENUM (
  'billing', 'shipping', 'jobsite', 'warehouse', 'headquarters', 'branch'
);

CREATE TYPE public.contact_type AS ENUM (
  'primary', 'billing', 'purchasing', 'site_contact',
  'accounts_payable', 'executive', 'technical'
);

CREATE TYPE public.document_type AS ENUM (
  'quote_pdf', 'invoice_pdf', 'po_pdf', 'pod_document',
  'credit_application', 'tax_exemption_cert',
  'material_cert', 'test_report', 'msds',
  'insurance_cert', 'lien_waiver', 'contract',
  'drawing', 'bom', 'photo', 'other'
);

CREATE TYPE public.shipping_method AS ENUM (
  'own_fleet', 'third_party_ftl', 'third_party_ltl',
  'supplier_direct', 'customer_pickup', 'courier'
);

CREATE TYPE public.fob_terms AS ENUM (
  'fob_origin', 'fob_destination', 'fob_warehouse'
);
```

---

## 2. ALL TABLES BY DOMAIN

### 2.1 Auth / Users / Tenants

```sql
-- =============================================
-- TENANT / ORGANIZATION
-- =============================================
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  domain TEXT,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',   -- Company-wide settings
  timezone TEXT DEFAULT 'UTC',
  currency TEXT DEFAULT 'USD',
  tax_id TEXT,                   -- EIN / VAT number
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USER PROFILES (extends auth.users)
-- =============================================
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  user_type public.user_type NOT NULL,
  -- Linked entity (only one is non-null based on user_type)
  customer_id UUID,             -- FK added after customers table
  supplier_id UUID,             -- FK added after suppliers table
  driver_id UUID,               -- FK added after drivers table
  employee_id UUID,             -- FK added after employees table
  -- Profile
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  display_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  locale TEXT DEFAULT 'en',
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USER ROLES (many-to-many: user can have multiple roles)
-- =============================================
CREATE TABLE public.user_roles (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,       -- Temporary role assignments
  UNIQUE (user_id, role, tenant_id)
);

-- =============================================
-- ROLE PERMISSIONS (which role gets which permissions)
-- =============================================
CREATE TABLE public.role_permissions (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  role public.app_role NOT NULL,
  permission public.app_permission NOT NULL,
  UNIQUE (role, permission)
);

-- =============================================
-- EMPLOYEES
-- =============================================
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  user_id UUID UNIQUE REFERENCES auth.users(id),
  employee_number TEXT NOT NULL,
  department TEXT NOT NULL,          -- sales, procurement, operations, finance, cs, executive
  title TEXT,
  reports_to UUID REFERENCES public.employees(id),
  hire_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  phone_extension TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, employee_number)
);
```

### 2.2 Customers

```sql
-- =============================================
-- CUSTOMERS (company-level entity)
-- =============================================
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  customer_number TEXT NOT NULL,         -- Human-readable: CUST-00142
  company_name TEXT NOT NULL,
  legal_name TEXT,
  trade_name TEXT,                       -- DBA
  tier public.customer_tier DEFAULT 'standard',
  -- Tax info
  tax_id TEXT,                           -- EIN
  tax_exempt BOOLEAN DEFAULT FALSE,
  tax_exemption_cert_url TEXT,
  tax_exemption_expires_at DATE,
  -- Industry info
  industry TEXT,                         -- Construction, General Contractor, Developer, etc.
  company_size TEXT,                     -- SMB, Mid-Market, Enterprise
  annual_revenue_range TEXT,
  -- Credit
  credit_status public.credit_status DEFAULT 'pending_review',
  credit_limit DECIMAL(15,2) DEFAULT 0,
  credit_limit_currency TEXT DEFAULT 'USD',
  credit_terms public.payment_terms DEFAULT 'cod',
  credit_approved_at TIMESTAMPTZ,
  credit_approved_by UUID REFERENCES auth.users(id),
  credit_review_date DATE,               -- Next review date
  -- Account management
  assigned_sales_rep UUID REFERENCES public.employees(id),
  assigned_account_manager UUID REFERENCES public.employees(id),
  -- Metadata
  website TEXT,
  notes TEXT,
  tags TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  onboarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, customer_number)
);

-- =============================================
-- CUSTOMER CONTACTS
-- =============================================
CREATE TABLE public.customer_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  contact_type public.contact_type DEFAULT 'primary',
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  title TEXT,                            -- Job title
  email TEXT,
  phone TEXT,
  mobile TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  is_portal_user BOOLEAN DEFAULT FALSE,  -- Has login access
  user_id UUID REFERENCES auth.users(id),-- Linked auth account
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ADDRESSES (polymorphic: customers, suppliers, projects)
-- =============================================
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  -- Polymorphic reference
  addressable_type TEXT NOT NULL,        -- 'customer', 'supplier', 'project', 'warehouse'
  addressable_id UUID NOT NULL,
  address_type public.address_type DEFAULT 'shipping',
  label TEXT,                            -- "Main Office", "Downtown Jobsite", etc.
  -- Address fields
  line_1 TEXT NOT NULL,
  line_2 TEXT,
  city TEXT NOT NULL,
  state_province TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'US',
  -- Geo
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  -- Delivery-specific
  site_access_notes TEXT,                -- Gate codes, low bridges, narrow roads
  unloading_equipment TEXT,              -- "Customer has crane", "Moffett required"
  delivery_time_restriction TEXT,        -- "7AM-4PM only", "No deliveries on Fridays"
  contact_name_on_site TEXT,
  contact_phone_on_site TEXT,
  --
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PROJECTS (construction projects for customers)
-- =============================================
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  project_number TEXT NOT NULL,          -- PRJ-2026-00042
  name TEXT NOT NULL,
  description TEXT,
  -- Location
  address_id UUID REFERENCES public.addresses(id),
  -- Timeline
  start_date DATE,
  estimated_end_date DATE,
  actual_end_date DATE,
  -- Financials
  project_budget DECIMAL(15,2),
  total_quoted DECIMAL(15,2) DEFAULT 0,
  total_ordered DECIMAL(15,2) DEFAULT 0,
  total_delivered DECIMAL(15,2) DEFAULT 0,
  total_invoiced DECIMAL(15,2) DEFAULT 0,
  total_paid DECIMAL(15,2) DEFAULT 0,
  -- Status
  status TEXT DEFAULT 'active',          -- active, completed, on_hold, cancelled
  assigned_sales_rep UUID REFERENCES public.employees(id),
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, project_number)
);

-- =============================================
-- CUSTOMER CREDIT APPLICATIONS
-- =============================================
CREATE TABLE public.credit_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  -- Requested
  requested_limit DECIMAL(15,2) NOT NULL,
  requested_terms public.payment_terms,
  -- Application data
  years_in_business INTEGER,
  annual_revenue DECIMAL(15,2),
  bank_name TEXT,
  bank_account_number_last4 TEXT,
  bank_contact TEXT,
  -- Trade references (stored as JSONB array)
  trade_references JSONB DEFAULT '[]',   -- [{company, contact, phone, email, account_number}]
  -- Credit report
  duns_number TEXT,
  credit_score INTEGER,
  credit_report_url TEXT,
  credit_report_date DATE,
  -- Decision
  status public.credit_status DEFAULT 'pending_review',
  approved_limit DECIMAL(15,2),
  approved_terms public.payment_terms,
  decision_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  -- Documents
  financial_statements_url TEXT,
  application_form_url TEXT,
  --
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.3 Suppliers

```sql
-- =============================================
-- SUPPLIERS
-- =============================================
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  supplier_number TEXT NOT NULL,         -- SUP-00042
  company_name TEXT NOT NULL,
  legal_name TEXT,
  -- Contact
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  -- Business
  tax_id TEXT,
  website TEXT,
  -- Categories they supply
  product_categories public.product_category[],
  -- Terms
  default_payment_terms public.payment_terms DEFAULT 'net_30',
  default_lead_time_days INTEGER DEFAULT 7,
  minimum_order_value DECIMAL(15,2),
  -- Performance metrics (updated by cron)
  on_time_delivery_rate DECIMAL(5,2),    -- Percentage
  quality_score DECIMAL(5,2),            -- 0-100
  average_lead_time_days DECIMAL(5,1),
  total_pos_count INTEGER DEFAULT 0,
  total_pos_value DECIMAL(15,2) DEFAULT 0,
  -- Supplier portal
  has_portal_access BOOLEAN DEFAULT FALSE,
  portal_user_id UUID REFERENCES auth.users(id),
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_preferred BOOLEAN DEFAULT FALSE,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, supplier_number)
);

-- =============================================
-- SUPPLIER CONTACTS
-- =============================================
CREATE TABLE public.supplier_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  contact_type public.contact_type DEFAULT 'primary',
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  is_portal_user BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SUPPLIER PRICE LISTS (published catalogs from suppliers)
-- =============================================
CREATE TABLE public.supplier_price_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  name TEXT NOT NULL,                    -- "Q1 2026 Price List"
  effective_date DATE NOT NULL,
  expiry_date DATE,
  currency TEXT DEFAULT 'USD',
  file_url TEXT,                         -- Original uploaded file
  status TEXT DEFAULT 'active',          -- draft, active, expired, superseded
  notes TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.4 Products / Catalog

```sql
-- =============================================
-- PRODUCTS (master product catalog)
-- =============================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category public.product_category NOT NULL,
  subcategory TEXT,
  -- Specs
  brand TEXT,
  manufacturer TEXT,
  model_number TEXT,
  specifications JSONB DEFAULT '{}',     -- Flexible specs: grade, size, color, etc.
  -- Units
  unit_of_measure public.unit_of_measure NOT NULL,
  secondary_uom public.unit_of_measure,  -- e.g., sold by piece, weighed by kg
  uom_conversion_factor DECIMAL(12,6),   -- How many secondary per primary
  -- Weight/Dimensions (for freight calculations)
  weight_kg DECIMAL(10,3),
  length_cm DECIMAL(10,2),
  width_cm DECIMAL(10,2),
  height_cm DECIMAL(10,2),
  -- Pricing references (not customer-facing prices)
  last_purchase_price DECIMAL(12,4),
  weighted_avg_cost DECIMAL(12,4),
  -- Classification
  is_stockable BOOLEAN DEFAULT FALSE,    -- Can be held in inventory
  is_active BOOLEAN DEFAULT TRUE,
  requires_inspection BOOLEAN DEFAULT FALSE,
  is_hazmat BOOLEAN DEFAULT FALSE,
  shelf_life_days INTEGER,               -- Null if no expiry
  -- Images
  image_urls TEXT[],
  -- Search
  search_vector TSVECTOR,               -- Full-text search
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, sku)
);

-- =============================================
-- PRODUCT SUPPLIERS (which suppliers sell which products)
-- =============================================
CREATE TABLE public.product_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  supplier_sku TEXT,                     -- Supplier's own SKU
  supplier_product_name TEXT,            -- Supplier's name for this product
  -- Pricing
  unit_cost DECIMAL(12,4),              -- Current cost from this supplier
  currency TEXT DEFAULT 'USD',
  price_list_id UUID REFERENCES public.supplier_price_lists(id),
  minimum_order_qty DECIMAL(12,3),
  price_breaks JSONB DEFAULT '[]',       -- [{qty: 100, price: 42.50}, {qty: 500, price: 40.00}]
  -- Lead time
  lead_time_days INTEGER DEFAULT 7,
  -- Preference
  is_preferred BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  last_quoted_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, product_id, supplier_id)
);

-- =============================================
-- PRICING RULES
-- =============================================
CREATE TABLE public.pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  -- Rule targeting (null means applies to all)
  customer_id UUID REFERENCES public.customers(id),
  customer_tier public.customer_tier,
  project_id UUID REFERENCES public.projects(id),
  product_id UUID REFERENCES public.products(id),
  product_category public.product_category,
  -- Rule definition
  priority INTEGER NOT NULL DEFAULT 100, -- Lower = higher priority
  rule_type TEXT NOT NULL,               -- 'contract', 'customer_specific', 'tier', 'project', 'volume', 'category_default', 'global_default'
  -- Pricing method (one of these is set)
  fixed_price DECIMAL(12,4),            -- Absolute price
  margin_percent DECIMAL(5,2),          -- Markup percentage
  discount_percent DECIMAL(5,2),        -- Discount off base
  -- Volume breaks
  min_quantity DECIMAL(12,3),
  max_quantity DECIMAL(12,3),
  -- Validity
  effective_date DATE,
  expiry_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  -- Audit
  approved_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CONTRACT PRICES (locked prices for specific customers)
-- =============================================
CREATE TABLE public.contract_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  contract_number TEXT,
  unit_price DECIMAL(12,4) NOT NULL,
  currency TEXT DEFAULT 'USD',
  effective_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  min_quantity DECIMAL(12,3),
  max_quantity DECIMAL(12,3),
  approved_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.5 Quotes

```sql
-- =============================================
-- QUOTE REQUESTS (customer material list submissions)
-- =============================================
CREATE TABLE public.quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  request_number TEXT NOT NULL,          -- QR-2026-00142
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  project_id UUID REFERENCES public.projects(id),
  -- Delivery requirements
  delivery_address_id UUID REFERENCES public.addresses(id),
  requested_delivery_date DATE,
  urgency public.urgency DEFAULT 'standard',
  -- Status
  status public.quote_request_status DEFAULT 'draft',
  -- Assignment
  assigned_to UUID REFERENCES public.employees(id),
  -- Hold/rejection
  hold_reason TEXT,
  rejection_reason TEXT,
  -- Source
  source TEXT DEFAULT 'portal',          -- portal, email, phone, whatsapp, ai_chat
  -- Attachments stored in documents table
  notes TEXT,
  -- Timestamps
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, request_number)
);

-- =============================================
-- QUOTE REQUEST LINE ITEMS
-- =============================================
CREATE TABLE public.quote_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id UUID NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  -- Product reference (may be fuzzy -- customer description)
  product_id UUID REFERENCES public.products(id),  -- Null if not yet matched
  customer_description TEXT NOT NULL,    -- What customer typed: "50kg OPC cement"
  specifications TEXT,                   -- Grade, size, color, etc.
  quantity DECIMAL(12,3) NOT NULL,
  unit_of_measure public.unit_of_measure,
  -- Internal matching
  matched_product_name TEXT,             -- What we matched it to
  match_confidence DECIMAL(5,2),         -- AI match confidence
  -- Status
  is_available BOOLEAN,                  -- Can we source this?
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- QUOTES (priced proposals sent to customers)
-- =============================================
CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  quote_number TEXT NOT NULL,            -- Q-2026-00142-v1
  quote_request_id UUID REFERENCES public.quote_requests(id),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  project_id UUID REFERENCES public.projects(id),
  -- Versioning
  version_number INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES public.quotes(id),
  -- Status
  status public.quote_status DEFAULT 'draft',
  -- Totals
  subtotal DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  delivery_fee DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  margin_percent DECIMAL(5,2),           -- Overall margin
  margin_amount DECIMAL(15,2),
  currency TEXT DEFAULT 'USD',
  -- Terms
  payment_terms public.payment_terms,
  delivery_terms public.fob_terms DEFAULT 'fob_destination',
  delivery_address_id UUID REFERENCES public.addresses(id),
  estimated_delivery_date DATE,
  -- Validity
  validity_days INTEGER DEFAULT 30,
  valid_until DATE,
  -- Approval
  requires_approval BOOLEAN DEFAULT FALSE,
  approval_threshold DECIMAL(15,2),      -- If total > this, needs approval
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  -- Customer interaction
  customer_po_reference TEXT,            -- Customer's PO number on acceptance
  -- Sales
  created_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES public.employees(id),
  -- Notes
  internal_notes TEXT,                   -- Not visible to customer
  customer_notes TEXT,                   -- Visible to customer
  negotiation_notes TEXT,
  -- Timestamps
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, quote_number)
);

-- =============================================
-- QUOTE LINE ITEMS
-- =============================================
CREATE TABLE public.quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  quote_request_item_id UUID REFERENCES public.quote_request_items(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  -- Product details (snapshot at time of quoting)
  product_name TEXT NOT NULL,
  product_sku TEXT,
  description TEXT,
  -- Quantities
  quantity DECIMAL(12,3) NOT NULL,
  unit_of_measure public.unit_of_measure NOT NULL,
  -- Pricing
  supplier_cost DECIMAL(12,4),           -- Our cost (hidden from customer)
  unit_price DECIMAL(12,4) NOT NULL,     -- Customer-facing price
  discount_percent DECIMAL(5,2) DEFAULT 0,
  line_total DECIMAL(15,2) NOT NULL,
  -- Margin
  margin_percent DECIMAL(5,2),
  margin_amount DECIMAL(15,2),
  pricing_rule_id UUID REFERENCES public.pricing_rules(id), -- Which rule determined price
  pricing_source TEXT,                   -- 'contract', 'customer_specific', 'tier', etc.
  -- Supplier sourcing
  supplier_id UUID REFERENCES public.suppliers(id),
  lead_time_days INTEGER,
  -- Line-item acceptance (for partial acceptance)
  is_accepted BOOLEAN,                   -- Null until customer responds
  -- Sort
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.6 Orders

```sql
-- =============================================
-- ORDERS
-- =============================================
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  order_number TEXT NOT NULL,            -- ORD-2026-00089
  quote_id UUID REFERENCES public.quotes(id),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  project_id UUID REFERENCES public.projects(id),
  -- Status
  status public.order_status DEFAULT 'confirmed',
  -- Customer reference
  customer_po_number TEXT,               -- Customer's internal PO number
  -- Totals
  subtotal DECIMAL(15,2) NOT NULL,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  delivery_fee DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  -- Margin (internal)
  total_cost DECIMAL(15,2),              -- Sum of supplier costs
  margin_amount DECIMAL(15,2),
  margin_percent DECIMAL(5,2),
  -- Terms
  payment_terms public.payment_terms,
  delivery_terms public.fob_terms DEFAULT 'fob_destination',
  delivery_address_id UUID REFERENCES public.addresses(id),
  requested_delivery_date DATE,
  -- Fulfillment tracking
  total_items INTEGER DEFAULT 0,
  fulfilled_items INTEGER DEFAULT 0,
  -- Hold / Cancel
  hold_reason TEXT,
  cancellation_reason TEXT,
  cancellation_fee DECIMAL(15,2),
  -- Assignment
  assigned_sales_rep UUID REFERENCES public.employees(id),
  assigned_ops_coordinator UUID REFERENCES public.employees(id),
  -- Credit check
  credit_check_passed BOOLEAN,
  credit_check_at TIMESTAMPTZ,
  -- Notes
  internal_notes TEXT,
  customer_notes TEXT,
  -- Timestamps
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, order_number)
);

-- =============================================
-- ORDER LINE ITEMS
-- =============================================
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  quote_item_id UUID REFERENCES public.quote_items(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  -- Snapshot
  product_name TEXT NOT NULL,
  product_sku TEXT,
  -- Quantities
  quantity DECIMAL(12,3) NOT NULL,
  unit_of_measure public.unit_of_measure NOT NULL,
  fulfilled_quantity DECIMAL(12,3) DEFAULT 0,
  backordered_quantity DECIMAL(12,3) DEFAULT 0,
  cancelled_quantity DECIMAL(12,3) DEFAULT 0,
  -- Pricing
  unit_price DECIMAL(12,4) NOT NULL,
  supplier_cost DECIMAL(12,4),
  line_total DECIMAL(15,2) NOT NULL,
  -- Sourcing
  supplier_id UUID REFERENCES public.suppliers(id),
  supplier_po_id UUID,                   -- FK added after supplier_pos table
  warehouse_id UUID,                     -- FK added after warehouses table
  -- Tracking
  is_fulfilled BOOLEAN DEFAULT FALSE,
  is_backordered BOOLEAN DEFAULT FALSE,
  -- Sort
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.7 Procurement / Purchase Orders

```sql
-- =============================================
-- SUPPLIER PURCHASE ORDERS
-- =============================================
CREATE TABLE public.supplier_pos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  po_number TEXT NOT NULL,               -- SPO-2026-00201
  order_id UUID NOT NULL REFERENCES public.orders(id),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  -- Status
  status public.supplier_po_status DEFAULT 'draft',
  -- Totals
  subtotal DECIMAL(15,2) NOT NULL,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  shipping_cost DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  -- Terms
  payment_terms public.payment_terms,
  shipping_method public.shipping_method,
  -- Dates
  expected_ship_date DATE,
  expected_delivery_date DATE,
  actual_ship_date DATE,
  actual_delivery_date DATE,
  -- Tracking
  tracking_numbers TEXT[],
  supplier_reference_number TEXT,        -- Supplier's acknowledgment number
  -- Inspection
  inspection_result public.inspection_result,
  inspection_notes TEXT,
  inspected_by UUID REFERENCES auth.users(id),
  inspected_at TIMESTAMPTZ,
  -- Receiving warehouse
  receiving_warehouse_id UUID,           -- FK added after warehouses table
  -- Approval
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  -- Assignment
  created_by UUID REFERENCES auth.users(id),
  -- Notes
  internal_notes TEXT,
  supplier_notes TEXT,
  -- Timestamps
  sent_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, po_number)
);

-- =============================================
-- SUPPLIER PO LINE ITEMS
-- =============================================
CREATE TABLE public.supplier_po_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_po_id UUID NOT NULL REFERENCES public.supplier_pos(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES public.order_items(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  -- Product
  product_name TEXT NOT NULL,
  supplier_sku TEXT,
  -- Quantities
  quantity DECIMAL(12,3) NOT NULL,
  received_quantity DECIMAL(12,3) DEFAULT 0,
  rejected_quantity DECIMAL(12,3) DEFAULT 0,
  unit_of_measure public.unit_of_measure NOT NULL,
  -- Pricing
  unit_cost DECIMAL(12,4) NOT NULL,
  line_total DECIMAL(15,2) NOT NULL,
  -- Sort
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SUPPLIER INQUIRIES (RFQs to suppliers during sourcing)
-- =============================================
CREATE TABLE public.supplier_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  inquiry_number TEXT NOT NULL,          -- INQ-2026-00301
  quote_request_id UUID REFERENCES public.quote_requests(id),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  -- Status
  status TEXT DEFAULT 'sent',            -- draft, sent, responded, expired, cancelled
  -- Response
  response_due_date DATE,
  responded_at TIMESTAMPTZ,
  response_notes TEXT,
  -- Items
  items JSONB NOT NULL DEFAULT '[]',     -- [{product_id, description, quantity, uom}]
  -- Response data
  response_items JSONB DEFAULT '[]',     -- [{product_id, unit_cost, lead_time, available_qty, notes}]
  -- Tracking
  sent_by UUID REFERENCES auth.users(id),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, inquiry_number)
);
```

### 2.8 Warehouse / Inventory

```sql
-- =============================================
-- WAREHOUSES
-- =============================================
CREATE TABLE public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  code TEXT NOT NULL,                    -- WH-01
  name TEXT NOT NULL,
  address_id UUID REFERENCES public.addresses(id),
  -- Capacity
  total_area_sqm DECIMAL(10,2),
  yard_area_sqm DECIMAL(10,2),
  -- Operations
  operating_hours TEXT,                  -- "Mon-Fri 6AM-6PM, Sat 7AM-1PM"
  manager_id UUID REFERENCES public.employees(id),
  -- Contact
  phone TEXT,
  email TEXT,
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_primary BOOLEAN DEFAULT FALSE,
  -- Geo (for proximity calculations)
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, code)
);

-- =============================================
-- WAREHOUSE LOCATIONS (zones, bins, yard areas)
-- =============================================
CREATE TABLE public.warehouse_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  code TEXT NOT NULL,                    -- A-01-03 (Zone A, Row 1, Bin 3)
  name TEXT,
  zone TEXT,                             -- Receiving, Storage, Staging, Yard
  location_type TEXT DEFAULT 'bin',      -- bin, rack, floor, yard_spot, receiving_dock, staging_area
  -- Constraints
  max_weight_kg DECIMAL(10,2),
  max_volume_cbm DECIMAL(10,3),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (warehouse_id, code)
);

-- =============================================
-- INVENTORY (stock levels per product per warehouse)
-- =============================================
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
  location_id UUID REFERENCES public.warehouse_locations(id),
  -- Quantities
  quantity_on_hand DECIMAL(12,3) DEFAULT 0,
  quantity_reserved DECIMAL(12,3) DEFAULT 0,  -- Reserved for confirmed orders
  quantity_allocated DECIMAL(12,3) DEFAULT 0, -- Allocated to specific deliveries
  quantity_available DECIMAL(12,3) GENERATED ALWAYS AS
    (quantity_on_hand - quantity_reserved - quantity_allocated) STORED,
  quantity_incoming DECIMAL(12,3) DEFAULT 0,  -- On approved POs not yet received
  -- ATP (Available to Promise)
  atp DECIMAL(12,3) GENERATED ALWAYS AS
    (quantity_on_hand - quantity_reserved - quantity_allocated + quantity_incoming) STORED,
  -- Cost
  unit_cost DECIMAL(12,4),               -- Weighted average cost
  total_value DECIMAL(15,2),
  -- Reorder
  reorder_point DECIMAL(12,3),
  reorder_quantity DECIMAL(12,3),
  safety_stock DECIMAL(12,3),
  -- Tracking
  lot_number TEXT,
  batch_number TEXT,
  expiry_date DATE,
  -- Last activity
  last_received_at TIMESTAMPTZ,
  last_shipped_at TIMESTAMPTZ,
  last_counted_at TIMESTAMPTZ,
  --
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, product_id, warehouse_id, COALESCE(location_id, '00000000-0000-0000-0000-000000000000'::UUID), COALESCE(lot_number, ''))
);

-- =============================================
-- STOCK MOVEMENTS (audit trail of all inventory changes)
-- =============================================
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  inventory_id UUID NOT NULL REFERENCES public.inventory(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
  -- Movement
  movement_type public.stock_movement_type NOT NULL,
  quantity DECIMAL(12,3) NOT NULL,        -- Positive = in, Negative = out
  -- Reference to source document
  reference_type TEXT,                    -- 'supplier_po', 'delivery', 'transfer', 'adjustment', 'return'
  reference_id UUID,                     -- ID of the source document
  -- Cost
  unit_cost DECIMAL(12,4),
  total_cost DECIMAL(15,2),
  -- Context
  reason TEXT,
  notes TEXT,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INVENTORY TRANSFERS (between warehouses)
-- =============================================
CREATE TABLE public.inventory_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  transfer_number TEXT NOT NULL,          -- TRF-2026-00045
  from_warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
  to_warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
  status TEXT DEFAULT 'draft',            -- draft, in_transit, received, cancelled
  -- Items (JSONB for simplicity; could be separate table for large ops)
  items JSONB NOT NULL DEFAULT '[]',     -- [{product_id, quantity, uom}]
  -- Tracking
  shipped_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  received_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, transfer_number)
);

-- =============================================
-- CYCLE COUNTS
-- =============================================
CREATE TABLE public.cycle_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
  count_number TEXT NOT NULL,
  status TEXT DEFAULT 'planned',         -- planned, in_progress, completed, cancelled
  count_date DATE NOT NULL,
  -- Items
  items JSONB NOT NULL DEFAULT '[]',     -- [{product_id, location_id, system_qty, counted_qty, variance, notes}]
  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),
  completed_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  -- Adjustments
  adjustments_applied BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, count_number)
);
```

### 2.9 Deliveries / Logistics

```sql
-- =============================================
-- VEHICLES
-- =============================================
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  vehicle_number TEXT NOT NULL,          -- VEH-001
  -- Type and specs
  vehicle_type public.vehicle_type NOT NULL,
  make TEXT,
  model TEXT,
  year INTEGER,
  license_plate TEXT,
  vin TEXT,
  -- Capacity
  max_payload_kg DECIMAL(10,2),
  gvwr_lbs DECIMAL(10,2),
  -- CDL requirement
  requires_cdl public.cdl_class,
  -- Equipment
  has_boom BOOLEAN DEFAULT FALSE,
  has_moffett BOOLEAN DEFAULT FALSE,
  has_liftgate BOOLEAN DEFAULT FALSE,
  has_crane BOOLEAN DEFAULT FALSE,
  -- Status
  status public.vehicle_status DEFAULT 'available',
  current_warehouse_id UUID REFERENCES public.warehouses(id),
  odometer_reading DECIMAL(10,1),
  -- Maintenance
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  next_inspection_date DATE,
  insurance_expiry DATE,
  registration_expiry DATE,
  -- Ownership
  ownership_type TEXT DEFAULT 'owned',   -- owned, leased, rented
  --
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, vehicle_number)
);

-- =============================================
-- DRIVERS
-- =============================================
CREATE TABLE public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  driver_number TEXT NOT NULL,           -- DRV-001
  user_id UUID REFERENCES auth.users(id),
  driver_type public.driver_type NOT NULL,
  -- Personal info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  -- License
  cdl_class public.cdl_class,
  cdl_number TEXT,
  cdl_state TEXT,
  cdl_expiry DATE,
  endorsements TEXT[],                   -- ['H', 'N', 'T']
  -- DOT
  dot_medical_card_expiry DATE,
  dot_drug_test_date DATE,
  -- Certifications
  moffett_certified BOOLEAN DEFAULT FALSE,
  crane_certified BOOLEAN DEFAULT FALSE,
  forklift_certified BOOLEAN DEFAULT FALSE,
  -- Employment
  hire_date DATE,
  company_name TEXT,                     -- For contracted/gig drivers
  insurance_policy_number TEXT,
  insurance_expiry DATE,
  -- Home warehouse
  home_warehouse_id UUID REFERENCES public.warehouses(id),
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_available BOOLEAN DEFAULT TRUE,
  -- Performance (updated by cron)
  completed_deliveries INTEGER DEFAULT 0,
  on_time_rate DECIMAL(5,2),
  average_rating DECIMAL(3,2),
  --
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, driver_number)
);

-- =============================================
-- DELIVERY ROUTES
-- =============================================
CREATE TABLE public.delivery_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  route_number TEXT NOT NULL,
  route_date DATE NOT NULL,
  -- Assignment
  driver_id UUID REFERENCES public.drivers(id),
  vehicle_id UUID REFERENCES public.vehicles(id),
  -- Route details
  start_warehouse_id UUID REFERENCES public.warehouses(id),
  estimated_distance_km DECIMAL(8,2),
  estimated_duration_minutes INTEGER,
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  -- Status
  status TEXT DEFAULT 'planned',         -- planned, in_progress, completed, cancelled
  -- Stops in order (derived from deliveries)
  stop_sequence UUID[],                  -- Array of delivery_ids in sequence
  -- Optimization
  optimized BOOLEAN DEFAULT FALSE,
  optimization_score DECIMAL(5,2),
  -- Dispatch
  dispatched_by UUID REFERENCES public.employees(id),
  dispatched_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, route_number)
);

-- =============================================
-- DELIVERIES
-- =============================================
CREATE TABLE public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  delivery_number TEXT NOT NULL,          -- DEL-2026-00567
  order_id UUID NOT NULL REFERENCES public.orders(id),
  supplier_po_id UUID REFERENCES public.supplier_pos(id),
  -- Status
  status public.delivery_status DEFAULT 'scheduled',
  -- Route
  route_id UUID REFERENCES public.delivery_routes(id),
  stop_sequence_number INTEGER,
  -- Assignment
  driver_id UUID REFERENCES public.drivers(id),
  vehicle_id UUID REFERENCES public.vehicles(id),
  -- Pickup
  pickup_warehouse_id UUID REFERENCES public.warehouses(id),
  pickup_address_id UUID REFERENCES public.addresses(id),  -- For supplier-direct
  -- Delivery address
  delivery_address_id UUID NOT NULL REFERENCES public.addresses(id),
  -- Scheduling
  scheduled_date DATE NOT NULL,
  scheduled_time_start TIME,
  scheduled_time_end TIME,
  -- Actual times
  actual_pickup_time TIMESTAMPTZ,
  actual_departure_time TIMESTAMPTZ,
  actual_arrival_time TIMESTAMPTZ,
  actual_delivery_time TIMESTAMPTZ,
  -- Shipping
  shipping_method public.shipping_method DEFAULT 'own_fleet',
  third_party_carrier TEXT,
  third_party_tracking TEXT,
  -- Proof of Delivery
  pod_signature TEXT,                    -- Base64 or storage reference
  pod_signed_by TEXT,                    -- Name of person who signed
  pod_photos TEXT[],                     -- Array of storage URLs
  pod_notes TEXT,
  -- GPS
  delivery_latitude DECIMAL(10,7),
  delivery_longitude DECIMAL(10,7),
  -- Failure / Return
  failure_reason public.delivery_failure_reason,
  failure_notes TEXT,
  return_reason TEXT,
  -- Weight
  total_weight_kg DECIMAL(10,2),
  -- Rescheduling
  rescheduled_from UUID REFERENCES public.deliveries(id),
  rescheduled_to UUID REFERENCES public.deliveries(id),
  -- Invoice link
  invoice_id UUID,                       -- FK added after invoices table
  --
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, delivery_number)
);

-- =============================================
-- DELIVERY LINE ITEMS
-- =============================================
CREATE TABLE public.delivery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES public.order_items(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  -- Quantities
  expected_quantity DECIMAL(12,3) NOT NULL,
  delivered_quantity DECIMAL(12,3) DEFAULT 0,
  refused_quantity DECIMAL(12,3) DEFAULT 0,
  damaged_quantity DECIMAL(12,3) DEFAULT 0,
  -- Status
  status TEXT DEFAULT 'pending',         -- pending, delivered, refused, partial
  refusal_reason TEXT,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- DRIVER GPS TRACKING (high-volume, partitioned)
-- =============================================
CREATE TABLE public.driver_locations (
  id BIGINT GENERATED ALWAYS AS IDENTITY,
  tenant_id UUID NOT NULL,
  driver_id UUID NOT NULL,
  delivery_id UUID,
  route_id UUID,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  speed_kmh DECIMAL(5,1),
  heading DECIMAL(5,1),
  accuracy_meters DECIMAL(6,1),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (recorded_at, id)
) PARTITION BY RANGE (recorded_at);

-- Create monthly partitions (example)
-- CREATE TABLE public.driver_locations_2026_03 PARTITION OF public.driver_locations
--   FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
```

### 2.10 Finance (Invoices, Payments, Credit)

```sql
-- =============================================
-- INVOICES
-- =============================================
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  invoice_number TEXT NOT NULL,           -- INV-2026-00834
  invoice_type public.invoice_type DEFAULT 'standard',
  -- References
  order_id UUID NOT NULL REFERENCES public.orders(id),
  delivery_id UUID REFERENCES public.deliveries(id),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  project_id UUID REFERENCES public.projects(id),
  -- Status
  status public.invoice_status DEFAULT 'draft',
  -- Amounts
  subtotal DECIMAL(15,2) NOT NULL,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  delivery_charges DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  adjustment_amount DECIMAL(15,2) DEFAULT 0,  -- Credit notes applied
  total DECIMAL(15,2) NOT NULL,
  amount_paid DECIMAL(15,2) DEFAULT 0,
  balance_due DECIMAL(15,2) GENERATED ALWAYS AS
    (total - amount_paid - adjustment_amount) STORED,
  currency TEXT DEFAULT 'USD',
  -- Terms
  payment_terms public.payment_terms,
  due_date DATE NOT NULL,
  -- Tax
  tax_rate DECIMAL(5,4),
  tax_jurisdiction TEXT,
  tax_exemption_applied BOOLEAN DEFAULT FALSE,
  -- Dispute
  dispute_reason TEXT,
  dispute_resolution TEXT,
  disputed_at TIMESTAMPTZ,
  -- Collections
  reminder_count INTEGER DEFAULT 0,
  last_reminder_date DATE,
  collections_assigned_to UUID REFERENCES public.employees(id),
  -- Credit notes
  credit_note_ids UUID[],
  -- Wire instructions (snapshot for this invoice)
  wire_instructions JSONB,
  -- Approval
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  -- Timestamps
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  written_off_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, invoice_number)
);

-- =============================================
-- INVOICE LINE ITEMS
-- =============================================
CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES public.order_items(id),
  delivery_item_id UUID REFERENCES public.delivery_items(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  -- Details
  description TEXT NOT NULL,
  quantity DECIMAL(12,3) NOT NULL,
  unit_of_measure public.unit_of_measure NOT NULL,
  unit_price DECIMAL(12,4) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  line_total DECIMAL(15,2) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PAYMENTS
-- =============================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  payment_number TEXT NOT NULL,           -- PAY-2026-01203
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  -- Status
  status public.payment_status DEFAULT 'received',
  -- Method
  payment_method public.payment_method NOT NULL,
  -- Amounts
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  applied_amount DECIMAL(15,2) DEFAULT 0,
  unapplied_amount DECIMAL(15,2) GENERATED ALWAYS AS
    (amount - applied_amount) STORED,
  -- Reference
  reference_number TEXT,                 -- Wire ref, check number, LC number
  bank_reference TEXT,
  bank_name TEXT,
  -- Dates
  received_date DATE NOT NULL,
  cleared_date DATE,
  value_date DATE,                       -- For international wires
  -- LC-specific
  lc_number TEXT,
  lc_issuing_bank TEXT,
  lc_expiry_date DATE,
  -- Remittance
  remittance_advice_url TEXT,
  -- Reconciliation
  reconciled BOOLEAN DEFAULT FALSE,
  reconciled_by UUID REFERENCES auth.users(id),
  reconciled_at TIMESTAMPTZ,
  -- Bounced / Reversed
  bounced_at TIMESTAMPTZ,
  bounce_reason TEXT,
  reversed_at TIMESTAMPTZ,
  reversal_reason TEXT,
  -- Notes
  notes TEXT,
  matched_by UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, payment_number)
);

-- =============================================
-- PAYMENT APPLICATIONS (links payments to invoices)
-- =============================================
CREATE TABLE public.payment_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id),
  amount DECIMAL(15,2) NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  applied_by UUID REFERENCES auth.users(id),
  notes TEXT,
  -- Reverse
  reversed BOOLEAN DEFAULT FALSE,
  reversed_at TIMESTAMPTZ,
  reversed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CREDIT NOTES
-- =============================================
CREATE TABLE public.credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  credit_note_number TEXT NOT NULL,       -- CN-2026-00045
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  -- References
  return_id UUID,                        -- FK added after returns table
  invoice_id UUID REFERENCES public.invoices(id),
  order_id UUID REFERENCES public.orders(id),
  -- Status
  status public.credit_note_status DEFAULT 'draft',
  -- Amounts
  amount DECIMAL(15,2) NOT NULL,
  applied_amount DECIMAL(15,2) DEFAULT 0,
  remaining_amount DECIMAL(15,2) GENERATED ALWAYS AS
    (amount - applied_amount) STORED,
  currency TEXT DEFAULT 'USD',
  -- Reason
  reason TEXT NOT NULL,
  -- Approval
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  -- Issued
  issued_at TIMESTAMPTZ,
  -- Items (what's being credited)
  items JSONB DEFAULT '[]',              -- [{product_id, description, quantity, unit_price, total}]
  --
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, credit_note_number)
);

-- =============================================
-- CREDIT NOTE APPLICATIONS (links credit notes to invoices)
-- =============================================
CREATE TABLE public.credit_note_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id UUID NOT NULL REFERENCES public.credit_notes(id),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id),
  amount DECIMAL(15,2) NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  applied_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- AR AGING SNAPSHOTS (pre-computed for reports and CEO AI)
-- =============================================
CREATE TABLE public.ar_aging_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  snapshot_date DATE NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  -- Aging buckets
  current_amount DECIMAL(15,2) DEFAULT 0,       -- Not yet due
  days_1_30 DECIMAL(15,2) DEFAULT 0,
  days_31_60 DECIMAL(15,2) DEFAULT 0,
  days_61_90 DECIMAL(15,2) DEFAULT 0,
  days_over_90 DECIMAL(15,2) DEFAULT 0,
  total_outstanding DECIMAL(15,2) DEFAULT 0,
  -- Credit info
  credit_limit DECIMAL(15,2),
  credit_available DECIMAL(15,2),
  -- DSO
  dso_days DECIMAL(5,1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, snapshot_date, customer_id)
);

-- =============================================
-- SUPPLIER INVOICES (bills from suppliers for our POs)
-- =============================================
CREATE TABLE public.supplier_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  invoice_number TEXT NOT NULL,           -- Supplier's invoice number
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  supplier_po_id UUID REFERENCES public.supplier_pos(id),
  -- Amounts
  subtotal DECIMAL(15,2) NOT NULL,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  shipping_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  -- Three-way match
  po_matched BOOLEAN DEFAULT FALSE,
  receipt_matched BOOLEAN DEFAULT FALSE,
  match_discrepancy_notes TEXT,
  -- Status
  status TEXT DEFAULT 'received',        -- received, matched, approved, paid, disputed, on_hold
  -- Terms
  payment_terms public.payment_terms,
  due_date DATE,
  -- Payment
  paid_amount DECIMAL(15,2) DEFAULT 0,
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  -- Approval
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  --
  received_date DATE NOT NULL,
  notes TEXT,
  document_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, supplier_id, invoice_number)
);
```

### 2.11 Returns / RMA

```sql
-- =============================================
-- RETURNS (RMA)
-- =============================================
CREATE TABLE public.returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  return_number TEXT NOT NULL,            -- RMA-2026-00034
  -- References
  order_id UUID NOT NULL REFERENCES public.orders(id),
  delivery_id UUID REFERENCES public.deliveries(id),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  -- Status
  status public.return_status DEFAULT 'requested',
  -- Reason
  reason_category TEXT NOT NULL,          -- damaged, wrong_item, quality_issue, overshipment, customer_change
  reason_detail TEXT,
  -- Photos
  photo_urls TEXT[],
  -- Items
  items JSONB NOT NULL DEFAULT '[]',     -- [{product_id, quantity, reason, condition}]
  -- Pickup
  pickup_delivery_id UUID REFERENCES public.deliveries(id),
  pickup_scheduled_date DATE,
  -- Inspection
  inspection_notes TEXT,
  inspection_result public.inspection_result,
  inspected_by UUID REFERENCES auth.users(id),
  inspected_at TIMESTAMPTZ,
  -- Resolution
  resolution_type TEXT,                   -- 'credit', 'replacement', 'rejected'
  credit_note_id UUID REFERENCES public.credit_notes(id),
  replacement_order_id UUID REFERENCES public.orders(id),
  -- Assignment
  assigned_to UUID REFERENCES public.employees(id),
  -- Approval
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  denied_reason TEXT,
  -- Restocking
  restocking_fee_percent DECIMAL(5,2) DEFAULT 0,
  restocking_fee_amount DECIMAL(15,2) DEFAULT 0,
  --
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, return_number)
);
```

### 2.12 Support Tickets

```sql
-- =============================================
-- SUPPORT TICKETS
-- =============================================
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  ticket_number TEXT NOT NULL,            -- TKT-2026-00890
  -- Requester
  requester_type TEXT NOT NULL,           -- 'customer', 'supplier', 'internal'
  requester_user_id UUID REFERENCES auth.users(id),
  customer_id UUID REFERENCES public.customers(id),
  supplier_id UUID REFERENCES public.suppliers(id),
  -- Classification
  category public.ticket_category NOT NULL,
  subcategory TEXT,                       -- Specific reason tag
  subject TEXT NOT NULL,
  description TEXT,
  -- Priority and status
  priority public.ticket_priority DEFAULT 'normal',
  status public.ticket_status DEFAULT 'new',
  -- Related entities
  order_id UUID REFERENCES public.orders(id),
  delivery_id UUID REFERENCES public.deliveries(id),
  invoice_id UUID REFERENCES public.invoices(id),
  quote_id UUID REFERENCES public.quotes(id),
  -- Assignment
  assigned_to UUID REFERENCES public.employees(id),
  assigned_team TEXT,                     -- sales, operations, finance, cs, dispatch, engineering
  -- SLA
  sla_first_response_due TIMESTAMPTZ,
  sla_resolution_due TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  sla_breached BOOLEAN DEFAULT FALSE,
  -- Escalation
  escalated BOOLEAN DEFAULT FALSE,
  escalated_to UUID REFERENCES public.employees(id),
  escalated_at TIMESTAMPTZ,
  escalation_reason TEXT,
  -- Resolution
  resolution_notes TEXT,
  resolution_type TEXT,                   -- 'resolved', 'wont_fix', 'duplicate', 'no_response'
  -- Source
  source TEXT DEFAULT 'portal',           -- portal, email, whatsapp, phone, ai_chat
  -- Tags
  tags TEXT[],
  --
  closed_at TIMESTAMPTZ,
  reopened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, ticket_number)
);

-- =============================================
-- TICKET MESSAGES (thread)
-- =============================================
CREATE TABLE public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  -- Author
  author_id UUID REFERENCES auth.users(id),
  author_type TEXT NOT NULL,              -- 'agent', 'customer', 'supplier', 'system', 'ai'
  author_name TEXT,
  -- Content
  message TEXT NOT NULL,
  -- Attachments
  attachment_urls TEXT[],
  -- Visibility
  is_internal BOOLEAN DEFAULT FALSE,     -- Internal note, not visible to customer
  --
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.13 AI (Conversations, Embeddings)

```sql
-- =============================================
-- AI CONVERSATIONS
-- =============================================
CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  -- Context
  conversation_type TEXT NOT NULL,        -- 'ceo_dashboard', 'customer_support', 'product_search', 'internal_assistant'
  title TEXT,
  -- Related entity (optional context)
  context_type TEXT,                      -- 'order', 'customer', 'product', etc.
  context_id UUID,
  -- Status
  status TEXT DEFAULT 'active',           -- active, archived
  -- Metadata
  model_used TEXT,
  total_tokens INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  --
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- AI MESSAGES
-- =============================================
CREATE TABLE public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,                     -- 'user', 'assistant', 'system', 'tool'
  content TEXT NOT NULL,
  -- Tool usage
  tool_calls JSONB,                      -- [{id, name, arguments}]
  tool_results JSONB,                    -- [{tool_call_id, result}]
  -- Metadata
  tokens_used INTEGER,
  model TEXT,
  latency_ms INTEGER,
  -- Feedback
  user_rating INTEGER,                    -- 1-5
  user_feedback TEXT,
  --
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- See Section 7 for pgvector embedding tables
```

### 2.14 Documents / Files

```sql
-- =============================================
-- DOCUMENTS (central file registry linked to any entity)
-- =============================================
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  -- Polymorphic reference
  entity_type TEXT NOT NULL,              -- 'quote_request', 'quote', 'order', 'delivery', 'customer', 'supplier', 'return', 'ticket'
  entity_id UUID NOT NULL,
  -- Document info
  document_type public.document_type NOT NULL,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,                 -- Supabase Storage URL
  file_size_bytes BIGINT,
  mime_type TEXT,
  -- Access control
  is_customer_visible BOOLEAN DEFAULT FALSE,
  is_supplier_visible BOOLEAN DEFAULT FALSE,
  -- Metadata
  uploaded_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.15 Notifications

```sql
-- =============================================
-- NOTIFICATIONS
-- =============================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  -- Content
  title TEXT NOT NULL,
  body TEXT,
  -- Channel
  channel public.notification_channel DEFAULT 'in_app',
  priority public.notification_priority DEFAULT 'normal',
  -- Link to entity
  entity_type TEXT,
  entity_id UUID,
  action_url TEXT,
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  is_sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  -- Metadata
  metadata JSONB DEFAULT '{}',
  --
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.16 Approvals

```sql
-- =============================================
-- APPROVALS (unified approval workflow)
-- =============================================
CREATE TABLE public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  approval_type public.approval_type NOT NULL,
  -- What is being approved
  entity_type TEXT NOT NULL,              -- 'quote', 'purchase_order', 'credit_application', 'payment', 'return', 'credit_note', 'price_override'
  entity_id UUID NOT NULL,
  -- Requester
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  -- Approver
  assigned_to UUID NOT NULL REFERENCES auth.users(id),
  -- Decision
  status public.approval_status DEFAULT 'pending',
  decision_notes TEXT,
  decided_at TIMESTAMPTZ,
  -- Escalation
  escalated_to UUID REFERENCES auth.users(id),
  escalated_at TIMESTAMPTZ,
  escalation_reason TEXT,
  -- Expiry
  expires_at TIMESTAMPTZ,
  -- Context
  context JSONB DEFAULT '{}',            -- Relevant data snapshot for the approver
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.17 Audit Log

```sql
-- =============================================
-- AUDIT LOG (system-wide change tracking)
-- =============================================
CREATE TABLE public.audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY,
  tenant_id UUID NOT NULL,
  -- Who
  user_id UUID,
  user_email TEXT,
  user_role TEXT,
  ip_address INET,
  user_agent TEXT,
  -- What
  action public.audit_action NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  -- Changes
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  -- Context
  description TEXT,
  metadata JSONB DEFAULT '{}',
  -- When
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (created_at, id)
) PARTITION BY RANGE (created_at);
```

### 2.18 System Settings

```sql
-- =============================================
-- SYSTEM SETTINGS (per-tenant configuration)
-- =============================================
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  category TEXT NOT NULL,                 -- 'general', 'quotes', 'orders', 'invoices', 'delivery', 'credit', 'notifications'
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, category, key)
);

-- =============================================
-- SEQUENCE COUNTERS (for generating human-readable IDs)
-- =============================================
CREATE TABLE public.sequence_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  entity_type TEXT NOT NULL,              -- 'quote_request', 'quote', 'order', etc.
  prefix TEXT NOT NULL,                   -- 'QR', 'Q', 'ORD', 'SPO', 'DEL', 'INV', 'PAY', etc.
  current_value BIGINT DEFAULT 0,
  year INTEGER,                          -- For yearly reset: 2026
  UNIQUE (tenant_id, entity_type, COALESCE(year, 0))
);

-- =============================================
-- STATE HISTORY (generic state change tracking)
-- =============================================
CREATE TABLE public.state_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id UUID NOT NULL,
  entity_type TEXT NOT NULL,              -- 'quote_request', 'quote', 'order', 'supplier_po', 'delivery', 'invoice', 'payment', 'return', 'credit_note'
  entity_id UUID NOT NULL,
  from_state TEXT,
  to_state TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- WEBHOOK EVENTS (incoming webhooks log)
-- =============================================
CREATE TABLE public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  source TEXT NOT NULL,                   -- 'bank_feed', 'supplier_portal', 'shipping_carrier', etc.
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'received',         -- received, processed, failed, ignored
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### TOTAL TABLE COUNT: 53 tables

| Domain | Tables | Count |
|--------|--------|-------|
| Auth/Users | tenants, user_profiles, user_roles, role_permissions, employees | 5 |
| Customers | customers, customer_contacts, addresses, projects, credit_applications | 5 |
| Suppliers | suppliers, supplier_contacts, supplier_price_lists | 3 |
| Products | products, product_suppliers, pricing_rules, contract_prices | 4 |
| Quotes | quote_requests, quote_request_items, quotes, quote_items | 4 |
| Orders | orders, order_items | 2 |
| Procurement | supplier_pos, supplier_po_items, supplier_inquiries | 3 |
| Warehouse | warehouses, warehouse_locations, inventory, stock_movements, inventory_transfers, cycle_counts | 6 |
| Deliveries | vehicles, drivers, delivery_routes, deliveries, delivery_items, driver_locations | 6 |
| Finance | invoices, invoice_items, payments, payment_applications, credit_notes, credit_note_applications, ar_aging_snapshots, supplier_invoices | 8 |
| Returns | returns | 1 |
| Support | tickets, ticket_messages | 2 |
| AI | ai_conversations, ai_messages, (+ 3 embedding tables in Section 7) | 2+3 |
| Documents | documents | 1 |
| System | notifications, approvals, audit_log, system_settings, sequence_counters, state_history, webhook_events | 7 |

---

## 3. KEY RELATIONSHIPS AND FOREIGN KEYS

### The Core Flow: Quote Request -> Quote -> Order -> PO -> Delivery -> Invoice -> Payment

```
quote_requests (1) --> (N) quotes
     |                      |
     | customer_id          | customer_id
     | project_id           | quote_request_id
     v                      v
  customers              quotes (1:1) --> orders
     ^                      |               |
     |                      | accepted      | (1:N)
     |                      v               v
     |                   orders (1) --> supplier_pos
     |                      |               |
     |                      | (1:N)         | (1:N)
     |                      v               v
     |                   deliveries <--- supplier_pos
     |                      |
     |                      | (1:1)
     |                      v
     |                   invoices
     |                      |
     |                      | (1:N)
     |                      v
     +-- payments <--- payment_applications --> invoices
```

### Junction / Link Tables

| Junction Table | Links | Relationship |
|---------------|-------|-------------|
| `payment_applications` | payments <-> invoices | Many-to-many: one payment can cover multiple invoices; one invoice can receive multiple payments |
| `credit_note_applications` | credit_notes <-> invoices | Many-to-many: one credit note can apply to multiple invoices |
| `product_suppliers` | products <-> suppliers | Many-to-many: one product from multiple suppliers |
| `user_roles` | auth.users <-> roles | Many-to-many: one user can have multiple roles |
| `role_permissions` | roles <-> permissions | Many-to-many: one role has multiple permissions |

### Deferred Foreign Keys (added after all tables exist)

```sql
-- Customer contacts -> auth
ALTER TABLE public.customer_contacts
  ADD CONSTRAINT fk_customer_contacts_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id);

-- User profiles -> linked entities
ALTER TABLE public.user_profiles
  ADD CONSTRAINT fk_user_profiles_customer FOREIGN KEY (customer_id) REFERENCES public.customers(id),
  ADD CONSTRAINT fk_user_profiles_supplier FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id),
  ADD CONSTRAINT fk_user_profiles_driver FOREIGN KEY (driver_id) REFERENCES public.drivers(id),
  ADD CONSTRAINT fk_user_profiles_employee FOREIGN KEY (employee_id) REFERENCES public.employees(id);

-- Order items -> supplier POs and warehouses
ALTER TABLE public.order_items
  ADD CONSTRAINT fk_order_items_supplier_po FOREIGN KEY (supplier_po_id) REFERENCES public.supplier_pos(id),
  ADD CONSTRAINT fk_order_items_warehouse FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);

-- Supplier POs -> warehouses
ALTER TABLE public.supplier_pos
  ADD CONSTRAINT fk_supplier_pos_warehouse FOREIGN KEY (receiving_warehouse_id) REFERENCES public.warehouses(id);

-- Deliveries -> invoices
ALTER TABLE public.deliveries
  ADD CONSTRAINT fk_deliveries_invoice FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);

-- Credit notes -> returns
ALTER TABLE public.credit_notes
  ADD CONSTRAINT fk_credit_notes_return FOREIGN KEY (return_id) REFERENCES public.returns(id);
```

### Complete Entity Relationship Summary

```
customers (1) ---> (N) customer_contacts
customers (1) ---> (N) addresses (via addressable_type='customer')
customers (1) ---> (N) projects
customers (1) ---> (N) quote_requests
customers (1) ---> (N) orders
customers (1) ---> (N) invoices
customers (1) ---> (N) payments
customers (1) ---> (N) credit_notes
customers (1) ---> (N) returns
customers (1) ---> (N) tickets
customers (1) ---> (1) credit_applications (latest active)

suppliers (1) ---> (N) supplier_contacts
suppliers (1) ---> (N) supplier_price_lists
suppliers (1) ---> (N) product_suppliers
suppliers (1) ---> (N) supplier_pos
suppliers (1) ---> (N) supplier_inquiries
suppliers (1) ---> (N) supplier_invoices

products (1) ---> (N) product_suppliers
products (1) ---> (N) quote_items
products (1) ---> (N) order_items
products (1) ---> (N) inventory (per warehouse)
products (1) ---> (N) stock_movements

orders (1) ---> (N) order_items
orders (1) ---> (N) supplier_pos
orders (1) ---> (N) deliveries
orders (1) ---> (N) invoices
orders (1) ---> (N) returns

deliveries (1) ---> (N) delivery_items
deliveries (1) ---> (1) invoices

invoices (1) ---> (N) invoice_items
invoices (1) ---> (N) payment_applications
invoices (1) ---> (N) credit_note_applications

payments (1) ---> (N) payment_applications

warehouses (1) ---> (N) warehouse_locations
warehouses (1) ---> (N) inventory
```

---

## 4. RLS POLICIES PATTERN

### Helper Functions

```sql
-- =============================================
-- RLS HELPER FUNCTIONS
-- =============================================

-- Get current user's tenant_id from JWT
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN ((SELECT auth.jwt()->'app_metadata'->>'tenant_id'))::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get current user's type
CREATE OR REPLACE FUNCTION public.current_user_type()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT auth.jwt()->'app_metadata'->>'user_type');
END;
$$ LANGUAGE plpgsql STABLE;

-- Get current user's customer_id
CREATE OR REPLACE FUNCTION public.current_customer_id()
RETURNS UUID AS $$
BEGIN
  RETURN ((SELECT auth.jwt()->'app_metadata'->>'customer_id'))::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get current user's supplier_id
CREATE OR REPLACE FUNCTION public.current_supplier_id()
RETURNS UUID AS $$
BEGIN
  RETURN ((SELECT auth.jwt()->'app_metadata'->>'supplier_id'))::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get current user's driver_id
CREATE OR REPLACE FUNCTION public.current_driver_id()
RETURNS UUID AS $$
BEGIN
  RETURN ((SELECT auth.jwt()->'app_metadata'->>'driver_id'))::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

-- Check if user is CEO or Admin
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
DECLARE
  user_roles TEXT[];
BEGIN
  SELECT ARRAY(
    SELECT jsonb_array_elements_text(
      (SELECT auth.jwt()->'app_metadata'->'roles')
    )
  ) INTO user_roles;
  RETURN 'ceo' = ANY(user_roles) OR 'admin' = ANY(user_roles);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if user has a specific permission
CREATE OR REPLACE FUNCTION public.authorize(requested_permission public.app_permission)
RETURNS BOOLEAN AS $$
DECLARE
  bind_permissions INT;
  user_roles TEXT[];
BEGIN
  SELECT ARRAY(
    SELECT jsonb_array_elements_text(
      (SELECT auth.jwt()->'app_metadata'->'roles')
    )
  ) INTO user_roles;

  SELECT COUNT(*) INTO bind_permissions
  FROM public.role_permissions
  WHERE permission = requested_permission
    AND role::TEXT = ANY(user_roles);

  RETURN bind_permissions > 0;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

### RLS Policy Pattern by Role Type

Every table with `tenant_id` follows this pattern:

```sql
-- STEP 1: Enable RLS
ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY;

-- STEP 2: Admin sees all (within tenant)
CREATE POLICY "admin_{table}_all" ON public.{table}
FOR ALL TO authenticated
USING (
  (SELECT public.is_admin_user())
  AND tenant_id = (SELECT public.current_tenant_id())
);

-- STEP 3: Employees with read permission
CREATE POLICY "employee_{table}_select" ON public.{table}
FOR SELECT TO authenticated
USING (
  (SELECT public.authorize('{table}.read'))
  AND tenant_id = (SELECT public.current_tenant_id())
);

-- STEP 4: Employees with read_own permission
CREATE POLICY "employee_{table}_select_own" ON public.{table}
FOR SELECT TO authenticated
USING (
  (SELECT public.authorize('{table}.read_own'))
  AND tenant_id = (SELECT public.current_tenant_id())
  AND created_by = (SELECT auth.uid())
);

-- STEP 5: Customer sees their own data
CREATE POLICY "customer_{table}_select" ON public.{table}
FOR SELECT TO authenticated
USING (
  (SELECT public.current_user_type()) = 'customer'
  AND customer_id = (SELECT public.current_customer_id())
  AND tenant_id = (SELECT public.current_tenant_id())
);

-- STEP 6: Supplier sees their related data
CREATE POLICY "supplier_{table}_select" ON public.{table}
FOR SELECT TO authenticated
USING (
  (SELECT public.current_user_type()) = 'supplier'
  AND supplier_id = (SELECT public.current_supplier_id())
  AND tenant_id = (SELECT public.current_tenant_id())
);
```

### Table-Specific Policies

| Table | Admin | Sales | Procurement | Warehouse | Dispatcher | Driver | Customer | Supplier | Accountant | CS |
|-------|-------|-------|-------------|-----------|------------|--------|----------|----------|------------|-----|
| customers | CRUD | R (own), U | R | - | - | - | R (self) | - | R | R (assigned) |
| quote_requests | CRUD | CRUD (own) | R | - | - | - | CR (own) | - | - | R |
| quotes | CRUD | CRUD (own) | R | - | - | - | R (own) | - | R | R |
| orders | CRUD | RU (own) | R | R | R | - | R (own) | - | R | R |
| supplier_pos | CRUD | R | CRUD | R | - | - | - | R (own) | R | - |
| deliveries | CRUD | R | - | RU | CRUD | RU (assigned) | R (own orders) | - | R | R |
| invoices | CRUD | R | - | - | - | - | R (own) | - | CRUD | R |
| payments | CRUD | R | - | - | - | - | R (own) | - | CRUD | R |
| inventory | CRUD | R | R | CRUD | - | - | - | - | R | - |
| tickets | CRUD | R (own) | R (own) | R (own) | R (own) | - | CR (own) | CR (own) | - | CRUD |
| returns | CRUD | R | R | RU | - | - | CR (own) | - | R | RU |
| products | CRUD | R | RU | R | - | - | R | R | - | R |

### MFA Requirement for Sensitive Operations

```sql
-- Require MFA for admin operations on settings, user management, credit approvals
CREATE POLICY "mfa_required_settings" ON public.system_settings
AS RESTRICTIVE
FOR ALL TO authenticated
USING (
  (SELECT auth.jwt()->>'aal') = 'aal2'
  OR (SELECT public.current_user_type()) != 'employee'
);

-- Pattern: use AS RESTRICTIVE for additional security layers
-- that combine with other policies via AND (not OR)
```

---

## 5. DATABASE TRIGGERS

### Status Change Triggers

```sql
-- =============================================
-- GENERIC STATUS CHANGE LOGGER
-- =============================================
CREATE OR REPLACE FUNCTION public.log_state_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.state_history (
      tenant_id, entity_type, entity_id,
      from_state, to_state, changed_by
    ) VALUES (
      NEW.tenant_id,
      TG_TABLE_NAME,
      NEW.id,
      OLD.status::TEXT,
      NEW.status::TEXT,
      (SELECT auth.uid())
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to all status-bearing tables
CREATE TRIGGER trg_quote_requests_state_change
  AFTER UPDATE OF status ON public.quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_state_change();

CREATE TRIGGER trg_quotes_state_change
  AFTER UPDATE OF status ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.log_state_change();

CREATE TRIGGER trg_orders_state_change
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_state_change();

CREATE TRIGGER trg_supplier_pos_state_change
  AFTER UPDATE OF status ON public.supplier_pos
  FOR EACH ROW EXECUTE FUNCTION public.log_state_change();

CREATE TRIGGER trg_deliveries_state_change
  AFTER UPDATE OF status ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.log_state_change();

CREATE TRIGGER trg_invoices_state_change
  AFTER UPDATE OF status ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.log_state_change();

CREATE TRIGGER trg_payments_state_change
  AFTER UPDATE OF status ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.log_state_change();

CREATE TRIGGER trg_returns_state_change
  AFTER UPDATE OF status ON public.returns
  FOR EACH ROW EXECUTE FUNCTION public.log_state_change();

CREATE TRIGGER trg_tickets_state_change
  AFTER UPDATE OF status ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.log_state_change();
```

### Business Logic Triggers

```sql
-- =============================================
-- QUOTE ACCEPTED -> CREATE ORDER
-- =============================================
CREATE OR REPLACE FUNCTION public.on_quote_accepted()
RETURNS TRIGGER AS $$
DECLARE
  new_order_id UUID;
  new_order_number TEXT;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    -- Generate order number
    SELECT public.next_sequence_number(NEW.tenant_id, 'order', 'ORD')
    INTO new_order_number;

    -- Create order from accepted quote
    INSERT INTO public.orders (
      tenant_id, order_number, quote_id, customer_id, project_id,
      customer_po_number, subtotal, tax_amount, delivery_fee,
      discount_amount, total, currency, payment_terms, delivery_terms,
      delivery_address_id, requested_delivery_date,
      assigned_sales_rep, status, confirmed_at, created_by
    )
    SELECT
      NEW.tenant_id, new_order_number, NEW.id, NEW.customer_id, NEW.project_id,
      NEW.customer_po_reference, NEW.subtotal, NEW.tax_amount, NEW.delivery_fee,
      NEW.discount_amount, NEW.total, NEW.currency, NEW.payment_terms,
      NEW.delivery_terms, NEW.delivery_address_id, NEW.estimated_delivery_date,
      NEW.assigned_to, 'confirmed', NOW(), NEW.created_by
    RETURNING id INTO new_order_id;

    -- Copy quote items to order items
    INSERT INTO public.order_items (
      order_id, quote_item_id, product_id, product_name, product_sku,
      quantity, unit_of_measure, unit_price, supplier_cost, line_total,
      supplier_id, sort_order, notes
    )
    SELECT
      new_order_id, qi.id, qi.product_id, qi.product_name, qi.product_sku,
      qi.quantity, qi.unit_of_measure, qi.unit_price, qi.supplier_cost,
      qi.line_total, qi.supplier_id, qi.sort_order, qi.notes
    FROM public.quote_items qi
    WHERE qi.quote_id = NEW.id
      AND (qi.is_accepted IS NULL OR qi.is_accepted = TRUE);

    -- Update project totals
    IF NEW.project_id IS NOT NULL THEN
      UPDATE public.projects
      SET total_ordered = total_ordered + NEW.total,
          updated_at = NOW()
      WHERE id = NEW.project_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_quote_accepted
  AFTER UPDATE OF status ON public.quotes
  FOR EACH ROW
  WHEN (NEW.status = 'accepted')
  EXECUTE FUNCTION public.on_quote_accepted();

-- =============================================
-- ORDER CONFIRMED -> CREATE SUPPLIER POs
-- (Heavy logic -- delegate to Edge Function via pg_net)
-- =============================================
CREATE OR REPLACE FUNCTION public.on_order_processing()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'processing' AND OLD.status = 'confirmed' THEN
    -- Invoke Edge Function to create supplier POs
    -- This is complex logic (multi-supplier splitting, cost resolution)
    -- better handled in application code
    PERFORM net.http_post(
      url := current_setting('app.edge_function_url') || '/create-supplier-pos',
      body := jsonb_build_object(
        'order_id', NEW.id,
        'tenant_id', NEW.tenant_id
      )::TEXT,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_order_processing
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  WHEN (NEW.status = 'processing')
  EXECUTE FUNCTION public.on_order_processing();

-- =============================================
-- DELIVERY COMPLETED -> GENERATE INVOICE
-- =============================================
CREATE OR REPLACE FUNCTION public.on_delivery_completed()
RETURNS TRIGGER AS $$
DECLARE
  new_invoice_id UUID;
  new_invoice_number TEXT;
  order_rec RECORD;
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    -- Get order info
    SELECT * INTO order_rec FROM public.orders WHERE id = NEW.order_id;

    -- Generate invoice number
    SELECT public.next_sequence_number(NEW.tenant_id, 'invoice', 'INV')
    INTO new_invoice_number;

    -- Create invoice
    INSERT INTO public.invoices (
      tenant_id, invoice_number, invoice_type, order_id, delivery_id,
      customer_id, project_id, status, subtotal, tax_amount,
      delivery_charges, total, currency, payment_terms, due_date, created_by
    )
    SELECT
      NEW.tenant_id, new_invoice_number, 'standard', NEW.order_id, NEW.id,
      order_rec.customer_id, order_rec.project_id, 'draft',
      -- Calculate subtotal from delivered items
      COALESCE((
        SELECT SUM(di.delivered_quantity * oi.unit_price)
        FROM public.delivery_items di
        JOIN public.order_items oi ON oi.id = di.order_item_id
        WHERE di.delivery_id = NEW.id AND di.delivered_quantity > 0
      ), 0),
      0, -- tax calculated separately
      0, -- delivery charges
      0, -- total calculated after tax
      order_rec.currency,
      order_rec.payment_terms,
      CURRENT_DATE + CASE order_rec.payment_terms
        WHEN 'net_15' THEN 15
        WHEN 'net_30' THEN 30
        WHEN 'net_45' THEN 45
        WHEN 'net_60' THEN 60
        WHEN 'net_90' THEN 90
        WHEN '2_10_net_30' THEN 30
        WHEN '1_10_net_30' THEN 30
        ELSE 30
      END,
      NEW.created_by
    RETURNING id INTO new_invoice_id;

    -- Copy delivery items to invoice items
    INSERT INTO public.invoice_items (
      invoice_id, order_item_id, delivery_item_id, product_id,
      description, quantity, unit_of_measure, unit_price, line_total, sort_order
    )
    SELECT
      new_invoice_id, di.order_item_id, di.id, di.product_id,
      oi.product_name, di.delivered_quantity, oi.unit_of_measure,
      oi.unit_price, (di.delivered_quantity * oi.unit_price), di.sort_order
    FROM public.delivery_items di
    JOIN public.order_items oi ON oi.id = di.order_item_id
    WHERE di.delivery_id = NEW.id AND di.delivered_quantity > 0;

    -- Update invoice total
    UPDATE public.invoices
    SET total = subtotal + tax_amount + delivery_charges - discount_amount,
        updated_at = NOW()
    WHERE id = new_invoice_id;

    -- Link delivery to invoice
    UPDATE public.deliveries SET invoice_id = new_invoice_id WHERE id = NEW.id;

    -- Update order fulfilled quantities
    UPDATE public.order_items oi
    SET fulfilled_quantity = oi.fulfilled_quantity + di.delivered_quantity,
        is_fulfilled = (oi.fulfilled_quantity + di.delivered_quantity >= oi.quantity)
    FROM public.delivery_items di
    WHERE di.delivery_id = NEW.id
      AND di.order_item_id = oi.id
      AND di.delivered_quantity > 0;

    -- Check if order is fully fulfilled
    IF NOT EXISTS (
      SELECT 1 FROM public.order_items
      WHERE order_id = NEW.order_id AND is_fulfilled = FALSE
    ) THEN
      UPDATE public.orders
      SET status = 'fulfilled', updated_at = NOW()
      WHERE id = NEW.order_id;
    ELSE
      UPDATE public.orders
      SET status = 'partially_fulfilled', updated_at = NOW()
      WHERE id = NEW.order_id AND status != 'partially_fulfilled';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_delivery_completed
  AFTER UPDATE OF status ON public.deliveries
  FOR EACH ROW
  WHEN (NEW.status = 'delivered')
  EXECUTE FUNCTION public.on_delivery_completed();

-- =============================================
-- PAYMENT APPLIED -> UPDATE INVOICE STATUS
-- =============================================
CREATE OR REPLACE FUNCTION public.on_payment_applied()
RETURNS TRIGGER AS $$
DECLARE
  inv RECORD;
BEGIN
  -- Update invoice amount_paid
  UPDATE public.invoices
  SET amount_paid = (
    SELECT COALESCE(SUM(pa.amount), 0)
    FROM public.payment_applications pa
    WHERE pa.invoice_id = NEW.invoice_id AND pa.reversed = FALSE
  ),
  updated_at = NOW()
  WHERE id = NEW.invoice_id;

  -- Check invoice status
  SELECT * INTO inv FROM public.invoices WHERE id = NEW.invoice_id;

  IF inv.balance_due <= 0 THEN
    UPDATE public.invoices
    SET status = 'paid', paid_at = NOW(), updated_at = NOW()
    WHERE id = NEW.invoice_id AND status != 'paid';
  ELSIF inv.amount_paid > 0 THEN
    UPDATE public.invoices
    SET status = 'partially_paid', updated_at = NOW()
    WHERE id = NEW.invoice_id AND status NOT IN ('partially_paid', 'paid');
  END IF;

  -- Update payment applied_amount
  UPDATE public.payments
  SET applied_amount = (
    SELECT COALESCE(SUM(pa.amount), 0)
    FROM public.payment_applications pa
    WHERE pa.payment_id = NEW.payment_id AND pa.reversed = FALSE
  ),
  status = CASE
    WHEN (SELECT SUM(pa.amount) FROM public.payment_applications pa
          WHERE pa.payment_id = NEW.payment_id AND pa.reversed = FALSE) >= amount
    THEN 'fully_applied'::public.payment_status
    ELSE 'partially_applied'::public.payment_status
  END,
  updated_at = NOW()
  WHERE id = NEW.payment_id;

  -- Check if order is fully paid (all invoices paid)
  -- and mark as completed
  PERFORM public.check_order_completion(inv.order_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_payment_applied
  AFTER INSERT ON public.payment_applications
  FOR EACH ROW EXECUTE FUNCTION public.on_payment_applied();

-- =============================================
-- INVENTORY CHANGE -> RECALCULATE ATP
-- =============================================
CREATE OR REPLACE FUNCTION public.on_inventory_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update total_value
  NEW.total_value := NEW.quantity_on_hand * COALESCE(NEW.unit_cost, 0);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inventory_recalc
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.on_inventory_change();

-- =============================================
-- GENERIC AUDIT LOG TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  old_data JSONB;
  new_data JSONB;
  changed TEXT[];
BEGIN
  IF TG_OP = 'DELETE' THEN
    old_data := to_jsonb(OLD);
    INSERT INTO public.audit_log (
      tenant_id, user_id, action, entity_type, entity_id, old_values
    ) VALUES (
      OLD.tenant_id, (SELECT auth.uid()), 'delete', TG_TABLE_NAME, OLD.id, old_data
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
    -- Get changed fields
    SELECT ARRAY_AGG(key) INTO changed
    FROM jsonb_each(new_data)
    WHERE new_data->key IS DISTINCT FROM old_data->key
      AND key NOT IN ('updated_at');

    IF changed IS NOT NULL AND array_length(changed, 1) > 0 THEN
      INSERT INTO public.audit_log (
        tenant_id, user_id, action, entity_type, entity_id,
        old_values, new_values, changed_fields
      ) VALUES (
        NEW.tenant_id, (SELECT auth.uid()),
        CASE WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'status_change' ELSE 'update' END,
        TG_TABLE_NAME, NEW.id, old_data, new_data, changed
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    new_data := to_jsonb(NEW);
    INSERT INTO public.audit_log (
      tenant_id, user_id, action, entity_type, entity_id, new_values
    ) VALUES (
      NEW.tenant_id, (SELECT auth.uid()), 'create', TG_TABLE_NAME, NEW.id, new_data
    );
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger to critical tables
CREATE TRIGGER trg_audit_orders AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
CREATE TRIGGER trg_audit_invoices AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
CREATE TRIGGER trg_audit_payments AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
CREATE TRIGGER trg_audit_credit_notes AFTER INSERT OR UPDATE OR DELETE ON public.credit_notes
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
CREATE TRIGGER trg_audit_supplier_pos AFTER INSERT OR UPDATE OR DELETE ON public.supplier_pos
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
CREATE TRIGGER trg_audit_customers AFTER INSERT OR UPDATE OR DELETE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- =============================================
-- UPDATED_AT AUTO-SETTER
-- =============================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at (example for key tables)
CREATE TRIGGER trg_updated_at_customers BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_updated_at_orders BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_updated_at_quotes BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
-- ... (apply to all tables with updated_at column)

-- =============================================
-- SEQUENCE NUMBER GENERATOR
-- =============================================
CREATE OR REPLACE FUNCTION public.next_sequence_number(
  p_tenant_id UUID,
  p_entity_type TEXT,
  p_prefix TEXT
)
RETURNS TEXT AS $$
DECLARE
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
  next_val BIGINT;
BEGIN
  -- Upsert and increment atomically
  INSERT INTO public.sequence_counters (tenant_id, entity_type, prefix, current_value, year)
  VALUES (p_tenant_id, p_entity_type, p_prefix, 1, current_year)
  ON CONFLICT (tenant_id, entity_type, COALESCE(year, 0))
  DO UPDATE SET current_value = public.sequence_counters.current_value + 1
  RETURNING current_value INTO next_val;

  RETURN p_prefix || '-' || current_year || '-' || LPAD(next_val::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;
```

### Complete Trigger Summary

| Trigger | Table | Event | Action |
|---------|-------|-------|--------|
| State change logger | All status tables (9) | AFTER UPDATE OF status | Insert into state_history |
| Quote accepted | quotes | AFTER UPDATE status='accepted' | Create order + order items, update project totals |
| Order processing | orders | AFTER UPDATE status='processing' | Call Edge Function to create supplier POs |
| Delivery completed | deliveries | AFTER UPDATE status='delivered' | Generate invoice, copy items, update order fulfillment |
| Payment applied | payment_applications | AFTER INSERT | Update invoice amount_paid/status, payment applied_amount, check order completion |
| Inventory recalc | inventory | BEFORE UPDATE | Recalculate total_value |
| Audit logger | 6 critical tables | AFTER INSERT/UPDATE/DELETE | Insert into audit_log |
| Updated_at setter | All tables with updated_at | BEFORE UPDATE | Set updated_at = NOW() |
| Product search vector | products | BEFORE INSERT/UPDATE | Update tsvector |

---

## 6. INDEXES FOR PERFORMANCE

### RLS-Critical Indexes (must exist for RLS performance)

```sql
-- Every table with tenant_id MUST have this index
CREATE INDEX idx_{table}_tenant_id ON public.{table}(tenant_id);

-- Specific RLS indexes
CREATE INDEX idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX idx_orders_created_by ON public.orders(created_by);
CREATE INDEX idx_supplier_pos_supplier_id ON public.supplier_pos(supplier_id);
CREATE INDEX idx_deliveries_driver_id ON public.deliveries(driver_id);
CREATE INDEX idx_deliveries_order_id ON public.deliveries(order_id);
CREATE INDEX idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX idx_payments_customer_id ON public.payments(customer_id);
CREATE INDEX idx_tickets_requester_user_id ON public.tickets(requester_user_id);
CREATE INDEX idx_tickets_customer_id ON public.tickets(customer_id);
CREATE INDEX idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
```

### Composite Indexes for Common Queries

```sql
-- Orders: by customer + status (sales dashboard, customer portal)
CREATE INDEX idx_orders_customer_status ON public.orders(tenant_id, customer_id, status);

-- Orders: by status + date (operations dashboard)
CREATE INDEX idx_orders_status_created ON public.orders(tenant_id, status, created_at DESC);

-- Quotes: by customer + status (quote management)
CREATE INDEX idx_quotes_customer_status ON public.quotes(tenant_id, customer_id, status);

-- Quotes: by assigned_to + status (rep's queue)
CREATE INDEX idx_quotes_assigned_status ON public.quotes(tenant_id, assigned_to, status);

-- Quotes: expiring soon
CREATE INDEX idx_quotes_valid_until ON public.quotes(tenant_id, valid_until)
  WHERE status = 'sent' OR status = 'viewed';

-- Quote requests: by status + urgency (inbox)
CREATE INDEX idx_qr_status_urgency ON public.quote_requests(tenant_id, status, urgency);

-- Deliveries: by driver + date (driver app)
CREATE INDEX idx_deliveries_driver_date ON public.deliveries(tenant_id, driver_id, scheduled_date);

-- Deliveries: by status + date (dispatch board)
CREATE INDEX idx_deliveries_status_date ON public.deliveries(tenant_id, status, scheduled_date);

-- Deliveries: by route (route management)
CREATE INDEX idx_deliveries_route ON public.deliveries(route_id);

-- Invoices: by status + due_date (AR management)
CREATE INDEX idx_invoices_status_due ON public.invoices(tenant_id, status, due_date);

-- Invoices: overdue (collections)
CREATE INDEX idx_invoices_overdue ON public.invoices(tenant_id, due_date)
  WHERE status IN ('sent', 'viewed', 'partially_paid', 'overdue');

-- Payments: unmatched (AR cash application)
CREATE INDEX idx_payments_unmatched ON public.payments(tenant_id, status, received_date)
  WHERE status IN ('received', 'unmatched');

-- Inventory: by product + warehouse (stock lookup)
CREATE INDEX idx_inventory_product_warehouse ON public.inventory(tenant_id, product_id, warehouse_id);

-- Inventory: low stock alerts
CREATE INDEX idx_inventory_low_stock ON public.inventory(tenant_id, warehouse_id)
  WHERE quantity_available <= reorder_point;

-- Supplier POs: by supplier + status
CREATE INDEX idx_spo_supplier_status ON public.supplier_pos(tenant_id, supplier_id, status);

-- Supplier POs: by order (order detail view)
CREATE INDEX idx_spo_order ON public.supplier_pos(order_id);

-- Products: by category (catalog browsing)
CREATE INDEX idx_products_category ON public.products(tenant_id, category)
  WHERE is_active = TRUE;

-- Notifications: unread per user
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC)
  WHERE is_read = FALSE;

-- Audit log: by entity (entity history view)
CREATE INDEX idx_audit_entity ON public.audit_log(entity_type, entity_id, created_at DESC);

-- Audit log: by user (user activity)
CREATE INDEX idx_audit_user ON public.audit_log(user_id, created_at DESC);

-- State history: by entity (state timeline)
CREATE INDEX idx_state_history_entity ON public.state_history(entity_type, entity_id, created_at DESC);

-- Tickets: by status + priority (queue)
CREATE INDEX idx_tickets_status_priority ON public.tickets(tenant_id, status, priority);

-- Tickets: assigned to (agent queue)
CREATE INDEX idx_tickets_assigned ON public.tickets(tenant_id, assigned_to, status);

-- AR Aging: by date (reports)
CREATE INDEX idx_ar_aging_date ON public.ar_aging_snapshots(tenant_id, snapshot_date DESC);

-- Addresses: polymorphic lookup
CREATE INDEX idx_addresses_entity ON public.addresses(addressable_type, addressable_id);

-- Documents: polymorphic lookup
CREATE INDEX idx_documents_entity ON public.documents(entity_type, entity_id);

-- Approvals: pending per user
CREATE INDEX idx_approvals_pending ON public.approvals(tenant_id, assigned_to, status)
  WHERE status = 'pending';

-- Customer contacts: by customer
CREATE INDEX idx_customer_contacts_customer ON public.customer_contacts(customer_id);

-- Product suppliers: lookup
CREATE INDEX idx_product_suppliers_product ON public.product_suppliers(product_id);
CREATE INDEX idx_product_suppliers_supplier ON public.product_suppliers(supplier_id);

-- Payment applications: by invoice and payment
CREATE INDEX idx_payment_apps_invoice ON public.payment_applications(invoice_id);
CREATE INDEX idx_payment_apps_payment ON public.payment_applications(payment_id);

-- GPS tracking: recent by driver
CREATE INDEX idx_driver_locations_driver ON public.driver_locations(driver_id, recorded_at DESC);
```

### Full-Text Search Indexes

```sql
-- Product search
CREATE INDEX idx_products_search ON public.products USING GIN(search_vector);

-- Product search vector update trigger
CREATE OR REPLACE FUNCTION public.update_product_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.sku, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.brand, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.subcategory, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_product_search_vector
  BEFORE INSERT OR UPDATE OF name, sku, brand, description, subcategory, tags
  ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_product_search_vector();

-- Ticket search (subject + description)
CREATE INDEX idx_tickets_search ON public.tickets
  USING GIN(to_tsvector('english', COALESCE(subject, '') || ' ' || COALESCE(description, '')));

-- Customer search (company name)
CREATE INDEX idx_customers_search ON public.customers
  USING GIN(to_tsvector('english', COALESCE(company_name, '') || ' ' || COALESCE(legal_name, '') || ' ' || COALESCE(trade_name, '')));
```

---

## 7. PGVECTOR TABLES FOR AI

### Enable Extension

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Embedding Tables

```sql
-- =============================================
-- DOCUMENT EMBEDDINGS (CEO RAG, knowledge base)
-- =============================================
CREATE TABLE public.document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  -- Source document
  source_type TEXT NOT NULL,              -- 'knowledge_base', 'policy', 'sop', 'faq', 'product_guide'
  source_id TEXT,                         -- External doc ID or filename
  -- Chunk info
  chunk_index INTEGER NOT NULL,           -- Position within document
  chunk_text TEXT NOT NULL,               -- The actual text chunk
  -- Metadata
  title TEXT,
  category TEXT,                          -- Topic category
  metadata JSONB DEFAULT '{}',           -- Any additional context
  -- Embedding
  embedding vector(1536) NOT NULL,       -- OpenAI text-embedding-3-small (1536 dims)
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index for fast similarity search
CREATE INDEX idx_document_embeddings_hnsw ON public.document_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Filter index
CREATE INDEX idx_document_embeddings_tenant_source ON public.document_embeddings(tenant_id, source_type);

-- =============================================
-- PRODUCT EMBEDDINGS (semantic product search)
-- =============================================
CREATE TABLE public.product_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  -- Combined text for embedding
  combined_text TEXT NOT NULL,            -- name + description + specs + category
  -- Embedding
  embedding vector(1536) NOT NULL,
  -- Staleness tracking
  product_updated_at TIMESTAMPTZ,        -- When product was last updated
  embedding_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_embeddings_hnsw ON public.product_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_product_embeddings_tenant ON public.product_embeddings(tenant_id);
CREATE UNIQUE INDEX idx_product_embeddings_product ON public.product_embeddings(product_id);

-- =============================================
-- CONVERSATION EMBEDDINGS (for CEO RAG context retrieval)
-- =============================================
CREATE TABLE public.business_data_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  -- What business data this represents
  data_type TEXT NOT NULL,                -- 'customer_summary', 'order_summary', 'financial_snapshot', 'supplier_performance', 'kpi_report'
  data_id UUID,                          -- Related entity ID
  -- The text representation of the data
  content TEXT NOT NULL,
  -- Metadata for filtering
  time_period TEXT,                       -- '2026-Q1', '2026-03', 'trailing-12m'
  metadata JSONB DEFAULT '{}',
  -- Embedding
  embedding vector(1536) NOT NULL,
  -- Freshness
  data_as_of TIMESTAMPTZ NOT NULL,       -- When the source data was computed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_business_embeddings_hnsw ON public.business_data_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_business_embeddings_tenant_type ON public.business_data_embeddings(tenant_id, data_type);
```

### Embedding Search Function

```sql
-- Semantic search function for RAG
CREATE OR REPLACE FUNCTION public.search_embeddings(
  p_tenant_id UUID,
  p_query_embedding vector(1536),
  p_source_type TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10,
  p_similarity_threshold DECIMAL DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  source_type TEXT,
  chunk_text TEXT,
  title TEXT,
  metadata JSONB,
  similarity DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.id,
    de.source_type,
    de.chunk_text,
    de.title,
    de.metadata,
    (1 - (de.embedding <=> p_query_embedding))::DECIMAL AS similarity
  FROM public.document_embeddings de
  WHERE de.tenant_id = p_tenant_id
    AND (p_source_type IS NULL OR de.source_type = p_source_type)
    AND (1 - (de.embedding <=> p_query_embedding)) >= p_similarity_threshold
  ORDER BY de.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Product semantic search
CREATE OR REPLACE FUNCTION public.search_products_semantic(
  p_tenant_id UUID,
  p_query_embedding vector(1536),
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  product_id UUID,
  name TEXT,
  sku TEXT,
  category public.product_category,
  similarity DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.sku,
    p.category,
    (1 - (pe.embedding <=> p_query_embedding))::DECIMAL AS similarity
  FROM public.product_embeddings pe
  JOIN public.products p ON p.id = pe.product_id
  WHERE pe.tenant_id = p_tenant_id
    AND p.is_active = TRUE
  ORDER BY pe.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## 8. EDGE FUNCTIONS

### Complete Edge Function List

| # | Function Name | Trigger | Description |
|---|--------------|---------|-------------|
| **AI** | | | |
| 1 | `ai-chat-handler` | HTTP POST | Main AI chat endpoint. Routes to CEO RAG, customer support AI, product search AI, or internal assistant based on conversation_type. |
| 2 | `ai-embed-document` | HTTP POST | Generate embeddings for uploaded documents. Chunk text, call OpenAI embeddings API, store in document_embeddings. |
| 3 | `ai-embed-product` | Webhook (product update) | Regenerate product embedding when product name/description/specs change. |
| 4 | `ai-embed-business-data` | Cron (daily) | Pre-compute business data embeddings for CEO RAG: customer summaries, KPI snapshots, financial reports. |
| 5 | `ai-match-products` | HTTP POST | Match customer's free-text material descriptions to catalog products using embeddings + fuzzy matching. |
| **Quotes** | | | |
| 6 | `quote-send-notification` | Webhook (quote status='sent') | Email quote PDF to customer. Send WhatsApp notification. Create portal notification. |
| 7 | `quote-expiry-check` | Cron (daily 6AM) | Find quotes past valid_until date, set status to 'expired'. Notify sales rep. |
| 8 | `quote-generate-pdf` | HTTP POST | Generate professional quote PDF from quote data. Store in Supabase Storage. |
| **Orders** | | | |
| 9 | `create-supplier-pos` | Trigger (order status='processing') | Split order into supplier POs based on product-supplier mapping, preferred suppliers, and inventory availability. |
| 10 | `order-credit-check` | Trigger (quote accepted) | Check customer credit limit against new order total. Auto-approve or flag for manual review. |
| 11 | `order-confirmation-email` | Webhook (order created) | Send order confirmation to customer with order details, estimated delivery dates. |
| **Procurement** | | | |
| 12 | `po-send-to-supplier` | HTTP POST | Email PO to supplier contact. Also push to supplier portal. |
| 13 | `po-acknowledgment-reminder` | Cron (twice daily) | Check for POs in 'sent' status > 48 hours without supplier confirmation. Alert procurement. |
| 14 | `supplier-catalog-parser` | HTTP POST | Parse uploaded supplier price list (CSV/Excel/PDF). Map to existing products or suggest new SKUs. |
| **Deliveries** | | | |
| 15 | `delivery-status-updater` | HTTP POST (from driver app) | Update delivery status, record GPS, process POD photos. Trigger downstream actions. |
| 16 | `delivery-customer-notification` | Webhook (delivery status change) | Notify customer: delivery scheduled, driver dispatched, ETA update, delivered (with POD link). |
| 17 | `delivery-route-optimizer` | HTTP POST | Call routing API to optimize stop sequence for a delivery route. Update stop_sequence. |
| 18 | `driver-location-ingester` | HTTP POST (batch) | Batch insert GPS coordinates from driver apps. Handles high-volume writes efficiently. |
| **Finance** | | | |
| 19 | `invoice-generate-pdf` | HTTP POST | Generate invoice PDF with line items, tax, wire instructions. Store in Storage. |
| 20 | `invoice-send` | Webhook (invoice status='sent') | Email invoice PDF to customer AP contact. WhatsApp notification. Portal notification. |
| 21 | `invoice-reminder` | Cron (daily 8AM) | Send payment reminders for invoices approaching due date and overdue invoices. Escalation ladder. |
| 22 | `payment-auto-matcher` | Webhook (payment created) | Attempt to auto-match incoming payment to open invoices by reference number, amount, customer. |
| 23 | `payment-webhook-handler` | HTTP POST | Process incoming bank feed webhooks. Create payment records from bank transaction data. |
| 24 | `ar-aging-calculator` | Cron (daily midnight) | Recalculate AR aging buckets for all customers. Store snapshot in ar_aging_snapshots. |
| 25 | `credit-limit-checker` | Cron (weekly) | Review customer credit utilization. Flag accounts over 80% usage. Schedule reviews for expiring approvals. |
| **Support** | | | |
| 26 | `ticket-auto-router` | Webhook (ticket created) | Auto-classify ticket category using AI. Route to appropriate team. Set SLA timers. |
| 27 | `ticket-sla-breach-detector` | Cron (every 15 min) | Check for tickets approaching or breaching SLA. Escalate and notify managers. |
| 28 | `whatsapp-webhook-handler` | HTTP POST | Process incoming WhatsApp messages. Route to AI or create tickets. Send replies. |
| **Notifications** | | | |
| 29 | `notification-dispatcher` | Webhook (notification created) | Route notification to appropriate channel: in-app, email, SMS, WhatsApp, push. |
| 30 | `notification-email-sender` | Queue | Send email notifications via Resend/SendGrid. Template-based. |
| 31 | `notification-whatsapp-sender` | Queue | Send WhatsApp messages via WhatsApp Business API. |
| **Scheduled Jobs** | | | |
| 32 | `daily-metrics-precompute` | Cron (daily 1AM) | Pre-compute CEO dashboard metrics: revenue, pipeline, margin, OTIF rate, DSO. Store for fast retrieval. |
| 33 | `data-retention-cleanup` | Cron (weekly Sunday 2AM) | Archive old GPS data, prune audit logs per retention policy, clean expired notifications. |
| 34 | `supplier-performance-updater` | Cron (weekly) | Recalculate supplier on-time rate, quality score, average lead time from completed POs. |
| 35 | `driver-performance-updater` | Cron (weekly) | Recalculate driver on-time rate, completed deliveries, average rating. |
| 36 | `inventory-reorder-checker` | Cron (daily 5AM) | Check inventory levels against reorder points. Generate suggested POs for procurement review. |

---

## 9. REAL-TIME SUBSCRIPTIONS

### Tables Requiring Supabase Realtime

```sql
-- Enable Realtime for specific tables via Supabase Dashboard or SQL
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.{table};

-- Order status changes (customer portal, sales dashboard, operations)
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Delivery status and GPS (customer tracking, dispatch board)
ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;

-- Notifications (all users)
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Tickets (CS agents, customer portal)
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;

-- Quote requests (sales inbox)
ALTER PUBLICATION supabase_realtime ADD TABLE public.quote_requests;

-- Quotes (customer portal -- viewed/accepted tracking)
ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;

-- Invoices (finance dashboard)
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;

-- Payments (finance -- cash application)
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;

-- Approvals (approval queues)
ALTER PUBLICATION supabase_realtime ADD TABLE public.approvals;

-- AI messages (streaming chat)
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_messages;

-- Inventory (warehouse dashboard)
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;
```

### Subscription Patterns by App

| App | Subscribes To | Filter | Use Case |
|-----|--------------|--------|----------|
| Customer Portal | orders, deliveries, quotes, invoices, notifications, tickets | customer_id = current_customer_id | Real-time order tracking, quote updates, payment confirmations |
| Driver App | deliveries, delivery_routes | driver_id = current_driver_id | New assignments, route changes, delivery updates |
| Sales Dashboard | quote_requests, quotes, orders, notifications, approvals | tenant + assigned_to or status | New RFQs, quote status changes, approval requests |
| Dispatch Board | deliveries, driver_locations, delivery_routes | tenant + scheduled_date = today | Live delivery map, status changes, GPS tracking |
| Warehouse App | inventory, supplier_pos, deliveries | warehouse_id = assigned_warehouse | Stock changes, incoming POs, outbound pick lists |
| Finance Dashboard | invoices, payments, credit_notes, notifications | tenant | Payment receipts, overdue alerts, AR changes |
| CEO Dashboard | notifications, ai_messages | user_id = ceo_user_id | Alert stream, AI chat responses |
| CS Dashboard | tickets, ticket_messages, notifications | tenant + assigned_to | New tickets, customer replies, SLA alerts |
| Supplier Portal | supplier_pos, supplier_inquiries | supplier_id = current_supplier_id | New POs, inquiry requests |

### Realtime RLS Note

Supabase Realtime respects RLS policies. Each subscription channel automatically filters rows based on the authenticated user's permissions. No additional filtering logic is needed in the client beyond the RLS policies already defined.

---

## 10. CRON JOBS VIA PG_CRON

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;
-- Enable pg_net for HTTP calls from triggers/cron
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =============================================
-- QUOTE EXPIRY CHECK (daily at 6:00 AM UTC)
-- =============================================
SELECT cron.schedule(
  'quote-expiry-check',
  '0 6 * * *',
  $$
  UPDATE public.quotes
  SET status = 'expired',
      expired_at = NOW(),
      updated_at = NOW()
  WHERE status IN ('sent', 'viewed')
    AND valid_until < CURRENT_DATE;
  $$
);

-- =============================================
-- AR AGING RECALCULATION (daily at midnight UTC)
-- =============================================
SELECT cron.schedule(
  'ar-aging-recalc',
  '0 0 * * *',
  $$
  INSERT INTO public.ar_aging_snapshots (
    tenant_id, snapshot_date, customer_id,
    current_amount, days_1_30, days_31_60, days_61_90, days_over_90,
    total_outstanding, credit_limit, credit_available, dso_days
  )
  SELECT
    i.tenant_id,
    CURRENT_DATE,
    i.customer_id,
    COALESCE(SUM(CASE WHEN i.due_date >= CURRENT_DATE THEN i.balance_due END), 0),
    COALESCE(SUM(CASE WHEN CURRENT_DATE - i.due_date BETWEEN 1 AND 30 THEN i.balance_due END), 0),
    COALESCE(SUM(CASE WHEN CURRENT_DATE - i.due_date BETWEEN 31 AND 60 THEN i.balance_due END), 0),
    COALESCE(SUM(CASE WHEN CURRENT_DATE - i.due_date BETWEEN 61 AND 90 THEN i.balance_due END), 0),
    COALESCE(SUM(CASE WHEN CURRENT_DATE - i.due_date > 90 THEN i.balance_due END), 0),
    COALESCE(SUM(i.balance_due), 0),
    c.credit_limit,
    c.credit_limit - COALESCE(SUM(i.balance_due), 0),
    CASE WHEN SUM(i.total) > 0 THEN
      (SUM(i.balance_due) / (SUM(i.total) / 30.0))::DECIMAL(5,1)
    ELSE 0 END
  FROM public.invoices i
  JOIN public.customers c ON c.id = i.customer_id
  WHERE i.status NOT IN ('cancelled', 'written_off', 'draft')
    AND i.balance_due > 0
  GROUP BY i.tenant_id, i.customer_id, c.credit_limit
  ON CONFLICT (tenant_id, snapshot_date, customer_id) DO UPDATE SET
    current_amount = EXCLUDED.current_amount,
    days_1_30 = EXCLUDED.days_1_30,
    days_31_60 = EXCLUDED.days_31_60,
    days_61_90 = EXCLUDED.days_61_90,
    days_over_90 = EXCLUDED.days_over_90,
    total_outstanding = EXCLUDED.total_outstanding,
    credit_available = EXCLUDED.credit_available,
    dso_days = EXCLUDED.dso_days;
  $$
);

-- =============================================
-- INVOICE OVERDUE CHECKER (daily at 8:00 AM UTC)
-- =============================================
SELECT cron.schedule(
  'invoice-overdue-check',
  '0 8 * * *',
  $$
  UPDATE public.invoices
  SET status = 'overdue',
      updated_at = NOW()
  WHERE status IN ('sent', 'viewed')
    AND due_date < CURRENT_DATE;
  $$
);

-- =============================================
-- CREDIT LIMIT REVIEW ALERTS (weekly Monday 7AM UTC)
-- =============================================
SELECT cron.schedule(
  'credit-limit-review',
  '0 7 * * 1',
  $$
  -- Flag customers needing credit review
  SELECT net.http_post(
    url := current_setting('app.edge_function_url') || '/credit-limit-checker',
    body := '{}'::TEXT,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    )
  );
  $$
);

-- =============================================
-- SLA BREACH DETECTION (every 15 minutes)
-- =============================================
SELECT cron.schedule(
  'sla-breach-detection',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.edge_function_url') || '/ticket-sla-breach-detector',
    body := '{}'::TEXT,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    )
  );
  $$
);

-- =============================================
-- DAILY METRICS PRE-COMPUTATION (1:00 AM UTC)
-- =============================================
SELECT cron.schedule(
  'daily-metrics-precompute',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.edge_function_url') || '/daily-metrics-precompute',
    body := '{}'::TEXT,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    )
  );
  $$
);

-- =============================================
-- SUPPLIER PERFORMANCE UPDATE (weekly Sunday 3AM UTC)
-- =============================================
SELECT cron.schedule(
  'supplier-performance-update',
  '0 3 * * 0',
  $$
  UPDATE public.suppliers s
  SET
    on_time_delivery_rate = sub.on_time_rate,
    average_lead_time_days = sub.avg_lead_time,
    total_pos_count = sub.po_count,
    total_pos_value = sub.po_value,
    updated_at = NOW()
  FROM (
    SELECT
      sp.supplier_id,
      COUNT(*) AS po_count,
      SUM(sp.total) AS po_value,
      AVG(EXTRACT(DAY FROM (sp.actual_delivery_date - sp.created_at)))::DECIMAL(5,1) AS avg_lead_time,
      (COUNT(*) FILTER (WHERE sp.actual_delivery_date <= sp.expected_delivery_date)::DECIMAL /
       NULLIF(COUNT(*), 0) * 100)::DECIMAL(5,2) AS on_time_rate
    FROM public.supplier_pos sp
    WHERE sp.status = 'closed'
      AND sp.actual_delivery_date IS NOT NULL
    GROUP BY sp.supplier_id
  ) sub
  WHERE s.id = sub.supplier_id;
  $$
);

-- =============================================
-- PO ACKNOWLEDGMENT REMINDER (twice daily: 9AM and 2PM UTC)
-- =============================================
SELECT cron.schedule(
  'po-ack-reminder',
  '0 9,14 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.edge_function_url') || '/po-acknowledgment-reminder',
    body := '{}'::TEXT,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    )
  );
  $$
);

-- =============================================
-- DATA RETENTION CLEANUP (weekly Sunday 2AM UTC)
-- =============================================
SELECT cron.schedule(
  'data-retention-cleanup',
  '0 2 * * 0',
  $$
  -- Archive GPS data older than 90 days
  DELETE FROM public.driver_locations
  WHERE recorded_at < NOW() - INTERVAL '90 days';

  -- Delete read notifications older than 30 days
  DELETE FROM public.notifications
  WHERE is_read = TRUE AND created_at < NOW() - INTERVAL '30 days';

  -- Delete processed webhook events older than 60 days
  DELETE FROM public.webhook_events
  WHERE status = 'processed' AND created_at < NOW() - INTERVAL '60 days';
  $$
);

-- =============================================
-- INVENTORY REORDER CHECK (daily at 5AM UTC)
-- =============================================
SELECT cron.schedule(
  'inventory-reorder-check',
  '0 5 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.edge_function_url') || '/inventory-reorder-checker',
    body := '{}'::TEXT,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    )
  );
  $$
);

-- =============================================
-- BUSINESS DATA EMBEDDINGS REFRESH (daily at 1:30 AM UTC)
-- =============================================
SELECT cron.schedule(
  'business-embeddings-refresh',
  '30 1 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.edge_function_url') || '/ai-embed-business-data',
    body := '{}'::TEXT,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    )
  );
  $$
);
```

### Complete Cron Schedule Summary

| Job | Schedule | Type | Description |
|-----|----------|------|-------------|
| quote-expiry-check | Daily 6AM | SQL | Expire quotes past valid_until |
| ar-aging-recalc | Daily midnight | SQL | Recalculate AR aging buckets |
| invoice-overdue-check | Daily 8AM | SQL | Mark overdue invoices |
| invoice-reminder | Daily 8AM | Edge Function | Send payment reminder emails |
| daily-metrics-precompute | Daily 1AM | Edge Function | CEO dashboard metrics |
| business-embeddings-refresh | Daily 1:30AM | Edge Function | Refresh AI knowledge embeddings |
| inventory-reorder-check | Daily 5AM | Edge Function | Check stock levels against reorder points |
| po-ack-reminder | 9AM, 2PM daily | Edge Function | Remind procurement of unconfirmed POs |
| sla-breach-detection | Every 15 min | Edge Function | Detect and escalate SLA breaches |
| credit-limit-review | Monday 7AM | Edge Function | Weekly credit utilization check |
| supplier-performance-update | Sunday 3AM | SQL | Recalculate supplier metrics |
| data-retention-cleanup | Sunday 2AM | SQL | Archive/delete old data |

---

## 11. DATA RETENTION AND ARCHIVING

### Retention Policies by Data Type

| Data Type | Retention | Strategy | Rationale |
|-----------|-----------|----------|-----------|
| **Orders, Invoices, Payments** | Forever | Keep in primary tables | Legal/financial records. Required for audit. |
| **Quotes (accepted)** | Forever | Keep | Linked to orders; legal contract basis. |
| **Quotes (expired/declined)** | 3 years | Keep then archive | Business analytics; may re-quote. |
| **Quote requests** | 3 years | Keep then archive | Sales analytics. |
| **Supplier POs** | Forever | Keep | Financial audit trail. |
| **Deliveries** | Forever | Keep | POD is legal proof of delivery. |
| **Driver GPS data** | 90 days live, 2 years archived | Partition + archive to cold storage | High volume; needed for dispute resolution. |
| **Audit log** | 7 years | Partition by month, archive to cold | Legal compliance. SOC2. |
| **State history** | 3 years | Keep then archive | Dispute resolution. |
| **Notifications (read)** | 30 days | Delete | Low value after read. |
| **Notifications (unread)** | 90 days | Keep | User may still need them. |
| **Ticket messages** | 3 years | Keep | Customer service history. |
| **AI conversations** | 1 year | Keep then archive | Analytics, model improvement. |
| **AI messages** | 1 year | Keep then archive | With conversations. |
| **Webhook events** | 60 days | Delete processed | Only keep failed for debugging. |
| **Embeddings** | Refresh continuously | Replace, don't accumulate | Only current embeddings matter. |
| **Products** | Forever | Soft delete (is_active=false) | Historical orders reference them. |
| **Customers** | Forever | Soft delete | Financial records reference them. |

### Partition Strategy

```sql
-- GPS data: monthly partitions
CREATE TABLE public.driver_locations_2026_01 PARTITION OF public.driver_locations
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE public.driver_locations_2026_02 PARTITION OF public.driver_locations
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE public.driver_locations_2026_03 PARTITION OF public.driver_locations
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
-- ... create partitions dynamically via cron or migration

-- Audit log: monthly partitions
CREATE TABLE public.audit_log_2026_01 PARTITION OF public.audit_log
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE public.audit_log_2026_02 PARTITION OF public.audit_log
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE public.audit_log_2026_03 PARTITION OF public.audit_log
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
-- ...

-- Auto-create future partitions (run monthly via cron)
SELECT cron.schedule(
  'create-monthly-partitions',
  '0 0 25 * *',  -- 25th of each month, create next month's partitions
  $$
  SELECT net.http_post(
    url := current_setting('app.edge_function_url') || '/create-monthly-partitions',
    body := '{}'::TEXT,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    )
  );
  $$
);
```

### Archive Strategy

```sql
-- Archive table pattern (example for GPS data)
CREATE TABLE public.driver_locations_archive (
  LIKE public.driver_locations INCLUDING ALL
);

-- Monthly archive job moves data > 90 days to archive table
-- Then archive table is periodically exported to Supabase Storage (Parquet/CSV)
-- for long-term cold storage
```

---

## 12. MIGRATION STRATEGY

### Folder Structure

```
supabase/
  migrations/
    -- Foundation (001-010)
    001_extensions.sql                    -- vector, pg_cron, pg_net, pgcrypto
    002_enums.sql                         -- All enum types
    003_tenants.sql                       -- Tenants table
    004_auth_users_profiles.sql           -- user_profiles, user_roles, role_permissions, employees
    005_auth_functions.sql                -- RLS helper functions, custom access token hook

    -- Core Entities (011-030)
    011_customers.sql                     -- customers, customer_contacts
    012_addresses.sql                     -- addresses (polymorphic)
    013_projects.sql                      -- projects
    014_credit_applications.sql           -- credit_applications
    015_suppliers.sql                     -- suppliers, supplier_contacts, supplier_price_lists
    016_products.sql                      -- products, product_suppliers, pricing_rules, contract_prices

    -- Quote-to-Order Flow (031-050)
    031_quote_requests.sql                -- quote_requests, quote_request_items
    032_quotes.sql                        -- quotes, quote_items
    033_orders.sql                        -- orders, order_items

    -- Procurement (051-060)
    051_supplier_pos.sql                  -- supplier_pos, supplier_po_items
    052_supplier_inquiries.sql            -- supplier_inquiries

    -- Warehouse (061-075)
    061_warehouses.sql                    -- warehouses, warehouse_locations
    062_inventory.sql                     -- inventory
    063_stock_movements.sql               -- stock_movements
    064_inventory_transfers.sql           -- inventory_transfers
    065_cycle_counts.sql                  -- cycle_counts

    -- Logistics (076-090)
    076_vehicles.sql                      -- vehicles
    077_drivers.sql                       -- drivers
    078_delivery_routes.sql               -- delivery_routes
    079_deliveries.sql                    -- deliveries, delivery_items
    080_driver_locations.sql              -- driver_locations (partitioned)

    -- Finance (091-110)
    091_invoices.sql                      -- invoices, invoice_items
    092_payments.sql                      -- payments, payment_applications
    093_credit_notes.sql                  -- credit_notes, credit_note_applications
    094_ar_aging.sql                      -- ar_aging_snapshots
    095_supplier_invoices.sql             -- supplier_invoices

    -- Returns (111-115)
    111_returns.sql                       -- returns

    -- Support (116-120)
    116_tickets.sql                       -- tickets, ticket_messages

    -- AI (121-130)
    121_ai_conversations.sql              -- ai_conversations, ai_messages
    122_embeddings.sql                    -- document_embeddings, product_embeddings, business_data_embeddings
    123_embedding_functions.sql           -- search_embeddings, search_products_semantic

    -- Documents & Notifications (131-140)
    131_documents.sql                     -- documents
    132_notifications.sql                 -- notifications

    -- System (141-155)
    141_approvals.sql                     -- approvals
    142_audit_log.sql                     -- audit_log (partitioned)
    143_system_settings.sql               -- system_settings, sequence_counters
    144_state_history.sql                 -- state_history
    145_webhook_events.sql                -- webhook_events

    -- Deferred Foreign Keys (156-160)
    156_deferred_foreign_keys.sql         -- All cross-domain FKs

    -- RLS Policies (161-175)
    161_rls_customers.sql
    162_rls_quotes_orders.sql
    163_rls_procurement.sql
    164_rls_warehouse.sql
    165_rls_deliveries.sql
    166_rls_finance.sql
    167_rls_support.sql
    168_rls_ai.sql
    169_rls_system.sql

    -- Triggers (176-185)
    176_triggers_state_change.sql         -- Generic state change logger
    177_triggers_business_logic.sql       -- Quote accepted, delivery completed, etc.
    178_triggers_audit.sql                -- Audit log triggers
    179_triggers_utility.sql              -- updated_at, search vector

    -- Indexes (186-190)
    186_indexes_rls.sql                   -- RLS-critical indexes
    187_indexes_composite.sql             -- Business query indexes
    188_indexes_fulltext.sql              -- Full-text search indexes
    189_indexes_vector.sql                -- pgvector HNSW indexes

    -- Cron Jobs (191-195)
    191_cron_jobs.sql                     -- All pg_cron schedules

    -- Seeds (196-199)
    196_seed_roles_permissions.sql        -- Default role-permission mappings
    197_seed_system_settings.sql          -- Default system settings
    198_seed_enums_data.sql               -- Any static reference data

    -- Partitions (200+)
    200_partitions_gps.sql                -- Monthly GPS partitions
    201_partitions_audit.sql              -- Monthly audit log partitions
```

### Naming Convention

```
{sequence}_{domain}_{action}_{detail}.sql

Examples:
  011_customers_create_table.sql
  161_rls_customers_policies.sql
  177_triggers_business_logic.sql
  186_indexes_rls_critical.sql
```

### Rollback Approach

1. Each migration is idempotent where possible (using `IF NOT EXISTS`, `CREATE OR REPLACE`).
2. For destructive changes, create a paired rollback migration:
   - `032_quotes.sql` has `032_quotes_rollback.sql` in a `rollbacks/` folder.
3. Use Supabase CLI `supabase db reset` for development.
4. For production: never drop columns or tables in the same release. Use a two-phase approach:
   - Phase 1: Deploy code that does not use the old column.
   - Phase 2: Next release, drop the column via migration.

---

## APPENDIX: CUSTOM ACCESS TOKEN HOOK

This function runs before every JWT issuance and injects custom claims (roles, tenant_id, entity IDs) into the token:

```sql
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims JSONB;
  user_roles_arr TEXT[];
  profile RECORD;
BEGIN
  claims := event->'claims';

  SELECT * INTO profile
  FROM public.user_profiles
  WHERE user_id = (event->>'user_id')::UUID;

  SELECT ARRAY_AGG(role::TEXT) INTO user_roles_arr
  FROM public.user_roles
  WHERE user_id = (event->>'user_id')::UUID;

  IF profile.user_type IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_metadata, user_type}', to_jsonb(profile.user_type));
  END IF;

  IF profile.tenant_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_metadata, tenant_id}', to_jsonb(profile.tenant_id::TEXT));
  END IF;

  IF user_roles_arr IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_metadata, roles}', to_jsonb(user_roles_arr));
  END IF;

  IF profile.customer_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_metadata, customer_id}', to_jsonb(profile.customer_id::TEXT));
  END IF;

  IF profile.supplier_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_metadata, supplier_id}', to_jsonb(profile.supplier_id::TEXT));
  END IF;

  IF profile.driver_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_metadata, driver_id}', to_jsonb(profile.driver_id::TEXT));
  END IF;

  IF 'ceo' = ANY(user_roles_arr) THEN
    claims := jsonb_set(claims, '{user_role}', '"ceo"');
  ELSIF 'admin' = ANY(user_roles_arr) THEN
    claims := jsonb_set(claims, '{user_role}', '"admin"');
  ELSIF user_roles_arr IS NOT NULL AND array_length(user_roles_arr, 1) > 0 THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_roles_arr[1]));
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
GRANT ALL ON TABLE public.user_profiles TO supabase_auth_admin;
GRANT ALL ON TABLE public.user_roles TO supabase_auth_admin;
```

---

## SOURCES

- [Supabase Row Level Security Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase AI Prompt: RLS Policies](https://supabase.com/docs/guides/getting-started/ai-prompts/database-rls-policies)
- [Supabase RLS and Edge Functions Transactions](https://marmelab.com/blog/2025/12/08/supabase-edge-function-transaction-rls.html)
- [Supabase in 2026: Relational AI Guide](https://textify.ai/supabase-relational-ai-2026-guide/)
- [Supabase Review 2026](https://hackceleration.com/supabase-review/)
