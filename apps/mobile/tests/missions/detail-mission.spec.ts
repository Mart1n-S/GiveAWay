import { test, expect } from "../_fixtures";
import {
  cleanDatabaseForWorker,
  createTestUser,
  createTestAssociation,
  createTestMission,
} from "../../../api/test/prisma-test-helper";
import { ActivityType } from "../../../api/src/generated/prisma/client";

test.beforeEach(async ({}, testInfo) => {
  await cleanDatabaseForWorker(testInfo.parallelIndex);
});

// ===========================================================================
// HELPER : crée un jeu de données minimal et retourne la mission
// ===========================================================================
async function seedMission(
  workerIndex: number,
  options: Parameters<typeof createTestMission>[1] = {},
) {
  const user = await createTestUser(workerIndex);
  const assoc = await createTestAssociation(user.id, workerIndex);
  const mission = await createTestMission(assoc.id, options);
  return { user, assoc, mission };
}

// ===========================================================================
// Affichage de la page de détail
// ===========================================================================
test.describe("Page Détail Mission — Affichage", () => {
  test("devrait afficher le titre de la mission", async ({
    page,
  }, testInfo) => {
    const { mission } = await seedMission(testInfo.parallelIndex, {
      title: "Ma Mission de Bénévolat E2E",
    });

    await page.goto(`/missions/${mission.id}`);

    await expect(page.getByTestId("mission-detail-title")).toBeVisible();
    await expect(page.getByTestId("mission-detail-title")).toContainText(
      "Ma Mission de Bénévolat E2E",
    );
  });

  test("devrait afficher le badge de type de la mission", async ({
    page,
  }, testInfo) => {
    const { mission } = await seedMission(testInfo.parallelIndex);

    await page.goto(`/missions/${mission.id}`);

    // Le badge type "Mission de bénévolat" est visible
    await expect(page.getByTestId("mission-detail-badge")).toBeVisible();
    await expect(page.getByTestId("mission-detail-badge")).toContainText(
      "Mission de bénévolat",
    );
  });

  test("devrait afficher le nom de l'association organisatrice", async ({
    page,
  }, testInfo) => {
    const { mission } = await seedMission(testInfo.parallelIndex);

    await page.goto(`/missions/${mission.id}`);

    await expect(page.getByTestId("mission-detail-association")).toBeVisible();
    // Le nom de l'association créée par createTestAssociation
    await expect(page.getByTestId("mission-detail-association")).toContainText(
      "Association E2E Test",
    );
  });

  test("devrait afficher la section description de la mission", async ({
    page,
  }, testInfo) => {
    const { mission } = await seedMission(testInfo.parallelIndex);

    await page.goto(`/missions/${mission.id}`);

    await expect(page.getByTestId("mission-detail-description")).toBeVisible();
    // Le texte de description généré par createTestMission
    await expect(page.getByTestId("mission-detail-description")).toContainText(
      "Description de la mission",
    );
  });

  test("devrait afficher la section 'À propos de la mission'", async ({
    page,
  }, testInfo) => {
    const { mission } = await seedMission(testInfo.parallelIndex);

    await page.goto(`/missions/${mission.id}`);

    await expect(
      page.getByText(/À propos de la mission/i),
    ).toBeVisible();
  });

  test("devrait afficher la section 'Informations pratiques'", async ({
    page,
  }, testInfo) => {
    const { mission } = await seedMission(testInfo.parallelIndex);

    await page.goto(`/missions/${mission.id}`);

    await expect(
      page.getByText(/Informations pratiques/i),
    ).toBeVisible();
  });

  test("devrait afficher la section 'L'association'", async ({
    page,
  }, testInfo) => {
    const { mission } = await seedMission(testInfo.parallelIndex);

    await page.goto(`/missions/${mission.id}`);

    await expect(page.getByText(/L'association/i)).toBeVisible();
  });
});

// ===========================================================================
// Bouton CTA (Candidater)
// ===========================================================================
test.describe("Page Détail Mission — CTA Candidater", () => {
  test("devrait afficher le bouton Candidater si hasRegistration=true (défaut)", async ({
    page,
  }, testInfo) => {
    // createTestMission met hasRegistration: true par défaut
    const { mission } = await seedMission(testInfo.parallelIndex);

    await page.goto(`/missions/${mission.id}`);

    await expect(page.getByTestId("mission-detail-cta")).toBeVisible();
    await expect(page.getByTestId("btn-candidater")).toBeVisible();
    await expect(page.getByTestId("btn-candidater")).toContainText(
      "Candidater à cette mission",
    );
  });

  test("devrait afficher le bouton Complet si la mission est pleine", async ({
    page,
  }, testInfo) => {
    // volunteersNeeded = 1 et on ne peut pas créer de participants en test,
    // donc on vérifie l'état "complet" en créant une mission avec volunteersNeeded=0
    // → la condition isFull = participantsCount(0) >= volunteersNeeded(0) = true
    const { mission } = await seedMission(testInfo.parallelIndex, {
      volunteersNeeded: 0,
    });

    await page.goto(`/missions/${mission.id}`);

    await expect(page.getByTestId("mission-detail-cta")).toBeVisible();
    await expect(page.getByTestId("btn-mission-full")).toBeVisible();
    await expect(page.getByTestId("btn-mission-full")).toContainText(
      "Complet",
    );
  });
});

// ===========================================================================
// Bouton retour (web uniquement)
// ===========================================================================
test.describe("Page Détail Mission — Navigation retour", () => {
  test("devrait afficher le bouton Retour sur web", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name.includes("Mobile"),
      "Le bouton Retour est visible sur web uniquement",
    );

    const { mission } = await seedMission(testInfo.parallelIndex);

    await page.goto(`/missions/${mission.id}`);

    await expect(page.getByTestId("btn-back-mission")).toBeVisible();
  });

  test("devrait revenir à la liste des missions au clic sur Retour", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name.includes("Mobile"),
      "Le bouton Retour est visible sur web uniquement",
    );

    const { mission } = await seedMission(testInfo.parallelIndex);

    // Naviguer depuis la liste pour que router.canGoBack() soit vrai
    await page.goto("/missions");
    await page.getByTestId(`mission-card-${mission.id}`).click();
    await expect(page).toHaveURL(new RegExp(`/missions/${mission.id}`));

    await page.getByTestId("btn-back-mission").click();

    await expect(page).toHaveURL(/\/missions$/);
  });

  test("devrait rediriger vers /missions si on accède directement à la page", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name.includes("Mobile"),
      "Le bouton Retour est visible sur web uniquement",
    );

    const { mission } = await seedMission(testInfo.parallelIndex);

    // Accès direct sans historique de navigation
    await page.goto(`/missions/${mission.id}`);

    await page.getByTestId("btn-back-mission").click();

    await expect(page).toHaveURL(/\/missions/);
  });
});

// ===========================================================================
// États d'erreur
// ===========================================================================
test.describe("Page Détail Mission — Erreurs", () => {
  test("devrait afficher la page d'erreur 404 pour une mission inexistante", async ({
    page,
  }) => {
    await page.goto("/missions/99999");

    await expect(page.getByTestId("mission-error-notfound")).toBeVisible();
    await expect(page.getByTestId("mission-error-notfound")).toContainText(
      "Mission introuvable",
    );
  });

  test("devrait afficher un message d'explication sur la page 404", async ({
    page,
  }) => {
    await page.goto("/missions/99999");

    await expect(
      page.getByText(/n'existe plus ou a été supprimée/i),
    ).toBeVisible();
  });

  test("devrait afficher un bouton Retour sur la page 404", async ({
    page,
  }) => {
    await page.goto("/missions/99999");

    await expect(
      page.getByRole("button", { name: /retour/i }),
    ).toBeVisible();
  });

  test("devrait revenir à la liste au clic sur Retour depuis une page 404", async ({
    page,
  }) => {
    await page.goto("/missions/99999");

    await page.getByRole("button", { name: /retour/i }).click();

    await expect(page).toHaveURL(/\/missions/);
  });
});

// ===========================================================================
// Types de missions
// ===========================================================================
test.describe("Page Détail Mission — Types", () => {
  test("devrait afficher le badge EVENT pour un événement", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(user.id, testInfo.parallelIndex);
    const mission = await createTestMission(assoc.id, {
      title: "Événement Test",
      type: ActivityType.EVENT,
    });

    await page.goto(`/missions/${mission.id}`);

    await expect(page.getByTestId("mission-detail-badge")).toContainText(
      "Événement",
    );
  });

  test("devrait afficher le badge COLLECT pour une collecte", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(user.id, testInfo.parallelIndex);
    const mission = await createTestMission(assoc.id, {
      title: "Collecte Test",
      type: ActivityType.COLLECT,
    });

    await page.goto(`/missions/${mission.id}`);

    await expect(page.getByTestId("mission-detail-badge")).toContainText(
      "Collecte",
    );
  });
});
