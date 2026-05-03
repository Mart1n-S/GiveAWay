import { Page, expect } from '@playwright/test';

export const ADMIN_EMAIL = process.env.ADMIN_E2E_EMAIL || 'admin@gmail.com';
export const ADMIN_PASSWORD = process.env.ADMIN_E2E_PASSWORD || 'password';

/**
 * Connecte l'admin via le formulaire de login et attend la redirection
 * vers /dashboard. À utiliser dans `beforeEach` pour partager la logique
 * d'authentification entre toutes les suites.
 */
export async function loginAsAdmin(
  page: Page,
  email: string = ADMIN_EMAIL,
  password: string = ADMIN_PASSWORD,
) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: /se connecter/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
