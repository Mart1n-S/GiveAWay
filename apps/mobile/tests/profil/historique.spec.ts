import { test, expect, Page } from "../_fixtures";
import {
  cleanDatabaseForWorker,
  createTestUser,
  createTestAssociation,
  createTestMission,
  createTestMissionParticipant,
} from "../../../api/test/prisma-test-helper";

test.beforeEach(async ({}, testInfo) => {
  await cleanDatabaseForWorker(testInfo.parallelIndex);
});

// ===========================================================================
// HELPER : connexion + navigation vers la page historique
// ===========================================================================
async function loginAndGoToHistorique(
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
  await page.waitForLoadState("networkidle");

  await page.goto("/profil/historique");
  await expect(page).toHaveURL(/.*historique/);
}

// ===========================================================================
// TESTS : Accès à la page
// ===========================================================================
test.describe("Page Historique — Accès", () => {
  test("devrait rediriger si non authentifié", async ({ page }) => {
    await page.goto("/profil/historique");
    await expect(page).not.toHaveURL(/.*historique$/);
  });
});

// ===========================================================================
// TESTS : État vide
// ===========================================================================
test.describe("Page Historique — État vide", () => {
  test("devrait afficher l'état vide si aucune participation", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToHistorique(page, user, isMobile);

    await expect(page.getByText(/aucune mission/i)).toBeVisible();
    await expect(
      page.getByText(/participez à des missions/i),
    ).toBeVisible();
  });
});

// ===========================================================================
// TESTS : Affichage avec participations
// ===========================================================================
test.describe("Page Historique — Affichage avec participations", () => {
  test("devrait afficher le toggle Liste / Planning", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(user.id, testInfo.parallelIndex);
    const mission = await createTestMission(assoc.id, { title: "Mission test" });
    await createTestMissionParticipant(mission.id, user.id);

    const isMobile = testInfo.project.name.includes("Mobile");
    await loginAndGoToHistorique(page, user, isMobile);

    await expect(page.getByText("Liste")).toBeVisible();
    await expect(page.getByText("Planning")).toBeVisible();
  });

  test("devrait afficher la mission dans la vue Liste", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(user.id, testInfo.parallelIndex);
    const mission = await createTestMission(assoc.id, { title: "Mission test E2E" });
    await createTestMissionParticipant(mission.id, user.id);

    const isMobile = testInfo.project.name.includes("Mobile");
    await loginAndGoToHistorique(page, user, isMobile);

    await expect(page.getByText("Mission test E2E")).toBeVisible();
  });

  test("devrait afficher les filtres de type", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(user.id, testInfo.parallelIndex);
    const mission = await createTestMission(assoc.id);
    await createTestMissionParticipant(mission.id, user.id);

    const isMobile = testInfo.project.name.includes("Mobile");
    await loginAndGoToHistorique(page, user, isMobile);

    await expect(page.getByTestId("filter-type-ALL")).toBeVisible();
    await expect(page.getByTestId("filter-type-MISSION")).toBeVisible();
  });

  test("devrait filtrer par type de mission", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(user.id, testInfo.parallelIndex);
    const missionA = await createTestMission(assoc.id, { title: "Ma mission" });
    const missionB = await createTestMission(assoc.id, {
      title: "Mon événement",
      type: "EVENT",
    });
    await createTestMissionParticipant(missionA.id, user.id);
    await createTestMissionParticipant(missionB.id, user.id);

    const isMobile = testInfo.project.name.includes("Mobile");
    await loginAndGoToHistorique(page, user, isMobile);

    // Filtre sur EVENT
    await page.getByTestId("filter-type-EVENT").click();
    await expect(page.getByText("Mon événement")).toBeVisible();
    await expect(page.getByText("Ma mission")).not.toBeVisible();

    // Retour à tout
    await page.getByTestId("filter-type-ALL").click();
    await expect(page.getByText("Ma mission")).toBeVisible();
    await expect(page.getByText("Mon événement")).toBeVisible();
  });
});

// ===========================================================================
// TESTS : Vue Planning (calendrier)
// ===========================================================================
test.describe("Page Historique — Vue Planning", () => {
  test("devrait basculer vers la vue Planning", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(user.id, testInfo.parallelIndex);
    const mission = await createTestMission(assoc.id);
    await createTestMissionParticipant(mission.id, user.id);

    const isMobile = testInfo.project.name.includes("Mobile");
    await loginAndGoToHistorique(page, user, isMobile);

    await page.getByText("Planning").click();

    // Le calendrier doit être visible
    await expect(page.getByText(/janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre/i)).toBeVisible();
  });

  test("devrait afficher la légende du calendrier", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(user.id, testInfo.parallelIndex);
    const mission = await createTestMission(assoc.id);
    await createTestMissionParticipant(mission.id, user.id);

    const isMobile = testInfo.project.name.includes("Mobile");
    await loginAndGoToHistorique(page, user, isMobile);

    await page.getByText("Planning").click();

    await expect(page.getByText("Légende")).toBeVisible();
    await expect(page.getByText("En cours")).toBeVisible();
    await expect(page.getByText("À venir")).toBeVisible();
    await expect(page.getByText("Terminées")).toBeVisible();
  });

  test("devrait afficher le message de sélection d'un jour", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(user.id, testInfo.parallelIndex);
    const mission = await createTestMission(assoc.id);
    await createTestMissionParticipant(mission.id, user.id);

    const isMobile = testInfo.project.name.includes("Mobile");
    await loginAndGoToHistorique(page, user, isMobile);

    await page.getByText("Planning").click();
    await expect(
      page.getByText(/sélectionnez un jour/i),
    ).toBeVisible();
  });
});

// ===========================================================================
// TESTS : Navigation
// ===========================================================================
test.describe("Page Historique — Navigation", () => {
  test("devrait naviguer vers le détail d'une mission au clic", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(user.id, testInfo.parallelIndex);
    const mission = await createTestMission(assoc.id, { title: "Mission cliquable" });
    await createTestMissionParticipant(mission.id, user.id);

    const isMobile = testInfo.project.name.includes("Mobile");
    await loginAndGoToHistorique(page, user, isMobile);

    await page.getByText("Mission cliquable").click();
    await expect(page).toHaveURL(new RegExp(`missions/${mission.id}`));
  });
});
