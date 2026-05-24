import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('AdminsPage', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admins');
  });

  test('affiche le titre Comptes admin et la table', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /comptes admin/i }),
    ).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /email/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /rôle/i })).toBeVisible();
  });

  test('SUPER_ADMIN voit le bouton "Nouvel admin" et peut ouvrir la modale', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /nouvel admin/i }).click();
    await expect(page.getByPlaceholder('Email *')).toBeVisible();
    await expect(page.getByPlaceholder('Prénom *')).toBeVisible();
    await expect(page.getByPlaceholder('Nom *', { exact: true })).toBeVisible();
    await expect(page.getByRole('combobox')).toBeVisible();
  });

  test('soumission vide → erreurs de validation visibles', async ({ page }) => {
    await page.getByRole('button', { name: /nouvel admin/i }).click();
    await page.getByRole('button', { name: /^créer$/i }).click();
    await expect(page.getByText(/l'email est obligatoire/i)).toBeVisible();
    await expect(page.getByText(/prénom est trop court/i)).toBeVisible();
    await expect(page.getByText(/^Le nom est trop court/i)).toBeVisible();
  });

  test('email invalide → message d\'erreur', async ({ page }) => {
    await page.getByRole('button', { name: /nouvel admin/i }).click();
    await page.getByPlaceholder('Email *').fill('pas-un-email');
    await page.getByPlaceholder('Prénom *').fill('Marie');
    await page.getByPlaceholder('Nom *', { exact: true }).fill('Curie');
    await page.getByRole('button', { name: /^créer$/i }).click();
    await expect(page.getByText(/format d'email invalide/i)).toBeVisible();
  });

  test('select rôle propose ADMIN et SUPER_ADMIN', async ({ page }) => {
    await page.getByRole('button', { name: /nouvel admin/i }).click();
    const select = page.getByRole('combobox');
    await expect(select.locator('option', { hasText: /^ADMIN$/ })).toHaveCount(1);
    await expect(select.locator('option', { hasText: /^SUPER_ADMIN$/ })).toHaveCount(1);
  });

  test('annuler ferme la modale de création', async ({ page }) => {
    await page.getByRole('button', { name: /nouvel admin/i }).click();
    await page.getByRole('button', { name: /annuler/i }).click();
    await expect(page.getByPlaceholder('Email *')).not.toBeVisible();
  });
});
