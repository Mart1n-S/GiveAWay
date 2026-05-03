import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('AssociationsPendingPage', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/associations/pending');
  });

  test('affiche le titre et le compteur "association(s) à examiner"', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /associations en attente/i }),
    ).toBeVisible();
    await expect(page.getByText(/à examiner/i)).toBeVisible();
  });

  test('depuis la sidebar : lien direct vers la page', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('link', { name: /^Validations$/ }).click();
    await expect(page).toHaveURL(/\/associations\/pending$/);
  });

  test('table ou état vide est affiché', async ({ page }) => {
    const empty = page.getByText(/aucune association en attente/i);
    const tableHead = page.getByRole('columnheader', { name: /^nom$/i });
    await expect(empty.or(tableHead)).toBeVisible();
  });
});
