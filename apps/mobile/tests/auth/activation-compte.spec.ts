import { test, expect } from "@playwright/test";
import { cleanDatabase, prisma } from "../../../api/test/prisma-test-helper";

test.beforeEach(async () => {
  await cleanDatabase();
});

test.describe("Flux d'activation de compte (Interface & OTP)", () => {
  test("devrait inscrire un utilisateur et permettre son activation avec le code dynamique", async ({
    page,
  }) => {
    const email = `test.activation.${Date.now()}@example.com`;

    // --- ÉTAPE 1 : INSCRIPTION (PRÉPARATION) ---
    await test.step("Inscription initiale du bénévole", async () => {
      await page.goto("/");
      const isMobile = test.info().project.name.includes("Mobile");
      if (isMobile) {
        await page.getByTestId("button-menu").click();
      }
      await page.getByText("S'inscrire").first().click();
      await page.getByText(/je suis un bénévole/i).click();

      await test.step("Remplissage du formulaire", async () => {
        await page.getByTestId("input-firstName").fill("Martin");
        await page.getByTestId("input-lastName").fill("Tester");
        await page.getByTestId("input-age").fill("25");
        await page.getByTestId("input-email").fill(email);

        const addressInput = page.getByTestId("input-address");
        await addressInput.fill("10 rue de la Paix");
        await page.getByTestId("input-postalCode").fill("75000");
        await page.getByTestId("input-city").fill("Paris");

        await page.getByTestId("input-password").fill("Password123!");
        await page.getByTestId("input-confirmPassword").fill("Password123!");
      });

      await test.step("Acceptation des CGU avec Scroll dynamique", async () => {
        await page.getByTestId("checkbox-terms").click();

        const scrollContainer = page.getByTestId("terms-scroll-view");
        const acceptBtn = page.getByTestId("btn-accept-terms-modal");

        let attempts = 0;
        while (attempts < 10) {
          const buttonText = await acceptBtn.innerText();
          if (buttonText.includes("J'accepte")) break;

          await scrollContainer.evaluate((el) => el.scrollBy(0, 1000));
          await page.waitForTimeout(200);
          attempts++;
        }

        await expect(acceptBtn).toHaveText(/J'accepte/i);
        await expect(acceptBtn).toBeEnabled();
        await acceptBtn.click();
      });

      await test.step("Soumission", async () => {
        const submitBtn = page.getByTestId("btn-submit-register");
        await expect(submitBtn).toBeEnabled();
        await submitBtn.click();
      });

      // On attend la redirection automatique vers l'écran OTP
      await expect(page.getByText(/vérifiez votre boîte mail/i)).toBeVisible();
    });

    // --- ÉTAPE 2 : NAVIGATION (RETOUR ET ACCÈS VIA LIEN D'ACTIVATION) ---
    await test.step("Navigation vers l'écran de demande d'activation", async () => {
      // On simule un utilisateur qui revient sur la page de choix de profil
      await page.goto("/");
      if (test.info().project.name.includes("Mobile")) {
        await page.getByTestId("button-menu").click();
      }
      await page.getByText("S'inscrire").first().click();

      // Utilisation du lien "Activer mon compte maintenant" en bas de page
      const activationLink = page.getByTestId("btn-goto-activation");
      await expect(activationLink).toBeVisible();
      await activationLink.click();

      await expect(page).toHaveURL(/.*demande-verification-email/);
    });

    // --- ÉTAPE 3 : DEMANDE DE CODE ET VÉRIFICATION UI ---
    await test.step("Demande de code et vérification du timer", async () => {
      await page.getByTestId("input-request-email").fill(email);
      await page.getByTestId("btn-submit-request-email").click();

      await expect(page.getByText(/vérifiez votre boîte mail/i)).toBeVisible();

      // Vérification du bouton Resend et du timer
      const resendBtn = page.getByTestId("btn-resend-code");
      await expect(resendBtn).toBeDisabled();
      await expect(resendBtn).toHaveText(/Renvoyer le code \(\d+s\)/);
    });

    // --- ÉTAPE 4 : ACTIVATION RÉELLE AVEC CODE DYNAMIQUE ---
    await test.step("Soumission du code OTP calculé via l'ID", async () => {
      // On récupère l'utilisateur en BDD pour connaître son ID
      const user =
        await test.step("Récupération de l'ID utilisateur", async () => {
          let userInDb = null;
          for (let i = 0; i < 5; i++) {
            // Tentatives sur 1 seconde
            userInDb = await prisma.user.findUnique({
              where: { email: email },
            });
            if (userInDb) break;
            await page.waitForTimeout(200);
          }
          if (!userInDb) throw new Error("Utilisateur non trouvé en BDD");
          return userInDb;
        });

      if (!user) throw new Error("Utilisateur non trouvé en BDD");

      // On calcule le code selon la logique de ton Backend de test
      const magicCode = user.id.toString().padStart(6, "0");

      await page.getByTestId("input-verify-code").fill(magicCode);
      console.log(`Code OTP utilisé pour le test : ${magicCode}`);
      await page.getByTestId("btn-submit-verify-code").click();

      // Vérification finale
      await expect(page.getByText(/compte activé/i)).toBeVisible();
      await expect(page).toHaveURL(/.*connexion/);
    });
  });
});
