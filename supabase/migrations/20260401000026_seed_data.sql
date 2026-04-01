-- Migration 026: Seed Data
-- Governorates (27), system_settings (~25 per tenant), sequence_counters (13 per tenant),
-- delivery_zones (10 per tenant).
--
-- Role permissions: ALREADY seeded in migration 006 (359 rows). NOT re-seeded here.
-- Unit translations: ALREADY created + seeded in migration 021. NOT re-seeded here.
--
-- All INSERTs use ON CONFLICT DO NOTHING for idempotent re-runs.

-- ============================================================================
-- 1. Egyptian Governorates (27)
-- ============================================================================
INSERT INTO governorates (code, name_en, name_ar, region) VALUES
  ('CAI', 'Cairo',           'القاهرة',        'cairo_giza'),
  ('GIZ', 'Giza',            'الجيزة',         'cairo_giza'),
  ('ALX', 'Alexandria',      'الإسكندرية',     'lower_egypt'),
  ('QAL', 'Qalyubia',        'القليوبية',       'lower_egypt'),
  ('SHR', 'Sharqia',         'الشرقية',         'lower_egypt'),
  ('DAK', 'Dakahlia',        'الدقهلية',        'lower_egypt'),
  ('GHR', 'Gharbia',         'الغربية',         'lower_egypt'),
  ('MNF', 'Monufia',         'المنوفية',        'lower_egypt'),
  ('BHR', 'Beheira',         'البحيرة',         'lower_egypt'),
  ('KFS', 'Kafr El Sheikh',  'كفر الشيخ',       'lower_egypt'),
  ('DMT', 'Damietta',        'دمياط',           'lower_egypt'),
  ('ISM', 'Ismailia',        'الإسماعيلية',     'canal'),
  ('PTS', 'Port Said',       'بورسعيد',         'canal'),
  ('SUZ', 'Suez',            'السويس',          'canal'),
  ('FYM', 'Faiyum',          'الفيوم',          'upper_egypt'),
  ('BNS', 'Beni Suef',       'بني سويف',        'upper_egypt'),
  ('MNA', 'Minya',           'المنيا',          'upper_egypt'),
  ('AST', 'Asyut',           'أسيوط',           'upper_egypt'),
  ('SHG', 'Sohag',           'سوهاج',           'upper_egypt'),
  ('QNA', 'Qena',            'قنا',             'upper_egypt'),
  ('LXR', 'Luxor',           'الأقصر',          'upper_egypt'),
  ('ASW', 'Aswan',           'أسوان',           'upper_egypt'),
  ('RDS', 'Red Sea',         'البحر الأحمر',     'frontier'),
  ('NVL', 'New Valley',      'الوادي الجديد',   'frontier'),
  ('MTR', 'Matrouh',         'مطروح',           'frontier'),
  ('NSN', 'North Sinai',     'شمال سيناء',      'frontier'),
  ('SSN', 'South Sinai',     'جنوب سيناء',      'frontier')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 2. System Settings Defaults (per tenant)
--    Replace __TENANT_ID__ with subquery from tenants table.
--    14% VAT, Egyptian weekend (Fri+Sat), Cairo timezone, AI routing config.
-- ============================================================================
INSERT INTO system_settings (tenant_id, category, key, value, description)
SELECT t.id, vals.category, vals.key, vals.value::jsonb, vals.description
FROM tenants t
CROSS JOIN (VALUES
  -- Quoting
  ('quoting', 'quote_expiry_minutes',            '15',      'Live quote validity window'),
  ('quoting', 'quote_default_validity_days',     '30',      'Formal quote validity'),
  ('quoting', 'sla_quote_response_hours',        '4',       'SLA: max hours to respond to RFQ'),
  ('quoting', 'require_approval_above',          '500000',  'EGP threshold for manager approval'),
  ('quoting', 'max_discount_percent_sales_rep',  '5',       'Max rep discount without approval'),
  ('quoting', 'max_discount_percent_manager',    '15',      'Max manager discount without director'),
  -- Credit
  ('credit', 'credit_hold_threshold',            '0.5',     'Overdue/limit ratio for credit hold'),
  ('credit', 'auto_hold_days_overdue',           '46',      'Days overdue before auto hold'),
  ('credit', 'auto_suspend_days_overdue',        '61',      'Days overdue before Tier 5 suspension'),
  ('credit', 'collections_escalation_days',      '90',      'Days before collections escalation'),
  -- Finance (14% VAT — Egyptian law, non-negotiable)
  ('finance', 'default_tax_rate',                '0.14',    'Egyptian VAT rate (14%)'),
  ('finance', 'withholding_tax_goods_rate',      '0.01',    'Withholding on goods (1%)'),
  ('finance', 'withholding_tax_services_rate',   '0.05',    'Withholding on services (5%)'),
  ('finance', 'bounced_check_penalty_egp',       '5000',    'Fee for bounced cheques'),
  -- Delivery (Cairo truck ban, Friday blackout)
  ('delivery', 'ramadan_mode',                   'false',   'Enable Ramadan working hours'),
  ('delivery', 'cairo_truck_ban_enabled',        'true',    '>5-ton truck ban (12AM-6AM only)'),
  ('delivery', 'friday_jumah_blackout_start',    '"11:30"', 'Friday prayer blackout start'),
  ('delivery', 'friday_jumah_blackout_end',      '"13:30"', 'Friday prayer blackout end'),
  ('delivery', 'gps_tracking_interval_seconds',  '30',     'GPS ping interval'),
  -- SLA
  ('sla', 'first_response_hours_critical',       '1',       'Critical ticket response SLA'),
  ('sla', 'resolution_hours_critical',           '4',       'Critical ticket resolution SLA'),
  -- Procurement
  ('procurement', 'exchange_rate_variance_threshold', '5',  'Percentage threshold for exchange rate variance between quote and PO'),
  -- AI routing config (4-tier architecture)
  ('ai', 'routing_config', '{"portal_chat":{"primary":"claude-sonnet","fallback_1":"groq-qwen3-32b","fallback_2":"glm-4-flash","timeout_ms":5000},"ceo_analytics":{"primary":"claude-sonnet","fallback_1":"groq-qwen3-32b","timeout_ms":8000},"intent_classification":{"primary":"glm-4-flash","fallback_1":"groq-qwen3-32b","timeout_ms":2000},"ocr":{"primary":"mistral-ocr","fallback_1":"claude-vision","timeout_ms":15000}}', 'AI provider routing with fallback chain per use case'),
  -- General (Egyptian locale)
  ('general', 'timezone',     '"Africa/Cairo"',          'Tenant timezone'),
  ('general', 'locale',       '"ar-EG"',                 'Default locale'),
  ('general', 'weekend_days', '["friday","saturday"]',   'Egyptian weekend')
) AS vals(category, key, value, description)
ON CONFLICT (tenant_id, category, key) DO NOTHING;

-- ============================================================================
-- 3. Sequence Counters (13 types per tenant)
--    For document numbering: SO-2026-00001, QT-2026-00001, etc.
-- ============================================================================
INSERT INTO sequence_counters (tenant_id, entity_type, prefix, current_value, year)
SELECT id,
       unnest(ARRAY['order', 'quote', 'quote_request', 'invoice', 'proforma_invoice', 'payment', 'delivery', 'supplier_po', 'supplier_inquiry', 'credit_note', 'return', 'ticket', 'coded_delivery']),
       unnest(ARRAY['SO', 'QT', 'RFQ', 'INV', 'PI', 'PMT', 'DEL', 'PO', 'INQ', 'CN', 'RET', 'TKT', 'HQ']),
       0,
       EXTRACT(YEAR FROM NOW())::INTEGER
FROM tenants
ON CONFLICT (tenant_id, entity_type, COALESCE(year, 0)) DO NOTHING;

-- ============================================================================
-- 4. Delivery Zones (10 zones per tenant — Cairo-area + regional)
--    Prices in EGP. Greater Cairo is primary market.
-- ============================================================================
INSERT INTO delivery_zones (tenant_id, zone_name, zone_name_ar, min_distance_km, max_distance_km, base_price, price_per_km, free_delivery_threshold, surcharge_moffett, surcharge_boom, surcharge_night, is_active)
SELECT t.id, vals.zone_name, vals.zone_name_ar, vals.min_km, vals.max_km, vals.base, vals.per_km, vals.free_threshold, vals.moffett, vals.boom, vals.night, true
FROM tenants t
CROSS JOIN (VALUES
  ('Cairo Inner',      'القاهرة الداخلية',    0,    15,  150.00, 10.00, 50000.00,  500.00,  750.00,  300.00),
  ('Cairo Outer',      'القاهرة الخارجية',   15,    35,  250.00, 12.00, 75000.00,  500.00,  750.00,  400.00),
  ('Giza',             'الجيزة',              0,    25,  200.00, 11.00, 60000.00,  500.00,  750.00,  350.00),
  ('6th October City', 'مدينة ٦ أكتوبر',     25,    45,  350.00, 14.00, 100000.00, 600.00,  850.00,  500.00),
  ('New Cairo',        'القاهرة الجديدة',     20,    40,  300.00, 13.00, 80000.00,  550.00,  800.00,  450.00),
  ('10th Ramadan',     'العاشر من رمضان',     40,    70,  500.00, 15.00, 120000.00, 650.00,  900.00,  600.00),
  ('Qalyubia',         'القليوبية',           15,    50,  350.00, 13.00, 90000.00,  550.00,  800.00,  450.00),
  ('Alexandria',       'الإسكندرية',         180,   220, 1500.00,  8.00, 200000.00, 800.00, 1200.00,  800.00),
  ('Delta Region',     'منطقة الدلتا',        80,   160, 1000.00,  9.00, 150000.00, 700.00, 1000.00,  700.00),
  ('Upper Egypt',      'صعيد مصر',           300,   800, 3000.00,  6.00, 300000.00, 1000.00, 1500.00, 1000.00)
) AS vals(zone_name, zone_name_ar, min_km, max_km, base, per_km, free_threshold, moffett, boom, night)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. Role Permissions — SKIP
--    Phase 2 migration 006 already seeded 359 role-permission rows.
--    DO NOT re-seed here. Use ON CONFLICT DO NOTHING if adding new permissions.
-- ============================================================================

-- ============================================================================
-- Verification queries:
-- SELECT count(*) FROM governorates;                  -- Expected: 27
-- SELECT count(*) FROM system_settings;               -- Expected: >= 25 per tenant
-- SELECT count(*) FROM sequence_counters;             -- Expected: 13 per tenant
-- SELECT count(*) FROM delivery_zones;                -- Expected: 10 per tenant
-- SELECT value FROM system_settings WHERE key = 'default_tax_rate';  -- Expected: 0.14
-- SELECT value FROM system_settings WHERE key = 'weekend_days';      -- Expected: ["friday","saturday"]
-- ============================================================================
