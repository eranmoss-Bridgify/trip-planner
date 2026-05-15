import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders header with logo and navigation', async ({ page }) => {
    await expect(page.locator('header')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Demo Co' })).toBeVisible();
    await expect(page.getByText('My Trips')).toBeVisible();
    await expect(page.getByText('Book a Flight')).toBeVisible();
  });

  test('renders hero section with CTAs', async ({ page }) => {
    await expect(page.getByText('Welcome aboard')).toBeVisible();
    await expect(page.getByText('Your next adventure starts here')).toBeVisible();
    await expect(page.getByText('Plan a New Trip')).toBeVisible();
    await expect(page.getByText('Browse Experiences')).toBeVisible();
  });

  test('renders flight info bar', async ({ page }) => {
    // Flight info is in the bar below the hero
    const flightBar = page.locator('section').filter({ hasText: 'Flight WV-2026' });
    await expect(flightBar).toBeVisible();
    await expect(page.getByText('1 passenger')).toBeVisible();
  });

  test('renders Your Trips section', async ({ page }) => {
    await expect(page.getByText('Your Trips')).toBeVisible();
  });

  test('renders Discover Barcelona section with 3 cards', async ({ page }) => {
    await expect(page.getByText('Discover Barcelona')).toBeVisible();
    await expect(page.getByText('Tours & Sightseeing')).toBeVisible();
    await expect(page.getByText('Food & Culture')).toBeVisible();
    await expect(page.getByText('Day Trips')).toBeVisible();
  });

  test('renders footer', async ({ page }) => {
    await expect(page.getByText(/© 2026 Demo Co/)).toBeVisible();
    await expect(page.getByText('Privacy Policy')).toBeVisible();
    await expect(page.getByText('Terms of Service')).toBeVisible();
  });

  test('"Browse Experiences" navigates to marketplace', async ({ page }) => {
    await page.getByRole('link', { name: /Browse Experiences/ }).click();
    await expect(page).toHaveURL('/marketplace');
  });

  test('Discover Barcelona cards navigate to marketplace', async ({ page }) => {
    await page.getByText('Tours & Sightseeing').click();
    await expect(page).toHaveURL(/\/marketplace/);
  });
});
