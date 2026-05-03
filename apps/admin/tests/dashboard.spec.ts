import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('DashboardPage', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('affiche le titre Dashboard et les KPIs principaux', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText(/utilisateurs actifs/i)).toBeVisible();
  });

  test('affiche les graphiques (inscriptions / statut associations / top causes)', async ({
    page,
  }) => {
    await expect(
      page.getByRole('heading', { name: /inscriptions utilisateurs/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /statut des associations/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /top causes choisies/i }),
    ).toBeVisible();
  });

  test('navigation sidebar → Utilisateurs', async ({ page }) => {
    await page.getByRole('link', { name: /^utilisateurs$/i }).first().click();
    await expect(page).toHaveURL(/\/users$/);
  });

  test('navigation sidebar → Associations', async ({ page }) => {
    await page.getByRole('link', { name: /^associations$/i }).first().click();
    await expect(page).toHaveURL(/\/associations$/);
  });

  test('SUPER_ADMIN voit le lien Logs et y accède', async ({ page }) => {
    await page.getByRole('link', { name: /logs|journal/i }).first().click();
    await expect(page).toHaveURL(/\/logs$/);
  });

  test('déconnexion → redirige vers /login', async ({ page }) => {
    await page.getByRole('button', { name: /menu utilisateur/i }).click();
    await page.getByRole('menuitem', { name: /déconnexion/i }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
