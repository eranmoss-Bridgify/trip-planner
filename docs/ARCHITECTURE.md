# Architecture — How the Layers Stack

> Last updated: 2026-05-13

---

## The Three Layers

```
┌─────────────────────────────────────────────────────────┐
│  CLIENTS (trip-planner, TOS pages, partner apps)        │
│  Next.js / TOS Travel Shell / 3rd-party widgets         │
└──────────────────────┬──────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          │ Direct     │ Via Hub    │
          │ (current)  │ (future)   │
          ▼            ▼            │
┌─────────────┐  ┌──────────────┐  │
│ Layer 3     │  │ Layer 3      │  │
│ BRIDGIFY    │  │ TOS-HUB     │  │
│ API         │  │ INTELLIGENCE │  │
│ (backend)   │  │ (tos-hub)    │  │
│             │  │              │  │
│ Django REST │  │ Express +    │  │
│ Port: 443   │  │ pgvector     │  │
│ api.dev.    │  │ Port: 3000   │  │
│ bridgify.io │  │              │  │
└──────┬──────┘  └──────┬───────┘  │
       │                │          │
       │      ┌─────────┘          │
       │      │ reads from         │
       ▼      ▼                    │
┌─────────────────────────┐        │
│ Layer 2                 │        │
│ POSTGRESQL              │        │
│                         │        │
│ attractionsAPI_*        │        │
│ order / order_item      │        │
│ cart / cart_item         │        │
│ hub_static_inventory    │        │
│ hub_dedup_pairs         │        │
│ hub_canonical_categories│        │
│ hub_attractions (POIs)  │        │
│ hub_global_pois         │        │
└──────────┬──────────────┘        │
           │                       │
           │ populated by          │
           ▼                       │
┌─────────────────────────┐        │
│ Layer 1                 │        │
│ ETL PIPELINE            │        │
│                         │        │
│ Airflow DAGs            │        │
│ 15 supplier extractors  │        │
│ Queue-based loading     │        │
│ ML enrichment           │        │
│ Translation             │        │
│ City/geo resolution     │        │
└─────────────────────────┘
```

---

## Layer 1: ETL Pipeline (Data Foundation)

**Repo:** `etl-pipeline`
**Role:** Populates the database. Runs on a schedule, not on user request.

**What it does:**
1. Extracts products from 15 supplier APIs (Viator, GYG, Tiqets, Hotelbeds, etc.)
2. Transforms to unified Bridgify schema (tags, pricing, geolocation)
3. Queues via Azure Service Bus (5 ETL + 9 ML queues)
4. Loads into PostgreSQL (`attractionsAPI_attraction` table — 1.2M products)
5. Enriches: ML tagging, city resolution (Google Places), translation (20 languages)
6. Indexes into OpenSearch for text search

**Schedule:** Main ETL runs Sun/Tue/Thu (20+ hours). Daily tasks for carousels, currency rates. Sub-hourly for booking status checks.

**Key tables it populates:**
- `attractionsAPI_attraction` — Master product catalog
- `attractionsAPI_availability` — Dates/timeslots per product
- `attractionsAPI_additionalinfo` — Inclusions, exclusions, images, highlights
- `attractionsAPI_city` — City records linked to Google Place IDs
- `attractionsAPI_category` — Category taxonomy

**This layer does NOT handle user requests.** It is pure background data processing.

---

## Layer 2: PostgreSQL (Shared Database)

**Role:** Single source of truth. Both the backend API and tos-hub read from the same database.

**Two schemas coexist:**

| Schema | Written by | Read by |
|--------|-----------|---------|
| `attractionsAPI_*` | ETL pipeline | Backend API |
| `order*`, `cart*`, `booking_*` | Backend API | ETL (reports only) |
| `hub_static_inventory` | tos-hub sync | tos-hub catalog |
| `hub_dedup_pairs` | tos-hub dedup engine | tos-hub catalog |
| `hub_canonical_categories` | tos-hub category mapper | tos-hub catalog |
| `hub_attractions` / `hub_global_pois` | tos-hub clustering | tos-hub catalog |

**pgvector extension** is used by tos-hub for embedding storage and cosine similarity search.

---

## Layer 3a: Bridgify Backend API (Production API)

**Repo:** `backend`
**Role:** Serves product data and handles bookings. This IS `api.dev.bridgify.io`.

**What it exposes:**
- `GET /attractions/products/` — Search (text + city + filters)
- `GET /attractions/products/{id}/` — Product detail
- `GET /attractions/products/availability/{id}/` — Date/time availability
- `GET /attractions/categories/` — Category list
- `GET /attractions/cities/` — City list
- `POST /attractions/booking/cart/` — Create cart (start booking)
- Full cart-based booking flow (12 endpoints)
- `POST /attractions/booking/orders/` — Create order

**What it reads:**
- `attractionsAPI_attraction` (populated by ETL)
- `attractionsAPI_availability` (populated by ETL)
- Supplier APIs for live pricing/availability (pass-through)

**What it writes:**
- `order`, `order_item`, `ticket` (booking lifecycle)
- `cart`, `cart_item` (shopping cart)
- `booking_bookingapilog` (audit trail)

**Authentication:** OAuth2 client_credentials (we have sandbox creds)

---

## Layer 3b: TOS-Hub Intelligence (Value-Add Layer)

**Repo:** `tos-hub/integration-hub`
**Role:** Adds dedup, ranking, semantic search, category mapping ON TOP of the same data.

**How it works:**

```
1. SYNC PHASE (background, like ETL but lighter)
   ├─ Calls Bridgify API search across 80+ cities × 8 search terms
   ├─ Stores results in hub_static_inventory (50K product cap)
   ├─ Generates MiniLM-L6-v2 embeddings for each product
   ├─ Runs dedup engine (rules → embeddings → LLM judge)
   ├─ Clusters attractions by landmark (geo + title)
   └─ Maps supplier categories → canonical taxonomy

2. SERVE PHASE (on user request)
   ├─ /v1/catalog/search — pgvector cosine similarity + ranking
   ├─ /v1/catalog/browse — filtered + deduped + ranked results
   ├─ /v1/catalog/categories — canonical taxonomy
   ├─ /v1/catalog/cities — city autocomplete
   ├─ /v1/catalog/:id — detail with category enrichment
   └─ /v1/catalog/:id/availability — pass-through to Bridgify
```

**What makes it different from calling Bridgify directly:**

| Feature | Bridgify Direct | Via tos-hub |
|---------|----------------|-------------|
| Duplicates | Same tour from Viator + GYG + Tiqets shown separately | Deduped — best variant selected |
| Ranking | Raw order (newest? cheapest?) | 6-factor: semantic + popularity + rating + margin + availability + supplier priority |
| Search | Text matching only | Semantic vectors: "romantic evening" → wine tours, sunset cruises |
| Categories | Supplier-specific (inconsistent across Viator/GYG/Tiqets) | Canonical 3-tier taxonomy |
| POIs | No grouping | Products clustered by landmark ("Eiffel Tower" = 15 variants) |
| Latency | Real-time API call | Pre-synced local data (faster for browse) |

---

## How Trip-Planner Connects

### Current (MVP — Direct to Bridgify)

```
trip-planner (Next.js :3001)
    │
    ├─ /api/bridgify/search      → GET api.dev.bridgify.io/attractions/products/
    ├─ /api/bridgify/[id]        → GET api.dev.bridgify.io/attractions/products/{id}/
    └─ /api/bridgify/[id]/avail  → GET api.dev.bridgify.io/attractions/products/availability/{id}/
```

Pros: Simple, no dependencies. Cons: Raw data, duplicates, no ranking.

### Future (Production — Through tos-hub)

```
trip-planner (Next.js :3001)
    │
    ├─ /api/catalog/search       → GET localhost:3000/v1/catalog/search
    ├─ /api/catalog/browse       → GET localhost:3000/v1/catalog/browse
    ├─ /api/catalog/categories   → GET localhost:3000/v1/catalog/categories
    ├─ /api/catalog/cities       → GET localhost:3000/v1/catalog/cities
    ├─ /api/catalog/[id]         → GET localhost:3000/v1/catalog/{id}
    ├─ /api/catalog/[id]/avail   → POST localhost:3000/v1/catalog/{id}/availability
    └─ /api/catalog/[id]/book    → POST localhost:3000/v1/catalog/{id}/book
```

Pros: Deduped, ranked, semantic search, canonical categories. Cons: Requires tos-hub + Postgres + pgvector running.

### Hybrid (Both)

```
trip-planner
    │
    ├─ Browse/Search → tos-hub (deduped, ranked)
    ├─ Detail/Availability → Bridgify direct (real-time, fresh)
    └─ Booking → Bridgify direct (cart flow, no middleware)
```

Best of both: tos-hub for discovery, Bridgify for transactions.

---

## How TOS Pages Connect

TOS pages (WanderVault Flask app :5001) use the same pattern but through the TOS action layer:

```
TOS Page (tp_home, tp_marketplace, etc.)
    │
    ├─ POST /api/v2/action/search          → datasource: bridgify_search_experiences
    ├─ GET  /api/v2/action/search/results   → cached results
    ├─ POST /api/v2/action/view_detail      → datasource + _snapshot
    ├─ GET  /api/v2/action/view_detail/results
    └─ POST /api/v2/action/book             → datasource + booking params
```

The TOS action layer proxies to whatever datasource is configured. Switching from Bridgify direct to tos-hub means changing the datasource config — components don't change.

---

## Summary: What Lives Where

| Concern | ETL Pipeline | Backend API | TOS-Hub | Trip-Planner |
|---------|-------------|-------------|---------|-------------|
| Data ingestion | ✅ | | | |
| ML enrichment | ✅ | | | |
| Translation | ✅ | | | |
| City resolution | ✅ | | | |
| Product search | | ✅ | ✅ (enhanced) | Proxy |
| Product detail | | ✅ | ✅ (pass-through) | Proxy |
| Availability | | ✅ | ✅ (pass-through) | Proxy |
| Cart/Booking | | ✅ | ✅ (pass-through) | Proxy |
| Deduplication | | | ✅ | |
| Ranking | | | ✅ | |
| Semantic search | | | ✅ | |
| Category mapping | | | ✅ | |
| POI clustering | | | ✅ | |
| UI rendering | | | | ✅ |
