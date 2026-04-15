import { test, expect } from "@playwright/test";
import {
  cleanDatabase,
  createTestUser,
  createTestAssociation,
  createTestMission,
} from "../../../api/test/prisma-test-helper";

test.beforeEach(async () => {
  await cleanDatabase();
});

// ===========================================================================
// HELPER : crée un jeu de données minimal (user + association + mission)
// ===========================================================================
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
// Accès à la page
// ===========================================================================
test.describe("Page Liste des Missions — Accès", () => {
  test("devrait être accessible sans authentification et afficher le titre", async ({
    page,
  }) => {
    await page.goto("/missions");

    await expect(page.getByTestId("missions-title")).toBeVisible();
    await expect(page.getByTestId("missions-title")).toContainText("Missions");
  });

  test("devrait afficher le sous-titre", async ({ page }) => {
    await page.goto("/missions");

    await expect(
      page.getByText(/Trouvez des missions de bénévolat/i),
    ).toBeVisible();
  });
});

// ===========================================================================
// Compteur et grille
// ===========================================================================
test.describe("Page Liste des Missions — Compteur et grille", () => {
  test("devrait afficher le compteur avec le bon nombre de missions", async ({
    page,
  }, testInfo) => {
    await seedOneMission(testInfo.workerIndex);

    await page.goto("/missions");

    const counter = page.getByTestId("mission-counter");
    await expect(counter).toBeVisible();
    await expect(counter).toContainText("1");
    await expect(counter).toContainText("mission disponible");
  });

  test("devrait afficher le compteur au pluriel avec plusieurs missions", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const assoc = await createTestAssociation(user.id);
    await createTestMission(assoc.id, { title: "Mission A" });
    await createTestMission(assoc.id, { title: "Mission B" });
    await createTestMission(assoc.id, { title: "Mission C" });

    await page.goto("/missions");

    const counter = page.getByTestId("mission-counter");
    await expect(counter).toContainText("3");
    await expect(counter).toContainText("missions disponibles");
  });

  test("devrait afficher la grille de missions", async ({
    page,
  }, testInfo) => {
    await seedOneMission(testInfo.workerIndex);

    await page.goto("/missions");

    await expect(page.getByTestId("mission-grid")).toBeVisible();
  });

  test("devrait afficher une card par mission créée", async ({
    page,
  }, testInfo) => {
    const { mission } = await seedOneMission(testInfo.workerIndex);

    await page.goto("/missions");

    await expect(
      page.getByTestId(`mission-card-${mission.id}`),
    ).toBeVisible();
  });

  test("devrait afficher le titre de la mission dans la card", async ({
    page,
  }, testInfo) => {
    await seedOneMission(testInfo.workerIndex, { title: "Mission Titre Visible" });

    await page.goto("/missions");

    await expect(page.getByText("Mission Titre Visible")).toBeVisible();
  });
});

// ===========================================================================
// État vide
// ===========================================================================
test.describe("Page Liste des Missions — État vide", () => {
  test("devrait afficher l'état vide si aucune mission n'existe", async ({
    page,
  }) => {
    await page.goto("/missions");

    await expect(page.getByTestId("mission-empty")).toBeVisible();
    await expect(page.getByTestId("mission-empty")).toContainText(
      "Aucune mission trouvée",
    );
  });

  test("devrait afficher le compteur à 0 si aucune mission", async ({
    page,
  }) => {
    await page.goto("/missions");

    const counter = page.getByTestId("mission-counter");
    await expect(counter).toBeVisible();
    await expect(counter).toContainText("0");
  });
});

// ===========================================================================
// Navigation vers le détail
// ===========================================================================
test.describe("Page Liste des Missions — Navigation", () => {
  test("devrait naviguer vers le détail de la mission au clic sur une card", async ({
    page,
  }, testInfo) => {
    const { mission } = await seedOneMission(testInfo.workerIndex, {
      title: "Mission Cliquable E2E",
    });

    await page.goto("/missions");

    const card = page.getByTestId(`mission-card-${mission.id}`);
    await expect(card).toBeVisible();
    await card.click();

    await expect(page).toHaveURL(new RegExp(`/missions/${mission.id}`));
  });

  test("devrait afficher le titre de la mission sur la page de détail après navigation", async ({
    page,
  }, testInfo) => {
    const { mission } = await seedOneMission(testInfo.workerIndex, {
      title: "Mission Navigation Test",
    });

    await page.goto("/missions");
    await page.getByTestId(`mission-card-${mission.id}`).click();

    await expect(page.getByTestId("mission-detail-title")).toBeVisible();
    await expect(page.getByTestId("mission-detail-title")).toContainText(
      "Mission Navigation Test",
    );
  });
});

// ===========================================================================
// Recherche / filtres
// ===========================================================================
test.describe("Page Liste des Missions — Recherche", () => {
  test("devrait filtrer les missions par texte de recherche", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const assoc = await createTestAssociation(user.id);
    await createTestMission(assoc.id, { title: "Maraude Paris Centre" });
    await createTestMission(assoc.id, { title: "Distribution alimentaire" });

    await page.goto("/missions");

    // Les deux missions sont visibles sans filtre
    await expect(page.getByText("Maraude Paris Centre")).toBeVisible();
    await expect(page.getByText("Distribution alimentaire")).toBeVisible();

    // Saisie dans le champ de recherche
    const searchInput = page.getByRole("textbox").first();
    await searchInput.fill("Maraude");

    // Attendre le debounce (400 ms) + rendu
    await page.waitForTimeout(600);

    await expect(page.getByText("Maraude Paris Centre")).toBeVisible();
    await expect(page.getByText("Distribution alimentaire")).not.toBeVisible();
  });

  test("devrait afficher l'état vide si la recherche ne donne aucun résultat", async ({
    page,
  }, testInfo) => {
    await seedOneMission(testInfo.workerIndex, { title: "Mission Existante" });

    await page.goto("/missions");

    const searchInput = page.getByRole("textbox").first();
    await searchInput.fill("xyzintrouvable999");

    await page.waitForTimeout(600);

    await expect(page.getByTestId("mission-empty")).toBeVisible();
  });
});

// ===========================================================================
// Bouton "Voir plus"
// ===========================================================================
test.describe("Page Liste des Missions — Charger plus", () => {
  test("devrait afficher le bouton Voir plus si le total dépasse la page", async ({
    page,
  }, testInfo) => {
    // PAGE_SIZE = 12 ; on en crée 13
    const user = await createTestUser(testInfo.workerIndex);
    const assoc = await createTestAssociation(user.id);

    for (let i = 1; i <= 13; i++) {
      await createTestMission(assoc.id, { title: `Mission ${i}` });
    }

    await page.goto("/missions");

    await expect(page.getByTestId("btn-load-more-missions")).toBeVisible();
  });

  test("ne devrait pas afficher le bouton Voir plus si toutes les missions tiennent sur une page", async ({
    page,
  }, testInfo) => {
    await seedOneMission(testInfo.workerIndex);

    await page.goto("/missions");

    await expect(
      page.getByTestId("btn-load-more-missions"),
    ).not.toBeVisible();
  });
});
