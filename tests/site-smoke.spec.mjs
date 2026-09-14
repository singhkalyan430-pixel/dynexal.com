import { test, expect } from 'playwright/test';

const BASE = 'https://dynexal.com';

async function sitemapUrls(request) {
  const response = await request.get(`${BASE}/sitemap.xml`);
  expect(response.status()).toBe(200);
  const xml = await response.text();
  return [...xml.matchAll(/<loc>(https:\/\/dynexal\.com\/[^<]+)<\/loc>/g)].map(m => m[1]);
}

test('all sitemap URLs return HTTP 200', async ({ request }) => {
  const urls = await sitemapUrls(request);
  expect(urls.length).toBeGreaterThan(10);
  for (const url of urls) {
    const response = await request.get(url);
    expect(response.status(), `HTTP status for ${url}`).toBe(200);
  }
});

test('robots.txt is accessible and points to sitemap', async ({ request }) => {
  const response = await request.get(`${BASE}/robots.txt`);
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).toContain('Allow: /');
  expect(body).toContain(`${BASE}/sitemap.xml`);
});

test('homepage renders without same-origin request failures', async ({ page }) => {
  const failed = [];
  const errors = [];
  page.on('requestfailed', req => {
    if (req.url().startsWith(BASE)) failed.push(`${req.method()} ${req.url()} :: ${req.failure()?.errorText || 'failed'}`);
  });
  page.on('pageerror', error => errors.push(error.message));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await expect(page).toHaveTitle(/Dynexal Technologies/i);
  await expect(page.locator('h1').first()).toBeVisible();
  await expect(page.locator('a[href="tutorials.html"]').first()).toBeVisible();
  await expect(page.locator('a[href="services.html"]').first()).toBeVisible();
  expect(failed, failed.join('\n')).toEqual([]);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('mobile navigation opens and closes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const menu = page.locator('.menu-btn');
  const nav = page.locator('.nav');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(nav).toBeVisible();
  await page.locator('.nav a[href="tutorials.html"]').click();
  await expect(page).toHaveURL(/\/tutorials\.html$/);
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
});

test('tutorial filters change visible cards', async ({ page }) => {
  await page.goto(`${BASE}/tutorials.html`, { waitUntil: 'networkidle' });
  const posts = page.locator('.post-grid .post');
  const total = await posts.count();
  expect(total).toBeGreaterThan(10);

  await page.locator('.filter', { hasText: 'Reports' }).click();
  const reportsVisible = await page.locator('.post-grid .post:not([hidden])').count();
  const reportsHidden = await page.locator('.post-grid .post[hidden]').count();
  expect(reportsVisible).toBeGreaterThan(0);
  expect(reportsHidden).toBeGreaterThan(0);

  await page.locator('.filter', { hasText: 'AI' }).click();
  const aiVisible = await page.locator('.post-grid .post:not([hidden])').count();
  expect(aiVisible).toBeGreaterThan(0);
  expect(aiVisible).toBeLessThan(total);

  await page.locator('.filter', { hasText: 'All Tutorials' }).click();
  expect(await page.locator('.post-grid .post:not([hidden])').count()).toBe(total);
});

test('services navigation anchors land on real sections', async ({ page }) => {
  for (const anchor of ['development', 'integration', 'reporting', 'ai']) {
    await page.goto(`${BASE}/services.html#${anchor}`, { waitUntil: 'networkidle' });
    const target = page.locator(`#${anchor}`);
    await expect(target).toBeVisible();
  }
});

test('Dynexal AI launcher opens and closes', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const launcher = page.locator('#dynexal-ai-launcher');
  const panel = page.locator('#dynexal-ai-panel');
  await expect(launcher).toBeVisible();
  await launcher.click();
  await expect(panel).toBeVisible();
  await expect(page.locator('#dynexal-ai-input')).toBeVisible();
  await page.locator('#dynexal-ai-close').click();
  await expect(panel).toBeHidden();
});
