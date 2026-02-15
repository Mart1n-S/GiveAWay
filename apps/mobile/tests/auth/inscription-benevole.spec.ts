import { test, expect } from "@playwright/test";
import { cleanDatabase } from "../../../api/test/prisma-test-helper";

test.beforeEach(async () => {
  await cleanDatabase();
});

test.describe("Flux d'inscription bénévole", () => {
  test("devrait créer un compte et afficher l'écran OTP", async ({ page }) => {
    const uniqueEmail = `benevole.${Date.now()}@test.com`;

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

    await test.step("Vérification de la redirection OTP", async () => {
      // 1. On attend le titre pour confirmer qu'on est sur la bonne page
      await expect(page.getByText(/vérifiez votre boîte mail/i)).toBeVisible({
        timeout: 10000,
      });

      // 2. On cible l'email spécifiquement dans le texte de confirmation
      // On utilise exact: true pour éviter de matcher le Toast qui contient une phrase plus longue
      const emailConfirmation = page.getByText(uniqueEmail, { exact: true });

      // Si plusieurs éléments ont exactement le même texte, on prend le premier (celui de la page)
      await expect(emailConfirmation.first()).toBeVisible();
    });
  });
});

test.describe("Flux d'inscription - Cas d'erreur", () => {
  test("devrait afficher une erreur si l'email est déjà utilisé", async ({ page }) => {
    const baseEmail = `conflict.${Date.now()}@test.com`;

    // --- ÉTAPE 1 : PRÉPARATION (Création du premier utilisateur) ---
    await test.step("Création du premier compte", async () => {
      // Parcours d'inscription simplifié pour créer le conflit
      await page.goto("/");
      const isMobile = test.info().project.name.includes("Mobile");
      if (isMobile) {
        await page.getByTestId("button-menu").click();
      }
      await page.getByText("S'inscrire").first().click();
      await page.getByText(/je suis un bénévole/i).click();

      await page.getByTestId("input-firstName").fill("Premier");
      await page.getByTestId("input-lastName").fill("User");
      await page.getByTestId("input-age").fill("30");
      await page.getByTestId("input-email").fill(baseEmail);

      // Assurez-vous d'utiliser l'autocomplete si nécessaire pour valider l'adresse
      await page.getByTestId("input-address").fill("10 rue de la Paix");
      await page.getByTestId("input-postalCode").fill("75000");
      await page.getByTestId("input-city").fill("Paris");

      await page.getByTestId("input-password").fill("Password123!");
      await page.getByTestId("input-confirmPassword").fill("Password123!");

      // On passe les CGU rapidement
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
      // On attend d'être sur la page OTP pour être sûr que c'est en BDD
      await test.step("Vérification de la redirection OTP", async () => {
        await expect(page.getByText(/vérifiez votre boîte mail/i)).toBeVisible({
          timeout: 10000,
        });
      });
    });

    // --- ÉTAPE 2 : LA TENTATIVE DE DOUBLON ---
    await test.step("Tentative d'inscription avec le même email", async () => {
      await page.goto("/"); // Retour accueil
      const isMobile = test.info().project.name.includes("Mobile");
      if (isMobile) {
        await page.getByTestId("button-menu").click();
      }
      await page.getByText("S'inscrire").first().click();
      await page.getByText(/je suis un bénévole/i).click();

      await page.getByTestId("input-firstName").fill("Deuxieme");
      await page.getByTestId("input-lastName").fill("User");
      await page.getByTestId("input-age").fill("25");
      await page.getByTestId("input-email").fill(baseEmail);
      await page.getByTestId("input-address").fill("10 rue de la Paix");
      await page.getByTestId("input-postalCode").fill("75000");
      await page.getByTestId("input-city").fill("Paris");

      await page.getByTestId("input-password").fill("Password123!");
      await page.getByTestId("input-confirmPassword").fill("Password123!");

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

      await page.getByTestId("btn-submit-register").click();
    });

    // --- ÉTAPE 3 : VÉRIFICATION DE L'ERREUR ---
    await test.step("Vérification du message d'erreur", async () => {
      await expect(page.getByText("Cet email est déjà utilisé")).toBeVisible();
      await expect(page).toHaveURL(/.*inscription\/benevole/);
    });
  });
});
