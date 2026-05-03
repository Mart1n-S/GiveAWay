import { test, expect } from '@playwright/test';

const EMAIL = process.env.ADMIN_E2E_EMAIL || 'admin@gmail.com';
const PASSWORD = process.env.ADMIN_E2E_PASSWORD || 'password';

test.describe('Admin login flow', () => {
  test('connexion → redirection dashboard → KPIs visibles', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(EMAIL);
    await page.getByLabel('Mot de passe').fill(PASSWORD);
    await page.getByRole('button', { name: /se connecter/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText(/utilisateurs actifs/i)).toBeVisible();
  });

  test('échec sur credentials invalides reste sur /login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(EMAIL);
    await page.getByLabel('Mot de passe').fill('wrong-password');
    await page.getByRole('button', { name: /se connecter/i }).click();

    await expect(page).toHaveURL(/\/login$/);
  });

  test('formulaire bloque la soumission si champs vides (HTML5 required)', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /se connecter/i }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('affiche le titre GiveAWay et le sous-titre Console', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /giveaway/i })).toBeVisible();
    await expect(page.getByText(/console d'administration/i)).toBeVisible();
  });

  test('accès direct à /dashboard sans auth → redirige vers /login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
  });
});
