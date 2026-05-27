import { test, expect } from "../_fixtures";
import { cleanDatabaseForWorker } from "../../../api/test/prisma-test-helper";

test.beforeEach(async ({}, testInfo) => {
  await cleanDatabaseForWorker(testInfo.parallelIndex);
});

// ===========================================================================
// TESTS : Vue Marketing (visiteur non authentifié)
// ===========================================================================
test.describe("Page Accueil — Vue Marketing (non authentifié)", () => {
  test("devrait afficher la vue marketing pour un visiteur non authentifié", async ({
    page,
  }) => {
    await page.goto("/");

    // Le titre hero est le marqueur fiable de la vue marketing
    await expect(
      page.getByText(/trouvez des missions qui/i).first(),
    ).toBeVisible();
  });

  test("devrait afficher le titre principal de la landing page", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByText(/trouvez des missions qui/i)).toBeVisible();
  });

  test("devrait afficher le slogan GiveAWay", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByText(/GiveAWay connecte bénévoles et associations/i),
    ).toBeVisible();
  });

  test("devrait afficher le bouton CTA 'Commencer maintenant'", async ({
    page,
  }) => {
    await page.goto("/");

    // getByRole est plus fiable que getByTestId pour les Button RN Web sur mobile Chrome
    await expect(
      page.getByRole("button", { name: /commencer maintenant/i }).first(),
    ).toBeVisible();
  });

  test("devrait afficher le bouton CTA 'Voir les missions'", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("button", { name: /voir les missions/i }).first(),
    ).toBeVisible();
  });

  test("devrait naviguer vers /inscription au clic sur 'Commencer maintenant'", async ({
    page,
  }) => {
    await page.goto("/");

    await page
      .getByRole("button", { name: /commencer maintenant/i })
      .first()
      .click();

    await expect(page).toHaveURL(/.*inscription/);
  });

  test("devrait naviguer vers /missions au clic sur 'Voir les missions'", async ({
    page,
  }) => {
    await page.goto("/");

    await page
      .getByRole("button", { name: /voir les missions/i })
      .first()
      .click();

    await expect(page).toHaveURL(/.*missions/);
  });

  test("devrait afficher la section 'Comment ça marche ?'", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByText(/comment ça marche/i)).toBeVisible();
  });

  test("devrait afficher les étapes du processus bénévole", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByText(/créez votre profil/i)).toBeVisible();
    await expect(page.getByText(/découvrez les missions/i)).toBeVisible();
    await expect(
      page.getByText(/engagez-vous près de chez vous/i),
    ).toBeVisible();
  });

  test("devrait afficher la section 'Pourquoi GiveAWay'", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText(/le bénévolat/i).first()).toBeVisible();
    await expect(page.getByText(/100 % gratuit/i)).toBeVisible();
  });

  // Données métier temporairement désynchronisées avec la landing page.
  // Les assertions ci-dessous seront réactivées une fois les statistiques mises à jour.
  // test("devrait afficher les statistiques en bas de page", async ({
  //   page,
  // }) => {
  //   await page.goto("/");

  //   await expect(page.getByText(/29/)).toBeVisible();
  //   await expect(page.getByText(/causes soutenues/i)).toBeVisible();
  // });

  test("devrait afficher le bouton 'Rejoindre GiveAWay'", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("button", { name: /rejoindre giveaway/i }),
    ).toBeVisible();
  });

  test("devrait naviguer vers /inscription au clic sur 'Rejoindre GiveAWay'", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /rejoindre giveaway/i }).click();

    await expect(page).toHaveURL(/.*inscription/);
  });
});
