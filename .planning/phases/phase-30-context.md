# Phase 30: AI Pipeline

## Goal
AI routing is operational across all surfaces: portal chat, CEO RAG, supplier catalog OCR, and internal assistant.

## Dependencies
- Phase 8 (Portal AI Chat)
- Phase 12 (Supplier Portal -- catalog upload)
- Phase 22 (Remaining Internal Modules -- AI assistant)
- Phase 23 (CEO Command Center -- dual AI)

## Requirements

- **INTG-05**: AI pipeline: Cloudflare AI Gateway routing (GLM -> Groq -> Claude), Mistral OCR for catalogs, pgvector embeddings for RAG, prompt templates per surface

## Success Criteria
1. Cloudflare AI Gateway routes requests through the 4-tier pipeline (GLM classifier -> Groq fast chat -> Mistral OCR -> Claude reasoning)
2. Supplier catalog PDFs parse via Mistral OCR with confidence scores per extracted field
3. CEO RAG queries return relevant results from pgvector embeddings with hybrid search
4. Prompt templates load per-surface (portal, CEO, internal, supplier) with appropriate context and safety guardrails

## What to Build
From GSD.md: Cloudflare AI Gateway routing (GLM -> Groq -> Claude), Mistral OCR for supplier catalogs, pgvector embeddings for CEO RAG, prompt templates per surface.

## Spec References

### 4-Tier AI Architecture (from RESEARCH.md)

```
User query -> GLM-4.7-Flash classifies intent (free, <50ms on CF Workers AI)
  |-- Simple lookup -> GLM handles directly (free)
  |-- Chat / Arabic -> Groq Qwen3 32B ($0.001/query, 662 tok/sec)
  |-- Complex reasoning -> Claude Sonnet ($0.008/query)
  |-- Vision / PDF parsing -> Mistral OCR + Groq structuring ($0.001-0.003/page)
  |-- Groq rate-limited -> fallback to Claude
All routed through Cloudflare AI Gateway (caching, rate limiting, analytics, fallback)
```

| Tier | Provider | Cost/Query | Use For |
|------|----------|-----------|---------|
| **Free** | GLM-4.7-Flash (Cloudflare Workers AI) | ~$0.0003 | Intent classification, simple lookups, driver briefings |
| **Fast** | Groq (Qwen3 32B) | ~$0.001 | Customer chatbot, employee assistant, Arabic chat, data structuring |
| **OCR** | Mistral OCR | ~$0.001-0.003/page | Supplier catalog text/table extraction (30-90x cheaper than Claude vision) |
| **Premium** | Claude (Haiku/Sonnet) | ~$0.003-0.008 | Complex reasoning, CEO analytics, vision fallback, project estimation |

**Estimated AI cost: ~$61/month** (50 users, 20 queries/day) vs $100-240 all-Claude.

### AI Routing Config (from BACKEND.md)

| Use Case | Primary | Fallback 1 | Fallback 2 | Timeout |
|---|---|---|---|---|
| `portal_chat` | claude-sonnet | groq-qwen3-32b | glm-4-flash | 5000ms |
| `ceo_analytics` | claude-sonnet | groq-qwen3-32b | -- | 8000ms |
| `intent_classification` | glm-4-flash | groq-qwen3-32b | -- | 2000ms |
| `ocr` | mistral-ocr | claude-vision | -- | 15000ms |

**Stored in system_settings as JSON:**
```json
{
  "portal_chat": {"primary": "claude-sonnet", "fallback_1": "groq-qwen3-32b", "fallback_2": "glm-4-flash", "timeout_ms": 5000},
  "ceo_analytics": {"primary": "claude-sonnet", "fallback_1": "groq-qwen3-32b", "timeout_ms": 8000},
  "intent_classification": {"primary": "glm-4-flash", "fallback_1": "groq-qwen3-32b", "timeout_ms": 2000},
  "ocr": {"primary": "mistral-ocr", "fallback_1": "claude-vision", "timeout_ms": 15000}
}
```

### AI Features by Surface (from RESEARCH.md)

| Surface | AI Feature | Pattern |
|---------|-----------|---------|
| Website | Chatbot (guided discovery + FAQ RAG) | Free tier (GLM) + Fast tier (Groq) |
| Internal | Database assistant (order lookup, inventory) | Fast tier (Groq) + Premium tier (Claude) for complex |
| Customer Portal | NL material list building + quote request drafting | Fast tier (Groq) + tool use (draft-review-confirm) |
| Supplier Portal | Catalog parsing, 3-way matching, reorder suggestions | OCR tier (Mistral) + Fast tier (Groq structuring) |
| Driver App | AI site briefings, voice commands | Free tier (GLM context injection) |
| CEO App | Analytics AI + RAG AI | Premium tier (Claude) + pre-computed metrics + pgvector |

### AI Tables (from BACKEND.md)

```sql
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  conversation_type TEXT NOT NULL, -- 'product_search','order_help','analytics','general'
  title TEXT,
  context_type TEXT, -- 'order','quote','invoice', etc.
  context_id UUID,
  status TEXT DEFAULT 'active',
  model_used TEXT,
  total_tokens INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user','assistant','system','tool'
  content TEXT NOT NULL,
  tool_calls JSONB,
  tool_results JSONB,
  tokens_used INTEGER,
  model TEXT,
  latency_ms INTEGER,
  user_rating INTEGER, -- 1-5 thumbs
  user_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ai_request_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  use_case TEXT NOT NULL, -- 'portal_chat', 'ceo_analytics', 'intent_classification', 'ocr'
  provider TEXT NOT NULL, -- 'claude-sonnet', 'groq-qwen3-32b', 'glm-4-flash', 'mistral-ocr'
  model TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  latency_ms INTEGER NOT NULL,
  fallback_used BOOLEAN DEFAULT FALSE,
  fallback_depth INTEGER DEFAULT 0, -- 0 = primary, 1 = fallback_1, 2 = fallback_2
  error_message TEXT,
  error_code TEXT, -- 'timeout', 'rate_limit', '500', 'network'
  token_count INTEGER,
  input_tokens INTEGER,
  output_tokens INTEGER,
  conversation_id UUID REFERENCES ai_conversations(id),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Embedding Tables (from BACKEND.md)

```sql
CREATE TABLE document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  source_type TEXT NOT NULL, -- 'spec_sheet','manual','policy','faq'
  source_id TEXT,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  title TEXT,
  category TEXT,
  metadata JSONB DEFAULT '{}',
  embedding vector(1536) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  product_id UUID NOT NULL REFERENCES products(id),
  combined_text TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  product_updated_at TIMESTAMPTZ,
  embedding_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE business_data_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  data_type TEXT NOT NULL, -- 'sales_summary','supplier_perf','customer_analysis'
  data_id UUID,
  content TEXT NOT NULL,
  time_period TEXT, -- '2026-Q1', '2026-03', etc.
  metadata JSONB DEFAULT '{}',
  embedding vector(1536) NOT NULL,
  data_as_of TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**HNSW Indexes:**
```sql
CREATE INDEX idx_document_embeddings_hnsw ON document_embeddings USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX idx_product_embeddings_hnsw ON product_embeddings USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX idx_business_embeddings_hnsw ON business_data_embeddings USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
```

### Prompt Template Structure (per Surface)

Each AI surface needs a structured prompt template with these components:

| Surface | System Prompt Focus | Context Injection | Safety Guardrails |
|---------|-------------------|-------------------|-------------------|
| **Portal Chat** | "You are a building materials assistant for HyperQuote Egypt." | Customer profile, order history, product catalog (via RAG) | Never reveal supplier costs, margins, or internal pricing. Never auto-submit. Draft-review-confirm. |
| **CEO Analytics** | "You are a business analytics assistant for the CEO of a building materials distributor." | Pre-computed metrics library, materialized view data, time period | Never expose raw SQL. Citations mandatory. Read-only DB. |
| **CEO RAG** | "You are a document intelligence assistant with access to company documents." | pgvector search results (top-k chunks with source metadata) | Citations mandatory ("Based on [source] dated [date]"). Never fabricate document references. |
| **Internal Assistant** | "You are an operations assistant for HyperQuote internal staff." | User role + permissions, relevant entity context (order/quote/customer) | Role-aware capabilities (respect same permissions as UI). Read-only DB for queries. |
| **Supplier Portal** | "You are a catalog data extraction assistant." | Uploaded document pages, existing product schema | Confidence scores on every extracted field. Never auto-approve extractions. |
| **Driver App** | "You are a delivery briefing assistant." | Today's route, stop details, site access notes, weather | Concise responses only. No complex analysis. Arabic-first. |

**Template storage:** `system_settings` table (category: `ai`, key: `prompt_template_{surface}`) or versioned files in the codebase. Prompt templates should NOT be hardcoded in application code.

### Safety Patterns (from RESEARCH.md)

- AI never constructs raw SQL (parameterized queries only)
- Read-only database connection for AI queries
- Draft-review-confirm for all mutations
- Capability tiers per user role
- Full audit log of every AI query and action
- Prompt caching (90% cost reduction for repeated schemas)

### AI in Quoting (Internal) (from RESEARCH.md)

- Auto-parse customer RFQs (including PDF/email) -> extract line items
- Recommend which suppliers to contact per line item
- Predict expected prices from historical data
- Auto-calculate optimal margins per deal
- Help customers build material lists from project descriptions

### CEO Dual AI (from RESEARCH.md)

**1. Analytics AI (Text-to-Data):**
- Pre-computed metrics library (50-100 parameterized queries) -- RECOMMENDED
- LLM classifies intent, extracts parameters, runs pre-built query
- Falls back to text-to-SQL against read replica for unusual questions
- Never expose raw SQL generation to CEO

**2. RAG AI (Document Intelligence):**
- Supabase pgvector for embeddings
- Documents: supplier contracts, pricing agreements, policies, SOPs
- Hybrid search (vector + BM25 keyword)
- Citations mandatory ("Based on ABC Supplier contract dated Jan 2025")

**Routing:** LLM classifier auto-routes questions to Analytics AI or RAG AI.

### Cloudflare AI Gateway (from RESEARCH.md)

- Proxies Claude API calls with caching, rate limiting, analytics, and fallback routing.
- All AI requests go through AI Gateway for unified logging and cost tracking.

### Supplier Catalog OCR (from RESEARCH.md)

- Supplier uploads catalog (PDF, Excel, CSV -- any format)
- AI parses and extracts structured product data (Mistral OCR + Groq structuring: ~$0.20-0.60/200-page catalog, 85-95% accuracy)
- Supplier reviews AI extraction in side-by-side UI (original doc + extracted data with confidence scores)
- Submits for HyperQuote review

### Cron Jobs for AI (from BACKEND.md)

| Cron Job | Schedule | Runtime | Purpose |
|---|---|---|---|
| `ai_log_cleanup` | Weekly Sunday 3:00 AM | pg_cron | Delete ai_request_log entries older than 90 days |
| `ai_usage_aggregation` | Daily 11:00 PM | pg_cron | Aggregate AI token usage per user/model |
| `search_index_sync` | Every 5 min (batch) | pg_cron | Batch-update tsvector search indexes (feeds RAG and product search) |

## Business Rules

**AI Rate Limiting:** 30 messages/minute per user for portal chat.

**AI Safety for Customer Portal:**
- AI never reveals supplier costs, margin data, or internal pricing.
- AI never auto-submits anything -- every action needs user confirmation.
- Draft-review-confirm pattern for all mutations.

**AI Safety for Internal:**
- Read-only database connection for AI queries.
- Role-aware capabilities -- AI respects the same permission system as UI.
- Deeper data access than customer AI (can see cost/margin data if user has permission).

**AI Safety for CEO:**
- Pre-computed metrics preferred over raw SQL.
- Text-to-SQL as fallback only, against read replica.
- Never expose raw SQL to CEO.
- Citations mandatory for RAG responses.

**Prompt Caching:** 90% cost reduction for repeated schemas. Use Cloudflare AI Gateway caching.

**Embeddings:** Workers AI bge-m3 for multilingual Arabic+English embeddings.

> **CRITICAL: Vector Dimension Mismatch.** Workers AI bge-m3 produces **1024-dim** vectors by default, but all embedding tables (`document_embeddings`, `product_embeddings`, `business_data_embeddings`) define columns as `vector(1536)`. **Either change table definitions to `vector(1024)` for bge-m3, or use OpenAI text-embedding-3-small for 1536-dim vectors. Decision required before implementation.** This also affects the HNSW indexes which must match the chosen dimension. STACK-DECISION.md lists "Workers AI bge-m3" as the chosen provider, so `vector(1024)` is likely correct, but the BACKEND.md table DDL must be updated to match.

## Non-Negotiable Rules

1. **Cloudflare AI Gateway** for all AI requests. No direct API calls to Claude/Groq/Mistral.
2. **Cloudflare Workers** for AI orchestration.
3. **@tanstack/ai + @tanstack/ai-react** for streaming. `useChat()` for SSE streaming.
4. **@cloudflare/tanstack-ai** for Workers AI + AI Gateway support.
5. **Bun, NOT npm/yarn/pnpm.**
6. **Draft-review-confirm** for all AI-initiated mutations. AI never auto-submits.

## Known Risks & Gotchas

1. **TanStack AI is 0.x (v0.9.1).** Wrap behind thin abstraction. API may break. AbortController cancellation.
2. **@tanstack/ai-react is 0.x (v0.7.5).** `useChat()` for streaming. Wrap behind abstraction.
3. **@cloudflare/tanstack-ai is 0.x (v0.1.6).** First-party but very early. Monitor stability.
4. **Groq rate limits.** Free tier has aggressive rate limits. Paid tier recommended for production.
5. **GLM-4.7-Flash on Workers AI.** Free but may have latency spikes. Use as classifier only, not for full responses.
6. **Mistral OCR accuracy.** 85-95% for catalog parsing. Side-by-side review UI is mandatory -- never auto-approve AI extractions.
7. **pgvector HNSW index build time.** Large document sets may take time to index. Build indexes CONCURRENTLY.
8. **Embedding dimension mismatch.** Workers AI bge-m3 produces 1024-dim vectors by default. OpenAI produces 1536. Ensure consistency across all embedding tables. Tables currently use `vector(1536)`.
9. **Arabic text in embeddings.** Ensure the embedding model handles Arabic well. Workers AI bge-m3 is multilingual and supports Arabic.

## Tips

- Build the routing/fallback layer first as a standalone module. Test each provider independently.
- Use Cloudflare AI Gateway's built-in caching to reduce costs for repeated queries.
- For CEO RAG: chunk documents at ~500 tokens with 50-token overlap. Include source metadata in each chunk.
- Build a metrics dashboard for AI: requests/day, cost/day, latency p50/p95, fallback rate, error rate.
- Prompt templates should be stored in the database (system_settings) or as versioned files, not hardcoded.
- For supplier catalog OCR: batch pages into groups of 10-20 for parallel processing. Show progress to supplier.
- Test Arabic chat quality with each provider. Groq Qwen3 32B is specifically good for Arabic.

## Cost Breakdown

| Tier | Provider | Cost/Query | Estimated Monthly (50 users, 20 queries/day) |
|------|----------|-----------|----------------------------------------------|
| Free | GLM-4.7-Flash (Workers AI) | ~$0.0003 | ~$9/mo |
| Fast | Groq (Qwen3 32B) | ~$0.001 | ~$30/mo |
| OCR | Mistral OCR | ~$0.001-0.003/page | Variable (~$5-15/mo depending on catalog volume) |
| Premium | Claude (Haiku/Sonnet) | ~$0.003-0.008 | ~$12-24/mo |
| **Total** | | | **~$61/mo** (vs $100-240 all-Claude) |

Assumes mixed routing: ~60% free tier, ~25% fast tier, ~10% premium tier, ~5% OCR tier.
