import { test, expect, type Page } from "../../_fixtures";
import {
  cleanDatabaseForWorker,
  createTestUser,
  createTestAssociation,
  createTestMission,
} from "../../../../api/test/prisma-test-helper";
import {
  MissionStatus,
  ActivityType,
} from "../../../../api/src/generated/prisma/client";

const VALID_PASSWORD = "Password123!";

test.beforeEach(async ({}, testInfo) => {
  await cleanDatabaseForWorker(testInfo.parallelIndex);
});

// ===========================================================================
// HELPER : connexion
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

async function loginAndGoToMission(
  page: Page,
  user: { email: string },
  missionId: number,
  isMobile: boolean,
) {
  await loginUser(page, user, isMobile);
  await page.goto(`/association/missions/${missionId}`);
  await expect(page).toHaveURL(
    new RegExp(`/association/missions/${missionId}`),
  );
  // Attendre la fin du chargement
  await expect(page.getByRole("button", { name: /modifier/i })).toBeVisible({
    timeout: 10000,
  });
}

// ===========================================================================
// Affichage
// ===========================================================================
test.describe("Détail Mission — Affichage", () => {
  test("devrait afficher le titre de la mission", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(user.id, testInfo.parallelIndex);
    const mission = await createTestMission(assoc.id, {
      title: "Mission Détail E2E",
    });
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToMission(page, user, mission.id, isMobile);

    await expect(page.getByText("Mission Détail E2E")).toBeVisible();
  });

  test("devrait afficher le badge de statut 'Active'", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(user.id, testInfo.parallelIndex);
    const mission = await createTestMission(assoc.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToMission(page, user, mission.id, isMobile);

    await expect(page.getByText("Active")).toBeVisible();
  });

  test("devrait afficher le badge de statut 'Archivée' pour une mission archivée", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(user.id, testInfo.parallelIndex);
    const mission = await createTestMission(assoc.id, {
      status: MissionStatus.ARCHIVED,
    });
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginUser(page, user, isMobile);
    await page.goto(`/association/missions/${mission.id}`);
    await expect(page).toHaveURL(
      new RegExp(`/association/missions/${mission.id}`),
    );
    await expect(
      page.getByRole("button", { name: /désarchiver/i }),
    ).toBeVisible({ timeout: 10000 });

    await expect(page.getByText("Archivée")).toBeVisible();
  });

  test("devrait afficher la description de la mission", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(user.id, testInfo.parallelIndex);
    const mission = await createTestMission(assoc.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToMission(page, user, mission.id, isMobile);

    await expect(
      page.getByText(/description de la mission de test/i),
    ).toBeVisible();
  });

  test("devrait afficher le type d'activité dans la card d'en-tête", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(user.id, testInfo.parallelIndex);
    const mission = await createTestMission(assoc.id, {
      type: ActivityType.EVENT,
    });
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToMission(page, user, mission.id, isMobile);

    await expect(page.getByText("Événement")).toBeVisible();
  });

  test("devrait afficher la section Informations pour une mission non-INFO", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(user.id, testInfo.parallelIndex);
    const mission = await createTestMission(assoc.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToMission(page, user, mission.id, isMobile);

    await expect(page.getByText("Informations")).toBeVisible();
  });
});

// ===========================================================================
// Barre d'actions — Mission ACTIVE
// ===========================================================================
test.describe("Détail Mission — Barre d'actions (ACTIVE)", () => {
  test("devrait afficher les boutons Modifier, Archiver et Supprimer", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(user.id, testInfo.parallelIndex);
    const mission = await createTestMission(assoc.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToMission(page, user, mission.id, isMobile);

    await expect(
      page.getByRole("button", { name: /modifier/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /archiver/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /supprimer/i }),
    ).toBeVisible();
  });

  test("devrait naviguer vers la page de modification au clic sur Modifier", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(user.id, testInfo.parallelIndex);
    const mission = await createTestMission(assoc.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToMission(page, user, mission.id, isMobile);

    await page.getByRole("button", { name: /modifier/i }).click();

    await expect(page).toHaveURL(
      new RegExp(`/association/missions/${mission.id}/modifier`),
    );
  });
});

// ===========================================================================
// Barre d'actions — Mission ARCHIVED
// ===========================================================================
test.describe("Détail Mission — Barre d'actions (ARCHIVÉE)", () => {
  test("devrait afficher uniquement le bouton Désarchiver pour une mission archivée", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(user.id, testInfo.parallelIndex);
    const mission = await createTestMission(assoc.id, {
      status: MissionStatus.ARCHIVED,
    });
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginUser(page, user, isMobile);
    await page.goto(`/association/missions/${mission.id}`);
    await expect(
      page.getByRole("button", { name: /désarchiver/i }),
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByRole("button", { name: /désarchiver/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /modifier/i }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: /supprimer/i }),
    ).not.toBeVisible();
  });
});

// ===========================================================================
// Action — Archiver
// ===========================================================================
test.describe("Détail Mission — Action Archiver", () => {
  test("devrait ouvrir la modale de confirmation d'archivage", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(user.id, testInfo.parallelIndex);
    const mission = await createTestMission(assoc.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToMission(page, user, mission.id, isMobile);

    await page.getByRole("button", { name: /archiver/i }).click();

    await expect(
      page.getByText(/archiver la mission/i).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/la mission sera archivée/i),
    ).toBeVisible();
  });

  test("devrait annuler l'archivage et rester sur la page de détail", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(user.id, testInfo.parallelIndex);
    const mission = await createTestMission(assoc.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToMission(page, user, mission.id, isMobile);

    await page.getByRole("button", { name: /archiver/i }).click();
    await page.getByRole("button", { name: /annuler/i }).click();

    // Reste sur la page de détail
    await expect(page).toHaveURL(
      new RegExp(`/association/missions/${mission.id}$`),
    );
    await expect(page.getByText("Active")).toBeVisible();
  });

  test("devrait archiver la mission et mettre à jour le badge de statut", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(user.id, testInfo.parallelIndex);
    const mission = await createTestMission(assoc.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToMission(page, user, mission.id, isMobile);

    await page.getByRole("button", { name: /archiver/i }).click();
    await page.getByRole("button", { name: /^archiver$/i }).last().click();

    await expect(page.getByText("Archivée")).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("button", { name: /désarchiver/i }),
    ).toBeVisible({ timeout: 10000 });
  });
});

// ===========================================================================
// Action — Désarchiver
// ===========================================================================
test.describe("Détail Mission — Action Désarchiver", () => {
  test("devrait ouvrir la modale de confirmation de désarchivage", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(user.id, testInfo.parallelIndex);
    const mission = await createTestMission(assoc.id, {
      status: MissionStatus.ARCHIVED,
    });
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginUser(page, user, isMobile);
    await page.goto(`/association/missions/${mission.id}`);
    await expect(
      page.getByRole("button", { name: /désarchiver/i }),
    ).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: /désarchiver/i }).click();

    await expect(
      page.getByText(/désarchiver la mission/i).first(),
    ).toBeVisible();
  });

  test("devrait désarchiver la mission et afficher le badge 'Active'", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(user.id, testInfo.parallelIndex);
    const mission = await createTestMission(assoc.id, {
      status: MissionStatus.ARCHIVED,
    });
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginUser(page, user, isMobile);
    await page.goto(`/association/missions/${mission.id}`);
    await expect(
      page.getByRole("button", { name: /désarchiver/i }),
    ).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: /désarchiver/i }).click();
    await page.getByRole("button", { name: /^désarchiver$/i }).last().click();

    await expect(page.getByText("Active")).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("button", { name: /archiver/i }),
    ).toBeVisible({ timeout: 10000 });
  });
});

// ===========================================================================
// Action — Supprimer
// ===========================================================================
test.describe("Détail Mission — Action Supprimer", () => {
  test("devrait ouvrir la modale de confirmation de suppression", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(user.id, testInfo.parallelIndex);
    const mission = await createTestMission(assoc.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToMission(page, user, mission.id, isMobile);

    await page.getByRole("button", { name: /supprimer/i }).click();

    await expect(
      page.getByText(/supprimer la mission/i).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/cette action est irréversible/i),
    ).toBeVisible();
  });

  test("devrait annuler la suppression et rester sur la page de détail", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(user.id, testInfo.parallelIndex);
    const mission = await createTestMission(assoc.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToMission(page, user, mission.id, isMobile);

    await page.getByRole("button", { name: /supprimer/i }).click();
    await page.getByRole("button", { name: /annuler/i }).click();

    await expect(page).toHaveURL(
      new RegExp(`/association/missions/${mission.id}$`),
    );
    await expect(
      page.getByRole("button", { name: /supprimer/i }),
    ).toBeVisible();
  });

  test("devrait supprimer la mission et rediriger vers le dashboard", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(user.id, testInfo.parallelIndex);
    const mission = await createTestMission(assoc.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToMission(page, user, mission.id, isMobile);

    await page.getByRole("button", { name: /supprimer/i }).click();
    await page.getByRole("button", { name: /^supprimer$/i }).last().click();

    await expect(page).toHaveURL(/.*association\/missions$/, {
      timeout: 10000,
    });
  });
});
