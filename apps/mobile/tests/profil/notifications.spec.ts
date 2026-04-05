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
// HELPER : connexion + navigation vers la page notifications
// ===========================================================================
async function loginAndGoToNotifications(
  page: Page,
  user: { email: string },
  isMobile: boolean,
) {
  await loginAndGoToProfile(page, user, isMobile);

  await page.getByTestId("btn-notifications").scrollIntoViewIfNeeded();
  await page.getByTestId("btn-notifications").click();

  await expect(page).toHaveURL(/.*profil\/notifications/);
}

// ===========================================================================
// TESTS : Navigation
// ===========================================================================
test.describe("Page Notifications - Navigation", () => {
  test("devrait naviguer vers la page notifications depuis le profil", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToProfile(page, user, isMobile);

    await page.getByTestId("btn-notifications").scrollIntoViewIfNeeded();
    await page.getByTestId("btn-notifications").click();

    await expect(page).toHaveURL(/.*profil\/notifications/);
  });
});

// ===========================================================================
// TESTS : Affichage
// ===========================================================================
test.describe("Page Notifications - Affichage", () => {
  test("devrait afficher la bulle d'info et le toggle e-mail", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToNotifications(page, user, isMobile);

    // Bulle d'information
    await expect(
      page.getByText(/sauvegardées automatiquement/i),
    ).toBeVisible();

    // Section e-mail
    await expect(
      page.getByText(/notifications par e-mail/i).first(),
    ).toBeVisible();

    // Toggle e-mail
    await expect(
      page.getByTestId("toggle-email-notifications"),
    ).toBeVisible();
  });

  test("devrait afficher le toggle e-mail désactivé par défaut", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToNotifications(page, user, isMobile);

    await expect(
      page.getByTestId("toggle-email-notifications"),
    ).toHaveAttribute("aria-checked", "false");
  });
});

// ===========================================================================
// TESTS : Interactions
// ===========================================================================
test.describe("Page Notifications - Interactions", () => {
  test("devrait activer les notifications e-mail au clic", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToNotifications(page, user, isMobile);

    const emailToggle = page.getByTestId("toggle-email-notifications");

    await emailToggle.click();

    await expect(emailToggle).toHaveAttribute("aria-checked", "true");
  });

  test("devrait désactiver un toggle précédemment activé", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToNotifications(page, user, isMobile);

    const emailToggle = page.getByTestId("toggle-email-notifications");

    // Active puis désactive
    await emailToggle.click();
    await expect(emailToggle).toHaveAttribute("aria-checked", "true");

    await emailToggle.click();
    await expect(emailToggle).toHaveAttribute("aria-checked", "false");
  });

  test("devrait persister l'état après rechargement de la page", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToNotifications(page, user, isMobile);

    // Active les notifications e-mail
    await page.getByTestId("toggle-email-notifications").click();
    await expect(
      page.getByTestId("toggle-email-notifications"),
    ).toHaveAttribute("aria-checked", "true");

    // Retour profil puis retour sur notifications
    await page.goBack();
    await expect(page).toHaveURL(/.*profil$/);

    await page.getByTestId("btn-notifications").scrollIntoViewIfNeeded();
    await page.getByTestId("btn-notifications").click();
    await expect(page).toHaveURL(/.*profil\/notifications/);

    // L'état doit être conservé (sauvegardé en base)
    await expect(
      page.getByTestId("toggle-email-notifications"),
    ).toHaveAttribute("aria-checked", "true");
  });
});

// ===========================================================================
// TESTS : Pas d'erreur globale visible au chargement
// ===========================================================================
test.describe("Page Notifications - Pas d'erreurs initiales", () => {
  test("ne devrait pas afficher de bandeau d'erreur au chargement", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToNotifications(page, user, isMobile);

    await expect(
      page.getByTestId("notifications-global-error"),
    ).not.toBeVisible();
  });
});
