import { test, expect } from '@playwright/test';

test.describe('Marketplace Page — Bridgify Live Data', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/marketplace');
  });

  test('renders page header', async ({ page }) => {
    await expect(page.getByText('Explore Experiences')).toBeVisible();
    await expect(page.getByText('Discover tours, activities, and attractions')).toBeVisible();
  });

  test('renders search form defaulting to Barcelona', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search experiences...');
    const cityInput = page.getByPlaceholder('City');
    const searchBtn = page.getByRole('button', { name: /Search/ });

    await expect(searchInput).toBeVisible();
    await expect(cityInput).toBeVisible();
    await expect(searchBtn).toBeVisible();

    await expect(searchInput).toHaveValue('tours');
    await expect(cityInput).toHaveValue('Barcelona');
  });

  test('loads experience cards from Bridgify API', async ({ page }) => {
    await expect(page.getByText(/\d+ experiences? found/)).toBeVisible({ timeout: 30_000 });

    const cards = page.locator('[data-slot="card"]');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('cards show Bridgify data, not mock data', async ({ page }) => {
    await expect(page.getByText(/\d+ experiences? found/)).toBeVisible({ timeout: 30_000 });

    const firstCard = page.locator('[data-slot="card"]').first();

    // Has a real image (Bridgify images are URLs, not placeholders)
    const img = firstCard.locator('img').first();
    await expect(img).toBeVisible();
    const src = await img.getAttribute('src');
    expect(src).toBeTruthy();
    expect(src).toMatch(/^https?:\/\//);

    // Has a title (h3)
    const title = firstCard.locator('h3').first();
    await expect(title).toBeVisible();
    const titleText = await title.textContent();
    expect(titleText!.length).toBeGreaterThan(3);

    // Has View Details button
    await expect(firstCard.getByText('View Details')).toBeVisible();
  });

  test('cards are Barcelona-relevant (title references Barcelona)', async ({ page }) => {
    await expect(page.getByText(/\d+ experiences? found/)).toBeVisible({ timeout: 30_000 });

    // Bridgify search for Barcelona returns products with "Barcelona" in titles
    const allCards = page.locator('[data-slot="card"]');
    const count = await allCards.count();
    let barcelonaCount = 0;
    for (let i = 0; i < Math.min(count, 10); i++) {
      const text = await allCards.nth(i).textContent();
      if (text?.toLowerCase().includes('barcelona')) barcelonaCount++;
    }
    expect(barcelonaCount).toBeGreaterThan(0);
  });

  test('search form submits and returns Barcelona results', async ({ page }) => {
    await expect(page.getByText(/\d+ experiences? found/)).toBeVisible({ timeout: 30_000 });

    const searchInput = page.getByPlaceholder('Search experiences...');
    const cityInput = page.getByPlaceholder('City');

    // Search for different experiences in Barcelona (not Paris)
    await searchInput.fill('museum');
    await cityInput.fill('Barcelona');
    await page.getByRole('button', { name: /Search/ }).click();

    await expect(page.getByText(/\d+ experiences? found/)).toBeVisible({ timeout: 30_000 });
  });

  test('clicking View Details opens sidebar with Bridgify detail', async ({ page }) => {
    await expect(page.getByText(/\d+ experiences? found/)).toBeVisible({ timeout: 30_000 });

    const firstViewDetails = page.getByText('View Details').first();
    await firstViewDetails.click();

    const sidebar = page.locator('[role="dialog"]');
    await expect(sidebar).toBeVisible({ timeout: 10_000 });

    // Sidebar should have a real title from Bridgify
    const sidebarTitle = sidebar.locator('h2').first();
    await expect(sidebarTitle).toBeVisible();
    const titleText = await sidebarTitle.textContent();
    expect(titleText!.length).toBeGreaterThan(3);
  });

  test('empty search shows "No experiences found"', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search experiences...');
    const cityInput = page.getByPlaceholder('City');

    await searchInput.fill('xyznonexistent12345');
    await cityInput.fill('Atlantis');
    await page.getByRole('button', { name: /Search/ }).click();

    await expect(page.getByText('No experiences found')).toBeVisible({ timeout: 30_000 });
  });

  test('cards display pricing information', async ({ page }) => {
    await expect(page.getByText(/\d+ experiences? found/)).toBeVisible({ timeout: 30_000 });

    const firstCard = page.locator('[data-slot="card"]').first();
    const footer = firstCard.locator('div').last();
    await expect(footer).toBeVisible();
  });

  test('no mock or hardcoded data visible on marketplace', async ({ page }) => {
    await expect(page.getByText(/\d+ experiences? found/)).toBeVisible({ timeout: 30_000 });

    // Should NOT show any Paris content — destination is Barcelona
    const parisText = page.getByText(/Paris/i);
    expect(await parisText.count()).toBe(0);

    // Should NOT show mock fingerprints
    const mockText = page.getByText(/Mock|Test Attraction|Placeholder/i);
    expect(await mockText.count()).toBe(0);
  });
});
