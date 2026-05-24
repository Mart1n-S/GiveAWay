import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('AssociationsPage', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/associations');
  });

  test('affiche le titre, la barre de recherche et les onglets', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /^associations$/i }),
    ).toBeVisible();
    await expect(
      page.getByPlaceholder(/recherche par nom, siret, rna/i),
    ).toBeVisible();
    for (const label of ['Toutes', 'Validées', 'En attente', 'Refusées', 'Suspendues']) {
      await expect(page.getByRole('button', { name: new RegExp(`^${label}$`) })).toBeVisible();
    }
  });

  test('saisir un terme de recherche n\'affiche pas d\'erreur', async ({ page }) => {
    await page.getByPlaceholder(/recherche par nom, siret, rna/i).fill('inconnu-xyz');
    await expect(
      page.getByRole('heading', { name: /^associations$/i }),
    ).toBeVisible();
  });

  test('changer d\'onglet "Validées" → la table reste accessible', async ({ page }) => {
    await page.getByRole('button', { name: /^validées$/i }).click();
    await expect(
      page.getByRole('columnheader', { name: /^nom$/i }),
    ).toBeVisible();
  });

  test('onglet "Suspendues" → table accessible', async ({ page }) => {
    await page.getByRole('button', { name: /^suspendues$/i }).click();
    await expect(page.getByRole('columnheader', { name: /statut/i })).toBeVisible();
  });

  test('table affiche les colonnes attendues', async ({ page }) => {
    for (const col of ['Nom', 'Catégorie', 'Statut', 'Actions']) {
      await expect(page.getByRole('columnheader', { name: new RegExp(col, 'i') })).toBeVisible();
    }
  });
});
