import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('ChangePasswordPage', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/account/password');
  });

  test('affiche le titre + section Sécurité', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /changer mon mot de passe/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /sécurité du compte/i }),
    ).toBeVisible();
  });

  test('soumission vide → erreurs "Mot de passe actuel requis"', async ({ page }) => {
    await page.getByRole('button', { name: /mettre à jour/i }).click();
    await expect(page.getByText(/mot de passe actuel requis/i)).toBeVisible();
  });

  test('mot de passe trop faible → règles non satisfaites visibles', async ({ page }) => {
    const inputs = page.locator('input[type="password"]');
    await inputs.nth(0).fill('password');
    await inputs.nth(1).fill('faible');
    await expect(page.getByText(/au moins 12 caractères/i)).toBeVisible();
    await expect(page.getByText(/une majuscule/i)).toBeVisible();
    await expect(page.getByText(/un chiffre/i)).toBeVisible();
  });

  test('mots de passe non identiques → erreur de confirmation', async ({ page }) => {
    const inputs = page.locator('input[type="password"]');
    await inputs.nth(0).fill('password');
    await inputs.nth(1).fill('NewSecret123!@');
    await inputs.nth(2).fill('NewSecret999!@');
    await page.getByRole('button', { name: /mettre à jour/i }).click();
    await expect(
      page.getByText(/les mots de passe ne correspondent pas/i),
    ).toBeVisible();
  });

  test('soumission avec nouveau mot de passe trop faible reste sur la page', async ({
    page,
  }) => {
    const inputs = page.locator('input[type="password"]');
    await inputs.nth(0).fill('password');
    await inputs.nth(1).fill('faible');
    await inputs.nth(2).fill('faible');
    await page.getByRole('button', { name: /mettre à jour/i }).click();
    await expect(page).toHaveURL(/\/account\/password$/);
  });

  test('toggle "afficher le mot de passe" change le type d\'input', async ({ page }) => {
    const inputs = page.locator('input[name="password"], input[type="password"], input[type="text"]');
    const firstPwd = page.locator('input[type="password"]').first();
    await firstPwd.fill('test');
    const toggle = page.getByTitle(/^afficher$/i).first();
    await toggle.click();
    await expect(page.locator('input[type="text"]').first()).toBeVisible();
  });
});
