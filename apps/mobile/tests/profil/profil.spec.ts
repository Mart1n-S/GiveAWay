import { test, expect, Page } from "@playwright/test";
import {
  cleanDatabase,
  createTestUser,
} from "../../../api/test/prisma-test-helper";

test.beforeEach(async () => {
  await cleanDatabase();
});


// ===========================================================================
// HELPER : connexion + navigation vers la page profil
// ===========================================================================
async function loginAndGoToProfile(
  page: Page,
  user: { email: string },
  isMobile: boolean,
) {
  const VALID_PASSWORD = "Password123!";

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
// TESTS : Affichage de la page profil
// ===========================================================================
test.describe("Page Profil - Affichage", () => {
  test("devrait afficher les informations du profil connecté", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToProfile(page, user, isMobile);

    // Vérification que le nom complet est affiché dans le header
    await expect(page.getByTestId("profile-fullname")).toBeVisible();
    await expect(page.getByTestId("profile-fullname")).toContainText("John");
    await expect(page.getByTestId("profile-fullname")).toContainText("Doe");

    // Vérification que les boutons d'action sont présents
    await expect(page.getByTestId("btn-edit-profile")).toBeVisible();
    await expect(page.getByTestId("btn-delete-account")).toBeVisible();
    await expect(page.getByTestId("btn-logout")).toBeVisible();
  });
});

// ===========================================================================
// TESTS : Modification du profil
// ===========================================================================
test.describe("Page Profil - Modification du prénom", () => {
  test("devrait modifier le prénom et afficher la mise à jour sur la page profil", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const isMobile = testInfo.project.name.includes("Mobile");
    const newFirstName = "Martin";

    // --- ÉTAPE 1 : Connexion et navigation profil ---
    await test.step("Connexion et accès à la page profil", async () => {
      await loginAndGoToProfile(page, user, isMobile);
    });

    // --- ÉTAPE 2 : Clic sur "Modifier le profil" ---
    await test.step("Ouverture de la page de modification", async () => {
      // Scroll jusqu'au bouton (il est en bas de page)
      await page.getByTestId("btn-edit-profile").scrollIntoViewIfNeeded();
      await page.getByTestId("btn-edit-profile").click();

      await expect(page).toHaveURL(/.*profil\/modifier/);
    });

    // --- ÉTAPE 3 : Modification du prénom ---
    await test.step("Modification du prénom", async () => {
      const firstNameInput = page.getByTestId("input-firstName");
      await expect(firstNameInput).toBeVisible();

      // On vide le champ et on saisit le nouveau prénom
      await firstNameInput.clear();
      await firstNameInput.fill(newFirstName);

      // Vérification de la valeur saisie
      await expect(firstNameInput).toHaveValue(newFirstName);
    });

    // --- ÉTAPE 4 : Sauvegarde ---
    await test.step("Sauvegarde des modifications", async () => {
      // Scroll jusqu'au bouton sauvegarder (en bas de page)
      await page.getByTestId("btn-save-profile").scrollIntoViewIfNeeded();
      await page.getByTestId("btn-save-profile").click();

      // On attend la redirection vers la page profil
      await expect(page).toHaveURL(/.*profil$/);
    });

    // --- ÉTAPE 5 : Vérification de la mise à jour ---
    await test.step("Vérification que le prénom a bien été mis à jour", async () => {
      const fullname = page.getByTestId("profile-fullname");
      await expect(fullname).toBeVisible();
      await expect(fullname).toContainText(newFirstName);
    });
  });

  test("devrait afficher une erreur si le prénom est trop court", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToProfile(page, user, isMobile);

    await page.getByTestId("btn-edit-profile").scrollIntoViewIfNeeded();
    await page.getByTestId("btn-edit-profile").click();
    await expect(page).toHaveURL(/.*profil\/modifier/);

    const firstNameInput = page.getByTestId("input-firstName");
    await firstNameInput.clear();
    await firstNameInput.fill("J");

    await page.getByTestId("btn-save-profile").scrollIntoViewIfNeeded();
    await page.getByTestId("btn-save-profile").click();

    // Toujours sur la page modifier (pas de redirection)
    await expect(page).toHaveURL(/.*profil\/modifier/);

    // Message d'erreur affiché
    await expect(page.getByText(/trop court/i).first()).toBeVisible();
  });
});

// ===========================================================================
// TESTS : Suppression de compte
// ===========================================================================
test.describe("Page Profil - Suppression de compte", () => {
  test("devrait naviguer vers la page de suppression au clic sur 'Supprimer le compte'", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToProfile(page, user, isMobile);

    await page.getByTestId("btn-delete-account").scrollIntoViewIfNeeded();
    await page.getByTestId("btn-delete-account").click();

    await expect(page).toHaveURL(/.*profil\/supprimer/);
  });
});

// ===========================================================================
// TESTS : Déconnexion depuis la page profil
// ===========================================================================
test.describe("Page Profil - Déconnexion", () => {
  test("devrait déconnecter l'utilisateur et le rediriger vers l'accueil", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToProfile(page, user, isMobile);

    await page.getByTestId("btn-logout").scrollIntoViewIfNeeded();
    await page.getByTestId("btn-logout").click();

    // Retour à l'accueil et bouton connexion visible à nouveau
    await expect(page).toHaveURL("/");
  });
});
