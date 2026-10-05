import { test, expect } from '@playwright/test';
test('served commit, application and real catalog backend are healthy', async ({ page, request }) => {
  const version = await request.get('/version.json');
  expect(version.ok()).toBe(true);
  const body = await version.json();
  expect(body.commit).toMatch(/^[a-f0-9]{40}$|^local$/);
  if (process.env.GITHUB_SHA) expect(body.commit).toBe(process.env.GITHUB_SHA);
  const term = process.env.SMOKE_SEARCH_TERM || 'Kursmjölk';
  await page.goto('/#/search?q=' + encodeURIComponent(term));
  await expect(page.locator('.offer-card').first()).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('.logo-text')).toHaveText('Matjakt');
});
