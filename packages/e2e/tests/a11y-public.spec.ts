import { test, expect } from '../fixtures/axe';

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
  test(`axe: ${path} — zero violations`, async ({ page, makeAxeBuilder }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await makeAxeBuilder().analyze();

    expect(
      accessibilityScanResults.violations,
      `Violations on ${path}:\n${JSON.stringify(accessibilityScanResults.violations, null, 2)}`,
    ).toEqual([]);
  });
}
