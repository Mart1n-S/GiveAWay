import { test, expect } from "@playwright/test";
import {
  cleanDatabase,
  createTestAssociation,
  createTestMission,
  createTestUser,
  prisma,
} from "../../../api/test/prisma-test-helper";

const VALID_PASSWORD = "Password123!";

test.beforeEach(async () => {
  await cleanDatabase();
});

// ===========================================================================
// Helpers
// ===========================================================================

/**
 * Crée un user, une asso et une mission qui partagent un skill et une cause
 * → garantit un score de matching ≥ 55 (causes 30 + skills 25), au-dessus
 *   du seuil de 40 utilisé pour la mise en avant.
 */
async function seedMatchingDataset(workerIndex: number) {
  const user = await createTestUser(workerIndex);
  const assoc = await createTestAssociation(user.id);
  const mission = await createTestMission(assoc.id, {
    title: "Mission matchante E2E",
  });

  const skill = await prisma.skill.upsert({
    where: { label: "E2E Toggle Skill" },
    update: {},
    create: { label: "E2E Toggle Skill" },
  });
  const cause = await prisma.cause.upsert({
    where: { label: "E2E Toggle Cause" },
    update: {},
    create: { label: "E2E Toggle Cause" },
  });

  await prisma.userSkill.create({
    data: { userId: user.id, skillId: skill.id },
  });
  await prisma.userCause.create({
    data: { userId: user.id, causeId: cause.id },
  });
  await prisma.missionSkill.create({
    data: { missionId: mission.id, skillId: skill.id },
  });
  await prisma.missionCause.create({
    data: { missionId: mission.id, causeId: cause.id },
  });

  return { user, mission };
}

/** Effectue la connexion via l'UI puis attend la redirection home. */
async function loginViaUI(
  page: import("@playwright/test").Page,
  email: string,
) {
  await page.goto("/");
  const isMobile = test.info().project.name.includes("Mobile");
  if (isMobile) {
    await page.getByTestId("button-menu").click();
  }
  await page.getByRole("button", { name: /connexion/i }).click();
  await page.getByTestId("input-login-email").fill(email);
  await page.getByTestId("input-login-password").fill(VALID_PASSWORD);
  await page.getByTestId("btn-login-submit").click();
  await expect(page).toHaveURL("/");
}

// ===========================================================================
// Visibilité du toggle selon l'authentification
// ===========================================================================
test.describe("Toggle Pour moi — Visibilité", () => {
  test("ne doit PAS être visible quand l'utilisateur n'est pas authentifié", async ({
    page,
  }, testInfo) => {
    await seedMatchingDataset(testInfo.workerIndex);

    await page.goto("/missions");

    // L'utilisateur n'est pas connecté : le toggle n'est jamais rendu.
    await expect(page.getByTestId("match-toggle")).toHaveCount(0);
    await expect(page.getByTestId("match-info-button")).toHaveCount(0);
  });

  test("doit être visible (avec bouton info) quand l'utilisateur est authentifié", async ({
    page,
  }, testInfo) => {
    const { user } = await seedMatchingDataset(testInfo.workerIndex);
    await loginViaUI(page, user.email);

    await page.goto("/missions");

    await expect(page.getByTestId("match-toggle")).toBeVisible();
    await expect(page.getByTestId("match-info-button")).toBeVisible();
  });
});

// ===========================================================================
// Modal d'explication du matching
// ===========================================================================
test.describe("Toggle Pour moi — Modal d'information", () => {
  test("le bouton info doit ouvrir la modale explicative", async ({
    page,
  }, testInfo) => {
    const { user } = await seedMatchingDataset(testInfo.workerIndex);
    await loginViaUI(page, user.email);

    await page.goto("/missions");

    await page.getByTestId("match-info-button").click();

    const modal = page.getByTestId("match-info-modal");
    await expect(modal).toBeVisible();
    // Vérifie le contenu pédagogique attendu
    await expect(modal).toContainText(/Comment fonctionne le matching/i);
    await expect(modal).toContainText(/Causes en commun/i);
    await expect(modal).toContainText(/Compétences en commun/i);
    await expect(modal).toContainText(/Distance/i);
    await expect(modal).toContainText(/Historique/i);
  });

  test("le bouton 'J'ai compris' doit fermer la modale", async ({
    page,
  }, testInfo) => {
    const { user } = await seedMatchingDataset(testInfo.workerIndex);
    await loginViaUI(page, user.email);

    await page.goto("/missions");

    await page.getByTestId("match-info-button").click();
    await expect(page.getByTestId("match-info-modal")).toBeVisible();

    await page.getByTestId("btn-close-match-info").click();
    await expect(page.getByTestId("match-info-modal")).not.toBeVisible();
  });
});

// ===========================================================================
// Activation du toggle → mise en avant des cards
// ===========================================================================
test.describe("Toggle Pour moi — Surbrillance des cards", () => {
  test("le badge 'Recommandé' n'est PAS affiché tant que le toggle est OFF", async ({
    page,
  }, testInfo) => {
    const { user, mission } = await seedMatchingDataset(testInfo.workerIndex);
    await loginViaUI(page, user.email);

    await page.goto("/missions");

    // La card existe mais sans badge match.
    await expect(page.getByTestId(`mission-card-${mission.id}`)).toBeVisible();
    await expect(
      page.getByTestId(`mission-card-${mission.id}-match-badge`),
    ).toHaveCount(0);
  });

  test("activer le toggle doit faire apparaître le badge 'Recommandé' sur la mission matchée", async ({
    page,
  }, testInfo) => {
    const { user, mission } = await seedMatchingDataset(testInfo.workerIndex);
    await loginViaUI(page, user.email);

    await page.goto("/missions");

    await page.getByTestId(`mission-card-${mission.id}`).waitFor();

    // Active le toggle
    await page.getByTestId("match-toggle").click();

    // Le badge apparaît (matchScore >= 40 garanti par seedMatchingDataset)
    const badge = page.getByTestId(`mission-card-${mission.id}-match-badge`);
    await expect(badge).toBeVisible();
    await expect(badge).toContainText(/Recommandé/i);
  });
});
