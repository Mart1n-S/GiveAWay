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
// HELPER : crée un jeu de données minimal (user + association)
// ===========================================================================
async function seedAssociation(workerIndex: number) {
  const user = await createTestUser(workerIndex);
  const assoc = await createTestAssociation(user.id);
  return { user, assoc };
}

// ===========================================================================
// Accès à la page
// ===========================================================================
test.describe("Page Liste des Associations — Accès", () => {
  test("devrait être accessible sans authentification", async ({ page }) => {
    await page.goto("/associations");

    await expect(page).toHaveURL(/.*associations/);
    await expect(page.getByText("Associations").first()).toBeVisible();
  });

  test("devrait afficher le titre principal", async ({ page }) => {
    await page.goto("/associations");

    await expect(
      page.getByText("Associations").first(),
    ).toBeVisible();
  });

  test("devrait afficher le sous-titre descriptif", async ({ page }) => {
    await page.goto("/associations");

    await expect(
      page.getByText(/Découvrez les associations/i),
    ).toBeVisible();
  });
});

// ===========================================================================
// Compteur et grille
// ===========================================================================
test.describe("Page Liste des Associations — Compteur et grille", () => {
  test("devrait afficher '0 association' si aucune association en base", async ({
    page,
  }) => {
    await page.goto("/associations");

    await expect(page.getByText(/0/)).toBeVisible();
    await expect(page.getByText(/association/i).first()).toBeVisible();
  });

  test("devrait afficher le compteur au singulier avec une association", async ({
    page,
  }, testInfo) => {
    await seedAssociation(testInfo.workerIndex);

    await page.goto("/associations");

    await expect(page.getByText("1")).toBeVisible();
    await expect(page.getByText(/^association$/i)).toBeVisible();
  });

  test("devrait afficher le compteur au pluriel avec plusieurs associations", async ({
    page,
  }, testInfo) => {
    const user1 = await createTestUser(testInfo.workerIndex);
    const user2 = await createTestUser(testInfo.workerIndex + 10);
    const user3 = await createTestUser(testInfo.workerIndex + 20);
    await createTestAssociation(user1.id);
    await createTestAssociation(user2.id);
    await createTestAssociation(user3.id);

    await page.goto("/associations");

    await expect(page.getByText("3")).toBeVisible();
    await expect(page.getByText(/associations/i).first()).toBeVisible();
  });

  test("devrait afficher une carte pour chaque association validée", async ({
    page,
  }, testInfo) => {
    const { assoc } = await seedAssociation(testInfo.workerIndex);

    await page.goto("/associations");

    await expect(
      page.getByTestId(`association-card-${assoc.id}`),
    ).toBeVisible();
  });

  test("devrait afficher le nom de l'association dans la carte", async ({
    page,
  }, testInfo) => {
    const { assoc } = await seedAssociation(testInfo.workerIndex);

    await page.goto("/associations");

    await expect(
      page.getByTestId(`association-card-${assoc.id}`),
    ).toContainText("Association E2E Test");
  });
});

// ===========================================================================
// État vide
// ===========================================================================
test.describe("Page Liste des Associations — État vide", () => {
  test("devrait afficher le message 'Aucune association trouvée' si aucune donnée", async ({
    page,
  }) => {
    await page.goto("/associations");

    await expect(page.getByText(/aucune association trouvée/i)).toBeVisible();
  });

  test("devrait afficher un message d'aide dans l'état vide", async ({
    page,
  }) => {
    await page.goto("/associations");

    await expect(
      page.getByText(/modifier votre recherche/i),
    ).toBeVisible();
  });
});

// ===========================================================================
// Barre de recherche
// ===========================================================================
test.describe("Page Liste des Associations — Recherche", () => {
  test("devrait afficher le champ de recherche", async ({ page }) => {
    await page.goto("/associations");

    const searchInput = page.getByPlaceholder("Rechercher une association…");
    await expect(searchInput).toBeVisible();
  });

  test("devrait afficher le champ de localisation", async ({ page }) => {
    await page.goto("/associations");

    const cityInput = page.getByPlaceholder("Ville ou adresse…");
    await expect(cityInput).toBeVisible();
  });

  test("devrait afficher 'Aucune association trouvée' si la recherche ne correspond à rien", async ({
    page,
  }, testInfo) => {
    await seedAssociation(testInfo.workerIndex);

    await page.goto("/associations");

    const searchInput = page.getByPlaceholder("Rechercher une association…");
    await searchInput.fill("xxxxxxxxxnonexistent");

    // Attendre la fin du debounce (400ms) + réponse API
    await page.waitForTimeout(600);

    await expect(page.getByText(/aucune association trouvée/i)).toBeVisible();
  });

  test("devrait trouver l'association si le nom correspond à la recherche", async ({
    page,
  }, testInfo) => {
    const { assoc } = await seedAssociation(testInfo.workerIndex);

    await page.goto("/associations");

    const searchInput = page.getByPlaceholder("Rechercher une association…");
    await searchInput.fill("Association E2E");

    // Attendre la fin du debounce (400ms) + réponse API
    await page.waitForTimeout(600);

    await expect(
      page.getByTestId(`association-card-${assoc.id}`),
    ).toBeVisible();
  });
});

// ===========================================================================
// Navigation
// ===========================================================================
test.describe("Page Liste des Associations — Navigation", () => {
  test("devrait naviguer vers le détail de l'association au clic sur la carte", async ({
    page,
  }, testInfo) => {
    const { assoc } = await seedAssociation(testInfo.workerIndex);

    await page.goto("/associations");

    await page.getByTestId(`association-card-${assoc.id}`).click();

    await expect(page).toHaveURL(
      new RegExp(`/associations/${assoc.id}`),
    );
  });
});

// ===========================================================================
// Missions actives dans la carte
// ===========================================================================
test.describe("Page Liste des Associations — Missions actives", () => {
  test("devrait afficher le nombre de missions actives dans la carte", async ({
    page,
  }, testInfo) => {
    const { assoc } = await seedAssociation(testInfo.workerIndex);
    await createTestMission(assoc.id, { title: "Mission 1" });
    await createTestMission(assoc.id, { title: "Mission 2" });

    await page.goto("/associations");

    const card = page.getByTestId(`association-card-${assoc.id}`);
    await expect(card).toContainText("2 missions");
  });

  test("devrait afficher 'Pas de mission active' si l'association n'a aucune mission", async ({
    page,
  }, testInfo) => {
    const { assoc } = await seedAssociation(testInfo.workerIndex);

    await page.goto("/associations");

    const card = page.getByTestId(`association-card-${assoc.id}`);
    await expect(card).toContainText("Pas de mission active");
  });
});
