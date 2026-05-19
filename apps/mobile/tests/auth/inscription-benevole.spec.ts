import { test, expect } from "../_fixtures";
import {
  cleanDatabaseForWorker,
  createTestUser,
  prisma, getPrisma
} from "../../../api/test/prisma-test-helper";

test.beforeEach(async ({}, testInfo) => {
  await cleanDatabaseForWorker(testInfo.parallelIndex);
});

// afterAll(async () => {
//   await prisma.$disconnect();
// });

test.describe("Flux d'inscription bénévole", () => {
  test("devrait créer un compte et afficher l'écran OTP", async ({ page }) => {
    const uniqueEmail = `benevole.w${test.info().parallelIndex}.${Date.now()}@test.com`;

    await test.step("Arrivée sur l'accueil et navigation", async () => {
      await page.goto("/");

      const isMobile = test.info().project.name.includes("Mobile");
      const registerButton = page.getByText("S'inscrire").first();

      if (isMobile) {
        // En mode mobile, on ouvre obligatoirement le menu
        const menuButton = page.getByTestId("button-menu");
        await expect(menuButton).toBeVisible();
        await menuButton.click();
      }

      // Maintenant, le bouton d'inscription doit être visible (soit menu ouvert, soit header desktop)
      await expect(registerButton).toBeVisible({ timeout: 5000 });
      await registerButton.click();
    });

    await test.step("Sélection du profil", async () => {
      await page.getByText(/je suis un bénévole/i).click();
      await expect(page).toHaveURL(/.*inscription\/benevole/);
    });

    await test.step("Remplissage du formulaire", async () => {
      await page.getByTestId("input-firstName").fill("Martin");
      await page.getByTestId("input-lastName").fill("Tester");
      await page.getByTestId("input-age").fill("25");
      await page.getByTestId("input-email").fill(uniqueEmail);

      // Gestion de l'adresse Autocomplete
      const addressInput = page.getByTestId("input-address");
      await addressInput.fill("10 rue de la Paix");
      await page.getByTestId("input-postalCode").fill("75000");
      await page.getByTestId("input-city").fill("Paris");

      await page.getByTestId("input-password").fill("Password123!");
      await page.getByTestId("input-confirmPassword").fill("Password123!");
    });

    await test.step("Acceptation des CGU avec Scroll dynamique", async () => {
      // 1. Ouvrir la modale
      await page.getByTestId("checkbox-terms").click();

      const scrollContainer = page.getByTestId("terms-scroll-view");
      const acceptBtn = page.getByTestId("btn-accept-terms-modal");

      // 2. Boucle de scroll : tant que le bouton n'a pas le texte "J'accepte"
      // On limite à 10 itérations pour éviter une boucle infinie en cas de bug
      let attempts = 0;
      while (attempts < 10) {
        const buttonText = await acceptBtn.innerText();
        if (buttonText.includes("J'accepte")) break;

        // On scrolle de 1000 pixels vers le bas
        await scrollContainer.evaluate((el) => el.scrollBy(0, 1000));
        // Petit temps d'attente pour laisser React traiter l'événement
        await page.waitForTimeout(200);
        attempts++;
      }

      // 3. Vérification finale et clic
      await expect(acceptBtn).toHaveText(/J'accepte/i);
      await expect(acceptBtn).toBeEnabled();
      await acceptBtn.click();
    });

    await test.step("Soumission", async () => {
      const submitBtn = page.getByTestId("btn-submit-register");
      await expect(submitBtn).toBeEnabled();
      await submitBtn.click();
    });

    await test.step("Vérification du code OTP", async () => {
      // 1. On attend le titre pour confirmer qu'on est sur la bonne page
      await expect(page.getByText(/vérifiez votre boîte mail/i)).toBeVisible({
        timeout: 10000,
      });

      const user =
        await test.step("Récupération de l'ID utilisateur", async () => {
          let userInDb = null;
          for (let i = 0; i < 5; i++) {
            // Tentatives sur 1 seconde
            userInDb = await getPrisma(test.info().parallelIndex).user.findUnique({
              where: { email: uniqueEmail },
            });
            if (userInDb) break;
            await page.waitForTimeout(200);
          }
          if (!userInDb) throw new Error("Utilisateur non trouvé en BDD");
          return userInDb;
        });

      const magicCode = user.id.toString().padStart(6, "0");

      await page.getByTestId("input-verify-code").fill(magicCode);
      await page.getByTestId("btn-submit-verify-code").click();

      await expect(page).toHaveURL(/.*connexion/);
    });
  });
});

test.describe("Flux d'inscription - Cas d'erreur", () => {
  test("devrait afficher une erreur si l'email est déjà utilisé", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);

    await test.step("Tentative d'inscription avec le même email", async () => {
      await page.goto("/");

      const isMobile = test.info().project.name.includes("Mobile");
      if (isMobile) {
        await page.getByTestId("button-menu").click();
      }
      await page.getByText("S'inscrire").first().click();
      await page.getByText(/je suis un bénévole/i).click();

      // Remplissage du formulaire avec l'email qui existe déjà
      await page.getByTestId("input-firstName").fill("Deuxieme");
      await page.getByTestId("input-lastName").fill("User");
      await page.getByTestId("input-age").fill("25");
      await page.getByTestId("input-email").fill(user.email);

      await page.getByTestId("input-address").fill("10 rue de la Paix");
      await page.getByTestId("input-postalCode").fill("75000");
      await page.getByTestId("input-city").fill("Paris");

      await page.getByTestId("input-password").fill("Password123!");
      await page.getByTestId("input-confirmPassword").fill("Password123!");

      await test.step("Acceptation des CGU avec Scroll dynamique", async () => {
        await page.getByTestId("checkbox-terms").click();

        const scrollContainer = page.getByTestId("terms-scroll-view");
        const acceptBtn = page.getByTestId("btn-accept-terms-modal");

        let attempts = 0;
        while (attempts < 10) {
          const buttonText = await acceptBtn.innerText();
          if (buttonText.includes("J'accepte")) break;

          // On scrolle de 1000 pixels vers le bas
          await scrollContainer.evaluate((el) => el.scrollBy(0, 1000));
          // Petit temps d'attente pour laisser React traiter l'événement
          await page.waitForTimeout(200);
          attempts++;
        }

        await expect(acceptBtn).toHaveText(/J'accepte/i);
        await expect(acceptBtn).toBeEnabled();
        await acceptBtn.click();
      });

      await page.getByTestId("btn-submit-register").click();
    });

    await test.step("Vérification du message d'erreur", async () => {
      // On vérifie que le message d'erreur spécifique apparaît sous l'input
      await expect(page.getByText("Cet email est déjà utilisé")).toBeVisible();

      // On vérifie qu'on n'a pas été redirigé
      await expect(page).toHaveURL(/.*inscription\/benevole/);
    });
  });
});
