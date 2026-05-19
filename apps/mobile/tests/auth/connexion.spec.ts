import { test, expect } from "../_fixtures";
import {
  cleanDatabaseForWorker,
  createTestUser,
} from "../../../api/test/prisma-test-helper";

test.beforeEach(async ({}, testInfo) => {
  await cleanDatabaseForWorker(testInfo.parallelIndex);
});

test.describe("Flux de Connexion", () => {
  // Identifiants définis dans ton userDto du helper
  const VALID_PASSWORD = "Password123!";

  test("devrait afficher une erreur avec de mauvais identifiants", async ({
    page,
  }, testInfo) => {
    // 1. Préparation : On crée l'utilisateur pour qu'il existe bien en base
    const user = await createTestUser(testInfo.parallelIndex);

    await page.goto("/");

    // Navigation
    const isMobile = test.info().project.name.includes("Mobile");
    if (isMobile) {
      await page.getByTestId("button-menu").click();
    }
    await page.getByRole("button", { name: /connexion/i }).click();

    // 2. Saisie de mauvais identifiants
    await page.getByTestId("input-login-email").fill(user.email);
    await page.getByTestId("input-login-password").fill("MauvaisPassword123!");
    await page.getByTestId("btn-login-submit").click();

    // 3. Vérification de la bannière d'erreur
    const errorBanner = page.getByTestId("error-banner-root");
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toHaveText(/incorrect/i);
  });

  test("devrait se connecter avec succès et rediriger vers l'accueil", async ({
    page,
  }, testInfo) => {
    // --- ÉTAPE 1 : PRÉPARATION (Injection directe en BDD via helper) ---
    const user = await createTestUser(testInfo.parallelIndex);

    // --- ÉTAPE 2 : CONNEXION RÉELLE ---
    await test.step("Tentative de connexion", async () => {
      await page.goto("/");

      const isMobile = test.info().project.name.includes("Mobile");
      if (isMobile) {
        await page.getByTestId("button-menu").click();
      }
      await page.getByRole("button", { name: /connexion/i }).click();

      // Saisie des identifiants du helper
      await page.getByTestId("input-login-email").fill(user.email);
      await page.getByTestId("input-login-password").fill(VALID_PASSWORD);
      await page.getByTestId("btn-login-submit").click();

      // Vérification de la redirection vers l'accueil
      await expect(page).toHaveURL("/");

      // On vérifie visuellement la disparition du bouton connexion (état connecté)
      const loginButton = page.getByRole("button", { name: /connexion/i });
      await expect(loginButton).not.toBeVisible();
    });
  });
});
