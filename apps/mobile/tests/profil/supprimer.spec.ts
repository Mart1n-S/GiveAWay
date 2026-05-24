import { test, expect, Page } from "../_fixtures";
import {
  cleanDatabaseForWorker,
  createTestUser,
  createTestAssociation,
} from "../../../api/test/prisma-test-helper";

const VALID_PASSWORD = "Password123!";

test.beforeEach(async ({}, testInfo) => {
  await cleanDatabaseForWorker(testInfo.parallelIndex);
});

// ===========================================================================
// HELPER : connexion + navigation vers la page profil
// ===========================================================================
async function loginAndGoToProfile(
  page: Page,
  user: { email: string },
  isMobile: boolean,
) {
  await page.goto("/");

  if (isMobile) {
    await page.getByTestId("button-menu").filter({ visible: true }).click();
  }

  await page
    .getByRole("button", { name: /connexion/i })
    .filter({ visible: true })
    .click();

  await page.getByTestId("input-login-email").fill(user.email);
  await page.getByTestId("input-login-password").fill(VALID_PASSWORD);
  await page.getByTestId("btn-login-submit").filter({ visible: true }).click();

  await expect(page).toHaveURL("/");

  if (isMobile) {
    await page.getByTestId("button-menu").filter({ visible: true }).click();
    await page.getByTestId("link-profile").filter({ visible: true }).click();
  } else {
    await page.getByTestId("btn-profile-nav").filter({ visible: true }).click();
  }

  await expect(page).toHaveURL(/.*profil/);
}

// ===========================================================================
// HELPER : connexion + navigation vers la page suppression de compte
// ===========================================================================
async function loginAndGoToDeleteAccount(
  page: Page,
  user: { email: string },
  isMobile: boolean,
) {
  await loginAndGoToProfile(page, user, isMobile);

  await page.getByTestId("btn-delete-account").scrollIntoViewIfNeeded();
  await page.getByTestId("btn-delete-account").click();

  await expect(page).toHaveURL(/.*profil\/supprimer/);
}

// ===========================================================================
// TESTS : Navigation
// ===========================================================================
test.describe("Page Suppression de compte - Navigation", () => {
  test("devrait naviguer vers la page de suppression depuis le profil", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToProfile(page, user, isMobile);

    await page.getByTestId("btn-delete-account").scrollIntoViewIfNeeded();
    await page.getByTestId("btn-delete-account").click();

    await expect(page).toHaveURL(/.*profil\/supprimer/);
  });

  test("devrait retourner à la page profil en cliquant sur Annuler", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToDeleteAccount(page, user, isMobile);

    await page.getByTestId("btn-cancel-delete-account").click();

    await expect(page).toHaveURL(/.*profil/);
  });
});

// ===========================================================================
// TESTS : Affichage
// ===========================================================================
test.describe("Page Suppression de compte - Affichage", () => {
  test("devrait afficher les avertissements et le formulaire", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToDeleteAccount(page, user, isMobile);

    // Avertissement d'action irréversible
    await expect(page.getByText(/action irréversible/i)).toBeVisible();
    await expect(page.getByText(/suppression de votre compte est définitive/i)).toBeVisible();

    // Champ mot de passe (compte email)
    await expect(page.getByTestId("input-delete-password")).toBeVisible();

    // Boutons
    await expect(page.getByTestId("btn-submit-delete-account")).toBeVisible();
    await expect(page.getByTestId("btn-cancel-delete-account")).toBeVisible();
  });

  test("devrait afficher le bouton de soumission désactivé si l'utilisateur est propriétaire d'une association", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    await createTestAssociation(user.id, testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    // L'utilisateur doit se reconnecter pour avoir les associations dans le token
    await loginAndGoToDeleteAccount(page, user, isMobile);

    // Le bandeau d'avertissement propriétaire doit être visible
    await expect(page.getByTestId("delete-owner-warning")).toBeVisible();
    await expect(page.getByText(/transfert de propriété requis/i)).toBeVisible();

    // Le bouton de suppression doit être désactivé
    await expect(page.getByTestId("btn-submit-delete-account")).toBeDisabled();
  });
});

// ===========================================================================
// TESTS : Erreurs serveur (mot de passe incorrect)
// ===========================================================================
test.describe("Page Suppression de compte - Erreurs", () => {
  test("devrait afficher une erreur si le mot de passe est incorrect", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToDeleteAccount(page, user, isMobile);

    await page.getByTestId("input-delete-password").fill("WrongPassword99!");

    await page.getByTestId("btn-submit-delete-account").click();

    // Message d'erreur du serveur visible
    await expect(
      page.getByText(/mot de passe incorrect|confirmation incorrecte/i).first(),
    ).toBeVisible({ timeout: 10000 });

    // On reste sur la page
    await expect(page).toHaveURL(/.*profil\/supprimer/);
  });

  test("devrait rester sur la page si le champ est vide à la soumission", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToDeleteAccount(page, user, isMobile);

    // Soumission sans remplir le champ
    await page.getByTestId("btn-submit-delete-account").click();

    await expect(page).toHaveURL(/.*profil\/supprimer/);
  });
});

// ===========================================================================
// TESTS : Succès
// ===========================================================================
test.describe("Page Suppression de compte - Succès", () => {
  test("devrait supprimer le compte et rediriger vers l'accueil", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToDeleteAccount(page, user, isMobile);

    // --- ÉTAPE 1 : Remplir le formulaire ---
    await test.step("Saisie du mot de passe de confirmation", async () => {
      await page.getByTestId("input-delete-password").fill(VALID_PASSWORD);
    });

    // --- ÉTAPE 2 : Soumettre ---
    await test.step("Soumission de la suppression", async () => {
      await page.getByTestId("btn-submit-delete-account").click();
    });

    // --- ÉTAPE 3 : Vérification du toast succès et redirection ---
    await test.step("Toast de succès et redirection vers l'accueil", async () => {
      await expect(
        page.getByText(/compte supprimé/i),
      ).toBeVisible({ timeout: 10000 });

      await expect(page).toHaveURL("/", { timeout: 10000 });
    });

    // --- ÉTAPE 4 : Tentative de reconnexion échoue ---
    await test.step("La reconnexion avec l'ancien compte doit échouer", async () => {
      if (isMobile) {
        await page.getByTestId("button-menu").filter({ visible: true }).click();
      }

      await page
        .getByRole("button", { name: /connexion/i })
        .filter({ visible: true })
        .click();

      await page.getByTestId("input-login-email").fill(user.email);
      await page.getByTestId("input-login-password").fill(VALID_PASSWORD);
      await page.getByTestId("btn-login-submit").filter({ visible: true }).click();

      await expect(
        page.getByText(/compte introuvable|identifiants invalides|email ou mot de passe/i).first(),
      ).toBeVisible();
    });
  });
});
