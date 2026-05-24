import { test, expect, type Page } from "../_fixtures";
import {
  cleanDatabaseForWorker,
  createTestUser,
  createTestAssociation,
  createTestMission,
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
// HELPER : connexion via l'UI puis navigation vers une association
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
// Accès et gestion d'erreur
// ===========================================================================
test.describe("Page Détail Association — Accès et erreurs", () => {
  test("devrait être accessible sans authentification", async ({
    page,
  }, testInfo) => {
    const { assoc } = await seedAssociation(testInfo.parallelIndex);

    await page.goto(`/associations/${assoc.id}`);

    await expect(page).toHaveURL(new RegExp(`/associations/${assoc.id}`));
  });

  test("devrait afficher 'Association introuvable' pour un ID inexistant", async ({
    page,
  }) => {
    await page.goto("/associations/999999");

    await expect(page.getByText(/association introuvable/i)).toBeVisible();
  });

  test("devrait afficher un message d'aide pour un ID inexistant", async ({
    page,
  }) => {
    await page.goto("/associations/999999");

    await expect(
      page.getByText(/n'existe plus ou n'est pas encore validée/i),
    ).toBeVisible();
  });

  test("devrait afficher le bouton Retour sur la page d'erreur", async ({
    page,
  }) => {
    await page.goto("/associations/999999");

    await expect(
      page.getByRole("button", { name: /retour/i }),
    ).toBeVisible();
  });
});

// ===========================================================================
// Affichage du profil public
// ===========================================================================
test.describe("Page Détail Association — Affichage", () => {
  test("devrait afficher le nom de l'association", async ({
    page,
  }, testInfo) => {
    const { assoc } = await seedAssociation(testInfo.parallelIndex);

    await page.goto(`/associations/${assoc.id}`);

    await expect(page.getByText("Association E2E Test")).toBeVisible();
  });

  test("devrait afficher la section 'Missions de l'association'", async ({
    page,
  }, testInfo) => {
    const { assoc } = await seedAssociation(testInfo.parallelIndex);

    await page.goto(`/associations/${assoc.id}`);

    await expect(
      page.getByText(/missions de l'association/i),
    ).toBeVisible();
  });

  test("devrait afficher 'Aucune mission active' si pas de missions", async ({
    page,
  }, testInfo) => {
    const { assoc } = await seedAssociation(testInfo.parallelIndex);

    await page.goto(`/associations/${assoc.id}`);

    await expect(page.getByText(/aucune mission active/i)).toBeVisible();
  });

  test("devrait afficher le message d'explication si pas de missions", async ({
    page,
  }, testInfo) => {
    const { assoc } = await seedAssociation(testInfo.parallelIndex);

    await page.goto(`/associations/${assoc.id}`);

    await expect(
      page.getByText(/n'a pas encore publié de mission/i),
    ).toBeVisible();
  });
});

// ===========================================================================
// Missions associées au profil
// ===========================================================================
test.describe("Page Détail Association — Missions", () => {
  test("devrait afficher la carte de mission quand l'association a des missions", async ({
    page,
  }, testInfo) => {
    const { assoc } = await seedAssociation(testInfo.parallelIndex);
    const mission = await createTestMission(assoc.id, {
      title: "Mission Bénévolat E2E",
    });

    await page.goto(`/associations/${assoc.id}`);

    await expect(
      page.getByTestId(`mission-card-${mission.id}`),
    ).toBeVisible();
  });

  test("devrait afficher le titre de la mission dans la carte", async ({
    page,
  }, testInfo) => {
    const { assoc } = await seedAssociation(testInfo.parallelIndex);
    const mission = await createTestMission(assoc.id, {
      title: "Mission Bénévolat E2E",
    });

    await page.goto(`/associations/${assoc.id}`);

    await expect(
      page.getByTestId(`mission-card-${mission.id}`),
    ).toContainText("Mission Bénévolat E2E");
  });

  test("devrait afficher plusieurs missions si l'association en a plusieurs", async ({
    page,
  }, testInfo) => {
    const { assoc } = await seedAssociation(testInfo.parallelIndex);
    const mission1 = await createTestMission(assoc.id, { title: "Mission A" });
    const mission2 = await createTestMission(assoc.id, { title: "Mission B" });

    await page.goto(`/associations/${assoc.id}`);

    await expect(
      page.getByTestId(`mission-card-${mission1.id}`),
    ).toBeVisible();
    await expect(
      page.getByTestId(`mission-card-${mission2.id}`),
    ).toBeVisible();
  });

  test("devrait afficher le bouton 'Voir plus de missions' si plus de 6 missions", async ({
    page,
  }, testInfo) => {
    const { assoc } = await seedAssociation(testInfo.parallelIndex);

    // Créer 7 missions pour déclencher la pagination (page size = 6)
    for (let i = 1; i <= 7; i++) {
      await createTestMission(assoc.id, { title: `Mission ${i}` });
    }

    await page.goto(`/associations/${assoc.id}`);

    await expect(
      page.getByRole("button", { name: /voir plus de missions/i }),
    ).toBeVisible();
  });

  test("ne devrait pas afficher le bouton 'Voir plus' si 6 missions ou moins", async ({
    page,
  }, testInfo) => {
    const { assoc } = await seedAssociation(testInfo.parallelIndex);

    for (let i = 1; i <= 3; i++) {
      await createTestMission(assoc.id, { title: `Mission ${i}` });
    }

    await page.goto(`/associations/${assoc.id}`);

    await expect(
      page.getByRole("button", { name: /voir plus de missions/i }),
    ).not.toBeVisible();
  });

  test("devrait naviguer vers la page de détail de la mission au clic", async ({
    page,
  }, testInfo) => {
    const { assoc } = await seedAssociation(testInfo.parallelIndex);
    const mission = await createTestMission(assoc.id, {
      title: "Mission Clic E2E",
    });

    await page.goto(`/associations/${assoc.id}`);

    await page.getByTestId(`mission-card-${mission.id}`).click();

    await expect(page).toHaveURL(new RegExp(`/missions/${mission.id}`));
  });
});

// ===========================================================================
// Bouton notification
// ===========================================================================
test.describe("Page Détail Association — Notifications", () => {
  test("devrait afficher le bouton 'Me notifier' pour un utilisateur connecté", async ({
    page,
  }, testInfo) => {
    const { user, assoc } = await seedAssociation(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociation(page, user, isMobile, assoc.id);

    await expect(
      page
        .getByRole("button", { name: /me notifier/i })
        .or(page.getByText(/me notifier/i)),
    ).toBeVisible();
  });

  test("devrait ouvrir la modale de confirmation des notifications au clic", async ({
    page,
  }, testInfo) => {
    const { user, assoc } = await seedAssociation(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociation(page, user, isMobile, assoc.id);

    // Clic sur le bouton "Me notifier" (version web texte)
    await page.getByText(/me notifier/i).first().click();

    await expect(
      page.getByText(/Recevoir des notifications/i),
    ).toBeVisible();
  });

  test("devrait confirmer les notifications et afficher 'Notifications activées'", async ({
    page,
  }, testInfo) => {
    const { user, assoc } = await seedAssociation(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociation(page, user, isMobile, assoc.id);

    // Ouvrir la modale
    await page.getByText(/me notifier/i).first().click();
    await expect(page.getByText(/Recevoir des notifications/i)).toBeVisible();

    // Confirmer
    await page.getByRole("button", { name: /^activer$/i }).click();

    // Vérifier que le bouton reflète l'état activé
    await expect(
      page.getByText(/notifications activées/i),
    ).toBeVisible();
  });

  test("devrait fermer la modale sans activer les notifications au clic sur Annuler", async ({
    page,
  }, testInfo) => {
    const { user, assoc } = await seedAssociation(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociation(page, user, isMobile, assoc.id);

    // Ouvrir la modale
    await page.getByText(/me notifier/i).first().click();
    await expect(page.getByText(/Recevoir des notifications/i)).toBeVisible();

    // Annuler
    await page.getByRole("button", { name: /^annuler$/i }).click();

    // La modale doit disparaître et le bouton reste "Me notifier"
    await expect(
      page.getByText(/Recevoir des notifications/i),
    ).not.toBeVisible();
    await expect(page.getByText(/me notifier/i).first()).toBeVisible();
  });
});

// ===========================================================================
// Navigation — bouton Retour
// ===========================================================================
test.describe("Page Détail Association — Navigation Retour", () => {
  test("devrait afficher le bouton 'Retour' sur la page de profil (web)", async ({
    page,
  }, testInfo) => {
    const { assoc } = await seedAssociation(testInfo.parallelIndex);

    await page.goto(`/associations/${assoc.id}`);

    await expect(
      page.getByRole("button", { name: /retour/i }),
    ).toBeVisible();
  });

  test("devrait naviguer vers la liste des associations au clic sur Retour", async ({
    page,
  }, testInfo) => {
    const { assoc } = await seedAssociation(testInfo.parallelIndex);

    // Arriver depuis la liste (pas de history back possible)
    await page.goto(`/associations/${assoc.id}`);

    await page.getByRole("button", { name: /retour/i }).first().click();

    // Devrait naviguer vers /associations ou revenir en arrière
    await expect(page).toHaveURL(/.*associations.*/);
  });
});
