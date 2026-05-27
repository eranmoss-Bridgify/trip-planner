/**
 * Bridgify Cart/Booking Flow Explorer — CORRECT ORDER
 * Order confirmed from required-fields response:
 *   dates → options → timeslots → tickets → languages → customer-info
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const envPath = join(dirname(fileURLToPath(import.meta.url)), '..', '.env.local');
const env = Object.fromEntries(
    readFileSync(envPath, 'utf8')
        .split('\n')
        .filter(l => l && !l.startsWith('#'))
        .map(l => [l.split('=')[0].trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const BASE = env.BRIDGIFY_BASE_URL ?? 'https://api.bridgify.io';

async function getToken() {
    const res = await fetch(`${BASE}/accounts/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: env.BRIDGIFY_CLIENT_ID, client_secret: env.BRIDGIFY_SECRET, grant_type: 'client_credentials', scope: 'read write' }),
    });
    const d = await res.json();
    console.log('✅ Token acquired');
    return d.access_token;
}

async function call(token, method, path, body) {
    const res = await fetch(`${BASE}${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, ok: res.ok, data };
}

function log(label, result) {
    const icon = result.ok ? '✅' : '❌';
    console.log(`\n${icon} ${label} [HTTP ${result.status}]`);
    const str = JSON.stringify(result.data, null, 2);
    console.log(str.length > 3000 ? str.slice(0, 3000) + '\n  ... (truncated)' : str);
    return result;
}

async function main() {
    const token = await getToken();

    // ── Pick product ─────────────────────────────────────────────────────────
    const searchRes = await call(token, 'GET', '/attractions/products/?city_name=Barcelona&text_search=tour&page=1&page_size=1');
    const product = searchRes.data?.attractions?.[0];
    console.log(`\n📦 "${product.title}"`);
    console.log(`   Bridgify uuid: ${product.uuid}  (use THIS for cart, not external_id ${product.external_id})`);

    // ── Step 1: Create cart ──────────────────────────────────────────────────
    console.log('\n══ STEP 1 — Create cart ══');
    const s1 = log('Create cart', await call(token, 'POST', '/attractions/booking/cart/', {}));
    const cartId = s1.data?.cart_uuid;

    // ── Step 2: Add item ─────────────────────────────────────────────────────
    console.log('\n══ STEP 2 — Add item (attraction_uuid = product.uuid) ══');
    const s2 = log('Add item', await call(token, 'POST', '/attractions/booking/cart/items/', {
        attraction_uuid: product.uuid, quantity: 2, cart_uuid: cartId,
    }));
    const itemId = s2.data?.cart_item_uuid;
    if (!itemId) { console.log('No cart_item_uuid — stopping'); return; }

    // ── Step 3: Required fields ──────────────────────────────────────────────
    console.log('\n══ STEP 3 — Required fields (defines exact step order) ══');
    const s3 = log('Required fields', await call(token, 'GET', `/attractions/booking/cart/items/${itemId}/required-fields/`));
    console.log(`\n  ✨ Confirmed order: ${(s3.data?.required_booking_fields ?? []).join(' → ')}`);

    // ── Step 4: DATES first (confirmed by required-fields order) ────────────
    console.log('\n══ STEP 4 — Dates (FIRST per required-fields order) ══');
    const s4a = log('Get available dates', await call(token, 'GET', `/attractions/booking/cart/items/${itemId}/dates/`));
    const dateParam = s4a.data?.available_dates?.[0] ?? '2026-05-21';
    console.log(`\n  → Selected date: ${dateParam}`);
    log('Select date (PATCH)', await call(token, 'PATCH', `/attractions/booking/cart/items/${itemId}/dates/`, { date: dateParam }));

    // ── Step 5: OPTIONS (second per required-fields order) ──────────────────
    console.log('\n══ STEP 5 — Options (SECOND per required-fields order) ══');
    const s5a = log('Get options', await call(token, 'GET', `/attractions/booking/cart/items/${itemId}/options/`));
    const firstOpt = s5a.data?.options?.[0];
    console.log(`\n  → Selecting: "${firstOpt?.title}" (option_id: ${firstOpt?.option_id})`);
    log('Select option (PATCH)', await call(token, 'PATCH', `/attractions/booking/cart/items/${itemId}/options/`, { option_id: firstOpt?.option_id }));

    // ── Step 6: TIMESLOTS (after dates + options) ────────────────────────────
    console.log('\n══ STEP 6 — Timeslots (after dates + options) ══');
    const s6a = log('Get timeslots', await call(token, 'GET', `/attractions/booking/cart/items/${itemId}/timeslots/`));
    const firstSlot = Array.isArray(s6a.data?.timeslots) ? s6a.data.timeslots[0] : null;
    if (firstSlot) {
        const slotId = firstSlot.timeslot_id ?? firstSlot.id ?? firstSlot.time;
        console.log(`\n  → Selecting timeslot: ${JSON.stringify(firstSlot)}`);
        log('Select timeslot (PATCH)', await call(token, 'PATCH', `/attractions/booking/cart/items/${itemId}/timeslots/`, { timeslot_id: slotId }));
    }

    // ── Step 7: TICKETS ──────────────────────────────────────────────────────
    console.log('\n══ STEP 7 — Tickets ══');
    const s7a = log('Get tickets', await call(token, 'GET', `/attractions/booking/cart/items/${itemId}/tickets/`));
    const tickets = s7a.data?.tickets ?? [];
    console.log(`\n  → All ticket types:`, JSON.stringify(tickets, null, 2));
    if (tickets.length) {
        const ticketPayload = tickets.map(t => ({ ticket_id: t.ticket_id ?? t.id, quantity: 1 }));
        log('Select tickets (PATCH)', await call(token, 'PATCH', `/attractions/booking/cart/items/${itemId}/tickets/`, { tickets: ticketPayload }));
    }

    // ── Step 8: LANGUAGES ────────────────────────────────────────────────────
    console.log('\n══ STEP 8 — Languages ══');
    const s8a = log('Get languages', await call(token, 'GET', `/attractions/booking/cart/items/${itemId}/languages/`));
    const langs = s8a.data?.languages ?? s8a.data ?? [];
    if (s8a.ok && langs.length) {
        const langCode = langs[0]?.code ?? langs[0] ?? 'en';
        console.log(`\n  → Selecting language: ${langCode}`);
        log('Select language (PATCH)', await call(token, 'PATCH', `/attractions/booking/cart/items/${itemId}/languages/`, { language: langCode }));
    }

    // ── Step 9: PICKUP (optional) ────────────────────────────────────────────
    console.log('\n══ STEP 9 — Pickup locations (optional) ══');
    log('Get pickup', await call(token, 'GET', `/attractions/booking/cart/items/${itemId}/pickup/`));

    // ── Step 10: CUSTOMER INFO ───────────────────────────────────────────────
    console.log('\n══ STEP 10 — Customer info ══');
    log('Customer info (PATCH)', await call(token, 'PATCH', `/attractions/booking/cart/${cartId}/customer-info/`, {
        first_name: 'Demo', last_name: 'Traveler',
        email: 'demo@wandervault.com', phone: '+15550000001',
    }));

    // ── Step 11: CREATE ORDER ────────────────────────────────────────────────
    console.log('\n══ STEP 11 — Create order (needs merchant creds) ══');
    const s11 = log('Create order', await call(token, 'POST', '/attractions/booking/orders/', { cart_uuid: cartId }));
    const orderId = s11.data?.order_uuid ?? s11.data?.uuid;

    if (orderId) {
        console.log('\n══ STEP 12 — Checkout ══');
        log('Checkout', await call(token, 'POST', `/attractions/booking/orders/${orderId}/checkout`, {}));
    }

    console.log('\n\n══════════════════════════════════════════');
    console.log('Exploration complete.');
    console.log('══════════════════════════════════════════\n');
}

main().catch(e => { console.error('\n💥', e.message); process.exit(1); });
