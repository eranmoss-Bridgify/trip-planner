import { test, expect } from '@playwright/test';

/**
 * Regression test for: activity added from explore page was always placed on
 * Day 1 (Jun 15) regardless of which availability slot the user selected.
 *
 * Fix: TripContext.addServiceToLeg now uses service.selectedDate to find the
 * matching day, falling back to day 0 only when no match exists.
 */

test.describe('Trip — Activity placed on selected availability date', () => {

  test.beforeEach(async ({ page }) => {
    // Reset trip state to default (3 days: Jun 15, 16, 17)
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('experience added with 2nd date slot is placed on Day 2, not Day 1', async ({ page }) => {
    await page.goto('/trip/t1/explore');
    await page.waitForLoadState('networkidle');

    // Wait for Bridgify results
    await expect(page.getByText(/\d+ experience/i)).toBeVisible({ timeout: 30_000 });

    const cards = page.locator('[data-slot="card"]');
    await expect(cards.first()).toBeVisible();

    // Find a card that returns date slots (TSL/CLD — not BSN open-voucher)
    // BSN products skip availability entirely; EVT/empty products return no slots.
    let found = false;

    for (let i = 0; i < 15 && !found; i++) {
      await cards.nth(i).click();

      const sidebar = page.locator('[role="dialog"]');
      await expect(sidebar).toBeVisible({ timeout: 5_000 });

      // Only products without availability_type=BSN show the Check Availability button
      const checkBtn = sidebar.getByRole('button', { name: /Check Availability/i });
      if (!await checkBtn.isVisible({ timeout: 800 }).catch(() => false)) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
        continue;
      }

      await checkBtn.click();

      // Slot cards show "N times" or "All day" as the subtitle — use that to identify them
      // We need at least 2 slots so we can select the 2nd (Jun 16)
      const slot2 = sidebar.locator('button').filter({ hasText: /\d+ times|All day/ }).nth(1);
      try {
        await slot2.waitFor({ state: 'visible', timeout: 15_000 });
        found = true;
      } catch {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
      }
    }

    test.skip(!found, 'No TSL/CLD product with ≥2 date slots found — skipping');

    const sidebar = page.locator('[role="dialog"]');

    // Click the 2nd date slot (Jun 16 — 2nd day of the Barcelona trip leg Jun 15–22)
    const slot2 = sidebar.locator('button').filter({ hasText: /\d+ times|All day/ }).nth(1);
    await slot2.click();

    // If a time picker appears (TSL products), select the first available time
    await page.waitForTimeout(400);
    const timePicker = sidebar.locator('.snap-x button');
    if (await timePicker.count() > 0 && await timePicker.first().isVisible().catch(() => false)) {
      await timePicker.first().click();
    }

    // Add to trip
    const addBtn = sidebar.getByRole('button', { name: /Add to Trip/i });
    await expect(addBtn).toBeEnabled({ timeout: 5_000 });
    await addBtn.click();
    await expect(sidebar).not.toBeVisible({ timeout: 8_000 });

    // ── Assert via localStorage ──────────────────────────────────────────────
    // TripContext persists to localStorage on every state change, so we can
    // read the final data without navigating away.
    const tripsData: any[] = await page.evaluate(
      () => JSON.parse(localStorage.getItem('wandervault_trips') ?? '[]'),
    );
    const trip = tripsData.find((t: any) => t.id === 't1');
    const leg = trip?.legs?.[0];

    // The Barcelona trip has days for Jun 15, 16, 17
    const day1 = leg?.days?.find((d: any) => d.date?.startsWith('2026-06-15'));
    const day2 = leg?.days?.find((d: any) => d.date?.startsWith('2026-06-16'));

    // Regression guard: activity must NOT be on Day 1 (the pre-fix behaviour)
    expect(
      day1?.activities?.length ?? 0,
      'Activity must NOT land on Day 1 (Jun 15) — regression of the hardcoded updatedDays[0] bug',
    ).toBe(0);

    // Positive: activity should be on Day 2 (the slot we selected)
    expect(
      day2?.activities?.length ?? 0,
      'Activity should be placed on Day 2 (Jun 16) matching the selected slot',
    ).toBeGreaterThan(0);

    // ── Visual verification on the trip page ─────────────────────────────────
    // Navigate back via the arrow link (client-side nav keeps React context)
    await page.locator(`a[href="/trip/t1"]`).click();
    await page.waitForLoadState('networkidle');

    // Day 2 heading must be present
    await expect(page.locator('h3').filter({ hasText: /Day 2/ })).toBeVisible({ timeout: 5_000 });

    // Day 2 section should contain the added activity (not Day 1)
    const pageText = await page.locator('body').textContent() ?? '';
    const day1Pos = pageText.indexOf('Day 1');
    const day2Pos = pageText.indexOf('Day 2');
    const day3Pos = pageText.indexOf('Day 3');

    const activityName: string = day2?.activities?.[0]?.name ?? '';
    // Use first 20 chars to avoid special-char regex issues
    const snippet = activityName.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    if (snippet.length > 0) {
      const positions = [...pageText.matchAll(new RegExp(snippet, 'g'))].map(m => m.index ?? 0);
      const endOfDay2 = day3Pos > 0 ? day3Pos : pageText.length;

      const someOnDay2 = positions.some(p => p > day2Pos && p < endOfDay2);
      const noneOnDay1 = !positions.some(p => p > day1Pos && p < day2Pos);

      expect(someOnDay2, `"${activityName.slice(0, 20)}" should appear under Day 2 heading`).toBe(true);
      expect(noneOnDay1, `"${activityName.slice(0, 20)}" should NOT appear under Day 1 heading`).toBe(true);
    }
  });

  test('open-voucher (BSN) experience can be added to trip without selecting a date', async ({ page }) => {
    await page.goto('/trip/t1/explore');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/\d+ experience/i)).toBeVisible({ timeout: 30_000 });

    const cards = page.locator('[data-slot="card"]');
    let foundBsn = false;

    for (let i = 0; i < 20 && !foundBsn; i++) {
      await cards.nth(i).click();
      const sidebar = page.locator('[role="dialog"]');
      await expect(sidebar).toBeVisible({ timeout: 5_000 });

      // BSN products show no Check Availability button — Add to Trip is enabled directly
      const checkBtn = sidebar.getByRole('button', { name: /Check Availability/i });
      if (await checkBtn.isVisible({ timeout: 600 }).catch(() => false)) {
        // Not BSN — has check availability. Could still be BSN if it shows open voucher.
        await checkBtn.click();
        await page.waitForTimeout(2_000);
        const isOpenVoucher = await sidebar.getByText('Open voucher').isVisible().catch(() => false);
        if (!isOpenVoucher) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(200);
          continue;
        }
      }

      // Add to trip (should be enabled without date selection)
      const addBtn = sidebar.getByRole('button', { name: /Add to Trip/i });
      if (!await addBtn.isEnabled({ timeout: 2_000 }).catch(() => false)) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
        continue;
      }

      await addBtn.click();
      await expect(sidebar).not.toBeVisible({ timeout: 8_000 });
      foundBsn = true;
    }

    test.skip(!foundBsn, 'No BSN/open-voucher product found — skipping');

    // Verify an activity was added to the trip (any day)
    const tripsData: any[] = await page.evaluate(
      () => JSON.parse(localStorage.getItem('wandervault_trips') ?? '[]'),
    );
    const trip = tripsData.find((t: any) => t.id === 't1');
    const leg = trip?.legs?.[0];
    const totalAdded = leg?.days?.reduce(
      (n: number, d: any) => n + (d.activities?.length ?? 0),
      0,
    ) ?? 0;

    expect(totalAdded, 'BSN activity should be added to trip (any day)').toBeGreaterThan(0);
  });
});
