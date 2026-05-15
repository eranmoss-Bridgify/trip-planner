import { test, expect } from '@playwright/test';

test.describe('Navigation & Links', () => {

  test('header logo links to home', async ({ page }) => {
    await page.goto('/marketplace');
    await page.getByRole('link', { name: 'Demo Co' }).click();
    await expect(page).toHaveURL('/');
  });

  test('home → Browse Experiences → marketplace', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Browse Experiences/ }).click();
    await expect(page).toHaveURL('/marketplace');
    await expect(page.getByText('Explore Experiences')).toBeVisible();
  });

  test('home → destination card → marketplace with Barcelona', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Tours & Sightseeing').click();
    await expect(page).toHaveURL(/\/marketplace.*city=Barcelona/);
  });

  test('home → Plan a New Trip opens wizard dialog', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Plan a New Trip').click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
  });

  test('marketplace → click card → sidebar opens with Bridgify detail', async ({ page }) => {
    await page.goto('/marketplace');

    await expect(page.getByText(/\d+ experiences? found/)).toBeVisible({ timeout: 30_000 });

    const firstCard = page.locator('[data-slot="card"]').first();
    await firstCard.click();

    const sidebar = page.locator('[role="dialog"]');
    await expect(sidebar).toBeVisible({ timeout: 10_000 });

    // Sidebar title should be a real Bridgify product name
    const sidebarTitle = sidebar.locator('h2').first();
    await expect(sidebarTitle).toBeVisible();
    const text = await sidebarTitle.textContent();
    expect(text!.length).toBeGreaterThan(3);
  });

  test('marketplace sidebar has availability section', async ({ page }) => {
    await page.goto('/marketplace');
    await expect(page.getByText(/\d+ experiences? found/)).toBeVisible({ timeout: 30_000 });

    const firstCard = page.locator('[data-slot="card"]').first();
    await firstCard.click();

    const sidebar = page.locator('[role="dialog"]');
    await expect(sidebar).toBeVisible({ timeout: 10_000 });

    const availBtn = sidebar.getByText(/Check Availability|Select Date|Availability/i);
    const dateRelated = sidebar.locator('input[type="date"], [class*="Calendar"], button:has-text("date")');

    const hasAvail = await availBtn.count() > 0 || await dateRelated.count() > 0;
    expect(hasAvail).toBe(true);
  });

  test('footer links are present on all pages', async ({ page }) => {
    for (const path of ['/', '/marketplace']) {
      await page.goto(path);
      await expect(page.getByText('Privacy Policy')).toBeVisible();
      await expect(page.getByText('Terms of Service')).toBeVisible();
      await expect(page.getByText('Accessibility')).toBeVisible();
    }
  });

  test('destination cards pass Barcelona context to marketplace', async ({ page }) => {
    await page.goto('/');

    // Click "Food & Culture" card
    await page.getByText('Food & Culture').click();
    await expect(page).toHaveURL(/\/marketplace/);

    // City input should be Barcelona (from query param)
    const cityInput = page.getByPlaceholder('City');
    await expect(cityInput).toHaveValue('Barcelona');
  });
});
