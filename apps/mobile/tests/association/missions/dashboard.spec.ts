import { test, expect, type Page } from "@playwright/test";
import {
  cleanDatabase,
  createTestUser,
  createTestAssociation,
  createTestMission,
} from "../../../../api/test/prisma-test-helper";
import { MissionStatus } from "../../../../api/src/generated/prisma/client";

const VALID_PASSWORD = "Password123!";

test.beforeEach(async () => {
  await cleanDatabase();
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

async function loginAndGoToDashboard(
  page: Page,
  user: { email: string },
  isMobile: boolean,
) {
  await loginUser(page, user, isMobile);
  await page.goto("/association/missions");
  await expect(page).toHaveURL(/.*association\/missions/);
}

async function seedOneMission(
  workerIndex: number,
  options: Parameters<typeof createTestMission>[1] = {},
) {
  const user = await createTestUser(workerIndex);
  const assoc = await createTestAssociation(user.id);
  const mission = await createTestMission(assoc.id, options);
  return { user, assoc, mission };
}

// ===========================================================================
// Accès
// ===========================================================================
test.describe("Dashboard Missions — Accès", () => {
  test("devrait rediriger vers la connexion si non authentifié", async ({
    page,
  }) => {
    await page.goto("/association/missions");
    await expect(page).not.toHaveURL(/.*association\/missions$/);
  });

  test("devrait afficher un message si l'utilisateur n'appartient à aucune association", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginUser(page, user, isMobile);
    await page.goto("/association/missions");

    await expect(
      page.getByText(/n'êtes membre d'aucune association/i),
    ).toBeVisible();
  });
});

// ===========================================================================
// Onglets
// ===========================================================================
test.describe("Dashboard Missions — Onglets", () => {
  test("devrait afficher les quatre onglets de navigation", async ({
    page,
  }, testInfo) => {
    const { user } = await seedOneMission(testInfo.workerIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToDashboard(page, user, isMobile);

    await expect(page.getByRole("tab", { name: "Actives" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "À venir" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Terminées" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Archivées" })).toBeVisible();
  });

  test("devrait basculer sur l'onglet Archivées et afficher l'état vide", async ({
    page,
  }, testInfo) => {
    const { user } = await seedOneMission(testInfo.workerIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToDashboard(page, user, isMobile);

    await page.getByRole("tab", { name: "Archivées" }).click();

    await expect(page.getByText(/aucune mission archivée/i)).toBeVisible();
  });

  test("devrait basculer sur l'onglet Archivées et afficher la mission archivée", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const assoc = await createTestAssociation(user.id);
    await createTestMission(assoc.id, {
      title: "Mission Archivée E2E",
      status: MissionStatus.ARCHIVED,
    });
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToDashboard(page, user, isMobile);

    await page.getByRole("tab", { name: "Archivées" }).click();

    await expect(page.getByText("Mission Archivée E2E")).toBeVisible();
  });
});

// ===========================================================================
// État vide
// ===========================================================================
test.describe("Dashboard Missions — État vide", () => {
  test("devrait afficher l'état vide sur l'onglet Actives sans mission", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    await createTestAssociation(user.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToDashboard(page, user, isMobile);

    await expect(
      page.getByText(/aucune mission active pour le moment/i),
    ).toBeVisible();
  });

  test("devrait afficher le bouton 'Créer une mission' dans l'état vide", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    await createTestAssociation(user.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToDashboard(page, user, isMobile);

    await expect(
      page.getByRole("button", { name: /créer une mission/i }),
    ).toBeVisible();
  });
});

// ===========================================================================
// Affichage des missions
// ===========================================================================
test.describe("Dashboard Missions — Affichage", () => {
  test("devrait afficher le titre de la mission dans la card", async ({
    page,
  }, testInfo) => {
    const { user } = await seedOneMission(testInfo.workerIndex, {
      title: "Mission Visible E2E",
    });
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToDashboard(page, user, isMobile);

    await expect(page.getByText("Mission Visible E2E")).toBeVisible();
  });

  test("devrait afficher le badge de statut 'Active'", async ({
    page,
  }, testInfo) => {
    const { user } = await seedOneMission(testInfo.workerIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToDashboard(page, user, isMobile);

    await expect(page.getByText("Active").first()).toBeVisible();
  });

  test("devrait afficher le badge de type d'activité", async ({
    page,
  }, testInfo) => {
    const { user } = await seedOneMission(testInfo.workerIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToDashboard(page, user, isMobile);

    await expect(page.getByText("Mission").first()).toBeVisible();
  });

  test("devrait naviguer vers le détail au clic sur la card", async ({
    page,
  }, testInfo) => {
    const { user, mission } = await seedOneMission(testInfo.workerIndex, {
      title: "Mission Cliquable",
    });
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToDashboard(page, user, isMobile);

    await page.getByText("Mission Cliquable").click();

    await expect(page).toHaveURL(
      new RegExp(`/association/missions/${mission.id}`),
    );
  });
});

// ===========================================================================
// Bouton Créer
// ===========================================================================
test.describe("Dashboard Missions — Bouton Créer", () => {
  test("devrait afficher le bouton Créer (web)", async ({
    page,
  }, testInfo) => {
    if (testInfo.project.name.includes("Mobile")) test.skip();

    const user = await createTestUser(testInfo.workerIndex);
    await createTestAssociation(user.id);

    await loginAndGoToDashboard(page, user, false);

    await expect(
      page.getByRole("button", { name: /créer/i }).first(),
    ).toBeVisible();
  });

  test("devrait naviguer vers la page de création au clic sur Créer", async ({
    page,
  }, testInfo) => {
    if (testInfo.project.name.includes("Mobile")) test.skip();

    const user = await createTestUser(testInfo.workerIndex);
    await createTestAssociation(user.id);

    await loginAndGoToDashboard(page, user, false);

    await page.getByRole("button", { name: /créer/i }).first().click();

    await expect(page).toHaveURL(/.*association\/missions\/creer/);
  });
});

// ===========================================================================
// Recherche
// ===========================================================================
test.describe("Dashboard Missions — Recherche", () => {
  test("devrait filtrer les missions selon le terme de recherche", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const assoc = await createTestAssociation(user.id);
    await createTestMission(assoc.id, { title: "Maraude nocturne" });
    await createTestMission(assoc.id, { title: "Distribution alimentaire" });
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToDashboard(page, user, isMobile);

    await expect(page.getByText("Maraude nocturne")).toBeVisible();
    await expect(page.getByText("Distribution alimentaire")).toBeVisible();

    await page.getByRole("textbox").first().fill("Maraude");
    await page.waitForTimeout(400);

    await expect(page.getByText("Maraude nocturne")).toBeVisible();
    await expect(page.getByText("Distribution alimentaire")).not.toBeVisible();
  });

  test("devrait afficher un message si la recherche ne donne aucun résultat", async ({
    page,
  }, testInfo) => {
    const { user } = await seedOneMission(testInfo.workerIndex, {
      title: "Mission Existante",
    });
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToDashboard(page, user, isMobile);

    await page.getByRole("textbox").first().fill("xyzintrouvable999");
    await page.waitForTimeout(400);

    await expect(page.getByText(/aucune mission ne correspond/i)).toBeVisible();
  });
});

// ===========================================================================
// Action — Archive depuis la card
// ===========================================================================
test.describe("Dashboard Missions — Action Archiver", () => {
  test("devrait ouvrir la modale de confirmation d'archivage", async ({
    page,
  }, testInfo) => {
    const { user } = await seedOneMission(testInfo.workerIndex, {
      title: "Mission À Archiver",
    });
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToDashboard(page, user, isMobile);

    await page.getByLabel("Actions").first().click();
    await page.getByText("Archiver", { exact: true }).click();

    await expect(page.getByText(/archiver la mission/i).first()).toBeVisible();
    await expect(
      page.getByText(/la mission sera archivée/i),
    ).toBeVisible();
  });

  test("devrait annuler l'archivage et rester sur la liste", async ({
    page,
  }, testInfo) => {
    const { user } = await seedOneMission(testInfo.workerIndex, {
      title: "Mission Non Archivée",
    });
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToDashboard(page, user, isMobile);

    await page.getByLabel("Actions").first().click();
    await page.getByText("Archiver", { exact: true }).click();
    await expect(page.getByText(/archiver la mission/i).first()).toBeVisible();

    await page.getByRole("button", { name: /annuler/i }).click();

    await expect(page.getByText("Mission Non Archivée")).toBeVisible();
  });

  test("devrait archiver la mission et la retirer de l'onglet Actives", async ({
    page,
  }, testInfo) => {
    const { user } = await seedOneMission(testInfo.workerIndex, {
      title: "Mission À Archiver",
    });
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToDashboard(page, user, isMobile);

    await page.getByLabel("Actions").first().click();
    await page.getByText("Archiver", { exact: true }).click();
    await page.getByRole("button", { name: /^archiver$/i }).last().click();

    await expect(
      page.getByText(/aucune mission active pour le moment/i),
    ).toBeVisible({ timeout: 10000 });
  });
});

// ===========================================================================
// Action — Désarchiver depuis l'onglet Archivées
// ===========================================================================
test.describe("Dashboard Missions — Action Désarchiver", () => {
  test("devrait désarchiver la mission et la retirer de l'onglet Archivées", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const assoc = await createTestAssociation(user.id);
    await createTestMission(assoc.id, {
      title: "Mission À Désarchiver",
      status: MissionStatus.ARCHIVED,
    });
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToDashboard(page, user, isMobile);

    await page.getByRole("tab", { name: "Archivées" }).click();
    await expect(page.getByText("Mission À Désarchiver")).toBeVisible();

    await page.getByLabel("Actions").first().click();
    await page.getByText("Désarchiver", { exact: true }).click();

    await expect(
      page.getByText(/aucune mission archivée/i),
    ).toBeVisible({ timeout: 10000 });
  });
});

// ===========================================================================
// Action — Modifier depuis la card
// ===========================================================================
test.describe("Dashboard Missions — Action Modifier", () => {
  test("devrait naviguer vers la page de modification", async ({
    page,
  }, testInfo) => {
    const { user, mission } = await seedOneMission(testInfo.workerIndex, {
      title: "Mission À Modifier",
    });
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToDashboard(page, user, isMobile);

    await page.getByLabel("Actions").first().click();
    await page.getByText("Modifier", { exact: true }).click();

    await expect(page).toHaveURL(
      new RegExp(`/association/missions/${mission.id}/modifier`),
    );
  });
});

// ===========================================================================
// Action — Supprimer depuis la card
// ===========================================================================
test.describe("Dashboard Missions — Action Supprimer", () => {
  test("devrait ouvrir la modale de confirmation de suppression", async ({
    page,
  }, testInfo) => {
    const { user } = await seedOneMission(testInfo.workerIndex, {
      title: "Mission À Supprimer",
    });
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToDashboard(page, user, isMobile);

    await page.getByLabel("Actions").first().click();
    await page.getByText("Supprimer", { exact: true }).click();

    await expect(
      page.getByText(/supprimer la mission/i).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/cette action est irréversible/i),
    ).toBeVisible();
  });

  test("devrait supprimer la mission et afficher l'état vide", async ({
    page,
  }, testInfo) => {
    const { user } = await seedOneMission(testInfo.workerIndex, {
      title: "Mission À Supprimer",
    });
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToDashboard(page, user, isMobile);

    await page.getByLabel("Actions").first().click();
    await page.getByText("Supprimer", { exact: true }).click();
    await page.getByRole("button", { name: /^supprimer$/i }).last().click();

    await expect(
      page.getByText(/aucune mission active pour le moment/i),
    ).toBeVisible({ timeout: 10000 });
  });
});
