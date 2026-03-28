import { test, expect } from "@playwright/test";
import {
  cleanDatabase,
  createTestUser,
  prisma,
} from "../../../api/test/prisma-test-helper";

test.beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

test.describe("Flux de Réinitialisation du mot de passe", () => {
  test("devrait permettre de réinitialiser son mot de passe avec succès", async ({
    page,
  }, testInfo) => {
    // 1. PRÉPARATION : Création de l'utilisateur via le helper (email unique par worker)
    const user = await createTestUser(testInfo.workerIndex);
    const newPassword = "NewPassword123!";

    // --- ÉTAPE 1 : DEMANDE DE RÉINITIALISATION ---
    await test.step("Demande de code via l'écran mot de passe oublié", async () => {
      await page.goto("/");

      const isMobile = test.info().project.name.includes("Mobile");
      if (isMobile) {
        await page.getByTestId("button-menu").click();
      }

      // On passe par l'écran de connexion
      await page.getByRole("button", { name: /connexion/i }).click();

      // Clic sur le lien "Mot de passe oublié"
      await page.getByTestId("link-forgot-password").click();
      await expect(page).toHaveURL(/.*mot-de-passe-oublie/);

      // Remplissage de l'email
      await page.getByTestId("input-forgot-password-email").fill(user.email);
      await page.getByTestId("btn-forgot-password-submit").click();

      // Vérification du Toast et de la redirection
      await expect(page.getByText(/vérifiez vos emails/i)).toBeVisible();
      await expect(page).toHaveURL(/.*reinitialisation-mot-de-passe/);
    });

    // --- ÉTAPE 2 : CALCUL DU CODE ET RÉINITIALISATION ---
    await test.step("Saisie du nouveau mot de passe avec le code dynamique", async () => {
      const dbUser =
        await test.step("Récupération de l'ID utilisateur", async () => {
          let userInDb = null;
          for (let i = 0; i < 5; i++) {
            // Tentatives sur 1 seconde
            userInDb = await prisma.user.findUnique({
              where: { email: user.email },
            });
            if (userInDb) break;
            await page.waitForTimeout(200);
          }
          if (!userInDb) throw new Error("Utilisateur non trouvé en BDD");
          return userInDb;
        });

      const magicCode = dbUser.id.toString().padStart(6, "0");

      // Remplissage du formulaire de réinitialisation
      await page.getByTestId("input-reset-password-code").fill(magicCode);
      await page.getByTestId("input-reset-password-new").fill(newPassword);
      await page.getByTestId("input-reset-password-confirm").fill(newPassword);

      await page.getByTestId("btn-reset-password-submit").click();

      // Vérification du succès et retour à la connexion
      await expect(
        page.getByText(/mot de passe modifié/i).first(),
      ).toBeVisible();
      await expect(page).toHaveURL(/.*connexion/);
    });

    // --- ÉTAPE 3 : VÉRIFICATION DE LA CONNEXION ---
    await test.step("Vérification que le nouveau mot de passe fonctionne", async () => {
      // On cible spécifiquement les éléments visibles sur l'écran actuel
      await page
        .getByTestId("input-login-email")
        .filter({ visible: true })
        .first()
        .fill(user.email);
      await page
        .getByTestId("input-login-password")
        .filter({ visible: true })
        .first()
        .fill(newPassword);

      // Correction du clic sur le bouton Se Connecter (gestion du doublon de transition)
      await page
        .getByTestId("btn-login-submit")
        .filter({ visible: true })
        .first()
        .click();

      await expect(page).toHaveURL("/");
    });
  });
});
