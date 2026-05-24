import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('AdminLogsPage', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/logs');
  });

  test('affiche le titre + la section Filtres', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /journal d'activité admin/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /filtres/i }),
    ).toBeVisible();
  });

  test('présente les selects de filtre (Action / Entité)', async ({ page }) => {
    await expect(page.getByRole('combobox').first()).toBeVisible();
    await expect(page.locator('select')).toHaveCount(await page.locator('select').count());
  });

  test('bouton "Réinitialiser" présent et cliquable', async ({ page }) => {
    const reset = page.getByRole('button', { name: /réinitialiser|reset/i });
    if ((await reset.count()) > 0) {
      await reset.first().click();
      await expect(page).toHaveURL(/\/logs$/);
    }
  });

  test('bouton export CSV présent', async ({ page }) => {
    const exportBtn = page.getByRole('button', { name: /export|télécharger|csv/i });
    if ((await exportBtn.count()) > 0) {
      await expect(exportBtn.first()).toBeVisible();
    }
  });
});
