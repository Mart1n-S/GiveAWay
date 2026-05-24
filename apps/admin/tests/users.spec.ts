import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('UsersPage', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/users');
  });

  test('affiche le titre, la recherche et le filtre statut', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /utilisateurs/i }),
    ).toBeVisible();
    await expect(
      page.getByPlaceholder(/recherche nom \/ email/i),
    ).toBeVisible();
    await expect(page.getByRole('combobox')).toBeVisible();
  });

  test('clic sur "Nouvel utilisateur" ouvre la modale avec les champs requis', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /nouvel utilisateur/i }).click();
    await expect(page.getByPlaceholder('Email *')).toBeVisible();
    await expect(page.getByPlaceholder('Prénom *')).toBeVisible();
    await expect(page.getByPlaceholder('Nom *', { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder('Âge *')).toBeVisible();
    await expect(page.getByPlaceholder('Adresse *')).toBeVisible();
    await expect(page.getByPlaceholder('Code postal *')).toBeVisible();
    await expect(page.getByPlaceholder('Ville *')).toBeVisible();
  });

  test('soumission vide → affiche les erreurs de validation', async ({ page }) => {
    await page.getByRole('button', { name: /nouvel utilisateur/i }).click();
    await page.getByRole('button', { name: /^créer$/i }).click();
    await expect(page.getByText(/l'email est obligatoire/i)).toBeVisible();
    await expect(page.getByText(/prénom est trop court/i).first()).toBeVisible();
    await expect(page.getByText(/l'âge est obligatoire/i)).toBeVisible();
    await expect(page.getByText(/code postal doit contenir 5 chiffres/i)).toBeVisible();
  });

  test('email invalide → message "Format d\'email invalide"', async ({ page }) => {
    await page.getByRole('button', { name: /nouvel utilisateur/i }).click();
    await page.getByPlaceholder('Email *').fill('not-an-email');
    await page.getByPlaceholder('Prénom *').fill('Jean');
    await page.getByPlaceholder('Nom *', { exact: true }).fill('Dupont');
    await page.getByPlaceholder('Âge *').fill('25');
    await page.getByPlaceholder('Adresse *').fill('1 rue de Paris');
    await page.getByPlaceholder('Code postal *').fill('75001');
    await page.getByPlaceholder('Ville *').fill('Paris');
    await page.getByRole('button', { name: /^créer$/i }).click();
    await expect(page.getByText(/format d'email invalide/i)).toBeVisible();
  });

  test('âge < 18 → message d\'erreur', async ({ page }) => {
    await page.getByRole('button', { name: /nouvel utilisateur/i }).click();
    await page.getByPlaceholder('Email *').fill('jeune@test.com');
    await page.getByPlaceholder('Prénom *').fill('Jean');
    await page.getByPlaceholder('Nom *', { exact: true }).fill('Dupont');
    await page.getByPlaceholder('Âge *').fill('15');
    await page.getByPlaceholder('Adresse *').fill('1 rue');
    await page.getByPlaceholder('Code postal *').fill('75001');
    await page.getByPlaceholder('Ville *').fill('Paris');
    await page.getByRole('button', { name: /^créer$/i }).click();
    await expect(page.getByText(/au moins 18 ans/i)).toBeVisible();
  });

  test('code postal invalide → message d\'erreur', async ({ page }) => {
    await page.getByRole('button', { name: /nouvel utilisateur/i }).click();
    await page.getByPlaceholder('Code postal *').fill('abc');
    await page.getByRole('button', { name: /^créer$/i }).click();
    await expect(page.getByText(/code postal doit contenir 5 chiffres/i)).toBeVisible();
  });

  test('annuler ferme la modale', async ({ page }) => {
    await page.getByRole('button', { name: /nouvel utilisateur/i }).click();
    await expect(page.getByPlaceholder('Email *')).toBeVisible();
    await page.getByRole('button', { name: /annuler/i }).click();
    await expect(page.getByPlaceholder('Email *')).not.toBeVisible();
  });

  test('filtre statut PENDING → la liste reste accessible', async ({ page }) => {
    await page.getByRole('combobox').selectOption('PENDING');
    await expect(
      page.getByRole('heading', { name: /utilisateurs/i }),
    ).toBeVisible();
  });

  test('recherche : saisie et UI stable', async ({ page }) => {
    await page.getByPlaceholder(/recherche nom \/ email/i).fill('inconnu-zzz');
    await expect(
      page.getByRole('heading', { name: /utilisateurs/i }),
    ).toBeVisible();
  });
});
