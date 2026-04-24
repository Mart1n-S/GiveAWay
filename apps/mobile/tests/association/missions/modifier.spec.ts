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

async function loginAndGoToModifier(
  page: Page,
  user: { email: string },
  missionId: number,
  isMobile: boolean,
) {
  await loginUser(page, user, isMobile);
  await page.goto(`/association/missions/${missionId}/modifier`);
  await expect(page).toHaveURL(
    new RegExp(`/association/missions/${missionId}/modifier`),
  );
  // Attendre la fin du chargement du formulaire
  await expect(
    page.getByPlaceholder("Ex: Distribution alimentaire"),
  ).toBeVisible({ timeout: 10000 });
}

// ===========================================================================
// Accès
// ===========================================================================
test.describe("Page Modifier Mission — Accès", () => {
  test("devrait rediriger si l'utilisateur n'est pas authentifié", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const assoc = await createTestAssociation(user.id);
    const mission = await createTestMission(assoc.id);

    await page.goto(`/association/missions/${mission.id}/modifier`);
    await expect(page).not.toHaveURL(
      new RegExp(`/association/missions/${mission.id}/modifier$`),
    );
  });

  test("devrait rediriger vers le détail pour une mission archivée (accès refusé)", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const assoc = await createTestAssociation(user.id);
    const mission = await createTestMission(assoc.id, {
      title: "Mission Archivée",
      status: MissionStatus.ARCHIVED,
    });
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginUser(page, user, isMobile);
    await page.goto(`/association/missions/${mission.id}/modifier`);

    // Toast d'accès refusé
    await expect(page.getByText(/accès refusé/i)).toBeVisible({
      timeout: 10000,
    });

    // Redirigé vers la page de détail
    await expect(page).toHaveURL(
      new RegExp(`/association/missions/${mission.id}$`),
      { timeout: 10000 },
    );
  });
});

// ===========================================================================
// Pré-remplissage du formulaire
// ===========================================================================
test.describe("Page Modifier Mission — Pré-remplissage", () => {
  test("devrait pré-remplir le champ titre avec le titre existant", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const assoc = await createTestAssociation(user.id);
    const mission = await createTestMission(assoc.id, {
      title: "Titre Original E2E",
    });
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToModifier(page, user, mission.id, isMobile);

    await expect(
      page.getByPlaceholder("Ex: Distribution alimentaire"),
    ).toHaveValue("Titre Original E2E");
  });

  test("devrait pré-remplir la description avec la description existante", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const assoc = await createTestAssociation(user.id);
    const mission = await createTestMission(assoc.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToModifier(page, user, mission.id, isMobile);

    await expect(
      page.getByPlaceholder("Décrivez la mission, les activités prévues..."),
    ).toHaveValue(/description de la mission de test/i);
  });
});

// ===========================================================================
// Interface — Stepper
// ===========================================================================
test.describe("Page Modifier Mission — Interface Stepper", () => {
  test("devrait afficher les trois étapes du stepper", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const assoc = await createTestAssociation(user.id);
    const mission = await createTestMission(assoc.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToModifier(page, user, mission.id, isMobile);

    await expect(page.getByText("Informations")).toBeVisible();
    await expect(page.getByText("Détails")).toBeVisible();
    await expect(page.getByText("Tags")).toBeVisible();
  });

  test("devrait afficher les boutons Annuler et Suivant sur l'étape 1", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const assoc = await createTestAssociation(user.id);
    const mission = await createTestMission(assoc.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToModifier(page, user, mission.id, isMobile);

    await expect(
      page.getByRole("button", { name: /annuler/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /suivant/i }),
    ).toBeVisible();
  });
});

// ===========================================================================
// Navigation
// ===========================================================================
test.describe("Page Modifier Mission — Navigation", () => {
  test("devrait revenir à la page précédente avec le bouton Annuler", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const assoc = await createTestAssociation(user.id);
    const mission = await createTestMission(assoc.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    // Naviguer depuis la page de détail → modifier → annuler → retour au détail
    await loginUser(page, user, isMobile);
    await page.goto(`/association/missions/${mission.id}`);
    await expect(
      page.getByRole("button", { name: /modifier/i }),
    ).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /modifier/i }).click();
    await expect(page).toHaveURL(
      new RegExp(`/association/missions/${mission.id}/modifier`),
    );

    // Attendre le chargement du formulaire
    await expect(
      page.getByPlaceholder("Ex: Distribution alimentaire"),
    ).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: /annuler/i }).click();

    await expect(page).toHaveURL(
      new RegExp(`/association/missions/${mission.id}$`),
    );
  });

  test("devrait passer à l'étape 2 au clic sur Suivant", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const assoc = await createTestAssociation(user.id);
    const mission = await createTestMission(assoc.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToModifier(page, user, mission.id, isMobile);

    await page.getByRole("button", { name: /suivant/i }).click();

    // Sur web, 2 boutons "Retour" coexistent (header page + footer étape)
    await expect(page.getByRole("button", { name: /retour/i }).first()).toBeVisible();
  });

  test("devrait passer à l'étape 3 depuis l'étape 2", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const assoc = await createTestAssociation(user.id);
    const mission = await createTestMission(assoc.id, { volunteersNeeded: 5 });
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToModifier(page, user, mission.id, isMobile);

    await page.getByRole("button", { name: /suivant/i }).click();
    await page.getByRole("button", { name: /suivant/i }).click();

    await expect(
      page.getByRole("button", { name: /enregistrer/i }),
    ).toBeVisible();
  });
});

// ===========================================================================
// Soumission
// ===========================================================================
test.describe("Page Modifier Mission — Soumission", () => {
  test("devrait modifier le titre et afficher le toast de succès", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const assoc = await createTestAssociation(user.id);
    const mission = await createTestMission(assoc.id, {
      title: "Titre À Modifier",
      volunteersNeeded: 5,
    });
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToModifier(page, user, mission.id, isMobile);

    // Modifier le titre
    const titleInput = page.getByPlaceholder("Ex: Distribution alimentaire");
    await titleInput.clear();
    await titleInput.fill("Titre Modifié E2E");

    // Étape 1 → Étape 2
    await page.getByRole("button", { name: /suivant/i }).click();

    // Étape 2 → Étape 3
    await page.getByRole("button", { name: /suivant/i }).click();

    // Soumettre
    await page.getByRole("button", { name: /enregistrer/i }).click();

    await expect(page.getByText(/mission mise à jour/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test("devrait afficher une erreur de validation si le titre est vidé", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const assoc = await createTestAssociation(user.id);
    const mission = await createTestMission(assoc.id, {
      title: "Titre Original",
    });
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToModifier(page, user, mission.id, isMobile);

    // Vider le titre
    const titleInput = page.getByPlaceholder("Ex: Distribution alimentaire");
    await titleInput.clear();

    await page.getByRole("button", { name: /suivant/i }).click();

    // Reste sur l'étape 1 (validation échoue)
    await expect(titleInput).toBeVisible();
    await expect(page).toHaveURL(
      new RegExp(`/association/missions/${mission.id}/modifier`),
    );
  });

  test("devrait naviguer vers le détail après une modification réussie", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const assoc = await createTestAssociation(user.id);
    const mission = await createTestMission(assoc.id, { volunteersNeeded: 5 });
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToModifier(page, user, mission.id, isMobile);

    // Étape 1 → sans modification
    await page.getByRole("button", { name: /suivant/i }).click();
    // Étape 2 → sans modification
    await page.getByRole("button", { name: /suivant/i }).click();
    // Soumettre
    await page.getByRole("button", { name: /enregistrer/i }).click();

    await expect(page.getByText(/mission mise à jour/i)).toBeVisible({
      timeout: 10000,
    });
    // Après succès, router.back() ramène à la page précédente
    await expect(page).not.toHaveURL(
      new RegExp(`/association/missions/${mission.id}/modifier$`),
      { timeout: 10000 },
    );
  });
});
