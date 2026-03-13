import { expect, test } from '@playwright/test';

test('renders the starter home screen', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/electron update starter/i);
  await expect(
    page.getByRole('heading', {
      name: /electron update starter/i,
    })
  ).toBeVisible();
  await expect(
    page.getByText(/single-route boilerplate with updater wiring/i)
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /updates/i })
  ).toBeVisible();
});
