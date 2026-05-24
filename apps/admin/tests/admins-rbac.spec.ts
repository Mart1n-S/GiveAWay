import { test, expect } from '@playwright/test';

const SUPER_EMAIL = process.env.ADMIN_E2E_EMAIL || 'admin@gmail.com';
const SUPER_PASSWORD = process.env.ADMIN_E2E_PASSWORD || 'password';

test.describe('Sidebar gating SUPER_ADMIN', () => {
  test('SUPER_ADMIN voit l\'entrée Admins dans la sidebar', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(SUPER_EMAIL);
    await page.getByLabel('Mot de passe').fill(SUPER_PASSWORD);
    await page.getByRole('button', { name: /se connecter/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('link', { name: /admins/i })).toBeVisible();
  });

  test('SUPER_ADMIN peut accéder à la page Admins via la sidebar', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(SUPER_EMAIL);
    await page.getByLabel('Mot de passe').fill(SUPER_PASSWORD);
    await page.getByRole('button', { name: /se connecter/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.getByRole('link', { name: /admins/i }).first().click();
    await expect(page).toHaveURL(/\/admins$/);
    await expect(
      page.getByRole('button', { name: /nouvel admin/i }),
    ).toBeVisible();
  });

  test('SUPER_ADMIN voit le lien Logs (réservé)', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(SUPER_EMAIL);
    await page.getByLabel('Mot de passe').fill(SUPER_PASSWORD);
    await page.getByRole('button', { name: /se connecter/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('link', { name: /logs|journal/i })).toBeVisible();
  });
});
