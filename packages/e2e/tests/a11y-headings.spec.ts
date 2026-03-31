import { test, expect } from '@playwright/test';

const publicPages = [
  '/',
  '/login',
  '/register',
  '/phone-login',
  '/forgot-password',
  '/privacy',
  '/cookies',
  '/portal/login',
];

for (const path of publicPages) {
  test(`headings: ${path} — exactly one h1`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');

    const h1Count = await page.locator('h1').count();
    expect(
      h1Count,
      `Expected exactly 1 <h1> on ${path}, found ${h1Count}`,
    ).toBe(1);
  });
}

test('heading order: no skipped levels on home page', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Gather all heading levels in DOM order
  const levels = await page.evaluate(() => {
    const headings = Array.from(
      document.querySelectorAll('h1, h2, h3, h4, h5, h6'),
    );
    return headings.map((h) => parseInt(h.tagName.slice(1), 10));
  });

  // Verify no heading jumps more than one level down at a time
  for (let i = 1; i < levels.length; i++) {
    const prev = levels[i - 1];
    const curr = levels[i];
    expect(
      curr <= prev + 1,
      `Heading level skipped from h${prev} to h${curr} at index ${i}`,
    ).toBe(true);
  }
});
