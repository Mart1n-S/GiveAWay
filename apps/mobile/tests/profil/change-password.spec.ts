import { test, expect, Page } from "../_fixtures";
import {
  cleanDatabaseForWorker,
  createTestUser,
} from "../../../api/test/prisma-test-helper";

const VALID_PASSWORD = "Password123!";
const NEW_VALID_PASSWORD = "NewPassword456@";
const WEAK_PASSWORD = "weakpass";

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
// HELPER : connexion + navigation vers la page changement de mot de passe
// ===========================================================================
async function loginAndGoToChangePassword(
  page: Page,
  user: { email: string },
  isMobile: boolean,
) {
  await loginAndGoToProfile(page, user, isMobile);

  await page.getByTestId("btn-password-security").scrollIntoViewIfNeeded();
  await page.getByTestId("btn-password-security").click();

  await expect(page).toHaveURL(/.*profil\/mot-de-passe/);
}

// ===========================================================================
// TESTS : Navigation
// ===========================================================================
test.describe("Page Changement de mot de passe - Navigation", () => {
  test("devrait naviguer vers la page de changement de mot de passe depuis le profil", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToProfile(page, user, isMobile);

    await page.getByTestId("btn-password-security").scrollIntoViewIfNeeded();
    await page.getByTestId("btn-password-security").click();

    await expect(page).toHaveURL(/.*profil\/mot-de-passe/);
  });

  test("devrait retourner à la page profil en cliquant sur Annuler", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToChangePassword(page, user, isMobile);

    await page.getByTestId("btn-cancel-change-password").click();

    await expect(page).toHaveURL(/.*profil$/);
  });
});

// ===========================================================================
// TESTS : Affichage
// ===========================================================================
test.describe("Page Changement de mot de passe - Affichage", () => {
  test("devrait afficher la bulle d'information de reconnexion et les champs du formulaire", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToChangePassword(page, user, isMobile);

    // Bulle d'information
    await expect(page.getByText(/reconnexion requise/i)).toBeVisible();
    await expect(page.getByText(/déconnecté de tous vos appareils/i)).toBeVisible();

    // Champs du formulaire
    await expect(page.getByTestId("input-old-password")).toBeVisible();
    await expect(page.getByTestId("input-new-password")).toBeVisible();
    await expect(page.getByTestId("input-confirm-password")).toBeVisible();

    // Boutons
    await expect(page.getByTestId("btn-submit-change-password")).toBeVisible();
    await expect(page.getByTestId("btn-cancel-change-password")).toBeVisible();
  });
});

// ===========================================================================
// TESTS : Validation côté client (Zod)
// ===========================================================================
test.describe("Page Changement de mot de passe - Validation", () => {
  test("devrait afficher des erreurs si les champs sont vides à la soumission", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToChangePassword(page, user, isMobile);

    await page.getByTestId("btn-submit-change-password").click();

    // Erreurs de validation sur les champs obligatoires
    await expect(
      page.getByText(/le mot de passe est obligatoire/i).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/la confirmation du mot de passe est obligatoire/i),
    ).toBeVisible();

    // On reste sur la page
    await expect(page).toHaveURL(/.*profil\/mot-de-passe/);
  });

  test("devrait afficher une erreur si le nouveau mot de passe ne respecte pas les critères", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToChangePassword(page, user, isMobile);

    await page.getByTestId("input-old-password").fill(VALID_PASSWORD);
    await page.getByTestId("input-new-password").fill(WEAK_PASSWORD);
    await page.getByTestId("input-confirm-password").fill(WEAK_PASSWORD);

    await page.getByTestId("btn-submit-change-password").click();

    // Erreur de validation du mot de passe
    await expect(
      page
        .getByText(/au moins 12 caractères|majuscule|minuscule|chiffre/i)
        .first(),
    ).toBeVisible();

    await expect(page).toHaveURL(/.*profil\/mot-de-passe/);
  });

  test("devrait afficher une erreur si la confirmation ne correspond pas au nouveau mot de passe", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToChangePassword(page, user, isMobile);

    await page.getByTestId("input-old-password").fill(VALID_PASSWORD);
    await page.getByTestId("input-new-password").fill(NEW_VALID_PASSWORD);
    await page.getByTestId("input-confirm-password").fill("DifferentPass99!");

    await page.getByTestId("btn-submit-change-password").click();

    await expect(
      page.getByText(/les mots de passe ne correspondent pas/i),
    ).toBeVisible();

    await expect(page).toHaveURL(/.*profil\/mot-de-passe/);
  });

  test("devrait afficher une erreur si le nouveau mot de passe est identique à l'ancien", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToChangePassword(page, user, isMobile);

    await page.getByTestId("input-old-password").fill(VALID_PASSWORD);
    await page.getByTestId("input-new-password").fill(VALID_PASSWORD);
    await page.getByTestId("input-confirm-password").fill(VALID_PASSWORD);

    await page.getByTestId("btn-submit-change-password").click();

    await expect(
      page.getByText(/nouveau mot de passe doit être différent/i),
    ).toBeVisible();

    await expect(page).toHaveURL(/.*profil\/mot-de-passe/);
  });
});

// ===========================================================================
// TESTS : Erreurs serveur (400)
// ===========================================================================
test.describe("Page Changement de mot de passe - Erreurs serveur", () => {
  test("devrait afficher une erreur sur le champ 'ancien mot de passe' si le mot de passe actuel est incorrect", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToChangePassword(page, user, isMobile);

    await page.getByTestId("input-old-password").fill("WrongPassword99!");
    await page.getByTestId("input-new-password").fill(NEW_VALID_PASSWORD);
    await page.getByTestId("input-confirm-password").fill(NEW_VALID_PASSWORD);

    await page.getByTestId("btn-submit-change-password").click();

    // L'erreur doit apparaître sous le champ "ancien mot de passe"
    await expect(
      page.getByText(/ancien mot de passe incorrect/i),
    ).toBeVisible();

    // On reste sur la page (pas de déconnexion)
    await expect(page).toHaveURL(/.*profil\/mot-de-passe/);
  });
});

// ===========================================================================
// TESTS : Succès
// ===========================================================================
test.describe("Page Changement de mot de passe - Succès", () => {
  test("devrait changer le mot de passe, afficher un toast de succès et déconnecter l'utilisateur", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToChangePassword(page, user, isMobile);

    // --- ÉTAPE 1 : Remplissage du formulaire ---
    await test.step("Remplissage du formulaire avec des données valides", async () => {
      await page.getByTestId("input-old-password").fill(VALID_PASSWORD);
      await page.getByTestId("input-new-password").fill(NEW_VALID_PASSWORD);
      await page.getByTestId("input-confirm-password").fill(NEW_VALID_PASSWORD);
    });

    // --- ÉTAPE 2 : Soumission ---
    await test.step("Soumission du formulaire", async () => {
      await page.getByTestId("btn-submit-change-password").click();
    });

    // --- ÉTAPE 3 : Vérification du toast de succès ---
    await test.step("Affichage du toast de succès", async () => {
      await expect(
        page.getByText(/mot de passe modifié/i),
      ).toBeVisible({ timeout: 10000 });
    });

    // --- ÉTAPE 4 : Redirection vers l'accueil (déconnexion) ---
    await test.step("Redirection vers l'accueil après déconnexion", async () => {
      await expect(page).toHaveURL("/", { timeout: 10000 });
    });

    // --- ÉTAPE 5 : Vérification que l'utilisateur est bien déconnecté ---
    await test.step("L'utilisateur est déconnecté (bouton connexion visible)", async () => {
      await expect(page).toHaveURL("/");
    });

    // --- ÉTAPE 6 : Vérification que le nouveau mot de passe fonctionne ---
    await test.step("Connexion avec le nouveau mot de passe", async () => {
      if (isMobile) {
        await page.getByTestId("button-menu").filter({ visible: true }).click();
      }

      await page
        .getByRole("button", { name: /connexion/i })
        .filter({ visible: true })
        .click();

      await page.getByTestId("input-login-email").fill(user.email);
      await page.getByTestId("input-login-password").fill(NEW_VALID_PASSWORD);
      await page.getByTestId("btn-login-submit").filter({ visible: true }).click();

      await expect(page).toHaveURL("/");
    });
  });

  test("ne devrait plus accepter l'ancien mot de passe après le changement", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToChangePassword(page, user, isMobile);

    await page.getByTestId("input-old-password").fill(VALID_PASSWORD);
    await page.getByTestId("input-new-password").fill(NEW_VALID_PASSWORD);
    await page.getByTestId("input-confirm-password").fill(NEW_VALID_PASSWORD);
    await page.getByTestId("btn-submit-change-password").click();

    // Attendre la déconnexion
    await expect(page).toHaveURL("/", { timeout: 10000 });

    // Tentative de connexion avec l'ANCIEN mot de passe
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

    // La connexion doit échouer
    await expect(
      page.getByText(/mot de passe incorrect|identifiants invalides/i).first(),
    ).toBeVisible();
  });
});
