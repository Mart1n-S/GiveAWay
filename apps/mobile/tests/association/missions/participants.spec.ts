import { test, expect, type Page } from "@playwright/test";
import {
  cleanDatabase,
  createTestUser,
  createTestAssociation,
  createTestMission,
  createTestMissionParticipant,
} from "../../../../api/test/prisma-test-helper";
import { MissionStatus } from "../../../../api/src/generated/prisma/client";

const VALID_PASSWORD = "Password123!";

test.beforeEach(async () => {
  await cleanDatabase();
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
  await expect(page.getByRole("button", { name: /modifier/i })).toBeVisible({
    timeout: 10000,
  });
}

// ===========================================================================
// Affichage — section participants
// ===========================================================================

test.describe("Participants Mission — Affichage", () => {
  test("devrait afficher la section Participants avec le compteur à zéro", async ({
    page,
  }, testInfo) => {
    const owner = await createTestUser(testInfo.workerIndex);
    const assoc = await createTestAssociation(owner.id);
    const mission = await createTestMission(assoc.id, {
      title: "Mission avec inscrits",
    });
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToMission(page, owner, mission.id, isMobile);

    await expect(page.getByText(/participants/i).first()).toBeVisible();
    await expect(
      page.getByText(/aucun bénévole inscrit/i),
    ).toBeVisible();
  });

  test("devrait afficher la carte du participant inscrit avec son nom", async ({
    page,
  }, testInfo) => {
    const owner = await createTestUser(testInfo.workerIndex);
    const assoc = await createTestAssociation(owner.id);
    const mission = await createTestMission(assoc.id);

    // Créer un second utilisateur et l'inscrire
    const volunteer = await createTestUser(testInfo.workerIndex + 100);
    await createTestMissionParticipant(mission.id, volunteer.id);

    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToMission(page, owner, mission.id, isMobile);

    await expect(
      page.getByRole("button", { name: /voir le profil de john doe/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("devrait afficher le bouton 'Voir le profil' pour un participant", async ({
    page,
  }, testInfo) => {
    const owner = await createTestUser(testInfo.workerIndex);
    const assoc = await createTestAssociation(owner.id);
    const mission = await createTestMission(assoc.id);
    const volunteer = await createTestUser(testInfo.workerIndex + 100);
    await createTestMissionParticipant(mission.id, volunteer.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToMission(page, owner, mission.id, isMobile);

    await expect(
      page.getByRole("button", { name: /voir le profil/i }).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("devrait afficher le bouton 'Retirer' pour une mission active", async ({
    page,
  }, testInfo) => {
    const owner = await createTestUser(testInfo.workerIndex);
    const assoc = await createTestAssociation(owner.id);
    const mission = await createTestMission(assoc.id);
    const volunteer = await createTestUser(testInfo.workerIndex + 100);
    await createTestMissionParticipant(mission.id, volunteer.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToMission(page, owner, mission.id, isMobile);

    await expect(
      page.getByRole("button", { name: /^retirer$/i }).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("ne devrait PAS afficher le bouton 'Retirer' pour une mission archivée", async ({
    page,
  }, testInfo) => {
    const owner = await createTestUser(testInfo.workerIndex);
    const assoc = await createTestAssociation(owner.id);
    const mission = await createTestMission(assoc.id, {
      status: MissionStatus.ARCHIVED,
    });
    const volunteer = await createTestUser(testInfo.workerIndex + 100);
    await createTestMissionParticipant(mission.id, volunteer.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginUser(page, owner, isMobile);
    await page.goto(`/association/missions/${mission.id}`);
    await expect(
      page.getByRole("button", { name: /désarchiver/i }),
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByRole("button", { name: /^retirer$/i }),
    ).not.toBeVisible();
  });

  test("devrait afficher le badge 'Lecture seule' pour une mission archivée avec participants", async ({
    page,
  }, testInfo) => {
    const owner = await createTestUser(testInfo.workerIndex);
    const assoc = await createTestAssociation(owner.id);
    const mission = await createTestMission(assoc.id, {
      status: MissionStatus.ARCHIVED,
    });
    const volunteer = await createTestUser(testInfo.workerIndex + 100);
    await createTestMissionParticipant(mission.id, volunteer.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginUser(page, owner, isMobile);
    await page.goto(`/association/missions/${mission.id}`);
    await expect(
      page.getByRole("button", { name: /désarchiver/i }),
    ).toBeVisible({ timeout: 10000 });

    await expect(page.getByText(/lecture seule/i)).toBeVisible();
  });
});

// ===========================================================================
// Modal profil participant
// ===========================================================================

test.describe("Participants Mission — Profil modal", () => {
  test("devrait ouvrir le modal de profil au clic sur 'Voir le profil'", async ({
    page,
  }, testInfo) => {
    const owner = await createTestUser(testInfo.workerIndex);
    const assoc = await createTestAssociation(owner.id);
    const mission = await createTestMission(assoc.id);
    const volunteer = await createTestUser(testInfo.workerIndex + 100);
    await createTestMissionParticipant(mission.id, volunteer.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToMission(page, owner, mission.id, isMobile);

    await page
      .getByRole("button", { name: /voir le profil/i })
      .first()
      .click();

    await expect(page.getByText(/profil du bénévole/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("devrait afficher le nom complet du bénévole dans le modal", async ({
    page,
  }, testInfo) => {
    const owner = await createTestUser(testInfo.workerIndex);
    const assoc = await createTestAssociation(owner.id);
    const mission = await createTestMission(assoc.id);
    const volunteer = await createTestUser(testInfo.workerIndex + 100);
    await createTestMissionParticipant(mission.id, volunteer.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToMission(page, owner, mission.id, isMobile);

    await page
      .getByRole("button", { name: /voir le profil/i })
      .first()
      .click();

    // Le modal est ouvert et affiche le titre + le bouton retrait (unique au modal)
    await expect(page.getByText(/profil du bénévole/i)).toBeVisible({
      timeout: 5000,
    });
    await expect(
      page.getByRole("button", { name: /retirer de la mission/i }),
    ).toBeVisible({ timeout: 5000 });
  });

  test("devrait fermer le modal au clic sur le bouton Fermer", async ({
    page,
  }, testInfo) => {
    const owner = await createTestUser(testInfo.workerIndex);
    const assoc = await createTestAssociation(owner.id);
    const mission = await createTestMission(assoc.id);
    const volunteer = await createTestUser(testInfo.workerIndex + 100);
    await createTestMissionParticipant(mission.id, volunteer.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToMission(page, owner, mission.id, isMobile);

    await page
      .getByRole("button", { name: /voir le profil/i })
      .first()
      .click();

    await expect(page.getByText(/profil du bénévole/i)).toBeVisible({
      timeout: 5000,
    });

    await page.getByLabel("Fermer").click();

    await expect(page.getByText(/profil du bénévole/i)).not.toBeVisible();
  });

  test("devrait afficher 'Retirer de la mission' dans le modal pour une mission active", async ({
    page,
  }, testInfo) => {
    const owner = await createTestUser(testInfo.workerIndex);
    const assoc = await createTestAssociation(owner.id);
    const mission = await createTestMission(assoc.id);
    const volunteer = await createTestUser(testInfo.workerIndex + 100);
    await createTestMissionParticipant(mission.id, volunteer.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToMission(page, owner, mission.id, isMobile);

    await page
      .getByRole("button", { name: /voir le profil/i })
      .first()
      .click();

    await expect(
      page.getByRole("button", { name: /retirer de la mission/i }),
    ).toBeVisible({ timeout: 5000 });
  });
});

// ===========================================================================
// Action — Retirer un participant
// ===========================================================================

test.describe("Participants Mission — Retrait", () => {
  test("devrait ouvrir la modale de confirmation au clic sur 'Retirer'", async ({
    page,
  }, testInfo) => {
    const owner = await createTestUser(testInfo.workerIndex);
    const assoc = await createTestAssociation(owner.id);
    const mission = await createTestMission(assoc.id);
    const volunteer = await createTestUser(testInfo.workerIndex + 100);
    await createTestMissionParticipant(mission.id, volunteer.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToMission(page, owner, mission.id, isMobile);

    await page.getByRole("button", { name: /^retirer$/i }).first().click();

    await expect(
      page.getByText(/retirer ce bénévole/i).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/le bénévole sera retiré/i),
    ).toBeVisible();
  });

  test("devrait annuler le retrait et garder le participant dans la liste", async ({
    page,
  }, testInfo) => {
    const owner = await createTestUser(testInfo.workerIndex);
    const assoc = await createTestAssociation(owner.id);
    const mission = await createTestMission(assoc.id);
    const volunteer = await createTestUser(testInfo.workerIndex + 100);
    await createTestMissionParticipant(mission.id, volunteer.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToMission(page, owner, mission.id, isMobile);

    await page.getByRole("button", { name: /^retirer$/i }).first().click();
    await page.getByRole("button", { name: /annuler/i }).click();

    // Le participant est toujours affiché
    await expect(
      page.getByRole("button", { name: /voir le profil de john doe/i }),
    ).toBeVisible();
  });

  test("devrait retirer le participant et mettre à jour le compteur", async ({
    page,
  }, testInfo) => {
    const owner = await createTestUser(testInfo.workerIndex);
    const assoc = await createTestAssociation(owner.id);
    const mission = await createTestMission(assoc.id);
    const volunteer = await createTestUser(testInfo.workerIndex + 100);
    await createTestMissionParticipant(mission.id, volunteer.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToMission(page, owner, mission.id, isMobile);

    // Vérifie qu'il y a bien 1 participant avant
    await expect(
      page.getByRole("button", { name: /voir le profil de john doe/i }),
    ).toBeVisible({ timeout: 10000 });

    // Déclenche le retrait
    await page.getByRole("button", { name: /^retirer$/i }).first().click();
    await page.getByRole("button", { name: /^retirer$/i }).last().click();

    // Le participant disparaît de la liste
    await expect(
      page.getByText(/aucun bénévole inscrit/i),
    ).toBeVisible({ timeout: 10000 });
  });

  test("devrait afficher un toast de succès après le retrait", async ({
    page,
  }, testInfo) => {
    const owner = await createTestUser(testInfo.workerIndex);
    const assoc = await createTestAssociation(owner.id);
    const mission = await createTestMission(assoc.id);
    const volunteer = await createTestUser(testInfo.workerIndex + 100);
    await createTestMissionParticipant(mission.id, volunteer.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToMission(page, owner, mission.id, isMobile);

    await page.getByRole("button", { name: /^retirer$/i }).first().click();
    await page.getByRole("button", { name: /^retirer$/i }).last().click();

    await expect(page.getByText(/participant retiré/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test("devrait pouvoir retirer depuis le modal de profil", async ({
    page,
  }, testInfo) => {
    const owner = await createTestUser(testInfo.workerIndex);
    const assoc = await createTestAssociation(owner.id);
    const mission = await createTestMission(assoc.id);
    const volunteer = await createTestUser(testInfo.workerIndex + 100);
    await createTestMissionParticipant(mission.id, volunteer.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToMission(page, owner, mission.id, isMobile);

    // Ouvre le modal profil
    await page
      .getByRole("button", { name: /voir le profil/i })
      .first()
      .click();

    // Clique sur "Retirer de la mission" dans le modal
    await page
      .getByRole("button", { name: /retirer de la mission/i })
      .click();

    // Confirme dans la modale de confirmation
    await page.getByRole("button", { name: /^retirer$/i }).last().click();

    // Le participant est supprimé
    await expect(
      page.getByText(/aucun bénévole inscrit/i),
    ).toBeVisible({ timeout: 10000 });
  });
});
