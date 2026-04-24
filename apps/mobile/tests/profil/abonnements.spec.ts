import { test, expect, Page } from "@playwright/test";
import {
  cleanDatabase,
  createTestUser,
} from "../../../api/test/prisma-test-helper";

const VALID_PASSWORD = "Password123!";

test.beforeEach(async () => {
  await cleanDatabase();
});

// ===========================================================================
// HELPER : connexion + navigation vers /profil/abonnements
// ===========================================================================
async function loginAndGoToAbonnements(
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

  await page.goto("/profil/abonnements");
  await expect(page).toHaveURL(/.*profil\/abonnements/);
}

// ===========================================================================
// TESTS : Accès et redirection
// ===========================================================================
test.describe("Page Abonnements — Accès", () => {
  test("devrait rediriger vers la page d'accueil si non authentifié", async ({
    page,
  }) => {
    await page.goto("/profil/abonnements");

    // La page est protégée par ProtectedStack — l'utilisateur est redirigé
    await expect(page).not.toHaveURL(/.*profil\/abonnements/);
  });
});

// ===========================================================================
// TESTS : État vide
// ===========================================================================
test.describe("Page Abonnements — État vide", () => {
  test("devrait afficher le message 'Vous ne suivez aucune association' pour un utilisateur sans abonnements", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAbonnements(page, user, isMobile);

    await expect(
      page.getByText(/vous ne suivez aucune association pour l'instant/i),
    ).toBeVisible();
  });
});

// ===========================================================================
// TESTS : Navigation web
// ===========================================================================
test.describe("Page Abonnements — Navigation web", () => {
  test("devrait afficher le bouton Retour sur web", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    // Ce test est pertinent uniquement sur web
    if (isMobile) {
      test.skip();
      return;
    }

    await loginAndGoToAbonnements(page, user, isMobile);

    await expect(
      page.getByRole("button", { name: /retour/i }),
    ).toBeVisible();
  });
});

// ===========================================================================
// TESTS : Composants de la page
// ===========================================================================
test.describe("Page Abonnements — Composants", () => {
  test("devrait afficher le champ de recherche", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAbonnements(page, user, isMobile);

    // Le SearchInput doit être présent même quand la liste est vide
    await expect(
      page.getByPlaceholder(/rechercher une association/i),
    ).toBeVisible();
  });

  test("devrait afficher le titre 'Abonnements'", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAbonnements(page, user, isMobile);

    await expect(page).toHaveTitle(/abonnements/i);
  });
});
