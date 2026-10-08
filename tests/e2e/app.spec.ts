import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

const env = loadEnv('development', process.cwd(), 'VITE_');
const url = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
// These mutating tests are strictly local; hosted releases run smoke.spec.ts only.
test.beforeEach(async ({ page }) => {
  if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) throw new Error('E2E account tests require local Supabase.');
  await page.route('https://*.basemaps.cartocdn.com/**', route => route.fulfill({ status: 204 }));
  await page.route('https://router.project-osrm.org/**', route => route.fulfill({ json: {
    routes: [{ geometry: { coordinates: [[18.0686,59.3293],[18.07,59.335]] }, distance: 1000, duration: 120 }],
  }}));
});
// Testmjölk is a deterministic local fixture from supabase/seed.sql, not a hosted product.
test('search, details, cart and cheapest local price', async ({ page }) => {
  await page.goto('/#/search?q=Testmjölk&store=ica');
  await expect(page.locator('.offer-card')).toHaveCount(1);
  await page.getByRole('heading', { name: 'Testmjölk 3%', exact: true }).click();
  await expect(page).toHaveURL(/details\/ica_milk/);
  await expect(page.getByRole('button', { name: 'Lägg i varukorg', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Lägg i varukorg', exact: true }).click();
  // Use actual browser geolocation through the existing model interface; no backend mocking.
  await page.evaluate(() => window.userModel.setLocation(18.0686, 59.3293));
  await page.locator('.navbar-cart-btn').click();
  await expect(page.getByRole('heading', { name: 'Granska din varukorg' })).toBeVisible();
  await page.getByRole('button', { name: 'Beräkna total' }).click();
  await expect(page.locator('.total-value')).toHaveText('15.00 kr');
  await page.getByRole('button', { name: 'Öka antal', exact: true }).click();
  await expect(page.locator('.total-value')).toHaveText('30.00 kr');
});
test('sign in, save profile and reload through Supabase', async ({ page }) => {
  const client = createClient(url, key);
  const email = 'e2e-' + randomUUID() + '@example.test';
  const password = 'Local-test-42!';
  const signup = await client.auth.signUp({ email, password });
  if (signup.data.user) createdUsers.push(signup.data.user.id);
  expect(signup.error).toBeNull();
  await client.auth.signOut();
  await page.goto('/');
  await page.getByRole('button', { name: 'Logga in', exact: true }).click();
  await page.getByPlaceholder('E-post', { exact: true }).fill(email);
  await page.getByPlaceholder('Lösenord', { exact: true }).fill(password);
  await page.locator('.auth-submit-btn').click();
  await expect(page.locator('.auth-modal')).toHaveCount(0);
  await page.locator('.navbar-login-btn').click();
  await expect(page.getByRole('heading', { name: 'Min profil' })).toBeVisible();
  await page.locator('.profile-toggle-slider').click();
  await page.getByPlaceholder('t.ex. 10', { exact: true }).fill('12');
  const login = await client.auth.signInWithPassword({ email, password });
  expect(login.error).toBeNull();
  await expect.poll(async () => {
    const { data, error } = await client.from('profiles').select('senior_discount_percent').single();
    if (error) throw error;
    return Number(data.senior_discount_percent);
  }).toBe(12);
  await page.reload();
  await expect(page.getByPlaceholder('t.ex. 10', { exact: true })).toHaveValue('12');
  await page.getByRole('button', { name: 'Logga ut' }).click();
  await expect(page.getByRole('button', { name: 'Logga in', exact: true })).toBeVisible();
});
test('empty result and a readable backend failure', async ({ page }) => {
  await page.goto('/#/search?q=zzznomatch');
  await expect(page.getByText('Inga produkter hittades', { exact: false })).toBeVisible();
  await page.route('**/rest/v1/rpc/search_products_dev1_4', route => route.fulfill({
    status: 503, json: { message: 'backend unavailable', code: 'TEST_FAILURE' },
  }));
  await page.goto('/#/search?q=Testkaffe');
  await expect(page.getByRole('alert')).toHaveText('Det gick inte att hämta produkter. Försök igen senare.');
});

const createdUsers: string[] = [];
test.afterEach(async () => {
  if (!createdUsers.length) return;
  const status = JSON.parse(execFileSync(process.execPath, [resolve('node_modules/supabase/dist/supabase.js'), 'status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  const admin = createClient(url, status.SECRET_KEY || status.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  for (const id of createdUsers.splice(0)) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw new Error('Could not clean up disposable local test user.');
  }
});