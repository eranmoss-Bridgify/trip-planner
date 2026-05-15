# TOS-Hub Intelligence Layer — Implementation Document

> How tos-hub sits alongside the Bridgify backend and ETL pipeline.
> Last updated: 2026-05-13

---

## 1. What TOS-Hub Is

TOS-Hub (`tos-hub/integration-hub`) is an Express.js intelligence layer that sits **between** client applications (trip-planner, TOS pages) and the Bridgify production API. It reads from the same PostgreSQL database that the ETL pipeline populates, adds its own tables, and exposes enhanced endpoints.

It does **not** replace the backend or ETL. It wraps them.

```
                    ┌──────────────────────────────┐
                    │  CLIENT APPS                 │
                    │  trip-planner / TOS pages     │
                    └──────────┬───────────────────┘
                               │
              ┌────────────────┼───────────────────┐
              │                │                   │
              ▼                ▼                   │
   ┌─────────────────┐  ┌──────────────────┐      │
   │ BRIDGIFY API    │  │ TOS-HUB          │      │
   │ (backend repo)  │  │ (integration-hub) │      │
   │ Django REST     │  │ Express + pgvector│      │
   │ Port: 443       │  │ Port: 3000        │      │
   │ Raw data        │  │ Deduped, ranked,  │      │
   │                 │  │ semantic search   │      │
   └────────┬────────┘  └────────┬─────────┘      │
            │                    │                 │
            │    ┌───────────────┘                 │
            ▼    ▼                                 │
   ┌──────────────────────────┐                   │
   │ POSTGRESQL               │                   │
   │                          │                   │
   │ attractionsAPI_* (ETL)   │                   │
   │ hub_* (TOS-Hub)          │                   │
   │ order/cart (Backend)     │                   │
   └──────────┬───────────────┘                   │
              │ populated by                      │
              ▼                                   │
   ┌──────────────────────────┐                   │
   │ ETL PIPELINE             │                   │
   │ Airflow DAGs             │                   │
   │ 15 supplier extractors   │                   │
   └──────────────────────────┘
```

---

## 2. What TOS-Hub Adds

| Capability | Without TOS-Hub | With TOS-Hub |
|-----------|----------------|-------------|
| **Deduplication** | Same tour shown 3× (Viator + GYG + Tiqets) | Single best variant selected |
| **Ranking** | Raw API order | 6-factor weighted scoring |
| **Search** | Text matching only | Semantic vectors ("romantic evening" → wine tours) |
| **Categories** | Supplier-specific, inconsistent | Canonical 3-tier taxonomy |
| **POI clustering** | No grouping | Products grouped by landmark |
| **Latency (browse)** | Real-time API call per request | Pre-synced local data |

---

## 3. Database Tables

TOS-Hub adds its own tables to the shared PostgreSQL instance. All tables are prefixed `hub_`. Every query includes `tenant_id` for multi-tenant isolation.

### 3.1 Core Infrastructure

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `hub_tenants` | Tenant registry | id, name, rate_limit_rpm |
| `hub_users` | Dashboard users | id, email, name, tenant_id, role, is_active |
| `hub_credentials_map` | Encrypted Bridgify API credentials | tenant_id, supplier_slug, credentials_encrypted (BYTEA) |
| `hub_transactions` | Booking/cancel audit log | tenant_id, supplier_slug, operation, status |
| `hub_prompts` | Prompt library (15 prompts) | id, category, name, template, variables |
| `hub_escalations` | Issues requiring human review | id, tenant_id, type, status, data |

### 3.2 Inventory & Sync

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `hub_static_inventory` | Pre-synced product catalog (50K cap) | id (UUID), supplier_slug, supplier_raw_ref, type, title, description, latitude, longitude, city, country, category, duration_minutes, price_from, price_currency, rating, review_count, image_urls[], embedding (vector), raw_content (JSONB), is_active, is_event, last_synced_at |
| `hub_sync_jobs` | Sync run tracking | id, supplier_slug, job_type, status (RUNNING\|COMPLETE\|FAILED\|CANCELLED), records_fetched, records_upserted, records_deactivated, records_errored, progress_pct, progress_detail (JSONB) |
| `hub_sync_errors` | Per-record sync failures | job_id, supplier_raw_ref, error_message, raw_data |

### 3.3 Deduplication

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `hub_dedup_pairs` | Computed duplicate pairs | tenant_id, inventory_id_a, inventory_id_b, composite_score, decision, signal_location, signal_name, signal_duration, signal_category |
| `hub_dedup_config` | Per-tenant dedup settings | tenant_id, config (JSONB: strategy, thresholds, uncertain_behavior) |
| `hub_dedup_test_log` | Test-mode dedup results | all signals + score + decision + strategy_applied + agent_reasoning |
| `hub_dedup_gold_pairs` | Labeled ground truth for evaluation | id_a, id_b, band, emb_sim, fuzzy_sim, label, label_source |
| `hub_dedup_eval_runs` | Precision/recall/F1 scores | precision_val, recall_val, f1_val |

### 3.4 Intelligence

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `hub_attractions` | POI clusters (landmarks) | id, name, display_name, city, country, latitude, longitude, category, experience_count, unique_product_count, image_url |
| `hub_global_pois` | Canonical attraction registry | id, name, city, country, lat, lng |
| `hub_supplier_pois` | Maps supplier products → global POIs | global_poi_id, supplier_slug, supplier_raw_ref |
| `hub_canonical_categories` | 3-tier category taxonomy | id, name, parent_id, level |
| `hub_category_mappings` | Supplier category → canonical mapping | supplier_slug, supplier_category, canonical_category_id |
| `hub_ranking_config` | Per-tenant ranking weights | tenant_id, config_json (JSONB), is_active |

### 3.5 Supporting Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `hub_vendor_knowledge` | Bridgify API documentation & quirks | supplier_slug, content (JSONB) |
| `hub_category_knowledge` | Category-level intelligence | category, content |
| `hub_knowledge_events` | Knowledge change log | supplier_slug, event_type, data |
| `hub_webhooks` | Inbound webhook config | partner, secret, endpoint |
| `agent_sessions` | AI agent session state | id, tenant_id, context |

---

## 4. Sync Pipeline

TOS-Hub does **not** integrate with suppliers directly. Bridgify's ETL pipeline already handles all 15 supplier integrations and populates the master catalog (1.2M products). TOS-Hub's only sync job is to pull a curated subset from the **Bridgify API** into `hub_static_inventory` for local intelligence processing.

### 4.1 How It Works

```
Bridgify ETL (15 suppliers → 1.2M products → attractionsAPI_*)
        │
        ▼
Bridgify API (GET /attractions/products/)
        │
        ▼
TOS-Hub Sync (bridgify-experiences.js)
  ├─ Searches 80+ cities × 8 search terms
  ├─ Maps each product to hub_static_inventory schema
  ├─ UPSERT on (supplier_slug, supplier_raw_ref)
  ├─ Soft-deletes products not seen this run
  └─ Tracks progress in hub_sync_jobs
        │
        ▼
hub_static_inventory (50K product cap)
        │
        ▼
Post-Sync Enrichment Pipeline
  1. Build Embeddings (MiniLM-L6-v2 → pgvector)
  2. Precompute Dedup (rules + embeddings + LLM judge)
  3. Cluster Attractions (geo + title → POIs)
  4. Map Categories (supplier raw → canonical taxonomy)
```

### 4.2 Inventory Fields

Every synced record lands in `hub_static_inventory` with:

```
supplier_slug, supplier_raw_ref, type, title, description,
latitude, longitude, city, country, timezone, category,
duration_minutes, price_from, price_currency, rating,
review_count, image_urls[], raw_content (JSONB),
embedding (vector), is_active, is_event, last_synced_at
```

The `supplier_slug` will be `bridgify` for all records synced through Bridgify. The original underlying supplier (viator, gyg, tiqets, etc.) is preserved in `raw_content`.

### 4.3 Post-Sync Enrichment

After sync completes, three passes run sequentially:

1. **Build Embeddings** (`build-embeddings.js`) — described in Section 5
2. **Precompute Dedup** (`dedup-precompute.js`) — described in Section 6
3. **Cluster Attractions** (`attraction-cluster.js`) — described in Section 7

---

## 5. Embedding Pipeline

### 5.1 Model

- **Model:** `Xenova/all-MiniLM-L6-v2` (384-dimensional, mean pooling, L2-normalized)
- **Storage:** `hub_static_inventory.embedding` column (pgvector `vector(384)`)
- **Batch size:** 50 records per batch

### 5.2 Input Construction

```
title | city | country | category | "airport transfer {origin}" | description[:200]
```

Each field is included only if non-null. The pipe separator preserves field boundaries for the embedding model.

### 5.3 Query-Time Usage

Search endpoints embed the user's query with the same model, then use pgvector's cosine distance operator:

```sql
SELECT *, 1 - (embedding <=> $queryVector) AS similarity
FROM hub_static_inventory
WHERE 1 - (embedding <=> $queryVector) >= $minScore
  AND is_active = true
ORDER BY similarity DESC
LIMIT $limit
```

Default `min_score` threshold: 0.30.

---

## 6. Dedup Engine

### 6.1 Three-Layer Architecture

```
Layer 1: Rule-Based Signals
  ├─ Fuzzy title match (Fuse.js, STOP_WORDS removed)
  ├─ Geo-distance check (geolib, 200m radius)
  ├─ Category exact match
  ├─ Duration similarity
  └─ Differentiator detection (40+ keywords in 11 categories)

Layer 2: Embedding Cosine Similarity
  ├─ KNN search on pgvector embeddings
  └─ Thresholds: ≥0.85 = duplicate, 0.70–0.85 = uncertain

Layer 3: LLM Judge (Claude)
  ├─ Called for uncertain pairs (0.70–0.85 range)
  ├─ Anthropic API (claude-3-haiku or configurable)
  └─ Writes agent_reasoning to hub_dedup_test_log
```

### 6.2 Differentiator Categories

Keywords that distinguish otherwise-similar products:

| Category | Examples |
|----------|----------|
| transport | bike, bus, boat, segway, helicopter |
| time | sunset, sunrise, evening, morning, night |
| format | workshop, class, cooking, walking, self-guided |
| scope | combo, highlights, express, full-day, half-day |
| venue | museum, stadium, palace, garden, rooftop |
| product | ticket, skip-the-line, fast-track, pass |
| group_size | private, small group, VIP, exclusive |
| level | summit, top floor, underground, backstage |
| meal | dinner, lunch, brunch, tasting, wine |
| addon | louvre, versailles, montmartre, etc. |

### 6.3 Configuration

Per-tenant config in `hub_dedup_config` (JSONB), merged over defaults:

```json
{
  "version": "2.0",
  "strategy": "LOWEST_PRICE",
  "preferred_supplier": null,
  "thresholds": {
    "embedding_duplicate": 0.85,
    "embedding_uncertain": 0.70,
    "max_cluster_size": 100
  },
  "uncertain_behavior": "SHOW_BOTH",
  "test_mode": false
}
```

### 6.4 Output

Writes to `hub_dedup_pairs`:
- `composite_score` — weighted combination of all signals
- `decision` — DUPLICATE | SHOW_BOTH | SHOW_A | SHOW_B
- `signal_location`, `signal_name`, `signal_duration`, `signal_category` — individual scores

Catalog queries filter: `WHERE canonical_id IS NULL` (non-duplicates only).

---

## 7. Attraction Clustering

Groups products by physical landmark (e.g., "Eiffel Tower" = 15 tour variants).

### 7.1 Algorithm

1. **Extract landmarks** from titles — lowercase, remove numbers and punctuation, strip 100+ stop words
2. **Grid-based spatial indexing** — cell size = 200m / 111000 ≈ 0.0018° per cell
3. **Cluster** products sharing the same grid cell + similar landmark phrase
4. **Write** to `hub_attractions` (name, display_name, city, lat/lng, experience_count, unique_product_count)

### 7.2 Constants

- `GEO_RADIUS_M` = 200 (meters)
- `MIN_PHRASE_COUNT` = 3 (minimum products to form a cluster)
- `IVFFLAT_PROBES` = 16 (pgvector index probe depth)

---

## 8. Category Mapping

### 8.1 Three-Tier Taxonomy

`hub_canonical_categories` stores a hierarchical taxonomy:

```
Level 0: Tours & Sightseeing
  Level 1: Walking Tours
    Level 2: Historical Walking Tours
  Level 1: Bus Tours
  Level 1: Boat Tours
Level 0: Culture & Arts
  Level 1: Museums
  Level 1: Art Galleries
...
```

### 8.2 Mapping Process

1. Supplier products arrive with raw categories (e.g., Viator's `"TOURS_SIGHTSEEING"`, GYG's `"City tours"`)
2. LLM-assisted mapper matches each raw category to a canonical category
3. Mapping stored in `hub_category_mappings` (supplier_slug, supplier_category → canonical_category_id)
4. Catalog queries JOIN on `hub_category_mappings` to return canonical categories

---

## 9. Ranking System

The catalog browse endpoint applies a 6-factor weighted ranking when no explicit sort is requested.

### 9.1 Ranking Signals

| Signal | Weight | Source |
|--------|--------|--------|
| Semantic relevance | Configurable | Cosine similarity to query vector |
| Popularity | Configurable | review_count from inventory |
| Rating | Configurable | rating from inventory |
| Margin | Configurable | retail_price − merchant_price |
| Availability | Configurable | Last known availability status |
| Supplier priority | Configurable | Per-tenant supplier preference |

### 9.2 Configuration

Stored in `hub_ranking_config` (JSONB), one active config per tenant. Allows A/B testing by swapping configs.

---

## 10. Lifecycle Handlers

For real-time operations (detail, availability, book, cancel), TOS-Hub passes through to the **Bridgify API**. Since Bridgify already aggregates all 15 suppliers behind one API, TOS-Hub doesn't need direct supplier connections for these operations.

### 10.1 Router

```javascript
runLifecycleStep({ tenantId, slug, step, rawRef, rawContent, payload })
  → HANDLERS['bridgify'][step]({ tenantId, rawRef, rawContent, payload })
```

### 10.2 Steps

| Step | Bridgify Endpoint | Purpose |
|------|------------------|---------|
| `detail` | `GET /attractions/products/{id}/` | Full product detail |
| `availability` | `GET /attractions/products/availability/{id}/` | Date/time slots |
| `book` | Cart-based flow (12 endpoints) | Create booking |
| `cancel` | `DELETE /bookings/{ref}/` | Cancel booking |

### 10.3 What TOS-Hub Adds on Top

- **Tenant isolation** — each lifecycle call scoped to tenant_id
- **Audit logging** — supplier, step, status (`ok|error|exception`), latency_ms → `hub_transactions`
- **Unified interface** — same endpoint shape regardless of underlying supplier quirks
- **Category enrichment** — detail responses include canonical category mapping

---

## 11. API Endpoints

### 11.1 Catalog API (Public — No Auth)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/v1/catalog/browse` | Filtered, deduped, ranked results |
| GET | `/v1/catalog/search` | Semantic search via embeddings |
| POST | `/v1/catalog/query` | Semantic search with pagination |
| GET | `/v1/catalog/cities` | City list with attraction counts |
| GET | `/v1/catalog/categories` | Hierarchical canonical taxonomy |
| GET | `/v1/catalog/transfer-points` | Terminal/hotel search for transfers |
| GET | `/v1/catalog/:id` | Single item detail + category mapping |
| GET | `/v1/catalog/:id/occurrences` | Recurring event instances |
| POST | `/v1/catalog/:id/availability` | Live availability check |
| POST | `/v1/catalog/:id/book` | Book via lifecycle handler |
| POST | `/v1/catalog/availability` | Batch availability (up to 20 IDs) |
| POST | `/v1/catalog/transfer-search` | Transfer availability |

### 11.2 Core API (API Key Auth — `X-Api-Key`)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/v1/search` | Search via Bridgify |
| POST | `/v1/book` | Book via Bridgify |
| POST | `/v1/cancel` | Cancel via Bridgify |
| GET | `/v1/booking/:id` | Get booking status |

### 11.3 Dashboard API (JWT Auth)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/v1/auth/login` | Send magic link |
| GET | `/v1/auth/verify/:token` | Exchange magic link for JWT |
| * | `/v1/dashboard/*` | Chat, sync management, dedup review, ranking config, category mapping, gold dataset labeling |

### 11.5 Admin API (`X-Admin-Key`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/v1/admin/dedup/test-log/:tenantId` | View dedup test results |
| POST | `/v1/admin/prompts` | Manage prompt library |
| POST | `/v1/admin/credentials` | Manage Bridgify credentials |
| GET/PATCH | `/v1/admin/knowledge/:slug` | API knowledge base |
| POST | `/v1/admin/escalation/:id/resolve` | Resolve escalations |

---

## 12. Prerequisites

### 12.1 Required Infrastructure

| Component | Version | Purpose |
|-----------|---------|---------|
| PostgreSQL | 14+ | Shared database |
| pgvector extension | 0.5+ | Vector similarity search |
| Node.js | 20.x | Runtime |

### 12.2 Required Environment Variables

```bash
DATABASE_URL=postgres://localhost:5432/tos
BRIDGIFY_API_KEY=...
BRIDGIFY_BASE_URL=https://api.dev.bridgify.io
ANTHROPIC_API_KEY=...          # For dedup LLM judge
JWT_SECRET=...                 # Dashboard auth
DASHBOARD_APP_URL=...          # CORS origin
PORT=3000
NODE_ENV=development
```

### 12.3 First-Run Setup

```bash
# 1. Run migrations (creates all hub_* tables)
npm run migrate

# 2. Sync inventory from Bridgify API
npm run sync

# 3. Generate embeddings for all synced products
npm run build-embeddings

# 4. Run dedup precompute
npm run dedup

# 5. Cluster attractions
npm run cluster
```

---

## 13. How TOS-Hub Coexists with Backend & ETL

### 13.1 No Conflict — Additive Only

TOS-Hub adds `hub_*` tables. It never writes to `attractionsAPI_*` tables (owned by ETL) or `order/cart` tables (owned by backend). The schemas coexist:

| Schema Prefix | Written By | Read By |
|--------------|-----------|---------|
| `attractionsAPI_*` | ETL pipeline | Backend API |
| `order*`, `cart*` | Backend API | ETL (reports) |
| `hub_*` | TOS-Hub | TOS-Hub |

### 13.2 Data Flow

```
ETL Pipeline                    TOS-Hub
    │                               │
    ▼                               │
attractionsAPI_attraction      hub_static_inventory
(1.2M products)                (50K product cap)
    │                               │
    ▼                               ▼
Backend API ◄──── feeds ────► TOS-Hub Sync
(serves raw)                  (stores enriched)
    │                               │
    ▼                               ▼
trip-planner (direct)         trip-planner (via hub)
```

TOS-Hub's sync process **calls the Bridgify API** (which reads from `attractionsAPI_*`) and stores a curated subset in `hub_static_inventory`. This means:

1. **ETL populates the master catalog** (1.2M products, 15 suppliers)
2. **Backend serves raw access** to the full catalog
3. **TOS-Hub syncs a subset** (50K) and adds intelligence on top
4. **Clients can call either** — Bridgify direct for raw data, TOS-Hub for enhanced data

### 13.3 Real-Time Operations

For detail, availability, and booking, TOS-Hub **passes through** to the Bridgify API. It doesn't cache these — it adds logging, tenant isolation, and a unified interface.

### 13.4 Migration Path

| Phase | Data Source | Intelligence |
|-------|-----------|-------------|
| **Current (MVP)** | Bridgify API direct | None — raw results |
| **Phase 2** | TOS-Hub catalog | Dedup, ranking, semantic search |
| **Phase 3 (Hybrid)** | TOS-Hub for browse, Bridgify for booking | Best of both |

---

## 14. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Intelligence layer, not supplier integration | Bridgify already aggregates 15 suppliers — TOS-Hub only adds intelligence on top |
| Separate `hub_*` tables, not views on `attractionsAPI_*` | Decoupled from ETL schema changes; can add columns freely |
| pgvector for embeddings, not external vector DB | Single database, simpler ops, good enough at 50K scale |
| MiniLM-L6-v2 (384-dim), not larger models | Fast inference, small storage, sufficient quality for product search |
| 3-layer dedup (rules → embeddings → LLM) | Rules catch obvious cases cheaply; LLM only called for ambiguous pairs |
| Sync to local inventory, not query-time passthrough | Sub-100ms browse latency; dedup/ranking need the full dataset |
| Per-tenant config for dedup/ranking | Different tenants can tune thresholds without code changes |
| Pass-through to Bridgify for real-time ops | Availability and pricing must be fresh — cache would stale |
