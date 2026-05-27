# Trip Planner — Missing APIs & Data Gaps

> Source of truth: `backend` repo (Django REST API at `api.dev.bridgify.io`) and `etl-pipeline` repo.
> Last updated: 2026-05-25

---

## Terminology Used in This Document

| Label | Meaning |
|-------|---------|
| **Implementation Gap** | Feature was built and the infrastructure exists, but the wiring is incomplete or broken. Fix is purely in our codebase — no new design needed. |
| **New Feature** | Not yet built. Requires design, new routes, or new UI. |
| **Bridgify Gap** | Bridgify API limitation we cannot fix ourselves — only TOS Hub solves it. |

---

## Implementation Gaps — Built But Not Wired ⚠️

These are bugs in our own implementation, not missing features. The DB tables, routes, and context all exist — the connections between them are incomplete.

### IG1. Trip Sync Is One-Time Only ✅ FIXED 2026-05-25

**Was broken:** `POST /api/trips` used `ON CONFLICT DO NOTHING` with no unique constraint on `(user_id, local_id)`, so the INSERT always created new rows — duplicate trips accumulating on every save. Subsequent saves after the first were effectively silently duplicating data.

**Fix applied:**
- Migration `002_add_trips_unique_constraint.sql`: adds `UNIQUE (user_id, local_id)` after deduplicating existing rows
- `POST /api/trips` now uses `ON CONFLICT (user_id, local_id) DO UPDATE SET ...` — a proper upsert that replaces the trip and all its legs/activities on every save
- `GET /api/trips` now returns full trip data (legs + days + activities reconstructed) so TripContext can hydrate from DB

### IG2. TripContext Never Reads from DB ✅ FIXED 2026-05-25

**Was broken:** On every page load, `TripContext` read from `localStorage` regardless of whether the user was logged in. DB-saved trips were invisible on other devices or after clearing the browser.

**Fix applied:** `TripContext` now imports `useAuth`. When a logged-in user is detected and their trips exist in the DB, those trips replace the `localStorage` state and re-sync `localStorage`. DB is the source of truth for logged-in users; `localStorage` is the source of truth for guests.

### IG3. No Continuous Sync After Mutations ✅ FIXED 2026-05-25

**Was broken:** Every TripContext mutation (`addServiceToLeg`, `removeActivity`, `moveActivity`, etc.) wrote to `localStorage` only. A user who added activities after the initial save and then opened a second device would see the pre-activity state.

**Fix applied:** TripContext now auto-saves to `POST /api/trips` with a 2-second debounce whenever trips change and a user is logged in. Every mutation that hits `localStorage` also hits the DB within 2 seconds.

### IG4. PUT /api/trips/[id] Only Updates Name + Destination (LOW)

The `PUT /api/trips/[id]` route updates only `name` and `destination`. It cannot sync legs or activities. This is now largely superseded by the full-upsert `POST /api/trips` (IG1 fix), but the PUT route should be removed or widened to avoid confusion.

- **Action:** [ ] Remove `PUT /api/trips/[id]` or replace with a full trip replace that calls the same upsert logic as POST.

---

## Currently Implemented

### Bridgify Proxy Routes

| # | Endpoint | Proxy Route | SWR Hook | Status |
|---|----------|-------------|----------|--------|
| 1 | `POST /accounts/token/` | `src/app/api/bridgify/token.ts` | (server-only) | ✅ Working |
| 2 | `GET /attractions/products/` | `src/app/api/bridgify/search/route.ts` | `useBridgifySearch` | ✅ Working |
| 3 | `GET /attractions/products/{id}/` | `src/app/api/bridgify/[productId]/route.ts` | `useBridgifyDetail` | ✅ Working |
| 4 | `GET /attractions/products/availability/{id}/` | `src/app/api/bridgify/[productId]/availability/route.ts` | `useBridgifyAvailability` | ✅ Working |

---

### Internal Trip Planner API Routes

All routes live under `src/app/api/`. Auth routes use bcrypt + OTP via Resend + JWT session cookie (`wv_session`, httpOnly, 7-day TTL).

#### Auth Routes

| Method | Route | Auth Required | Description |
|--------|-------|--------------|-------------|
| `POST` | `/api/auth/register` | No | Create user, hash password, send 6-digit OTP via Resend |
| `POST` | `/api/auth/login` | No | Verify password, send OTP |
| `POST` | `/api/auth/verify-otp` | No | Verify OTP → set `wv_session` httpOnly cookie |
| `POST` | `/api/auth/logout` | Yes | Delete session row + clear cookie |
| `GET` | `/api/auth/me` | Yes | Return `{ id, email, name }` from cookie session |

**Auth flow**: register/login → OTP email → verify-otp → `wv_session` cookie set → all subsequent requests use cookie.

**Known constraint**: Resend free tier only sends to verified addresses (`eranmoss@gmail.com`) without a domain. In production: add a verified domain.

**Sessions table**: `token` column **must be `TEXT`** (not `VARCHAR(64)`) — JWT tokens are ~200 chars; a VARCHAR(64) silently fails the INSERT and the OTP appears to work but no session is created.

#### Trip Storage Routes

| Method | Route | Auth Required | Description |
|--------|-------|--------------|-------------|
| `GET` | `/api/trips` | Yes | List all trips for current user (via `trip_members` JOIN — includes shared trips) |
| `POST` | `/api/trips` | Yes | Upsert batch of trips from localStorage; deduplicates by `local_id` |
| `PUT` | `/api/trips/[id]` | Yes | Update single trip (name, destination, vibes, dates) |
| `DELETE` | `/api/trips/[id]` | Yes | Delete trip (owner only) |

**Trip ownership model**: `POST /api/trips` inserts the user as `owner` into `trip_members`. `GET /api/trips` queries via `trip_members` JOIN so both owned and shared trips appear. Only owners can delete.

#### Trip Sharing Routes

| Method | Route | Auth Required | Description |
|--------|-------|--------------|-------------|
| `POST` | `/api/trips/share` | Yes | Generate (or return cached) share token for a trip; auto-saves trip to DB first |
| `GET` | `/api/trips/share/[token]` | No | Public: return trip + legs + activities for share page |
| `POST` | `/api/trips/join` | Yes | Add logged-in user as `editor` via share token; returns full trip data for TripContext injection |

**Share flow**: user clicks Share → `POST /api/trips/share` → 40-char hex token stored in `trips.share_token` → link `/trip/share/[token]` shared → recipient opens page → clicks "Edit this trip" → auth modal → `POST /api/trips/join` → added to `trip_members` as editor → `addTrip()` loads into TripContext → redirect to `/trips`.

**Share token lookup**: uses `WHERE (id::text = $1 OR local_id = $1) AND user_id = $2`. The UPDATE must use the DB UUID (`rows[0].id`), not `local_id`, or the token never gets saved.

#### AI Assistant Route

| Method | Route | Auth Required | Description |
|--------|-------|--------------|-------------|
| `POST` | `/api/ai-chat` | No | Send messages + trip context → server pre-fetches Bridgify → Claude (claude-sonnet-4-6) proposes best matches → returns `{ text, proposals }` |

**Architecture (revised 2026-05-20):** Server-side intent classification + parallel Bridgify pre-fetch, then Claude selects and proposes. Claude does NOT search — it only proposes.

```
User message → classifyIntent() → Promise.all(Bridgify searches) → inject into system prompt → Claude → propose_add_activity × 2–3 → cards
```

**Intent classification (`classifyIntent(query)` in `route.ts`):**  
Regex-based map from user intent → Bridgify category terms (2–3 terms selected). Examples:
- "live performances" / "concert" → `['Shows & Performances', 'Music', 'Festivals']`
- "outdoor" / "nature" → `['Outdoor Activities', 'Nature', 'Walking & Biking']`
- "food" / "eat" → `['Culinary Experiences', 'Street Food']`
- Default (no match) → `['Popular', 'Must See', 'Guided Tours']`

Up to 3 category terms are searched in parallel via `Promise.all()`. Results are merged and deduplicated by `external_id`, best sellers sorted first, capped at 15 activities injected as context.

**Claude tools (reduced from 3 to 2 — `search_activities` removed):**
- `propose_add_activity(external_id, name, …, leg_id, day_date, reason)` — Claude picks from the pre-fetched pool and surfaces an activity as a confirmable card; no server action, just appends to `proposals[]` in the response
- `propose_remove_activity(activity_id, …, leg_id, reason)` — proposes removal of an existing itinerary activity

**Forcing proposals:** When activities are pre-fetched, the first API call uses `tool_choice: { type: 'any' }` — this forces Claude to call a tool (i.e. `propose_add_activity`) rather than responding with text. Without this, Claude would often say "Here are some options below" and then stop without calling the tool.

**Trip context**: system prompt receives full trip summary — name, destination, dates, vibes, all legs with day dates and activity lists including IDs — so Claude can reference real dates and existing activities.

**General questions** (no activity intent detected): `classifyIntent` returns a general-question flag, no Bridgify pre-fetch runs, Claude answers directly in text without tools.

> ⚠️ **GAP — Intent classification is regex-based, not ML**
>
> `classifyIntent()` uses a 23-rule regex map. Edge cases it misses: compound requests ("food and culture"), questions about removing vs adding ("what can I replace the museum with?"), non-English input, very vague requests ("plan my day"). A small LLM call (Haiku) for intent classification would handle these better.
>
> **Remaining gap — semantic search:** The pre-fetched results still come from Bridgify keyword search (title/description match). The category terms are better keywords than the raw user query, but they're still not semantic. TOS Hub semantic search (`GET /v1/catalog/search?q=...`) is the correct long-term fix — but blocked on D1–D5 (ID coupling between `external_id` and `supplier_raw_ref`).
>
> **Action**: [ ] **F1.** When the app switches to TOS Hub, replace `searchBridgify()` in `route.ts` with a call to `GET http://localhost:3000/v1/catalog/search?q={term}&city={destination}&limit=8`. At that point the AI assistant gains true semantic understanding. `classifyIntent()` can remain as a routing hint but TOS Hub handles the actual ranking.

**Chat LTM (Long-Term Memory)**:
- Logged-in users: conversation persisted to `localStorage` under key `chat_ltm_{userId}_{tripId}` (capped at 60 messages)
- Loaded on panel open, saved on every assistant reply
- "Clear" button in panel header wipes history
- Guests: in-memory only, resets on page reload
- Amber nudge strip shown to guests: "Sign in to save this conversation across sessions"

**Proposal cards → Service detail sidebar:**
Clicking the image, title, or "Details" button on a proposal card opens `ServiceDetailsSidebar` with full availability checking, photo gallery, and price breakdown. `AIChatPanel` receives `onOpenServiceDetails` prop from `TripDetailsView` and passes it to `ProposalCard`, which converts the proposal activity shape into an `Attraction` object on the fly.

---

### Database Schema (`trip_planner` schema in `tos_integration_hub` Postgres)

Migration file: `migrations/001_trip_planner_schema.sql`  
Connection: `postgres://postgres:postgres@127.0.0.1:5433/tos_integration_hub`

#### Tables

**`trip_planner.users`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | `gen_random_uuid()` |
| `email` | VARCHAR(255) UNIQUE | Login identifier |
| `name` | VARCHAR(255) | Display name |
| `password_hash` | VARCHAR(255) | bcrypt, cost 10 |
| `created_at`, `updated_at` | TIMESTAMPTZ | Auto |

**`trip_planner.otp_tokens`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | Cascade delete |
| `token` | VARCHAR(6) | 6-digit OTP |
| `expires_at` | TIMESTAMPTZ | 10-minute TTL |
| `used` | BOOLEAN | Marked true after verify |

**`trip_planner.sessions`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | Cascade delete |
| `token` | **TEXT** UNIQUE | JWT ~200 chars — **must be TEXT, not VARCHAR(64)** |
| `expires_at` | TIMESTAMPTZ | 7-day TTL |

**`trip_planner.trips`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | Original creator |
| `local_id` | VARCHAR(255) | Client-side UUID for dedup on upsert |
| `name` | VARCHAR(255) | |
| `destination` | VARCHAR(255) | |
| `vibes` | TEXT[] | Array of vibe strings |
| `passengers` | JSONB | |
| `start_date`, `end_date` | DATE | |
| `share_token` | VARCHAR(64) UNIQUE | 40-char hex; NULL until first share |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

**`trip_planner.trip_members`**
| Column | Type | Notes |
|--------|------|-------|
| `trip_id` | UUID FK → trips | Cascade delete |
| `user_id` | UUID FK → users | Cascade delete |
| `role` | VARCHAR(20) | `owner` or `editor` |
| PK | (trip_id, user_id) | Composite |

> This table is what enables **true collaboration** — multiple users can be members of the same trip row. `GET /api/trips` queries via this JOIN so shared trips appear in both users' lists.

**`trip_planner.trip_legs`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `trip_id` | UUID FK → trips | Cascade delete |
| `local_id` | VARCHAR(255) | Client-side ID |
| `title`, `location` | VARCHAR(255) | |
| `start_date`, `end_date` | DATE | |
| `sort_order` | INTEGER | |

**`trip_planner.activities`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `leg_id` | UUID FK → trip_legs | Cascade delete |
| `day_date` | DATE NOT NULL | Which day this activity belongs to |
| `external_id` | VARCHAR(255) | Bridgify `external_id` |
| `name` | VARCHAR(255) | |
| `category` | VARCHAR(100) | |
| `image_url` | TEXT | Main photo |
| `price` | DECIMAL(10,2) | |
| `currency` | VARCHAR(10) | |
| `duration` | VARCHAR(100) | |
| `location` | VARCHAR(255) | |
| `rating` | DECIMAL(3,1) | |
| `booking_status` | VARCHAR(50) | `none` / `planned` / `booked` / `booked_manual` |
| `booking_ref` | VARCHAR(255) | |
| `is_best_seller` | BOOLEAN | From Bridgify `additional_info` |
| `raw_data` | JSONB | Full Bridgify payload for future use |
| `sort_order` | INTEGER | |

---

## Missing APIs

### HIGH PRIORITY — Needed for core UX

#### A0. Search Result Ordering — Not Supported by Bridgify

**Confirmed 2026-05-20:** The `ordering` parameter on `GET /attractions/products/` is silently ignored. Every value tested (`rating`, `-rating`, `price`, `-price`, `best_seller`, `relevance`, `title`) returns identical results in the same order. Bridgify has no server-side sort control.

| Param tried | Result |
|-------------|--------|
| `ordering=rating` | Ignored — same order as no param |
| `ordering=-rating` | Ignored |
| `ordering=price` | Ignored |
| `ordering=best_seller` | Ignored |
| `ordering=relevance` | Ignored |
| `ordering=title` | Ignored |

**Impact:** We cannot sort by price, rating, or relevance server-side. Any sorting must happen client-side after fetching results. Our search proxy already sorts by `is_best_seller` flag client-side — that's the only ordering signal available from Bridgify.

**Production fix:** TOS Hub `/v1/catalog/search` applies a 6-factor ranking (relevance, rating, popularity, margin, availability, supplier priority) server-side. This is the correct solution.

**Action:** [ ] **A0.** When TOS Hub is wired (D1), remove client-side best-seller sort from `src/app/api/bridgify/search/route.ts` — TOS Hub handles ranking.

---

#### A0b. Accent-Sensitive Search — Bridgify Breaks on Diacritics

**Confirmed 2026-05-20:** Bridgify's `text_search` parameter is accent-sensitive. Searching with accented characters returns 0 results; without accents returns full results.

| Query | Results |
|-------|---------|
| `"batlló"` (with accent) | **0 results** |
| `"batllo"` (no accent) | 50 results |
| `"Sagrada Família"` | **0 results** |
| `"Sagrada Familia"` | 50 results |
| `"Güell"` | **0 results** |
| `"Guell"` | 50 results |

**Impact:** Users who type "Sagrada Família" (with accent, copied from Wikipedia/Google) get zero results. This is a silent failure — no error, just an empty grid.

**Fix (client-side workaround):** Strip diacritics from the search query before sending to Bridgify. Add to `src/app/api/bridgify/search/route.ts`:
```typescript
const normalise = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
const safeQuery = normalise(textSearch);
```
- **Action:** [ ] **A0b.** Apply `normalise()` in the search proxy and in the AI chat `searchBridgify()` function.

---

#### A1. Categories List
- **Backend**: `GET /attractions/categories/`
- **Returns**: Full category taxonomy (id, caption, image_url) — 33 categories confirmed 2026-05-20
- **Proxy route**: ✅ `src/app/api/bridgify/categories/route.ts` — 24h in-memory cache
- **Used for**: Category filter chips on marketplace, sidebar filters, onboarding wizard "vibes" step, **AI assistant vocabulary** (see below)
- **Currently**: Proxy route added; SWR hook and UI wiring still needed
- **Action**: [ ] Add SWR hook, wire to marketplace filters

**AI Semantic Layer (implemented 2026-05-20):** The 33 category captions are baked into the AI assistant's system prompt as its "search vocabulary." When a user asks for "nightlife", Claude translates to `["Nightlife", "Music", "Shows & Performances"]` and calls `search_activities` once per term (the agentic loop supports multiple calls). This gives the AI semantic-quality results from a keyword API — `"nightlife"` now returns 50+ results instead of 1. See `src/app/api/ai-chat/route.ts` for the translation examples and full category list.

Full category list (33): Shopping, Beach, Restaurant, Cafe, Must See, Art, Hidden Gems, Historic Sites, Nightlife, Watersports, Architecture, Nature, Museums, Sporting Events, Popular, Walking & Biking, Urban Parks, Shows & Performances, Festivals, Culinary Experiences, Amusements, Outdoor Activities, Local Events, Local Markets, Street Food, Guided Tours, LGBT, Music, Wellness & Wellbeing, Family Friendly, Classes & Workshops, Religion, Culture

#### A2. Cities / Destinations Autocomplete
- **Backend**: `GET /attractions/cities/` + query params
- **Returns**: City list with country, lat/lng, attraction count
- **Used for**: Destination input autocomplete in search bar, onboarding wizard
- **Currently**: Free-text input, no validation or suggestions
- **Action**: [ ] Add proxy route, SWR hook, wire to search bar + wizard

#### A3. Best Sellers / Curated Recommendations
- **Backend**: `GET /attractions/best-sellers-bridgify/`
- **Returns**: Curated product list per city (editorial picks)
- **Also**: `GET /attractions/best-sellers-gyg/` (GetYourGuide top sellers)
- **Used for**: Home page featured section, trip detail "recommendations" carousel
- **Currently**: Default search ("tours" in Barcelona) used as fallback — not curated
- **Action**: [ ] Add proxy route, SWR hook, use for home page + trip recommendations

#### A4. Search Suggestions / Autocomplete
- **Backend**: `GET /attractions/search-suggestion/?q=...`
- **Returns**: Matching product titles, categories, cities
- **Used for**: Type-ahead in search bar
- **Currently**: No autocomplete — user must type and submit
- **Action**: [ ] Add proxy route, debounced SWR hook, dropdown UI

---

### MEDIUM PRIORITY — Needed for proper booking flow

#### B1. Cart-Based Booking (Full Flow)

These are **Bridgify's own endpoints** — they exist on `api.bridgify.io` and were fully explored on 2026-05-20 using `scripts/explore-booking-flow.mjs`.

**Confirmed working (steps 1–8) and confirmed broken (steps 9–11):**

| Step | Endpoint | Method | Body / Params | Result (confirmed) |
|------|----------|--------|---------------|-------------------|
| 1 | `/attractions/booking/cart/` | POST | `{}` | ✅ Returns `cart_uuid`, `cart_short_uuid` |
| 2 | `/attractions/booking/cart/{cart_uuid}/items/` | POST | `{ attraction_uuid, quantity }` | ✅ Returns `cart_item_uuid`. **`cart_uuid` goes in the URL path, NOT the body. Use `product.uuid`, NOT `product.external_id`** |
| 3 | `/attractions/booking/cart/items/{item_uuid}/required-fields/` | GET | — | ✅ Returns `required_booking_fields[]` in the **exact order** steps must be called |
| 4a | `/attractions/booking/cart/items/{item_uuid}/dates/` | GET | — | ✅ Returns `available_dates[]` — months of real dates |
| 4b | `/attractions/booking/cart/items/{item_uuid}/dates/` | PATCH | `{ date: "YYYY-MM-DD" }` | ✅ "The date … selected successfully" |
| 5a | `/attractions/booking/cart/items/{item_uuid}/options/` | GET | — | ✅ Returns ticket tiers with `option_id`, `title`, `description`, `meeting_point`, `retail_price` |
| 5b | `/attractions/booking/cart/items/{item_uuid}/options/` | PATCH | `{ option_id }` | ✅ "Option selected successfully" |
| 6 | `/attractions/booking/cart/items/{item_uuid}/timeslots/` | GET | — | ✅ Returns `available_timeslots[]` — 15-min slots e.g. 09:00–19:45 |
| 7 | `/attractions/booking/cart/items/{item_uuid}/tickets/` | GET | — | ✅ Returns `{ tickets[], restriction }` — field is **`tickets`** not `ticket_types`. Each ticket: `product_id`, `name`, `age_from/to`, `available_selling_quantities[]`, `holder_type`. Restriction: `overall_max_tickets`, `adult_required` |
| 8 | `/attractions/booking/cart/items/{item_uuid}/languages/` | GET | — | ✅ Returns `available_languages[]` e.g. "English - Audio guide", "French - Audio guide" (14 for Casa Batlló) |
| 9 | `/attractions/booking/cart/items/{item_uuid}/pickup/` | GET | — | ⚠️ 404 if product has no hotel pickup (`has_pick_up: false` in search response) — skip for those products |
| 10 | `/attractions/booking/cart/{cart_uuid}/customer-info/` | PATCH | `{ first_name, last_name, email, phone }` | ❌ 422 "Invalid request" — field format unconfirmed; possibly needs all ticket selections complete first |
| 11 | `/attractions/booking/orders/` | POST | `{ cart_uuid }` | ❌ 404 "get() returned more than one Cart — it returned 11!" — Bridgify sandbox backend bug; cart lookup ambiguous |
| 12 | `/attractions/booking/orders/{order_uuid}/checkout` | POST | `{}` | ❌ Unreachable — step 11 fails first. In production: triggers payment processor |

**Critical discovery: the step order is product+supplier-specific.**
Step 3 (`required-fields`) returns both *which* steps are needed AND their required execution order. For a GetYourGuide product (Casa Batlló), the order is:
```
dates → options → timeslots → tickets → languages → customer-info
```
Calling timeslots before selecting an option returns `422 "Missing booking data in 'Option', endpoints accessed in wrong order"`. The `required-fields` response is the source of truth — read it after step 2 and drive the UI from it.

**What you get from each step (real data, Casa Batlló example):**

*Options (step 5a):*
```json
{ "option_id": "1350871", "title": "BLUE Casa Batlló Entrance Ticket", "retail_price": 33.66, "currency": "USD", "meeting_point": "Show your tickets at the entrance of Casa Batlló" }
{ "option_id": "1350880", "title": "SILVER ...", "retail_price": 39.46 }
{ "option_id": "1350882", "title": "GOLD ...", "retail_price": 45.26 }
{ "option_id": "1350893", "title": "PLATINUM ...", "retail_price": 56.87 }
```
Note: `merchant_price: 0` on all options confirms we don't have merchant pricing.

*Ticket types (step 7):*
```json
{ "product_id": "adult",   "name": "Adults",              "age_from": 18, "age_to": 64 }
{ "product_id": "youth",   "name": "Youth",               "age_from": 13, "age_to": 17 }
{ "product_id": "child",   "name": "Children",            "age_from": 0,  "age_to": 12 }
{ "product_id": "senior",  "name": "Seniors",             "age_from": 65, "age_to": 99 }
{ "product_id": "student", "name": "Students (with ID)",  "age_from": 0,  "age_to": 99 }
```
Restriction: `overall_max_tickets: 10`, `adult_required: true`.

**Why steps 10–11 fail:**

**Customer-info (step 10):** Returns 422 with `{ first_name, last_name, email, phone }`. Possible causes: field names differ per supplier, or tickets must be selected before customer info is accepted. Needs further investigation (try different field names like `customer_first_name`, or complete ticket selection first).

**Create order (step 11):** Returns `"get() returned more than one Cart -- it returned 11!"` — this is a Bridgify sandbox backend bug. The ORM query that looks up the cart by `cart_uuid` is returning multiple rows (our many test runs created multiple carts under the same client credentials, and the query is using a filter that doesn't uniquely resolve). This bug only exists in sandbox — in production each client creates far fewer carts.

**What we CAN build right now (steps 1–8):**
The entire pre-payment booking UI is implementable without merchant credentials:
- Date picker populated from real API availability
- Ticket tier selection (BLUE/SILVER/GOLD/PLATINUM) with real prices and descriptions
- Time slot selection from real 15-minute slot grid
- Ticket quantity selector with real adult/child/youth/senior types and age constraints
- Language selection from real language list
- Meeting point display (`meeting_point` field from options)

This is a genuinely rich booking UX. The only thing missing is the final payment step.

**The two real blockers for full end-to-end booking:**
1. **Merchant credentials** — `is_merchant=false` on our sandbox consumer; steps 11–12 need this enabled
2. **Payment integration** — step 12 connects to Bridgify's payment processor (not a REST call we own)

**The shortcut: TOS Hub collapses this to one call.**
`POST /v1/catalog/:id/book` — TOS Hub handles the entire cart lifecycle server-side. Trip planner sends `{ id, date, timeslot, passengers, customer }` and gets back a `booking_ref`. All 12 Bridgify steps happen inside the hub. This is why wiring through TOS Hub (action D5) is cleaner than owning the 12-step flow.

**Exploration script:** `scripts/explore-booking-flow.mjs` — run `node scripts/explore-booking-flow.mjs` to re-explore with a live cart.

- **Currently**: Checkout button is a dead end — no booking call made
- **Action A (build UI for steps 1–8)**: [ ] Implementable now — date/option/timeslot/ticket/language selection with real API data, stops before payment
- **Action B (full booking)**: [ ] Needs merchant credentials from Bridgify + payment integration
- **Action C (TOS Hub path)**: [ ] Wire `POST /v1/catalog/:id/book` after D1–D5 complete

#### B2. Order Status & Cancellation
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/attractions/booking/orders/{uuid}/` | GET | Check order status |
| `/attractions/booking/orders/{id}/cancellation` | GET | Get cancellation policy |
| `/attractions/booking/orders/{id}/cancellation` | DELETE | Cancel order |

- **Currently**: No post-booking management
- **Action**: [ ] Add after cart flow is working

---

### LOW PRIORITY — Nice to have

#### C1. QR Code Generation
- **Backend**: `GET /attractions/products/qr-code/{id}/`
- **Used for**: Ticket display after booking
- **Action**: [ ] Add when booking confirmation page is built

#### C2. Spell Check
- **Backend**: `POST /attractions/spell-check/`
- **Used for**: "Did you mean...?" on search
- **Action**: [ ] Add if search UX needs improvement

#### C3. Inventory Suppliers List
- **Backend**: `GET /attractions/inventory-suppliers/`
- **Returns**: List of active suppliers (Viator, GetYourGuide, Tiqets, etc.)
- **Used for**: Filter by supplier, admin/debug
- **Action**: [ ] Low priority, nice for filtering

#### C4. Deals / Promotions
- **Backend**: `GET /attractions/deals/`
- **Returns**: GetYourGuide promotional offers
- **Used for**: Deals section on marketplace
- **Action**: [ ] Add if deals UI is built

---

## Missing Data Fields

Fields available in the backend but not yet mapped in `bridgify-adapter.ts`:

| Field | Backend Source | Current Mapping | Gap |
|-------|--------------|-----------------|-----|
| `geolocation` (lat/lng) | `attraction.geolocation` | ❌ Not mapped | Need for map view |
| `number_of_reviews` | `attraction.number_of_reviews` | ✅ `reviewCount` | OK |
| `is_free` | `attraction.is_free` | ❌ Not mapped | Show "Free" badge |
| `availability_type` | `attraction.availability_type` | ❌ Not mapped | BSN/CLD/TSL/EVT |
| `inclusions` | `additional_info.inclusions` | ❌ Not mapped | Detail page |
| `exclusions` | `additional_info.exclusions` | ❌ Not mapped | Detail page |
| `itinerary` | `additional_info.itinerary` | ❌ Not mapped | Detail page |
| `hotel_pickup` | `attraction.hotel_pickup` | ❌ Not mapped | Badge on card |
| `is_accessible` | `attraction.is_accessible` | ❌ Not mapped | Accessibility badge |
| `order_webpage` | `attraction.order_webpage` | ❌ Not mapped | Affiliate fallback link |
| `main_product` | `attraction.main_product` | ❌ Not mapped | Dedup / preferred variant |
| `categories` (structured) | `attraction.categories` M2M | ❌ Only raw string | Need structured categories |
| `photos` (gallery) | `additional_info.images` | ✅ `images` array | Check if populated |
| `artist_name` | `additional_info.artist_name` | ❌ Not mapped | Events/shows |
| `event_date` | `additional_info.event_date` | ❌ Not mapped | Events |

---

---

## POI / Geolocation Gaps (Explored 2026-05-20)

> **Script:** `scripts/explore-poi-dedup.mjs`

### What Bridgify Has

**Every product has `geolocation: { lat, lng }` populated** (100% of products sampled). This means a map view is technically possible — all the pin coordinates are there.

The standard search endpoint accepts loose geo params:
```
GET /attractions/products/?city_name=Barcelona&lat_min=41.3&lat_max=41.5&lng_min=2.0&lng_max=2.3
GET /attractions/products/?city_name=Barcelona&bbox=2.0,41.3,2.3,41.5
```
Both return HTTP 200. However, the `count` is **identical to an unfiltered city search** (2,881), which strongly suggests these params are accepted but silently ignored — the API is city-scoped, not geo-scoped.

### What Bridgify Does NOT Have

| Endpoint tried | Result | Meaning |
|----------------|--------|---------|
| `GET /attractions/pois/` | 404 | No POI registry |
| `GET /attractions/landmarks/` | 404 | No landmark grouping |
| `GET /attractions/geo/` | 404 | No geo-query endpoint |
| `GET /attractions/products/nearby/?lat=…` | 400 | Proximity search not supported |
| `GET /attractions/products/map/` | 400 | No map-optimised endpoint |
| `GET /attractions/products/clusters/` | 400 | No server-side clustering |
| `GET /attractions/places/` | 404 | No places API |

**There is no way to query Bridgify by proximity, radius, or bounding box.** The geo params on the search endpoint appear to be dead code. All geo intelligence must be done client-side.

### What This Means for Map View

To build a map with pinned activities:
1. Fetch all products for the city (could be 2,000+)
2. Filter and cluster the `geolocation` coordinates in the browser
3. Render pins — but with no landmark identity, each product is an isolated pin

**With TOS Hub**: `hub_global_pois` is a proper landmark registry (Sagrada Família, Park Güell, etc.) with all supplier products linked to canonical landmarks. Map shows one pin per landmark, clicking it shows all variants.

**Without TOS Hub**: You get 324 pins for "Sagrada Família" (one per product) because there is no grouping concept in Bridgify. The client would have to cluster by proximity heuristics — imprecise and expensive.

### Action Items

- [ ] **P1. Wire `geolocation` field to map view** — all products have lat/lng, add them as pins to the itinerary map tab (already built, just needs data)
- [ ] **P2. Client-side geo clustering** — group pins within ~50m radius for the Bridgify-direct path (imperfect but workable stopgap)
- [ ] **P3. TOS Hub POI map** — use `hub_global_pois` + `/v1/catalog/browse?poi_id=…` for true landmark-based map view (proper solution, after D1–D5)

---

## Duplicate Products in Bridgify (Explored 2026-05-20)

> **Script:** `scripts/explore-poi-dedup.mjs`  
> **Severity: High.** 50% of results in a 100-product sample were exact duplicates. Cross-supplier duplication adds further noise on top.

### Type 1 — Pagination Duplicates (Bridgify Bug)

When fetching page 1 (50 results) and page 2 (50 results) for `text_search=tour` in Barcelona, **50 of the 100 products share the same `external_id` and `uuid`** — the same object appears on both pages.

```
external_id 1177  →  appears on page 1 AND page 2: "Barcelona: Montserrat Tour..."
external_id 41657 →  appears on page 1 AND page 2: "Palau de la Musica Guided Tour..."
external_id 44533 →  appears on page 1 AND page 2: "Paella Cooking Experience..."
```

This is a Bridgify-side pagination bug. It means:
- Our carousels and marketplace show duplicates when results span multiple pages
- `useBridgifySearch` with `page_size=6` is probably fine, but any "load more" / infinite scroll would hit this immediately
- Result counts are inflated — `count: 1598` may actually represent ~800 unique products

**Current workaround needed**: Deduplicate by `external_id` after fetching, before rendering.

### Type 2 — Cross-Supplier Duplicates

The same real-world tour is listed by multiple suppliers at different prices. This is intentional (Bridgify aggregates 15 suppliers) but the user sees them as separate products with no indication they're the same experience:

| Tour | GYG price | Viator price | Price delta |
|------|-----------|--------------|-------------|
| Costa Brava: Kayak, Snorkel & Cliff Jump | $99.56 | $71.77 | $27.79 (28% cheaper) |
| Sagrada Família Skip-the-Line Guided Tour | $72.62 | $64.59 | $8.03 (11% cheaper) |
| Park Güell Guided Tour | $31.72 | — | (GYG only in this sample) |

**Sagrada Família alone has 324 products** across GetYourGuide (25), Viator (16), and Tiqets (9) in the first 50 results — with prices ranging from **$3.59 to $108.85** (a 30× range). A user searching for "Sagrada Família" sees a wall of near-identical listings with no indication that cheaper or better-reviewed versions exist.

### Supplier Distribution in Results

In a 100-product sample for Barcelona "tour":
- Viator: 54 products
- GetYourGuide: 36 products
- Tiqets: 8 products
- HotelBeds: 2 products

Viator dominates. Bridgify's ranking (or lack thereof) means Viator products appear first regardless of quality.

### What We're Currently Doing Wrong

The `src/app/api/bridgify/search/route.ts` proxy sorts by `best_seller` flag but does **no deduplication**. A user who browses past the first 6 results will see the same products repeated.

### Action Items

- [ ] **DUP1. Deduplicate by `external_id` in search proxy** — after fetching, filter to unique `external_id` before returning. Simple fix, should be in the proxy not the client. Add to `src/app/api/bridgify/search/route.ts`.
- [ ] **DUP2. Report pagination bug to Bridgify** — products appearing on multiple pages is their backend bug; they should fix it but we need the client-side dedup as a workaround regardless.
- [ ] **DUP3. Cross-supplier dedup** — harder: same tour from GYG + Viator needs title similarity matching to group. This is exactly what TOS Hub's dedup engine does (3-layer: rule → embedding cosine → LLM judge). No good client-side solution without TOS Hub.
- [ ] **DUP4. Show cheapest supplier** — once deduped, surface the cheapest option for each landmark with a "from $X" price rather than arbitrary supplier selection.

---

## Bridgify Sandbox Availability Gap

> **Severity: Medium.** The availability endpoint is unreliable in sandbox — it returns `400` or `404` for the majority of products regardless of date range or product type. This affects the entire availability UX.

### What Happens

`GET /attractions/products/availability/{external_id}/?date_from=...&date_to=...` returns:

| Response | Frequency in sandbox | Meaning |
|----------|---------------------|---------|
| `200` with slot data | Rare (~5% of products) | Product has real availability loaded |
| `400 Bad Request` | Common | Sandbox has no availability data for this product |
| `404 Not Found` | Common | Product exists but availability not populated in sandbox |

The sandbox does **not** distinguish between "this product is an open voucher (BSN)" and "this product has time slots but we haven't loaded the data." Both return `400`/`404`.

### Impact on Trip Planner

- Cannot show real date/time slots for most products in sandbox
- Cannot reliably detect BSN (open voucher) type from the availability response alone
- SWR's default `shouldRetryOnError: true` caused the error to trigger a visible retry loop

### Workarounds Applied

1. **`shouldRetryOnError: false`** on `useBridgifyAvailability` hook — stops the retry loop on first failure (`src/lib/api-client.ts`)
2. **Date-picker fallback** — when availability returns an error, the sidebar shows a plain date input so the user can still pick a date and add to their trip (`src/components/demo/ServiceDetailsSidebar.tsx`)
3. **Manual trigger** — availability is only fetched after the user clicks "Check Availability" (not on sidebar open), matching the TOS integration hub pattern and preventing unnecessary failed requests

### Production Behaviour

In production (`api.bridgify.io`) the availability endpoint is expected to work correctly for all products. The `400`/`404` pattern is sandbox-only. The fallback date picker will never show in production for products that have real slot data.

### Action Items

- [ ] **E1. Map `availability_type` from search response** — the field `attraction.availability_type` (BSN/CLD/TSL/EVT) is returned in the product search response but not yet mapped in `bridgify-adapter.ts`. If we read this field, we can skip the availability API call entirely for BSN products and show "Open voucher" immediately without a round-trip.
- [ ] **E2. Use `availability_type` to drive the UI** — if `availabilityType === 'BSN'`, show open voucher banner and skip the Check Availability button; if `CLD`/`TSL`/`EVT`, show the date form as normal.
- [ ] **E3. Test against production credentials** — once production API access is available, verify that availability returns correct slot data and the fallback path is never hit for real products.

---

## Data Shape Differences

Things we learned from the actual API response vs what we assumed:

| Field | Expected (from plan) | Actual (from API) | Fix Applied? |
|-------|---------------------|-------------------|-------------|
| `price` | `{ amount, currency }` object | Flat number (e.g. `34.07`) | ✅ Yes — `resolvePrice()` |
| `location` | Always present | Sometimes `undefined` | ✅ Yes — null guard |
| `status` | Always present | Sometimes missing | ✅ Yes — made optional |
| `currency` | In price object | Not in search response | ✅ Yes — default USD |
| `external_id` | Primary ID | Confirmed as primary ID | ✅ Correct |

---

## Authentication Notes

- **Current**: OAuth2 client_credentials via `POST /accounts/token/`
- **Backend also supports**: JWT (`POST /api/token/`), API key header, session auth
- **APIConsumer model**: Each client has `percentage_fee`, `service_fee`, `is_merchant`, `is_sandbox_mode`
- **Our consumer**: Sandbox mode, credentials in `.env.local`
- **Production**: Would need a real APIConsumer record with merchant config

---

## Supplier-Specific Behaviors

The backend abstracts 15 suppliers behind one API. Behaviors vary:

| Supplier | Booking Flow | Availability | Notes |
|----------|-------------|-------------|-------|
| Viator | Cart → dates → tickets → order | CLD + TSL | Largest catalog |
| GetYourGuide | Cart → dates → tickets → order | CLD + TSL | Dual API key rotation |
| Tiqets | Cart → dates → tickets → order | CLD | Museum/attraction focus |
| Hotelbeds | Cart → dates → order | CLD | OAuth2 + HMAC |
| AttractionWorld | Cart → dates → tickets → order | CLD + TSL | Webhooks for status |
| SportsEvents365 | Cart → dates → tickets → order | EVT | Live events only |
| Ticketero | Cart → order | BSN | Open vouchers |
| GoCity | Cart → dates → order | CLD | City passes |

---

---

## Why TOS Integration Hub >> Bridgify Direct

> **Summary**: Bridgify is a raw aggregation API — it exposes 15 suppliers behind one auth layer but does nothing else. Every consumer has to solve the same quality problems independently. TOS Hub solves them once, correctly, server-side.

### Head-to-Head Comparison

| Capability | Bridgify Direct (current) | TOS Integration Hub |
|---|---|---|
| **Search quality** | Title/description keyword match only. `"outdoor"` → 2 results. `"wellness"` → 0. | MiniLM-L6-v2 semantic embeddings in pgvector. `"romantic outdoor adventure"` finds relevant results even if those words aren't in the title. |
| **Duplicate products** | Same activity listed by Viator AND GetYourGuide AND Tiqets appears 3× in results. No dedup. | 3-layer dedup engine: rule-based → embedding cosine similarity → Claude LLM judge. User sees one canonical result per product. |
| **Result ranking** | Effectively random — order reflects supplier ingestion order, not user relevance. | 6-factor weighted ranking: semantic relevance + popularity + rating + margin + availability + supplier priority. Best results first. |
| **Category filtering** | Products have a `category` field, but the search endpoint doesn't accept it as a filter. You can't say "show me museums only." | Three-tier canonical taxonomy, fully filterable. Works consistently across all 15 suppliers (Viator "SIGHTSEEING" = GYG "Sightseeing" = canonical "Sightseeing"). |
| **Availability checking** | One HTTP call per product. Bridgify sandbox returns 400/404 for ~95% of products. | Batch availability: up to 20 products in one POST. Supplier-abstracted — no per-supplier availability quirks. |
| **Booking flow** | 12-step cart flow, different required fields per supplier (Viator cart ≠ GYG cart ≠ Tiqets cart). Each step is a separate endpoint. Client must know which supplier it's talking to. | Single `POST /v1/catalog/:id/book` with unified schema. Hub handles supplier routing, field mapping, and lifecycle tracking. |
| **Booking lifecycle** | Nothing. Once you POST an order you have no record of it. | Booking rows in `hub_bookings` table: pending → confirmed → cancelled. Supports status polling, cancellation, refund tracking. |
| **Supplier transparency** | `external_id` leaks which supplier the product came from, but no structured supplier metadata. | Explicit `supplier` field on every product. Can filter or badge by supplier. Can route to preferred supplier for same product. |
| **Landmark clustering** | None. Search for "Eiffel Tower" returns 15 near-identical variants as separate results. | Geo + fuzzy title clustering groups all variants under one landmark. User picks the variant they want, not a wall of duplicates. |
| **POI / Map** | Lat/lng in search response but no POI registry. Client must cluster pins itself with no landmark context. | Global POI registry (`hub_global_pois`). Products linked to canonical landmarks. Map pins cluster by POI, not by raw coordinate proximity. |
| **Multi-supplier pricing** | One price per product. No visibility into net cost, margin, or whether a cheaper supplier exists for the same product. | Net pricing support. Margin control per supplier. Can show cheapest supplier for same landmark. |
| **Data freshness** | Fresh from Bridgify on every request. No sync lag, but also no caching, no enrichment. | Periodic sync (`hub_supplier_pois` → ETL → `hub_static_inventory`). Slightly stale but enriched, deduped, and ranked. Availability is still live. |
| **Category vocabulary** | 33 raw captions, not normalized. Same concept has different names per supplier. | Canonical 3-tier taxonomy built by LLM-assisted mapping. "Historic Sites", "Heritage", "Historical Landmarks" all map to the same canonical bucket. |
| **City autocomplete** | `GET /attractions/cities/` returns a list but no attraction counts, no ranking. | `/v1/catalog/cities` returns cities ranked by attraction count, with thumbnail. Better for destination selection UX. |

### The Core Problem with Bridgify Direct

Every client that uses Bridgify raw has to independently solve:
- Keyword → intent translation (we built `VIBE_TO_SEARCH` as a stopgap)
- Duplicate suppression (we don't — users see the same tour 3 times)
- Result ranking (we don't — results are in ingestion order)
- Supplier-specific booking field mapping (we haven't built the cart flow at all)
- Availability normalization (we built a BSN synthetic fallback just to not crash)

These are infrastructure problems, not product decisions. TOS Hub solves them once. Rebuilding them in the trip-planner is wasted effort.

### Migration Path

The blocker for switching is **ID coupling**: the entire app uses Bridgify `external_id` as the product key. The AI assistant proposals, the itinerary activities, the cart — all reference `external_id`. TOS Hub uses `supplier_raw_ref` (a different identifier). Both need to switch together or there will be data mismatches between proposals and bookable products.

See action items D1–D6 and F1 below.

---

## Current App Gaps (Regardless of Data Source)

These gaps exist at the application level — they are not fixed by switching from Bridgify to TOS Hub. They represent missing features and incomplete flows in the trip planner itself.

### G1 — Booking Flow Is Not Wired (HIGH)

The "Add to Cart" and checkout buttons exist in the UI but the actual cart-based booking flow is not implemented. The current flow:

1. User clicks "Add to Cart" on an activity → item added to local cart state ✓
2. User goes to `/cart` → sees items ✓
3. User clicks "Checkout" → **dead end** (no real booking call)

What's missing:
- Cart creation (`POST /attractions/booking/cart/`)
- Per-item required fields (`GET .../required-fields/`) — each supplier needs different passenger info
- Timeslot selection wired to the sidebar availability UI
- Passenger detail collection form
- Order creation (`POST /attractions/booking/orders/`)
- Payment gateway (Bridgify uses its own payment layer in production)
- Post-booking confirmation page with real booking reference

**Impact**: The app is a trip *planner* that cannot actually book anything. Every activity added is `bookingStatus: 'planned'` forever.

### G2 — Activity Detail Page Needs Product API (HIGH)

The product detail endpoint (`GET /attractions/products/{id}/`) returns much richer data than the search listing: full description, inclusions, exclusions, itinerary, meeting point, accessibility info, all photos, cancellation policy. We currently only show what came from the search result (truncated description, first photo, basic metadata).

**What's missing**: A dedicated detail fetch when the `ServiceDetailsSidebar` opens, wiring the full `additional_info` payload to the UI.

### G3 — No Real Trip Sync ✅ FIXED 2026-05-25 (see IG1–IG3 above)

The DB schema, routes, and context wiring are now fully connected. TripContext loads from DB on login and auto-saves on every mutation (2s debounce). See Implementation Gaps section for full detail.

**Remaining:** Two editors editing the same shared trip will still overwrite each other (last write wins). No conflict detection or merge strategy. This is a new feature (G4 real-time collaboration) not an implementation gap.

### G4 — Real-Time Collaboration Is Stateless (MEDIUM)

`trip_members` lets multiple users join the same trip, but there is no live sync mechanism. If Alice adds an activity and Bob has the same trip open, Bob sees nothing until he refreshes.

Options (in order of complexity):
- Polling: `GET /api/trips/[id]` every 30s — simple, adds some latency
- Server-Sent Events: stream trip mutations — medium complexity, works in Next.js
- WebSocket: full real-time — requires a separate WS server or a service like Pusher

### G5 — AI Chat Has No Streaming (MEDIUM)

The AI assistant waits for the full Claude response (including all tool calls) before rendering anything. A 5-turn agentic loop with 3 Bridgify searches can take 15–25 seconds with no feedback beyond "Thinking…"

**Fix**: Switch `/api/ai-chat` to the Anthropic streaming API and stream text chunks back using a `ReadableStream`. The `AIChatPanel` renders tokens as they arrive.

### G6 — No Budget / Cost Tracking (MEDIUM)

The itinerary displays individual activity prices, but there is no:
- Trip total cost summary
- Per-day spend breakdown
- Budget cap with over-budget alert
- Currency conversion (all prices assumed USD)
- Cost split across travelers

### G7 — Documents Wallet Has No Real File Storage (MEDIUM)

`DocumentsWallet` component exists with UI for flight confirmations, hotel vouchers, etc., but is wired to mock data only. There is no:
- File upload endpoint
- S3 / object storage backend
- PDF viewer
- Auto-parse of booking confirmation emails

### G8 — Notes Have No CRUD API (LOW)

Trip notes are in `mock-data.ts` only. There is no:
- `POST /api/trips/[id]/notes` to create a note
- `PUT /api/trips/[id]/notes/[noteId]` to update
- `DELETE /api/trips/[id]/notes/[noteId]` to delete

The Notes tab in the sidebar is read-only decoration.

### G9 — No Calendar / Export Integration (LOW)

Users cannot:
- Export their itinerary to Google Calendar / iCal (`.ics` file)
- Share a calendar link with travel companions
- See activities overlaid on a real calendar (the Calendar view tab exists but uses mock data)

### G10 — No Offline / PWA Support (LOW)

The app requires a network connection for everything. There is no:
- Service worker
- Offline fallback (cached trips)
- Add-to-home-screen manifest
- Background sync when connection returns

### G11 — Activity Conflict Detection (LOW)

No logic checks whether:
- Two activities overlap in time on the same day
- A day has more activities than realistically possible (e.g. 8 hours of tours)
- Travel time between activity locations is accounted for

### G12 — Search Has No Pagination (LOW)

`GET /attractions/products/` supports `page` and `page_size` parameters, but the frontend only ever fetches page 1 with a fixed limit. Marketplace and AI search results are silently capped at 6–10 items.

**Fix**: Add infinite scroll or "Load more" to marketplace and AI proposal cards.

### G13 — No Wishlist / Saved Activities (LOW)

Users can only add an activity to a specific trip day. There is no way to save an activity for later consideration without committing it to a day. A wishlist (activities bookmarked but not yet scheduled) is a common travel planning pattern.

### G14 — AI Chat History Not DB-Backed (LOW)

Chat LTM uses `localStorage` keyed by `userId + tripId`. This means:
- History is lost if the user clears their browser
- History is not available on other devices
- No admin visibility into conversations (for debugging or training data)

**Fix**: Add a `chat_messages` table in `trip_planner` schema, write through on every assistant reply. `localStorage` becomes a read cache only.

### G15 — No Email Notifications (LOW)

No transactional emails beyond OTP:
- "Someone joined your shared trip" notification
- "Your booking was confirmed" email with voucher
- "Trip reminder" email N days before departure
- "Price drop" alert for saved activities

### Available tos-hub Catalog Endpoints

| Endpoint | Method | What it adds over raw Bridgify |
|----------|--------|-------------------------------|
| `/v1/catalog/browse` | GET | Deduped results, ranked by 6-factor scoring, category-filtered |
| `/v1/catalog/search` | GET | **Semantic search** via pgvector embeddings (not just text match) |
| `/v1/catalog/query` | POST | Semantic search with pagination |
| `/v1/catalog/cities` | GET | City autocomplete with attraction counts |
| `/v1/catalog/categories` | GET | Three-tier canonical taxonomy (not supplier-raw) |
| `/v1/catalog/:id` | GET | Detail with canonical category mapping |
| `/v1/catalog/:id/availability` | POST | Availability with supplier abstraction |
| `/v1/catalog/:id/book` | POST | Booking with lifecycle tracking |
| `/v1/catalog/availability` | POST | **Batch** availability (up to 20 IDs at once) |
| `/v1/catalog/:id/occurrences` | GET | Recurring event instances |

### Intelligence Features (Unique to tos-hub)

| Feature | What it does | Benefit |
|---------|-------------|---------|
| **Dedup engine** | 3-layer: rule-based + embedding cosine + Claude LLM judge | No duplicate products from different suppliers |
| **Ranking** | 6 weighted signals: semantic, popularity, rating, margin, availability, supplier_priority | Better default sort than raw API |
| **Semantic search** | MiniLM-L6-v2 embeddings in pgvector | "romantic dinner" finds wine-tasting even if title doesn't say "romantic" |
| **Attraction clustering** | Groups products by landmark (geo + title fuzzy match) | "Eiffel Tower" shows all 15 variants grouped |
| **Category mapping** | LLM-assisted supplier→canonical taxonomy | Consistent categories across Viator, GYG, Tiqets, etc. |
| **POI management** | Global POI registry with supplier linkage | Map view with clustered pins |

### Data Path Options

| Path | Pros | Cons | When to use |
|------|------|------|-------------|
| **Direct → Bridgify API** (current) | Simple, no middleware dependency | Raw data, duplicates, no ranking | MVP / demo |
| **Through tos-hub** | Deduped, ranked, semantic search, categories | Requires tos-hub running (port 3000) | Production |
| **Hybrid** | Best of both — Bridgify for speed, tos-hub for intelligence | More complex routing | Scale |

### Action Items

- [ ] **D1. Wire tos-hub catalog/search** — Add proxy route + SWR hook for `/v1/catalog/search` (semantic)
- [ ] **D2. Wire tos-hub categories** — Use canonical taxonomy instead of hardcoded tags
- [ ] **D3. Wire tos-hub cities** — City autocomplete with attraction counts
- [ ] **D4. Wire tos-hub browse** — Ranked, deduped results for marketplace
- [ ] **D5. Evaluate: replace Bridgify direct with tos-hub** — Once tos-hub is stable, route all calls through it
- [ ] **D6. Batch availability** — Use `/v1/catalog/availability` POST for itinerary day view (check 5-10 items at once)

### Required: tos-hub must be running

tos-hub runs on `localhost:3000` (Express). It needs:
- PostgreSQL with pgvector extension
- Bridgify credentials in its `.env`
- `npm run sync` to populate `hub_static_inventory` (first run)
- `npm run build-embeddings` to generate vectors (first run)

---

## API Failure: No Semantic Search — Client Must Guess Keywords

> **Severity: High.** This is a design failure in the Bridgify search API, not a missing feature. It pushes category intelligence onto every client independently and produces unpredictable, city-dependent results.

### What the API Does

`GET /attractions/products/?text_search=<term>&city_name=<city>` performs a **naive text match** against product titles and descriptions. There is no intent understanding, synonym resolution, or category awareness. The term `"outdoor"` does not return outdoor activities — it returns products whose *title contains the word "outdoor"*.

### Evidence: Result Count by Keyword (Barcelona)

Measured 2026-05-15 against the Bridgify sandbox:

| User Intent | Keyword Tried | Results | Notes |
|-------------|--------------|---------|-------|
| Nature & Outdoors | `outdoor` | **2** | Only products with "outdoor" in title |
| Nature & Outdoors | `park` | 163 | Better — but means parks specifically |
| Nature & Outdoors | `hiking` | 40 | Good — but misses cycling, kayaking |
| Nature & Outdoors | `nature` | 4 | Too narrow |
| Nightlife | `nightlife` | **1** | Effectively broken |
| Nightlife | `bar` | 47 | Works but misses clubs, shows |
| Wellness | `wellness` | **0** | Zero results |
| Wellness | `spa` | 13 | Works |
| Food & Dining | `food` | 74 | OK |
| Food & Dining | `tapas` | 206 | Far better for Barcelona specifically |
| Culture | `museum` | 153 | Good |
| Culture | `art` | 55 | Partially overlapping |
| History | `historical` | 0–5 | Sparse |
| History | `history` | 31 | Better |
| Entertainment | `show` | ~20 | Limited |
| Entertainment | `flamenco` | 60 | Barcelona-specific, not generalisable |

### Why This Is a Problem

**1. The client must maintain a city × vibe keyword matrix.**
A term that works for Barcelona (`tapas`) returns nothing in Tokyo. The mapping must be maintained per destination, not per intent. This knowledge does not belong in the frontend.

**2. Synonyms are not equivalent.**
`"outdoor"` (2 results) and `"park"` (163 results) describe the same user intent but produce radically different results. A user who picks "Nature & Outdoors" would see 2 products if we guessed the wrong synonym — and we would not know it was wrong without measuring.

**3. Results are sparse for legitimate categories.**
Wellness (0), Nightlife (1), and Outdoor (2) are real travel categories but essentially invisible in the API unless you know the exact title keywords Bridgify suppliers happen to use.

**4. Multi-vibe queries are not possible.**
A user who wants "museums and food" cannot express that in one query. The API has no `OR` logic, no multi-term boosting, no category filter on the search endpoint.

**5. The category field on products is not filterable.**
Products have a `category` field (e.g. `"CULTURE"`, `"OUTDOOR"`), but `GET /attractions/products/` does not accept `category` as a query parameter for filtering. It only accepts free-text search.

### Our Current Workaround

`src/lib/utils.ts` contains `VIBE_TO_SEARCH` — a hardcoded map from user-facing vibes to API-compatible search keywords:

```ts
export const VIBE_TO_SEARCH: Record<string, string> = {
  nature:    'park',       // 'outdoor' returns only 2 results
  nightlife: 'bar',        // 'nightlife' returns 1 result
  wellness:  'spa',        // 'wellness' returns 0 results
  food:      'tapas',      // Barcelona-specific; 'food' returns 74
  ...
};
```

**This is fragile.** It is a client-side approximation of semantic understanding that:
- Breaks when used for cities other than Barcelona
- Must be updated manually as supplier content changes
- Cannot express compound intent or ranked relevance
- Silently degrades (returns 2 instead of 0, so no visible error)

### The Right Solution

The Bridgify backend does not expose semantic search. However **tos-hub already has it:**

- `GET /v1/catalog/search?q=nature+outdoors+Barcelona` — MiniLM-L6-v2 embeddings in pgvector
- Resolves "nature activities", "outdoor adventures", "hiking and cycling" to the same results
- Works across all cities because it matches intent, not title text
- Returns ranked results (6-factor scoring) with deduplication

**Action items:**
- [ ] **A1. Remove `VIBE_TO_SEARCH` from client** — this logic must not live in the frontend
- [ ] **A2. Wire tos-hub `/v1/catalog/search`** — pass user vibe labels or natural-language queries directly
- [ ] **A3. Add `category` filter to Bridgify search** — request this from Bridgify as an API improvement; products have the category field, it just isn't filterable
- [ ] **A4. Until tos-hub is wired: expand keyword fallbacks** — for each vibe, try the primary term and if results < 8, fall back to secondary terms (requires two sequential SWR calls)

---

---

## Bugs Fixed & Features Implemented

### 2026-05-15

#### BUG: `Cannot access 'isHotel' before initialization` — `ServiceDetailsSidebar` crash
- **Symptom**: Trip page crashed immediately when opening any activity detail sheet.
- **Root cause**: `useBridgifyAvailability` hook was called before `const isHotel = type === 'Hotel'` was declared. React hooks must not reference variables declared after them in the function body.
- **Fix**: Moved `const isHotel = type === 'Hotel'` to the top of the component body, before all hook calls.
- **File**: `src/components/demo/ServiceDetailsSidebar.tsx`

#### BUG: Availability sidebar shows "Could not load availability" for almost all products
- **Symptom**: Every activity detail sidebar showed a hard error — no date slots, no way to add to trip.
- **Root cause**: Bridgify sandbox returns `404` or `400` for the availability endpoint on most products, particularly BSN (open voucher) types. The proxy route was forwarding those status codes directly to the client, causing `availError` to be set and blocking the UI.
- **Fix applied (proxy layer)**: `src/app/api/bridgify/[productId]/availability/route.ts` now maps `404` and `400` responses — and empty/typeless slot arrays — to a synthetic `{ data: { type: 'BSN', slots: [] } }` response. BSN means the product is an open voucher with no slot constraints.
- **Fix applied (UI layer)**: Added `availFailed` state for genuine 5xx errors; shows an amber notice + manual date picker as fallback. The "Add to Trip" button remains usable.
- **Note**: This is a sandbox limitation. In production, most products will return real slot data.

#### BUG: Wizard vibe selection had no influence on recommendations
- **Symptom 1**: All day recommendation carousels showed identical "tour" results regardless of vibes chosen in the wizard.
- **Root cause 1 (mock trip)**: The default mock trip (`src/lib/mock-data.ts`) had no `vibes` field, so `trip.vibes` was `undefined` → `VIBE_TO_SEARCH` returned nothing → fell back to `'tour'` for all days.
- **Fix**: Added `vibes: ['culture', 'food', 'history']` to the mock Barcelona trip.
- **Root cause 2 (single-term search)**: `ItineraryDay` only ever called one `useBridgifySearch` hook using `vibestoSearchTerm()` which returns the first vibe's term only.
- **Fix**: `ItineraryDay` now derives up to 3 unique search terms from all selected vibes and calls 3 parallel SWR hooks. Results are round-robin interleaved and deduplicated by `external_id`. Carousel title reflects active vibes: "Museum & Tapas picks for Day 1".
- **File**: `src/components/demo/ItineraryDay.tsx`, `src/lib/mock-data.ts`

#### FEATURE: Availability UI rewritten to match TOS integration hub pattern
- **Previous state**: Hardcoded time dropdown (09:00 AM / 10:00 AM etc.), never called availability API, "Add to Trip" permanently disabled for attractions.
- **New behaviour**:
  - Fetches the full leg date range at once (e.g. Jun 15–22) rather than a single day.
  - Renders clickable **date slot cards** (matches `integration_hub_detail.html` slot grid): each card shows date + "3 times" or "All day".
  - Clicking a card reveals **time pills** for that date; auto-selects first available time.
  - BSN (open voucher) → single green banner, no date selection required.
  - "Add to Trip" now enabled correctly for all attraction types.
  - Footer summary: `Total · 2 guests · Wed, Jun 18 at 10:00`.
- **File**: `src/components/demo/ServiceDetailsSidebar.tsx`

#### FEATURE: Best seller prioritisation
- **What**: `best_seller: true` flag from `additional_info.external_exclusive_fields.best_seller` is now mapped and surfaced throughout the app (~8% of products).
- **Search proxy** (`src/app/api/bridgify/search/route.ts`): Sorts best sellers to the top of every search result before returning — affects marketplace, carousels, and day recommendations.
- **Adapter** (`src/lib/bridgify-adapter.ts`): Maps `isBestSeller: boolean` onto the `Attraction` type.
- **ServiceCard** (`src/components/demo/ServiceCard.tsx`): Shows an amber "Best Seller" badge (Award icon) on the top-left of the card image.
- **Type** (`src/types/services.ts`): Added `isBestSeller?: boolean` to `Attraction`.

---

---

## Bugs Fixed & Features Implemented (cont.)

### 2026-05-20

#### BUG: Sessions `VARCHAR(64)` silently truncated JWT tokens
- **Symptom**: OTP verified successfully (marked `used = true`) but immediately showed "Invalid or expired code" on next attempt. Session cookie never set.
- **Root cause**: `trip_planner.sessions.token` was `VARCHAR(64)`. JWT tokens are ~200 chars. The INSERT silently failed due to value too long — Postgres truncation error was swallowed.
- **Fix**: `ALTER TABLE trip_planner.sessions ALTER COLUMN token TYPE TEXT`
- **Migration**: `migrations/001_trip_planner_schema.sql` updated to use `TEXT` for `token`

#### BUG: Share link crashed with "Unexpected end of JSON input"
- **Symptom**: Clicking Share generated a spinner but no link. Console showed JSON parse error.
- **Root cause**: `POST /api/trips/share` was updating `share_token` using `tripId` (the client `local_id`) in a `WHERE id = $2` clause. UUID vs varchar mismatch caused `UPDATE` to match 0 rows, `share_token` stayed `NULL`, and the route crashed when trying to return it.
- **Fix**: Fetch the DB row first (`rows[0].id` is the real UUID), use that as `dbId` for all subsequent queries.
- **File**: `src/app/api/trips/share/route.ts`

#### BUG: Share dialog conflicting triggers caused double-fire
- **Symptom**: Share dialog would open and immediately close, or open twice.
- **Root cause**: Both a `<DialogTrigger>` and a manual `open` state prop were wired to the same dialog, causing conflicting open/close events.
- **Fix**: Removed `<DialogTrigger>`. Dialog is fully controlled via `open` prop; the Share button calls `handleShareClick()` directly.
- **File**: `src/components/demo/ShareDialog.tsx`

#### BUG: Wrong port — hitting Integration Hub instead of Trip Planner
- **Symptom**: Auth requests returned "missing Bearer token" — the Express error format from the integration hub, not Next.js.
- **Root cause**: `.env.local` had `NEXT_PUBLIC_APP_URL=http://localhost:3000` (integration hub port). Trip planner runs on **port 3001**.
- **Fix**: Updated to `NEXT_PUBLIC_APP_URL=http://localhost:3001`

#### FEATURE: Auth system (email + bcrypt + OTP MFA)
- **No login wall** — guests plan freely; auth only required for Save, Share, and AI chat history.
- `POST /api/auth/register` → hash password with bcrypt (cost 10), send 6-digit OTP via Resend
- `POST /api/auth/login` → verify password, send OTP
- `POST /api/auth/verify-otp` → mark OTP used, create session row, set `wv_session` httpOnly cookie (JWT, 7-day)
- `GET /api/auth/me` → return user from cookie; called on every app mount via `AuthContext`
- `POST /api/auth/logout` → delete session row, clear cookie
- `AuthModal` component: two-step dialog (email+password → OTP input), controlled externally via `onAuthenticated` callback
- `UserMenu` component: avatar + email in `AppToolbar`; shows logout option

#### FEATURE: Trip persistence to Postgres
- `POST /api/trips` → upserts trip batch from localStorage; deduplicates by `local_id` to prevent double-save
- `GET /api/trips` → queries via `trip_members` JOIN — returns both owned and shared trips
- Legs and activities stored in `trip_legs` and `activities` tables
- `trip_members` table stores `owner` or `editor` role per user per trip

#### FEATURE: Trip sharing with true collaboration
- Share button (auth-gated) in `TripDetailsView` sidebar
- `POST /api/trips/share` auto-saves the trip to DB first, then generates/returns a 40-char hex `share_token`
- Public page at `/trip/share/[token]` — read-only view with activity cards grouped by day
- "Edit this trip" button → auth modal (if not logged in) → `POST /api/trips/join` → added as `editor` in `trip_members` → `addTrip()` injects trip into TripContext → redirect to `/trips`
- Both owner and editor see the same trip row; future edits from either user update the same record

#### FEATURE: AI chat assistant (Claude + Bridgify tools)
- Floating indigo/violet button fixed bottom-right; slides in a 420px panel from the right
- `POST /api/ai-chat` — agentic Claude loop (up to 5 turns) with 3 tools:
  - `search_activities` — server-side Bridgify call, returns up to 10 activities
  - `propose_add_activity` — Claude surfaces a specific activity as a confirmable card in the chat
  - `propose_remove_activity` — Claude proposes removing an activity with confirm/keep buttons
- Trip context injected as system prompt: all legs, days, existing activities with IDs
- Markdown table rendering: chat messages containing `|`-based tables are parsed and rendered as styled `<table>` components (indigo header, striped rows, hover highlight)
- Chat LTM: logged-in users have history saved to `localStorage` key `chat_ltm_{userId}_{tripId}` (60-message cap); guests get ephemeral session only

#### BUG: AI assistant stuck on "Thinking…" forever — never responded
- **Symptom**: Sending any message caused the assistant to spin indefinitely with no response.
- **Root cause**: The `messages` array sent to the Anthropic API started with the greeting message (`role: 'assistant'`). Anthropic's API requires every conversation to start with a `user` message — a leading `assistant` message causes a silent rejection.
- **Fix**: In `AIChatPanel.tsx`, before calling `/api/ai-chat`, strip any leading assistant messages: `const firstUserIdx = next.findIndex(m => m.role === 'user'); const apiMessages = firstUserIdx >= 0 ? next.slice(firstUserIdx) : [];`
- **File**: `src/components/demo/AIChatPanel.tsx`

#### BUG: Greeting said "I know your Trip to Barcelona to Barcelona (BCN)"
- **Symptom**: Redundant destination in the opening greeting — trip name already contained the city.
- **Root cause**: Greeting template was `"I know your **${trip.name}** to **${trip.destination}**"` — both were "Barcelona".
- **Fix**: Simplified to `"I'm all set to help with your **${trip.name || 'trip'}**"` — no destination suffix.
- **File**: `src/components/demo/AIChatPanel.tsx`

#### BUG: Claude said "Here are options below" but no activity cards appeared
- **Symptom**: Claude acknowledged the request and said to look below, but the chat showed no proposal cards.
- **Root cause (1)**: Claude was calling `search_activities` but then generating a text reply instead of calling `propose_add_activity`. Confirmed via `scripts/test-ai-chat.mjs` which returned `proposals.length: 0`.
- **Root cause (2)**: `max_tokens: 1024` was too low. With 7+ messages of history + system prompt + search result JSON, Claude hit the token limit (`stop_reason: max_tokens`) before it could generate tool calls, returning an empty text response.
- **Fix (1)**: Added `tool_choice: { type: 'any' }` on the API call made after a search returns results — this forces Claude to call a tool rather than ending with text.
- **Fix (2)**: Raised `max_tokens` from 1024 to 4096 on all Claude API calls in the route.
- **File**: `src/app/api/ai-chat/route.ts`

#### FEATURE: AI chat — server-side intent classification + parallel Bridgify pre-fetch
- **Problem**: Claude was doing Bridgify searches inside the agentic loop (1–2 sequential tool call turns = slow). For niche categories like "Shows & Performances", it would return 0 results and Claude had no fallback strategy.
- **Solution**: Moved all search logic out of Claude. Before calling Claude, the route:
  1. Runs `classifyIntent(lastUserMessage)` — a 23-rule regex map that translates user intent to 2–3 Bridgify category terms (e.g. "live performances" → `['Shows & Performances', 'Music', 'Festivals']`)
  2. Runs `Promise.all()` over those terms — parallel Bridgify searches, ~300–500ms total
  3. Merges + deduplicates results by `external_id`, sorts best sellers first, caps at 15 activities
  4. Injects the activity list into Claude's system prompt as "Available Activities"
  5. Forces `tool_choice: { type: 'any' }` on the first Claude call so it must pick from the list immediately
- **Result**: Claude no longer needs to search. It goes from `search → propose (2 turns)` to `propose only (1 turn)`. Faster and more reliable. "Looking for live performances" now returns real proposals even though Bridgify's keyword search for "live performances" returns 0 — because we pre-search "Shows & Performances", "Music", and "Festivals" instead.
- **Removed tool**: `search_activities` tool removed from Claude's tool list — no longer needed.
- **File**: `src/app/api/ai-chat/route.ts`

#### FEATURE: AI proposal cards → open ServiceDetailsSidebar with full availability
- **Problem**: Proposal cards in the AI chat only had "Add to Trip" and "Skip" — no way to see full activity details, photos, or check real availability before committing.
- **Fix**: Added "Details" button and clickable image/title to each proposal card. Clicking any of these opens the `ServiceDetailsSidebar` (same sidebar used in the itinerary and marketplace) with the full activity loaded — photo gallery, rating, availability checker, pricing.
- **Wiring**: `TripDetailsView` passes `handleOpenServiceDetails` as `onOpenServiceDetails` prop to `AIChatPanel`, which passes it to `ProposalCard`. The card converts the proposal's activity fields into an `Attraction` object on the fly.
- **Files**: `src/components/demo/AIChatPanel.tsx`, `src/components/demo/TripDetailsView.tsx`

#### BUG: Bridgify cart add-item ignored `cart_uuid` from body — created new cart instead
- **Symptom**: After creating a cart (`POST /cart/`) and adding an item (`POST /cart/items/`), the two responses contained different `cart_uuid` values. Subsequent calls to `items/{itemUuid}/required-fields/` returned 404 because `itemUuid` was `undefined` — the add-item response only had `cart_uuid`, no `cart_item_uuid`.
- **Root cause**: The Bridgify cart API expects the `cart_uuid` in the **URL path**, not the request body. `POST /attractions/booking/cart/items/` with `cart_uuid` in the body is treated as a new cart creation request (same endpoint as step 1). The correct endpoint for step 2 is `POST /attractions/booking/cart/{cart_uuid}/items/`.
- **Discovery**: Noticed that the `cart_uuid` returned by add-item (`931a3214-...`) was always different from the one created in step 1 (`eb367c82-...`). Also confirmed the UUID being sent was a valid Bridgify product UUID (not an `external_id`), ruling out the UUID format as the cause.
- **Fix**: Changed `cartPost('items/', { attraction_uuid, quantity, cart_uuid })` → `cartPost(`${cartUuid}/items/`, { attraction_uuid, quantity })` — cart UUID moves into the URL path.
- **File**: `src/app/checkout/[activityId]/page.tsx`

#### FEATURE: Bridgify multi-photo gallery
- Discovered `additional_info.additional_image_urls` array in Bridgify search response (4–39 photos per activity)
- `bridgify-adapter.ts` now maps full image array into `Attraction.images[]`
- `ActivityImageCarousel` in `ItineraryDay.tsx`: 220px landscape image, large circular left/right arrows, "N / total" counter badge bottom-right; no dot indicators, no thumbnail strip
- `ServiceDetailsSidebar.tsx`: same design — large arrows, counter badge, thumbnail strip removed

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-13 | Created this doc | Need to track gaps between trip-planner and backend capabilities |
| 2026-05-13 | Documented tos-hub intelligence layer | Has dedup, ranking, semantic search, categories — all already built |
| 2026-05-13 | Reviewed Bridgify backend + etl-pipeline repos | Now have full picture of what the API actually provides |
| 2026-05-15 | Documented semantic search failure | Measured keyword result counts for Barcelona — `outdoor`=2, `nightlife`=1, `wellness`=0; confirmed API is title-match only; added `VIBE_TO_SEARCH` workaround in `utils.ts` as stopgap; tos-hub semantic search is the correct fix |
| 2026-05-15 | BSN availability normalisation | Bridgify sandbox returns 404/400 for open-voucher products instead of `{ type: 'BSN' }`; proxy now maps these to a synthetic BSN response so the UI stays usable |
| 2026-05-15 | Multi-vibe parallel search | Single `useBridgifySearch` call with first vibe term replaced by 3 parallel hooks (one per unique vibe), round-robin interleaved — gives genuine category mix per trip day |
| 2026-05-15 | `shouldRetryOnError: false` on availability hook | Bridgify sandbox returns 400/404 for most availability requests; SWR default retry-on-error caused an infinite backoff loop visible to the user as "thinking then retrying" |
| 2026-05-20 | Sessions token must be TEXT | JWT ~200 chars; VARCHAR(64) silently fails INSERT, OTP appears to work but no session created — session must use TEXT |
| 2026-05-20 | Share uses DB UUID not local_id | UPDATE share_token must target `trips.id` (UUID), not `local_id` (varchar) — mismatch caused 0 rows updated and share_token stayed NULL |
| 2026-05-20 | Collaborative trips via trip_members | Instead of copying trips on share, multiple users join the same trip row; trip_members stores role (owner/editor); future: real-time sync via polling or websocket |
| 2026-05-20 | AI chat LTM localStorage only | No DB table needed for v1 — localStorage keyed by userId+tripId gives persistence without server cost; upgrade to DB-backed history if 60-message cap becomes limiting |
| 2026-05-20 | Bridgify images from additional_info | Product detail endpoint returns 401 with our sandbox credentials; images found via `additional_info.additional_image_urls` in search results — 4–39 photos per product, no extra API call needed |
| 2026-05-20 | AI assistant stays on Bridgify search for now | TOS Hub semantic search (`/v1/catalog/search`) is confirmed working but switching `search_activities` tool now would create a data mismatch — proposal cards use Bridgify `external_id` while the rest of the app does too; both must migrate together (action F1, blocked on D1–D5) |
| 2026-05-20 | Category-vocabulary semantic layer for AI | Bridgify has 33 official categories (confirmed via `/attractions/categories/`). Their captions are the terms that appear in product content. Baking them into the AI system prompt with intent→category translation examples gives Claude semantic-quality search from a keyword API — e.g. "nightlife" → search "Nightlife" + "Music" + "Shows & Performances" (3 calls, ~50+ results) instead of a single "nightlife" query (1 result). No TOS Hub dependency. |
| 2026-05-20 | Strip leading assistant messages before Anthropic API call | Anthropic API rejects any conversation whose first message is `role: 'assistant'`. The greeting is rendered as an assistant message in the UI but must be excluded from the API payload. Fix: find first `user` message index, slice from there. |
| 2026-05-20 | max_tokens: 1024 → 4096 for AI chat | With 7+ messages of history + system prompt (1,500 tokens) + search result JSON (~800 tokens), the 1024 limit was hit before Claude could generate `propose_add_activity` calls. `stop_reason: max_tokens` returned empty text. 4096 gives sufficient headroom for a full agentic response. |
| 2026-05-20 | Moved search out of Claude into server pre-fetch | Claude doing search via `search_activities` tool required 1–2 extra turns (slow, unpredictable). Replaced with: (1) regex intent → Bridgify category terms, (2) parallel Promise.all searches, (3) results injected into system prompt. Claude now only calls `propose_add_activity`. Faster, more reliable, no more "0 results" for niche intents like "live performances". |
| 2026-05-20 | tool_choice: any forces Claude to propose | After pre-fetching activities, Claude must call a tool — not respond with text. `tool_choice: { type: 'any' }` on the first API call enforces this. Without it, Claude would acknowledge the request in text and stop. |
| 2026-05-20 | Proposal cards open ServiceDetailsSidebar | Users clicking a proposal card should see full details + availability before committing. Wired `onOpenServiceDetails` from TripDetailsView through AIChatPanel to ProposalCard. Proposal activity fields converted to Attraction shape on the fly. |
| 2026-05-20 | Bridgify cart add-item: cart_uuid in URL path not body | Passing `cart_uuid` in the POST body of `/attractions/booking/cart/items/` is silently ignored — Bridgify treats it as a new cart creation and returns a fresh `cart_uuid`. The correct endpoint is `/attractions/booking/cart/{cart_uuid}/items/` with only `{ attraction_uuid, quantity }` in the body. Discovered by observing two different `cart_uuid` values in the create-cart and add-item responses. |
