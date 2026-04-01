-- Migration 021: Support, HR/Onboarding, AI/Search, System Tables
-- 25 tables + RLS policies + pgvector HNSW indexes + unit_translations seed
-- Tables ordered for FK dependencies

-- ============================================================================
-- 1. notifications (System — no FK deps on new tables)
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  channel     notification_channel DEFAULT 'in_app',
  priority    notification_priority DEFAULT 'normal',
  title       TEXT NOT NULL,
  body        TEXT,
  entity_type TEXT,
  entity_id   UUID,
  action_url  TEXT,
  is_read     BOOLEAN DEFAULT FALSE,
  read_at     TIMESTAMPTZ,
  is_sent     BOOLEAN DEFAULT FALSE,
  sent_at     TIMESTAMPTZ,
  sent_via    JSONB,
  metadata    JSONB DEFAULT '{}',
  group_key   TEXT,
  is_summary  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. notification_groups (System — no FK deps on new tables)
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_groups (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id),
  group_key          TEXT NOT NULL,
  root_event_type    TEXT NOT NULL,
  root_entity_id     UUID,
  summary_text       TEXT NOT NULL,
  summary_text_ar    TEXT,
  notification_count INTEGER DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, group_key)
);

-- ============================================================================
-- 3. documents (System — no FK deps on new tables)
-- ============================================================================
CREATE TABLE IF NOT EXISTS documents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  entity_type         TEXT NOT NULL,
  entity_id           UUID NOT NULL,
  document_type       document_type NOT NULL,
  name                TEXT NOT NULL,
  file_url            TEXT NOT NULL,
  file_size_bytes     BIGINT,
  mime_type           TEXT,
  is_customer_visible BOOLEAN DEFAULT FALSE,
  is_supplier_visible BOOLEAN DEFAULT FALSE,
  uploaded_by         UUID REFERENCES auth.users(id),
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. system_settings (System — no FK deps on new tables)
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  category    TEXT NOT NULL,
  key         TEXT NOT NULL,
  value       JSONB NOT NULL,
  description TEXT,
  updated_by  UUID REFERENCES auth.users(id),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, category, key)
);

-- ============================================================================
-- 5. sequence_counters (System — no FK deps on new tables)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sequence_counters (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  entity_type   TEXT NOT NULL,
  prefix        TEXT NOT NULL,
  current_value BIGINT DEFAULT 0,
  year          INTEGER
);

-- COALESCE-based uniqueness requires CREATE UNIQUE INDEX (PostgreSQL constraint limitation)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sequence_counters_unique
  ON sequence_counters (tenant_id, entity_type, COALESCE(year, 0));

-- ============================================================================
-- 6. state_history (System — no FK deps on new tables)
-- ============================================================================
CREATE TABLE IF NOT EXISTS state_history (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id   UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  from_state  TEXT,
  to_state    TEXT NOT NULL,
  changed_by  UUID REFERENCES auth.users(id),
  reason      TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. webhook_events (System — no FK deps on new tables)
-- ============================================================================
CREATE TABLE IF NOT EXISTS webhook_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID,
  source        TEXT NOT NULL,
  event_type    TEXT NOT NULL,
  payload       JSONB NOT NULL,
  status        TEXT DEFAULT 'received',
  processed_at  TIMESTAMPTZ,
  error_message TEXT,
  retry_count   INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 8. weather_alerts (System — no FK deps on new tables)
-- ============================================================================
CREATE TABLE IF NOT EXISTS weather_alerts (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES tenants(id),
  governorate            TEXT NOT NULL,
  alert_date             DATE NOT NULL,
  wind_speed_kmh         DECIMAL(5,1),
  wind_gust_kmh          DECIMAL(5,1),
  visibility_km          DECIMAL(5,1),
  temperature_c          DECIMAL(4,1),
  humidity_percent       DECIMAL(4,1),
  condition              TEXT,
  severity               TEXT DEFAULT 'normal',
  sheet_delivery_blocked BOOLEAN DEFAULT FALSE,
  outdoor_ops_paused     BOOLEAN DEFAULT FALSE,
  raw_api_response       JSONB,
  fetched_at             TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, governorate, alert_date)
);

-- ============================================================================
-- 9. carrier_routing_config (System — no FK deps on new tables)
-- ============================================================================
CREATE TABLE IF NOT EXISTS carrier_routing_config (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES tenants(id),
  prefix                 TEXT NOT NULL,
  carrier_name           TEXT NOT NULL,
  carrier_name_ar        TEXT,
  whatsapp_priority      INTEGER DEFAULT 1,
  sms_priority           INTEGER DEFAULT 2,
  voice_priority         INTEGER DEFAULT 3,
  whatsapp_timeout_ms    INTEGER DEFAULT 30000,
  sms_timeout_ms         INTEGER DEFAULT 30000,
  sms_provider           TEXT DEFAULT 'twilio',
  sms_delivery_rate      DECIMAL(5,2),
  whatsapp_delivery_rate DECIMAL(5,2),
  notes                  TEXT,
  is_active              BOOLEAN DEFAULT TRUE,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, prefix)
);

-- ============================================================================
-- 10. otp_delivery_log (System — no FK deps on new tables)
-- ============================================================================
CREATE TABLE IF NOT EXISTS otp_delivery_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  phone_number        TEXT NOT NULL,
  detected_carrier    TEXT,
  detected_prefix     TEXT,
  otp_purpose         TEXT NOT NULL,
  attempt_number      INTEGER NOT NULL DEFAULT 1,
  channel_used        TEXT NOT NULL,
  provider_used       TEXT,
  sent_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at        TIMESTAMPTZ,
  read_at             TIMESTAMPTZ,
  verified_at         TIMESTAMPTZ,
  failed_at           TIMESTAMPTZ,
  failure_reason      TEXT,
  latency_ms          INTEGER,
  provider_message_id TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 11. ceo_digests (System — no FK deps on new tables)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ceo_digests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id),
  digest_type  TEXT NOT NULL CHECK (digest_type IN ('daily', 'weekly')),
  digest_date  DATE NOT NULL,
  content      JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_narrative TEXT,
  generated_at TIMESTAMPTZ,
  sent_at      TIMESTAMPTZ,
  sent_via     TEXT[],
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, digest_type, digest_date)
);

-- ============================================================================
-- 12. tickets (Support — FKs to existing tables only)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tickets (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES tenants(id),
  ticket_number          TEXT NOT NULL,
  requester_type         TEXT NOT NULL,
  requester_user_id      UUID REFERENCES auth.users(id),
  customer_id            UUID REFERENCES customers(id),
  supplier_id            UUID REFERENCES suppliers(id),
  category               ticket_category NOT NULL,
  subcategory            TEXT,
  subject                TEXT NOT NULL,
  description            TEXT,
  priority               ticket_priority DEFAULT 'medium',
  status                 ticket_status DEFAULT 'new',
  order_id               UUID REFERENCES orders(id),
  delivery_id            UUID REFERENCES deliveries(id),
  invoice_id             UUID REFERENCES invoices(id),
  quote_id               UUID REFERENCES quotes(id),
  assigned_to            UUID REFERENCES employees(id),
  assigned_team          TEXT,
  sla_first_response_due TIMESTAMPTZ,
  sla_resolution_due     TIMESTAMPTZ,
  first_response_at      TIMESTAMPTZ,
  resolved_at            TIMESTAMPTZ,
  sla_breached           BOOLEAN DEFAULT FALSE,
  escalated              BOOLEAN DEFAULT FALSE,
  escalated_to           UUID REFERENCES employees(id),
  escalated_at           TIMESTAMPTZ,
  escalation_reason      TEXT,
  resolution_notes       TEXT,
  resolution_type        TEXT,
  source                 TEXT DEFAULT 'portal',
  tags                   TEXT[],
  closed_at              TIMESTAMPTZ,
  reopened_at            TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, ticket_number)
);

-- ============================================================================
-- 13. ticket_messages (Support — FK to tickets)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ticket_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id       UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id       UUID REFERENCES auth.users(id),
  author_type     TEXT NOT NULL,
  author_name     TEXT,
  message         TEXT NOT NULL,
  attachment_urls TEXT[],
  is_internal     BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 14. onboarding_sequences (HR — no FK deps on new tables)
-- ============================================================================
CREATE TABLE IF NOT EXISTS onboarding_sequences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  name        TEXT NOT NULL,
  description TEXT,
  target_type TEXT NOT NULL,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);

-- ============================================================================
-- 15. onboarding_steps (HR — FK to onboarding_sequences)
-- ============================================================================
CREATE TABLE IF NOT EXISTS onboarding_steps (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id    UUID NOT NULL REFERENCES onboarding_sequences(id) ON DELETE CASCADE,
  tenant_id      UUID NOT NULL REFERENCES tenants(id),
  step_number    INTEGER NOT NULL,
  name           TEXT NOT NULL,
  delay_minutes  INTEGER NOT NULL DEFAULT 0,
  channel        TEXT NOT NULL,
  action_type    TEXT NOT NULL,
  template_key   TEXT,
  content_config JSONB,
  assigned_role  app_role,
  skip_if        JSONB,
  is_active      BOOLEAN DEFAULT TRUE,
  sort_order     INTEGER NOT NULL,
  UNIQUE (sequence_id, step_number)
);

-- ============================================================================
-- 16. customer_onboarding_progress (HR — FK to notifications, onboarding_sequences, onboarding_steps)
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_onboarding_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  customer_id     UUID NOT NULL REFERENCES customers(id),
  sequence_id     UUID NOT NULL REFERENCES onboarding_sequences(id),
  step_id         UUID NOT NULL REFERENCES onboarding_steps(id),
  status          TEXT NOT NULL DEFAULT 'pending',
  scheduled_at    TIMESTAMPTZ NOT NULL,
  sent_at         TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  skipped_at      TIMESTAMPTZ,
  skip_reason     TEXT,
  failure_reason  TEXT,
  assigned_to     UUID REFERENCES employees(id),
  notification_id UUID REFERENCES notifications(id),
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, customer_id, step_id)
);

-- ============================================================================
-- 17. governorates (HR — standalone, SMALLINT GENERATED ALWAYS AS IDENTITY)
-- ============================================================================
CREATE TABLE IF NOT EXISTS governorates (
  id        SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  code      TEXT UNIQUE NOT NULL,
  name_en   TEXT NOT NULL,
  name_ar   TEXT NOT NULL,
  region    TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE
);

-- ============================================================================
-- 18. ai_conversations (AI — FK to existing tables)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_conversations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  user_id           UUID NOT NULL REFERENCES auth.users(id),
  conversation_type TEXT NOT NULL,
  title             TEXT,
  context_type      TEXT,
  context_id        UUID,
  status            TEXT DEFAULT 'active',
  model_used        TEXT,
  total_tokens      INTEGER DEFAULT 0,
  total_messages    INTEGER DEFAULT 0,
  last_message_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 19. ai_messages (AI — FK to ai_conversations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,
  content         TEXT NOT NULL,
  tool_calls      JSONB,
  tool_results    JSONB,
  tokens_used     INTEGER,
  model           TEXT,
  latency_ms      INTEGER,
  user_rating     INTEGER,
  user_feedback   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 20. ai_request_log (AI — FK to ai_conversations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_request_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  use_case        TEXT NOT NULL,
  provider        TEXT NOT NULL,
  model           TEXT NOT NULL,
  success         BOOLEAN NOT NULL,
  latency_ms      INTEGER NOT NULL,
  fallback_used   BOOLEAN DEFAULT FALSE,
  fallback_depth  INTEGER DEFAULT 0,
  error_message   TEXT,
  error_code      TEXT,
  token_count     INTEGER,
  input_tokens    INTEGER,
  output_tokens   INTEGER,
  conversation_id UUID REFERENCES ai_conversations(id),
  user_id         UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 21. document_embeddings (AI — pgvector 1536)
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_embeddings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  source_type TEXT NOT NULL,
  source_id   TEXT,
  chunk_index INTEGER NOT NULL,
  chunk_text  TEXT NOT NULL,
  title       TEXT,
  category    TEXT,
  metadata    JSONB DEFAULT '{}',
  embedding   extensions.vector(1536) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 22. product_embeddings (AI — pgvector 1536, FK to products)
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_embeddings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id),
  product_id           UUID NOT NULL REFERENCES products(id),
  combined_text        TEXT NOT NULL,
  embedding            extensions.vector(1536) NOT NULL,
  product_updated_at   TIMESTAMPTZ,
  embedding_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 23. business_data_embeddings (AI — pgvector 1536)
-- ============================================================================
CREATE TABLE IF NOT EXISTS business_data_embeddings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  data_type   TEXT NOT NULL,
  data_id     UUID,
  content     TEXT NOT NULL,
  time_period TEXT,
  metadata    JSONB DEFAULT '{}',
  embedding   extensions.vector(1536) NOT NULL,
  data_as_of  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 24. search_index (AI — with GIN + tenant + supplier partial indexes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS search_index (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type        TEXT NOT NULL,
  entity_id          UUID NOT NULL,
  entity_tenant_id   UUID NOT NULL REFERENCES tenants(id),
  entity_customer_id UUID,
  entity_supplier_id UUID,
  search_vector      TSVECTOR NOT NULL,
  display_title      TEXT NOT NULL,
  display_subtitle   TEXT,
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_search_index_vector ON search_index USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_search_index_tenant ON search_index (entity_tenant_id);
CREATE INDEX IF NOT EXISTS idx_search_index_supplier ON search_index (entity_supplier_id) WHERE entity_supplier_id IS NOT NULL;

-- ============================================================================
-- 25. unit_translations (Reference data — CREATE TABLE + INSERT of 29 rows)
-- ============================================================================
CREATE TABLE IF NOT EXISTS unit_translations (
  unit    unit_of_measure PRIMARY KEY,
  en_name TEXT NOT NULL,
  en_abbr TEXT NOT NULL,
  ar_name TEXT NOT NULL,
  ar_abbr TEXT NOT NULL
);

INSERT INTO unit_translations (unit, en_name, en_abbr, ar_name, ar_abbr) VALUES
  ('kg',          'kilogram',      'kg',   'كيلو جرام',    'كجم'),
  ('g',           'gram',          'g',    'جرام',         'جم'),
  ('ton',         'ton',           'ton',  'طن',           'طن'),
  ('meter',       'meter',         'm',    'متر',          'م'),
  ('centimeter',  'centimeter',    'cm',   'سنتيمتر',      'سم'),
  ('millimeter',  'millimeter',    'mm',   'ميليمتر',       'مم'),
  ('square_meter','square meter',  'm²',   'متر مربع',     'م²'),
  ('cubic_meter', 'cubic meter',   'm³',   'متر مكعب',     'م³'),
  ('liter',       'liter',         'L',    'لتر',          'ل'),
  ('piece',       'piece',         'pc',   'قطعة',         'قطعة'),
  ('unit',        'unit',          'unit', 'وحدة',         'وحدة'),
  ('bag',         'bag',           'bag',  'كيس',          'كيس'),
  ('bag_50kg',    '50kg bag',      'bag',  'كيس ٥٠ كجم',   'كيس'),
  ('bag_25kg',    '25kg bag',      'bag',  'كيس ٢٥ كجم',   'كيس'),
  ('pallet',      'pallet',        'plt',  'لوح تحميل',    'لوح'),
  ('bundle',      'bundle',        'bdl',  'حزمة',         'حزمة'),
  ('roll',        'roll',          'roll', 'لفة',          'لفة'),
  ('sheet',       'sheet',         'sht',  'لوح',          'لوح'),
  ('panel',       'panel',         'pnl',  'لوحة',         'لوحة'),
  ('box',         'box',           'box',  'صندوق',        'صندوق'),
  ('carton',      'carton',        'ctn',  'كرتونة',       'كرتونة'),
  ('drum',        'drum',          'drm',  'برميل',        'برميل'),
  ('coil',        'coil',          'coil', 'لفة سلك',      'لفة'),
  ('bar',         'bar',           'bar',  'قضيب',         'قضيب'),
  ('length',      'length',        'len',  'طول',          'طول'),
  ('trip',        'trip',          'trip', 'رحلة',         'رحلة'),
  ('load',        'load',          'load', 'حمولة',        'حمولة'),
  ('set',         'set',           'set',  'طقم',          'طقم'),
  ('pair',        'pair',          'pair', 'زوج',          'زوج')
ON CONFLICT (unit) DO NOTHING;


-- ============================================================================
-- RLS: ENABLE + FORCE on ALL 25 tables
-- ============================================================================

-- 1. notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

CREATE POLICY notifications_own_select ON notifications
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE POLICY notifications_own_update ON notifications
  FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE POLICY notifications_internal_insert ON notifications
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

-- 2. notification_groups
ALTER TABLE notification_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_groups FORCE ROW LEVEL SECURITY;

CREATE POLICY notification_groups_internal_all ON notification_groups
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

-- 3. documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;

CREATE POLICY documents_internal_all ON documents
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY documents_external_select ON documents
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user())
    AND (
      (entity_type = 'customer' AND entity_id = (SELECT current_customer_id()))
      OR (entity_type = 'supplier' AND entity_id = (SELECT current_supplier_id()))
      OR (entity_type = 'driver' AND entity_id = (SELECT current_driver_id()))
    )
  );

-- 4. system_settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings FORCE ROW LEVEL SECURITY;

CREATE POLICY system_settings_internal_all ON system_settings
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY system_settings_external_select ON system_settings
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT current_tenant_id()));

-- 5. sequence_counters
ALTER TABLE sequence_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_counters FORCE ROW LEVEL SECURITY;

CREATE POLICY sequence_counters_internal_all ON sequence_counters
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

-- 6. state_history
ALTER TABLE state_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_history FORCE ROW LEVEL SECURITY;

CREATE POLICY state_history_internal_all ON state_history
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

-- 7. webhook_events (tenant_id is nullable — internal-only access)
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events FORCE ROW LEVEL SECURITY;

CREATE POLICY webhook_events_internal_all ON webhook_events
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()))
  WITH CHECK ((SELECT is_internal_user()));

-- 8. weather_alerts
ALTER TABLE weather_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_alerts FORCE ROW LEVEL SECURITY;

CREATE POLICY weather_alerts_internal_all ON weather_alerts
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

-- 9. carrier_routing_config
ALTER TABLE carrier_routing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE carrier_routing_config FORCE ROW LEVEL SECURITY;

CREATE POLICY carrier_routing_config_internal_all ON carrier_routing_config
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

-- 10. otp_delivery_log
ALTER TABLE otp_delivery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_delivery_log FORCE ROW LEVEL SECURITY;

CREATE POLICY otp_delivery_log_internal_all ON otp_delivery_log
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

-- 11. ceo_digests
ALTER TABLE ceo_digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceo_digests FORCE ROW LEVEL SECURITY;

CREATE POLICY ceo_digests_internal_all ON ceo_digests
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

-- 12. tickets
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets FORCE ROW LEVEL SECURITY;

CREATE POLICY tickets_internal_all ON tickets
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

-- IMPORTANT: tickets uses requester_user_id, not created_by (per plan discrepancy note)
CREATE POLICY tickets_external_own ON tickets
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND requester_user_id = (SELECT auth.uid()));

CREATE POLICY tickets_external_insert ON tickets
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_external_user()) AND requester_user_id = (SELECT auth.uid()));

CREATE POLICY tickets_external_update ON tickets
  FOR UPDATE TO authenticated
  USING ((SELECT is_external_user()) AND requester_user_id = (SELECT auth.uid()) AND status NOT IN ('closed', 'resolved'));

-- 13. ticket_messages
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages FORCE ROW LEVEL SECURITY;

CREATE POLICY ticket_messages_internal_all ON ticket_messages
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = ticket_messages.ticket_id
      AND (SELECT is_internal_user())
      AND t.tenant_id = (SELECT current_tenant_id())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = ticket_messages.ticket_id
      AND (SELECT is_internal_user())
      AND t.tenant_id = (SELECT current_tenant_id())
  ));

CREATE POLICY ticket_messages_external_own ON ticket_messages
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user())
    AND NOT is_internal
    AND EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_messages.ticket_id
        AND t.requester_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY ticket_messages_external_insert ON ticket_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT is_external_user())
    AND EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_messages.ticket_id
        AND t.requester_user_id = (SELECT auth.uid())
    )
  );

-- 14. onboarding_sequences
ALTER TABLE onboarding_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_sequences FORCE ROW LEVEL SECURITY;

CREATE POLICY onboarding_sequences_internal_all ON onboarding_sequences
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

-- 15. onboarding_steps
ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_steps FORCE ROW LEVEL SECURITY;

CREATE POLICY onboarding_steps_internal_all ON onboarding_steps
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

-- 16. customer_onboarding_progress
ALTER TABLE customer_onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_onboarding_progress FORCE ROW LEVEL SECURITY;

CREATE POLICY customer_onboarding_progress_internal_all ON customer_onboarding_progress
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

-- 17. governorates (reference data — all authenticated can SELECT)
ALTER TABLE governorates ENABLE ROW LEVEL SECURITY;
ALTER TABLE governorates FORCE ROW LEVEL SECURITY;

CREATE POLICY governorates_select_all ON governorates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY governorates_internal_manage ON governorates
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()))
  WITH CHECK ((SELECT is_internal_user()));

-- 18. ai_conversations (user_id scoped — own conversations)
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations FORCE ROW LEVEL SECURITY;

CREATE POLICY ai_conversations_own ON ai_conversations
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK (user_id = (SELECT auth.uid()) AND tenant_id = (SELECT current_tenant_id()));

-- 19. ai_messages (via conversation ownership EXISTS subquery)
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages FORCE ROW LEVEL SECURITY;

CREATE POLICY ai_messages_own ON ai_messages
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM ai_conversations c
    WHERE c.id = ai_messages.conversation_id
      AND c.user_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM ai_conversations c
    WHERE c.id = ai_messages.conversation_id
      AND c.user_id = (SELECT auth.uid())
  ));

-- 20. ai_request_log (internal select + internal insert)
ALTER TABLE ai_request_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_request_log FORCE ROW LEVEL SECURITY;

CREATE POLICY ai_log_internal_select ON ai_request_log
  FOR SELECT TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY ai_log_internal_insert ON ai_request_log
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT current_tenant_id()));

-- 21. document_embeddings
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings FORCE ROW LEVEL SECURITY;

CREATE POLICY document_embeddings_internal_all ON document_embeddings
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

-- 22. product_embeddings
ALTER TABLE product_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_embeddings FORCE ROW LEVEL SECURITY;

CREATE POLICY product_embeddings_internal_all ON product_embeddings
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

-- 23. business_data_embeddings
ALTER TABLE business_data_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_data_embeddings FORCE ROW LEVEL SECURITY;

CREATE POLICY business_data_embeddings_internal_all ON business_data_embeddings
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

-- 24. search_index (entity_tenant_id NOT tenant_id)
ALTER TABLE search_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_index FORCE ROW LEVEL SECURITY;

CREATE POLICY search_internal_select ON search_index
  FOR SELECT TO authenticated
  USING ((SELECT is_internal_user()) AND entity_tenant_id = (SELECT current_tenant_id()));

CREATE POLICY search_customer_select ON search_index
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user())
    AND (SELECT current_user_type()) = 'customer'
    AND entity_tenant_id = (SELECT current_tenant_id())
    AND entity_customer_id = (SELECT current_customer_id())
  );

CREATE POLICY search_supplier_select ON search_index
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user())
    AND (SELECT current_user_type()) = 'supplier'
    AND entity_tenant_id = (SELECT current_tenant_id())
    AND entity_supplier_id = (SELECT current_supplier_id())
  );

CREATE POLICY search_internal_insert ON search_index
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_internal_user()) AND entity_tenant_id = (SELECT current_tenant_id()));

-- 25. unit_translations (reference data — all authenticated can SELECT)
ALTER TABLE unit_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_translations FORCE ROW LEVEL SECURITY;

CREATE POLICY unit_translations_select_all ON unit_translations
  FOR SELECT TO authenticated USING (true);


-- ============================================================================
-- pgvector HNSW indexes (m=16, ef_construction=64)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_document_embeddings_hnsw ON document_embeddings
  USING hnsw (embedding extensions.vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_product_embeddings_hnsw ON product_embeddings
  USING hnsw (embedding extensions.vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_business_data_embeddings_hnsw ON business_data_embeddings
  USING hnsw (embedding extensions.vector_cosine_ops) WITH (m = 16, ef_construction = 64);


-- ============================================================================
-- Deferred indexes from Phase 13 (noted in 13-05-SUMMARY.md)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_system_settings_tenant_category ON system_settings(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_state_history_entity ON state_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_state_history_tenant ON state_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ceo_digests_tenant_type ON ceo_digests(tenant_id, digest_type);


-- ============================================================================
-- Universal triggers: set_tenant_id (BEFORE INSERT) + updated_at (BEFORE UPDATE)
-- Only apply updated_at to tables that have an updated_at column
-- ============================================================================

-- notifications (has created_at only — no updated_at)
CREATE TRIGGER set_tenant_id_notifications
  BEFORE INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

-- notification_groups (has created_at only — no updated_at)
CREATE TRIGGER set_tenant_id_notification_groups
  BEFORE INSERT ON notification_groups
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

-- documents (has created_at only — no updated_at)
CREATE TRIGGER set_tenant_id_documents
  BEFORE INSERT ON documents
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

-- system_settings (has updated_at)
CREATE TRIGGER set_tenant_id_system_settings
  BEFORE INSERT ON system_settings
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE TRIGGER update_updated_at_system_settings
  BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- sequence_counters (no updated_at)
CREATE TRIGGER set_tenant_id_sequence_counters
  BEFORE INSERT ON sequence_counters
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

-- state_history (no updated_at, tenant_id not FK — still set from JWT)
CREATE TRIGGER set_tenant_id_state_history
  BEFORE INSERT ON state_history
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

-- webhook_events (tenant_id nullable — still set from JWT if available)
CREATE TRIGGER set_tenant_id_webhook_events
  BEFORE INSERT ON webhook_events
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

-- weather_alerts (no updated_at)
CREATE TRIGGER set_tenant_id_weather_alerts
  BEFORE INSERT ON weather_alerts
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

-- carrier_routing_config (has updated_at)
CREATE TRIGGER set_tenant_id_carrier_routing_config
  BEFORE INSERT ON carrier_routing_config
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE TRIGGER update_updated_at_carrier_routing_config
  BEFORE UPDATE ON carrier_routing_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- otp_delivery_log (no updated_at)
CREATE TRIGGER set_tenant_id_otp_delivery_log
  BEFORE INSERT ON otp_delivery_log
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

-- ceo_digests (no updated_at)
CREATE TRIGGER set_tenant_id_ceo_digests
  BEFORE INSERT ON ceo_digests
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

-- tickets (has updated_at)
CREATE TRIGGER set_tenant_id_tickets
  BEFORE INSERT ON tickets
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE TRIGGER update_updated_at_tickets
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ticket_messages (no updated_at)
CREATE TRIGGER set_tenant_id_ticket_messages
  BEFORE INSERT ON ticket_messages
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

-- onboarding_sequences (has updated_at)
CREATE TRIGGER set_tenant_id_onboarding_sequences
  BEFORE INSERT ON onboarding_sequences
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE TRIGGER update_updated_at_onboarding_sequences
  BEFORE UPDATE ON onboarding_sequences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- onboarding_steps (no updated_at)
CREATE TRIGGER set_tenant_id_onboarding_steps
  BEFORE INSERT ON onboarding_steps
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

-- customer_onboarding_progress (has updated_at)
CREATE TRIGGER set_tenant_id_customer_onboarding_progress
  BEFORE INSERT ON customer_onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE TRIGGER update_updated_at_customer_onboarding_progress
  BEFORE UPDATE ON customer_onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- governorates (no tenant_id, no updated_at — skip both triggers)

-- ai_conversations (has updated_at)
CREATE TRIGGER set_tenant_id_ai_conversations
  BEFORE INSERT ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE TRIGGER update_updated_at_ai_conversations
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ai_messages (no tenant_id, no updated_at — skip both triggers)

-- ai_request_log (no updated_at)
CREATE TRIGGER set_tenant_id_ai_request_log
  BEFORE INSERT ON ai_request_log
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

-- document_embeddings (has updated_at)
CREATE TRIGGER set_tenant_id_document_embeddings
  BEFORE INSERT ON document_embeddings
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE TRIGGER update_updated_at_document_embeddings
  BEFORE UPDATE ON document_embeddings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- product_embeddings (no updated_at column — has embedding_updated_at instead)
CREATE TRIGGER set_tenant_id_product_embeddings
  BEFORE INSERT ON product_embeddings
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

-- business_data_embeddings (no updated_at)
CREATE TRIGGER set_tenant_id_business_data_embeddings
  BEFORE INSERT ON business_data_embeddings
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

-- search_index (has updated_at, uses entity_tenant_id not tenant_id)
-- Note: set_tenant_id trigger NOT applied — search_index uses entity_tenant_id which is set explicitly
CREATE TRIGGER update_updated_at_search_index
  BEFORE UPDATE ON search_index
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- unit_translations (no tenant_id, no updated_at — skip both triggers)

-- ticket_messages: set_tenant_id needs special handling (no tenant_id column)
-- Drop the incorrectly created trigger above
DROP TRIGGER IF EXISTS set_tenant_id_ticket_messages ON ticket_messages;
