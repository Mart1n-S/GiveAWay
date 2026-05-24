import { test, expect, Page } from "../_fixtures";
import {
  cleanDatabaseForWorker,
  createTestUser,
} from "../../../api/test/prisma-test-helper";

const VALID_PASSWORD = "Password123!";

test.beforeEach(async ({}, testInfo) => {
  await cleanDatabaseForWorker(testInfo.parallelIndex);
});

// ===========================================================================
// HELPER : connexion + navigation vers /profil/associations-aidees
// ===========================================================================
async function loginAndGoToAssociationsAidees(
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

  await page.goto("/profil/associations-aidees");
  await expect(page).toHaveURL(/.*profil\/associations-aidees/);
}

// ===========================================================================
// TESTS : Accès et redirection
// ===========================================================================
test.describe("Page Associations aidées — Accès", () => {
  test("devrait rediriger si non authentifié", async ({ page }) => {
    await page.goto("/profil/associations-aidees");

    // La page est protégée par ProtectedStack — l'utilisateur est redirigé
    await expect(page).not.toHaveURL(/.*profil\/associations-aidees/);
  });
});

// ===========================================================================
// TESTS : État vide (aucune participation)
// ===========================================================================
test.describe("Page Associations aidées — État vide", () => {
  test("devrait afficher 'Aucune participation' pour un utilisateur sans historique", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociationsAidees(page, user, isMobile);

    await expect(page.getByText(/aucune participation/i)).toBeVisible();
  });

  test("devrait afficher le message d'aide invitant à participer à des missions", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociationsAidees(page, user, isMobile);

    await expect(
      page.getByText(/participez à des missions pour voir vos statistiques/i),
    ).toBeVisible();
  });
});

// ===========================================================================
// TESTS : Section Filtres
// ===========================================================================
test.describe("Page Associations aidées — Filtres", () => {
  test("devrait afficher la section 'Filtres'", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociationsAidees(page, user, isMobile);

    await expect(page.getByText(/filtres/i).first()).toBeVisible();
  });

  test("devrait afficher le bouton de filtre 'Tous' (filter-type-ALL)", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociationsAidees(page, user, isMobile);

    await expect(page.getByTestId("filter-type-ALL")).toBeVisible();
  });

  test("devrait afficher le bouton de filtre 'Mission' (filter-type-MISSION)", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociationsAidees(page, user, isMobile);

    await expect(page.getByTestId("filter-type-MISSION")).toBeVisible();
  });

  test("devrait afficher le bouton de filtre 'Événement' (filter-type-EVENT)", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociationsAidees(page, user, isMobile);

    await expect(page.getByTestId("filter-type-EVENT")).toBeVisible();
  });

  test("ne devrait pas afficher le bouton Réinitialiser si aucun filtre n'est actif", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociationsAidees(page, user, isMobile);

    // Sans filtre actif, "Réinitialiser les filtres" ne doit pas être visible
    await expect(
      page.getByText(/réinitialiser les filtres/i),
    ).not.toBeVisible();
  });

  test("devrait afficher le bouton Réinitialiser après sélection d'un filtre type", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociationsAidees(page, user, isMobile);

    // Activer le filtre MISSION
    await page.getByTestId("filter-type-MISSION").click();

    // "Réinitialiser les filtres" doit apparaître
    await expect(
      page.getByText(/réinitialiser les filtres/i),
    ).toBeVisible();
  });
});

// ===========================================================================
// TESTS : Navigation web
// ===========================================================================
test.describe("Page Associations aidées — Navigation web", () => {
  test("devrait afficher le bouton Retour sur web", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    // Ce test est pertinent uniquement sur web
    if (isMobile) {
      test.skip();
      return;
    }

    await loginAndGoToAssociationsAidees(page, user, isMobile);

    await expect(
      page.getByRole("button", { name: /retour/i }),
    ).toBeVisible();
  });
});
