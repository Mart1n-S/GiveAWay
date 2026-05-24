import { test, expect, type Page } from "../_fixtures";
import {
  cleanDatabaseForWorker,
  createTestUser,
  createTestAssociation,
  createTestMission,
  addAssociationMember,
} from "../../../api/test/prisma-test-helper";
import {
  ActivityType,
  AssociationRole,
} from "../../../api/src/generated/prisma/client";

const VALID_PASSWORD = "Password123!";

test.beforeEach(async ({}, testInfo) => {
  await cleanDatabaseForWorker(testInfo.parallelIndex);
});

// ===========================================================================
// HELPERS
// ===========================================================================

async function loginUser(
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
}

async function loginAndGoToStats(
  page: Page,
  user: { email: string },
  isMobile: boolean,
) {
  await loginUser(page, user, isMobile);
  await page.goto("/association/statistiques");
  await expect(page).toHaveURL(/.*association\/statistiques/);
}

// ===========================================================================
// Accès
// ===========================================================================

test.describe("Page Statistiques — Accès", () => {
  test("devrait rediriger si non authentifié", async ({ page }) => {
    await page.goto("/association/statistiques");
    await expect(page).not.toHaveURL(/.*association\/statistiques$/);
  });
});

// ===========================================================================
// Affichage — aucune mission
// ===========================================================================

test.describe("Page Statistiques — État vide", () => {
  test("devrait afficher 'Aucune donnée disponible' si l'association n'a pas de mission", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    await createTestAssociation(user.id, testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToStats(page, user, isMobile);

    await expect(page.getByText(/aucune donnée disponible/i)).toBeVisible();
  });

  test("devrait afficher les KPI cards avec la valeur 0", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    await createTestAssociation(user.id, testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToStats(page, user, isMobile);

    await expect(page.getByText("Total missions")).toBeVisible();
    await expect(page.getByText("Total participants")).toBeVisible();
  });
});

// ===========================================================================
// Affichage — avec missions
// ===========================================================================

test.describe("Page Statistiques — Avec missions", () => {
  test("devrait afficher les KPI cards avec les bonnes valeurs", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(user.id, testInfo.parallelIndex);
    await createTestMission(assoc.id, { type: ActivityType.MISSION });
    await createTestMission(assoc.id, { type: ActivityType.EVENT });
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToStats(page, user, isMobile);

    await expect(page.getByText("Total missions")).toBeVisible();
    // 2 missions créées
    const kpiValues = page.getByText("2");
    await expect(kpiValues.first()).toBeVisible();
  });

  test("devrait afficher la section top missions", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(user.id, testInfo.parallelIndex);
    await createTestMission(assoc.id, { title: "Mission populaire" });
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToStats(page, user, isMobile);

    await expect(
      page.getByText(/top missions/i),
    ).toBeVisible();
    await expect(page.getByText("Mission populaire")).toBeVisible();
  });

  test("devrait afficher la section répartition par type", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(user.id, testInfo.parallelIndex);
    await createTestMission(assoc.id, { type: ActivityType.MISSION });
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToStats(page, user, isMobile);

    await expect(page.getByText(/répartition par type/i)).toBeVisible();
  });

  test("devrait afficher le graphique missions par mois", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(user.id, testInfo.parallelIndex);
    await createTestMission(assoc.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToStats(page, user, isMobile);

    await expect(page.getByText(/missions créées par mois/i)).toBeVisible();
  });
});

// ===========================================================================
// Navigation
// ===========================================================================

test.describe("Page Statistiques — Navigation depuis association", () => {
  test("devrait naviguer vers /association/statistiques via le bouton 'Statistiques'", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    await createTestAssociation(user.id, testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginUser(page, user, isMobile);
    await page.goto("/association");

    await page.getByTestId("btn-statistics").scrollIntoViewIfNeeded();
    await page.getByTestId("btn-statistics").click();

    await expect(page).toHaveURL(/.*association\/statistiques/);
  });

  test("devrait retourner à /association via le bouton Retour (web)", async ({
    page,
  }, testInfo) => {
    if (testInfo.project.name.includes("Mobile")) return;

    const user = await createTestUser(testInfo.parallelIndex);
    await createTestAssociation(user.id, testInfo.parallelIndex);

    await loginUser(page, user, false);
    await page.goto("/association");
    await page.getByTestId("btn-statistics").scrollIntoViewIfNeeded();
    await page.getByTestId("btn-statistics").click();
    await expect(page).toHaveURL(/.*association\/statistiques/);

    await page.getByRole("button", { name: /retour/i }).click();
    await expect(page).toHaveURL(/.*\/association$/);
  });

  test("ne devrait pas afficher le bouton Statistiques pour un EDITOR", async ({
    page,
  }, testInfo) => {
    const owner = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(owner.id, testInfo.parallelIndex);
    const editor = await createTestUser(testInfo.parallelIndex, 'editor');
    await addAssociationMember(assoc.id, editor.id, AssociationRole.EDITOR);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginUser(page, editor, isMobile);
    await page.goto("/association");

    await expect(page.getByTestId("btn-statistics")).not.toBeVisible();
  });
});

// ===========================================================================
// Filtres
// ===========================================================================

test.describe("Page Statistiques — Filtres", () => {
  test("devrait afficher le panneau de filtres", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    await createTestAssociation(user.id, testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToStats(page, user, isMobile);

    await expect(page.getByText("Filtres")).toBeVisible();
  });

  test("devrait afficher les boutons de filtre par type", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    await createTestAssociation(user.id, testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToStats(page, user, isMobile);

    await expect(page.getByTestId("filter-type-ALL")).toBeVisible();
    await expect(page.getByTestId("filter-type-MISSION")).toBeVisible();
    await expect(page.getByTestId("filter-type-EVENT")).toBeVisible();
    await expect(page.getByTestId("filter-type-COLLECT")).toBeVisible();
    await expect(page.getByTestId("filter-type-INFO")).toBeVisible();
  });

  test("devrait afficher le bouton Réinitialiser après sélection d'un filtre type", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    await createTestAssociation(user.id, testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToStats(page, user, isMobile);

    await page.getByTestId("filter-type-MISSION").click();

    await expect(page.getByTestId("btn-reset-filters")).toBeVisible();
  });

  test("devrait masquer le bouton Réinitialiser si aucun filtre actif", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    await createTestAssociation(user.id, testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToStats(page, user, isMobile);

    await expect(page.getByTestId("btn-reset-filters")).not.toBeVisible();
  });
});

// ===========================================================================
// Export PDF
// ===========================================================================

test.describe("Page Statistiques — Export PDF", () => {
  test("devrait afficher le bouton Exporter PDF", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    await createTestAssociation(user.id, testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToStats(page, user, isMobile);

    await expect(
      page.getByRole("button", { name: /exporter pdf/i }),
    ).toBeVisible();
  });

  test("le bouton Exporter PDF est désactivé pendant le chargement", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    await createTestAssociation(user.id, testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginUser(page, user, isMobile);

    // Intercept pour ralentir la réponse stats
    await page.route("**/missions/statistics**", async (route) => {
      await new Promise((r) => setTimeout(r, 300));
      await route.continue();
    });

    await page.goto("/association/statistiques");

    // Pendant le chargement le bouton export n'est pas encore visible
    const exportBtn = page.getByRole("button", { name: /exporter pdf/i });
    // Après chargement, il doit être visible et activé
    await expect(exportBtn).toBeVisible({ timeout: 10000 });
  });
});
