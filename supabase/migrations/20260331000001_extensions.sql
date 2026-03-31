-- Migration 001: Database Extensions
-- Enable required PostgreSQL extensions for HyperQuote platform

-- UUID generation (gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- Trigram similarity for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

-- Vector embeddings for AI search (1536-dim)
-- Note: extension name is 'vector', not 'pgvector'
CREATE EXTENSION IF NOT EXISTS vector SCHEMA extensions;

-- Scheduled database jobs (quote expiry, AR aging, partition management)
CREATE EXTENSION IF NOT EXISTS pg_cron SCHEMA cron;

-- Automatic audit logging for table changes
-- supa_audit is available on hosted Supabase but may not be in local dev.
-- CASCADE creates the 'audit' schema automatically when available.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'supa_audit') THEN
    CREATE EXTENSION IF NOT EXISTS supa_audit CASCADE;
  ELSE
    RAISE NOTICE 'supa_audit extension not available locally -- will be enabled on hosted Supabase';
  END IF;
END;
$$;
