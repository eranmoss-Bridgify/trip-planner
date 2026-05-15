import { test, expect } from '@playwright/test';

test.describe('Bridgify API Proxy — Live Data Validation', () => {

  test('GET /api/bridgify/search returns Bridgify-shaped attractions', async ({ request }) => {
    const res = await request.get('/api/bridgify/search?text_search=tours&city_name=Barcelona');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('attractions');
    expect(Array.isArray(body.attractions)).toBe(true);
    expect(body.attractions.length).toBeGreaterThan(0);

    const first = body.attractions[0];
    // Bridgify uses external_id, not numeric id — confirms real API, not mock
    expect(first).toHaveProperty('external_id');
    expect(typeof first.external_id).toBe('string');
    expect(first.external_id.length).toBeGreaterThan(0);
    expect(first).toHaveProperty('title');
    expect(typeof first.title).toBe('string');
  });

  test('search results are Barcelona-relevant (title or query context)', async ({ request }) => {
    const res = await request.get('/api/bridgify/search?text_search=tours&city_name=Barcelona');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('attractions');

    // Bridgify doesn't return location.city in search — but titles should reference Barcelona
    const withBarcelona = (body.attractions as any[]).filter(
      (a: any) => a.title?.toLowerCase().includes('barcelona')
    );
    expect(withBarcelona.length).toBeGreaterThan(0);
  });

  test('search returns price data from Bridgify', async ({ request }) => {
    const res = await request.get('/api/bridgify/search?text_search=tours&city_name=Barcelona');
    const body = await res.json();
    const withPrice = body.attractions.filter(
      (a: any) => a.price != null && (typeof a.price === 'number' || a.price?.amount != null)
    );
    expect(withPrice.length).toBeGreaterThan(0);
  });

  test('search returns images', async ({ request }) => {
    const res = await request.get('/api/bridgify/search?text_search=tours&city_name=Barcelona');
    const body = await res.json();
    const withImage = body.attractions.filter((a: any) =>
      a.main_photo_url || (a.images && a.images.length > 0)
    );
    expect(withImage.length).toBeGreaterThan(0);
  });

  test('search results have no mock data fingerprints', async ({ request }) => {
    const res = await request.get('/api/bridgify/search?text_search=tours&city_name=Barcelona');
    const body = await res.json();

    for (const attraction of body.attractions) {
      // Bridgify external_ids are numeric strings — verify they exist and are non-empty
      expect(attraction.external_id).toBeTruthy();
      // No mock placeholder titles
      expect(attraction.title).not.toContain('Mock');
      expect(attraction.title).not.toContain('Test Attraction');
      expect(attraction.title).not.toContain('Placeholder');
      // Should have a real image URL, not a placeholder
      if (attraction.main_photo_url) {
        expect(attraction.main_photo_url).toMatch(/^https?:\/\//);
      }
    }
  });

  test('search with empty params still returns results (Bridgify behavior)', async ({ request }) => {
    const res = await request.get('/api/bridgify/search');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('attractions');
  });

  test('GET /api/bridgify/[productId] returns Bridgify product detail', async ({ request }) => {
    const searchRes = await request.get('/api/bridgify/search?text_search=tours&city_name=Barcelona');
    expect(searchRes.status()).toBe(200);
    const searchBody = await searchRes.json();
    expect(searchBody).toHaveProperty('attractions');
    const product = (searchBody.attractions as any[])[0];
    const productId = product?.external_id;
    expect(productId).toBeTruthy();

    const detailRes = await request.get(`/api/bridgify/${productId}`);
    // Bridgify sandbox may return 400 for some IDs
    expect([200, 400]).toContain(detailRes.status());

    if (detailRes.status() === 200) {
      const detail = await detailRes.json();
      expect(detail).toHaveProperty('attraction');
      expect(detail.attraction).toHaveProperty('title');
      expect(detail.attraction).toHaveProperty('external_id');
      // Confirm it's the same product we requested
      expect(detail.attraction.external_id).toBe(productId);
    }
  });

  test('GET /api/bridgify/[productId]/availability returns response', async ({ request }) => {
    const searchRes = await request.get('/api/bridgify/search?text_search=tours&city_name=Barcelona');
    expect(searchRes.status()).toBe(200);
    const searchBody = await searchRes.json();
    expect(searchBody).toHaveProperty('attractions');
    const productId = (searchBody.attractions as any[])[0]?.external_id;
    expect(productId).toBeTruthy();

    const from = new Date();
    from.setDate(from.getDate() + 7);
    const to = new Date(from);
    to.setDate(to.getDate() + 3);
    const dateFrom = from.toISOString().split('T')[0];
    const dateTo = to.toISOString().split('T')[0];

    const availRes = await request.get(
      `/api/bridgify/${productId}/availability?date_from=${dateFrom}&date_to=${dateTo}`
    );
    expect([200, 400, 404]).toContain(availRes.status());
  });

  test('nonexistent product ID returns error status', async ({ request }) => {
    const res = await request.get('/api/bridgify/nonexistent-product-id-12345');
    const body = await res.json();
    const isError = res.status() >= 400 || body.error || !body.attraction;
    expect(isError).toBe(true);
  });
});
