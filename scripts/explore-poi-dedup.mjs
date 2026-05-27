/**
 * Bridgify POI & Duplicate Explorer
 * 1. Checks what geo/POI endpoints exist
 * 2. Scans search results for duplicate products
 * Run: node scripts/explore-poi-dedup.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const envPath = join(dirname(fileURLToPath(import.meta.url)), '..', '.env.local');
const env = Object.fromEntries(
    readFileSync(envPath, 'utf8').split('\n')
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

function log(label, result, truncate = 2000) {
    const icon = result.ok ? '✅' : '❌';
    console.log(`\n${icon} ${label} [HTTP ${result.status}]`);
    const str = JSON.stringify(result.data, null, 2);
    console.log(str.length > truncate ? str.slice(0, truncate) + '\n  ...(truncated)' : str);
}

async function main() {
    const token = await getToken();
    console.log('✅ Token acquired\n');

    // ═══════════════════════════════════════════════════════════════════
    // PART 1: POI / Geo Endpoints
    // ═══════════════════════════════════════════════════════════════════
    console.log('═══════════════════════════════════════════════════════════');
    console.log('PART 1 — POI / Geographic Endpoints');
    console.log('═══════════════════════════════════════════════════════════');

    // Check known geo-related endpoints
    const poiProbes = [
        '/attractions/pois/',
        '/attractions/pois/?city_name=Barcelona',
        '/attractions/landmarks/',
        '/attractions/landmarks/?city_name=Barcelona',
        '/attractions/geo/',
        '/attractions/products/nearby/?lat=41.38&lng=2.17&radius=1',
        '/attractions/products/?city_name=Barcelona&lat=41.38&lng=2.17&radius=1&page_size=3',
        '/attractions/products/map/',
        '/attractions/products/clusters/',
        '/attractions/places/',
        '/attractions/locations/',
    ];

    for (const path of poiProbes) {
        const r = await call(token, 'GET', path);
        const icon = r.ok ? '✅' : (r.status === 404 ? '❌ 404' : `⚠️  ${r.status}`);
        const preview = JSON.stringify(r.data).slice(0, 120);
        console.log(`  ${icon}  GET ${path}`);
        if (r.ok) console.log(`         → ${preview}`);
    }

    // Check if geolocation is populated in search results
    console.log('\n\n── Geolocation field on search results ──');
    const geoSearch = await call(token, 'GET', '/attractions/products/?city_name=Barcelona&text_search=tour&page=1&page_size=20');
    const products = geoSearch.data?.attractions ?? [];
    const withGeo = products.filter(p => p.geolocation?.lat || p.geolocation?.lng || (Array.isArray(p.geolocation) && p.geolocation.length));
    const withoutGeo = products.filter(p => !withGeo.includes(p));
    console.log(`  Total products: ${products.length}`);
    console.log(`  With geolocation: ${withGeo.length}`);
    console.log(`  Without geolocation: ${withoutGeo.length}`);
    if (withGeo.length) {
        console.log('\n  Sample geolocation data:');
        withGeo.slice(0, 3).forEach(p => console.log(`    "${p.title.slice(0, 50)}" → ${JSON.stringify(p.geolocation)}`));
    }

    // Check geolocation field structure on a single product
    if (products.length) {
        console.log('\n  Geolocation field values (first 5 products):');
        products.slice(0, 5).forEach(p => {
            console.log(`    [${p.external_id}] "${p.title.slice(0,45)}" geolocation: ${JSON.stringify(p.geolocation)}`);
        });
    }

    // Check if there's a bbox/bounds search
    console.log('\n\n── Bounding box / geo search ──');
    const bboxProbes = [
        '/attractions/products/?city_name=Barcelona&bbox=2.0,41.3,2.3,41.5&page_size=3',
        '/attractions/products/?city_name=Barcelona&geolocation=41.38,2.17&radius=500&page_size=3',
        '/attractions/products/?city_name=Barcelona&lat_min=41.3&lat_max=41.5&lng_min=2.0&lng_max=2.3&page_size=3',
    ];
    for (const path of bboxProbes) {
        const r = await call(token, 'GET', path);
        console.log(`  ${r.ok ? '✅' : `❌ ${r.status}`}  GET ${path.slice(0, 80)}`);
        if (r.ok) console.log(`     → count: ${r.data?.count}, first: "${r.data?.attractions?.[0]?.title?.slice(0,40)}"`);
    }

    // ═══════════════════════════════════════════════════════════════════
    // PART 2: Duplicate Detection
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('PART 2 — Duplicate Detection');
    console.log('═══════════════════════════════════════════════════════════');

    // Fetch a larger result set to look for duplicates
    console.log('\nFetching 100 Barcelona "tour" results...');
    const page1 = await call(token, 'GET', '/attractions/products/?city_name=Barcelona&text_search=tour&page=1&page_size=50');
    const page2 = await call(token, 'GET', '/attractions/products/?city_name=Barcelona&text_search=tour&page=2&page_size=50');
    const all = [...(page1.data?.attractions ?? []), ...(page2.data?.attractions ?? [])];
    console.log(`  Fetched: ${all.length} products (total in API: ${page1.data?.count})`);

    // Check 1: Same external_id appearing twice
    const byExternalId = {};
    all.forEach(p => { (byExternalId[p.external_id] = byExternalId[p.external_id] ?? []).push(p); });
    const dupExternalIds = Object.entries(byExternalId).filter(([, ps]) => ps.length > 1);
    console.log(`\n  Duplicate external_ids: ${dupExternalIds.length}`);
    if (dupExternalIds.length) {
        dupExternalIds.slice(0, 3).forEach(([id, ps]) => {
            console.log(`    external_id ${id} appears ${ps.length}× — titles: ${ps.map(p => `"${p.title.slice(0,40)}"`).join(', ')}`);
        });
    }

    // Check 2: Same Bridgify uuid appearing twice
    const byUuid = {};
    all.forEach(p => { (byUuid[p.uuid] = byUuid[p.uuid] ?? []).push(p); });
    const dupUuids = Object.entries(byUuid).filter(([, ps]) => ps.length > 1);
    console.log(`  Duplicate Bridgify uuids: ${dupUuids.length}`);

    // Check 3: Near-identical titles (same landmark, different supplier)
    const normalize = t => t.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
    const byNormTitle = {};
    all.forEach(p => {
        const key = normalize(p.title);
        (byNormTitle[key] = byNormTitle[key] ?? []).push(p);
    });
    const exactTitleDups = Object.entries(byNormTitle).filter(([, ps]) => ps.length > 1);
    console.log(`  Exact title duplicates (normalized): ${exactTitleDups.length}`);
    if (exactTitleDups.length) {
        exactTitleDups.slice(0, 5).forEach(([title, ps]) => {
            console.log(`    "${title.slice(0, 60)}" (${ps.length}× — suppliers: ${ps.map(p => p.inventory_supplier ?? 'unknown').join(', ')})`);
        });
    }

    // Check 4: Same attraction, different suppliers (partial title match)
    // Group by first 5 significant words
    const titlePrefix = t => normalize(t).split(' ').slice(0, 5).join(' ');
    const byPrefix = {};
    all.forEach(p => {
        const key = titlePrefix(p.title);
        (byPrefix[key] = byPrefix[key] ?? []).push(p);
    });
    const prefixDups = Object.entries(byPrefix).filter(([, ps]) => ps.length > 1);
    console.log(`  Products sharing first 5 title words: ${prefixDups.length} groups`);
    if (prefixDups.length) {
        console.log('\n  Top duplicate groups by title prefix:');
        prefixDups.sort((a, b) => b[1].length - a[1].length).slice(0, 8).forEach(([prefix, ps]) => {
            console.log(`    "${prefix}" → ${ps.length} products`);
            ps.forEach(p => console.log(`      [${p.external_id}] supplier:${p.inventory_supplier ?? '?'} price:${p.price} "${p.title.slice(0, 60)}"`));
        });
    }

    // Check 5: Supplier breakdown
    console.log('\n\n── Supplier distribution in results ──');
    const bySup = {};
    all.forEach(p => { const s = p.inventory_supplier ?? 'unknown'; bySup[s] = (bySup[s] ?? 0) + 1; });
    Object.entries(bySup).sort((a, b) => b[1] - a[1]).forEach(([s, n]) => console.log(`  ${s}: ${n} products`));

    // Check 6: Same product from multiple suppliers (different external_id, very similar title)
    console.log('\n\n── Cross-supplier title similarity (Sagrada Família example) ──');
    const sagrada = await call(token, 'GET', '/attractions/products/?city_name=Barcelona&text_search=Sagrada+Familia&page=1&page_size=30');
    const sProducts = sagrada.data?.attractions ?? [];
    console.log(`  "Sagrada Familia" search: ${sProducts.length} results (total: ${sagrada.data?.count})`);
    const supGroups = {};
    sProducts.forEach(p => { const s = p.inventory_supplier ?? 'unknown'; (supGroups[s] = supGroups[s] ?? []).push(p); });
    Object.entries(supGroups).forEach(([sup, ps]) => {
        console.log(`  \n  Supplier: ${sup} (${ps.length} products)`);
        ps.slice(0, 3).forEach(p => console.log(`    [${p.external_id}] ${p.price ?? '?'}$ "${p.title.slice(0, 70)}"`));
    });

    // Check 7: Price variation for same landmark across suppliers
    console.log('\n\n── Price variance for same landmark ──');
    const prices = sProducts.filter(p => p.price).map(p => p.price);
    if (prices.length) {
        const min = Math.min(...prices), max = Math.max(...prices), avg = prices.reduce((a, b) => a + b) / prices.length;
        console.log(`  Sagrada Família prices: min $${min.toFixed(2)}, max $${max.toFixed(2)}, avg $${avg.toFixed(2)}, range $${(max - min).toFixed(2)}`);
    }

    console.log('\n\nDone.\n');
}

main().catch(e => { console.error('💥', e.message); process.exit(1); });
