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
// HELPER : crée un jeu de données minimal (user + association)
// ===========================================================================
async function seedAssociation(workerIndex: number) {
  const user = await createTestUser(workerIndex);
  const assoc = await createTestAssociation(user.id, workerIndex);
  return { user, assoc };
}

// ===========================================================================
// HELPER : connexion + navigation vers la page d'une association
// ===========================================================================
async function loginAndGoToAssociation(
  page: Page,
  user: { email: string },
  isMobile: boolean,
  associationId: number,
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

  await page.goto(`/associations/${associationId}`);
  await expect(page).toHaveURL(new RegExp(`/associations/${associationId}`));
}

// ===========================================================================
// TESTS : Bouton "Me notifier" — visibilité
// ===========================================================================
test.describe("Follow Association — Visibilité du bouton 'Me notifier'", () => {
  test("ne devrait PAS afficher le bouton 'Me notifier' à un visiteur non connecté", async ({
    page,
  }, testInfo) => {
    const { assoc } = await seedAssociation(testInfo.parallelIndex);

    await page.goto(`/associations/${assoc.id}`);

    // Le bouton est réservé aux utilisateurs connectés (cf. associations/[id].tsx)
    await expect(page.getByText(/me notifier/i)).not.toBeVisible();
  });
});

// ===========================================================================
// TESTS : Clic avec authentification
// ===========================================================================
test.describe("Follow Association — Utilisateur connecté", () => {
  test("devrait ouvrir la modale de confirmation au clic sur 'Me notifier' quand connecté", async ({
    page,
  }, testInfo) => {
    const { user, assoc } = await seedAssociation(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociation(page, user, isMobile, assoc.id);

    // Clic sur le bouton "Me notifier"
    await page.getByText(/me notifier/i).first().click();

    // La modale de confirmation s'ouvre
    await expect(
      page.getByText(/recevoir des notifications/i),
    ).toBeVisible();
  });

  test("devrait afficher 'Notifications activées' après confirmation du follow", async ({
    page,
  }, testInfo) => {
    const { user, assoc } = await seedAssociation(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociation(page, user, isMobile, assoc.id);

    // Ouvrir la modale
    await page.getByText(/me notifier/i).first().click();
    await expect(
      page.getByText(/recevoir des notifications/i),
    ).toBeVisible();

    // Confirmer l'activation
    await page.getByRole("button", { name: /^activer$/i }).click();

    // Après confirmation le bouton doit indiquer que les notifications sont activées
    await expect(
      page.getByText(/notifications activées/i),
    ).toBeVisible();
  });
});
