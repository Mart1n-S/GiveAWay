import { test, expect, type Page } from "@playwright/test";
import {
  cleanDatabase,
  createTestUser,
  createTestAssociation,
} from "../../../../api/test/prisma-test-helper";

const VALID_PASSWORD = "Password123!";

test.beforeEach(async () => {
  await cleanDatabase();
});

// ===========================================================================
// HELPER : connexion
// ===========================================================================
async function loginUser(
  page: Page,
  user: { email: string },
  isMobile: boolean,
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
}

async function loginAndGoToCreer(
  page: Page,
  user: { email: string },
  isMobile: boolean,
) {
  await loginUser(page, user, isMobile);
  await page.goto("/association/missions/creer");
  await expect(page).toHaveURL(/.*association\/missions\/creer/);
  // Attendre la fin du chargement des référentiels
  await expect(
    page.getByPlaceholder("Ex: Distribution alimentaire"),
  ).toBeVisible({ timeout: 10000 });
}

// ===========================================================================
// Accès
// ===========================================================================
test.describe("Page Créer Mission — Accès", () => {
  test("devrait rediriger si l'utilisateur n'est pas authentifié", async ({
    page,
  }) => {
    await page.goto("/association/missions/creer");
    await expect(page).not.toHaveURL(/.*association\/missions\/creer$/);
  });

  test("devrait afficher un message si l'utilisateur n'est pas membre d'une association", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginUser(page, user, isMobile);
    await page.goto("/association/missions/creer");

    await expect(
      page.getByText(/n'êtes membre d'aucune association/i),
    ).toBeVisible();
  });
});

// ===========================================================================
// Interface — Stepper
// ===========================================================================
test.describe("Page Créer Mission — Interface Stepper", () => {
  test("devrait afficher les trois étapes du stepper", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    await createTestAssociation(user.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToCreer(page, user, isMobile);

    await expect(page.getByText("Informations")).toBeVisible();
    await expect(page.getByText("Détails")).toBeVisible();
    await expect(page.getByText("Tags")).toBeVisible();
  });

  test("devrait afficher les boutons Annuler et Suivant sur l'étape 1", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    await createTestAssociation(user.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToCreer(page, user, isMobile);

    await expect(
      page.getByRole("button", { name: /annuler/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /suivant/i }),
    ).toBeVisible();
  });

  test("devrait afficher le champ titre avec le placeholder approprié", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    await createTestAssociation(user.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToCreer(page, user, isMobile);

    await expect(
      page.getByPlaceholder("Ex: Distribution alimentaire"),
    ).toBeVisible();
  });

  test("devrait afficher les radio pills de type d'activité", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    await createTestAssociation(user.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToCreer(page, user, isMobile);

    await expect(page.getByRole("radio", { name: "Mission" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Événement" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Collecte" })).toBeVisible();
    await expect(
      page.getByRole("radio", { name: "Information" }),
    ).toBeVisible();
  });
});

// ===========================================================================
// Navigation entre étapes
// ===========================================================================
test.describe("Page Créer Mission — Navigation entre étapes", () => {
  test("devrait afficher une erreur si le titre est vide au clic sur Suivant", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    await createTestAssociation(user.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToCreer(page, user, isMobile);

    await page.getByRole("button", { name: /suivant/i }).click();

    // Reste sur l'étape 1 car validation échoue
    await expect(
      page.getByPlaceholder("Ex: Distribution alimentaire"),
    ).toBeVisible();
    await expect(page).toHaveURL(/.*association\/missions\/creer/);
  });

  test("devrait passer à l'étape 2 après avoir rempli l'étape 1 (type INFO)", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    await createTestAssociation(user.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToCreer(page, user, isMobile);

    await page
      .getByPlaceholder("Ex: Distribution alimentaire")
      .fill("Ma mission de test");
    await page
      .getByPlaceholder("Décrivez la mission, les activités prévues...")
      .fill(
        "Description suffisamment longue pour passer la validation minimale du formulaire.",
      );
    await page.getByRole("radio", { name: "Information" }).click();

    await page.getByRole("button", { name: /suivant/i }).click();

    // Étape 2 visible : bouton "Retour" présent (sur web il y en a 2 : header + footer)
    await expect(page.getByRole("button", { name: /retour/i }).first()).toBeVisible();
  });

  test("devrait revenir à l'étape 1 avec le bouton Retour depuis l'étape 2", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    await createTestAssociation(user.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToCreer(page, user, isMobile);

    // Remplir étape 1 avec type INFO
    await page
      .getByPlaceholder("Ex: Distribution alimentaire")
      .fill("Ma mission de test");
    await page
      .getByPlaceholder("Décrivez la mission, les activités prévues...")
      .fill(
        "Description suffisamment longue pour passer la validation minimale du formulaire.",
      );
    await page.getByRole("radio", { name: "Information" }).click();
    await page.getByRole("button", { name: /suivant/i }).click();

    // Sur étape 2 — sur web il y a 2 "Retour" (header + footer) ; on clique le dernier (footer = retour étape)
    await expect(page.getByRole("button", { name: /retour/i }).first()).toBeVisible();

    await page.getByRole("button", { name: /retour/i }).last().click();

    // Retour à l'étape 1 : le champ titre doit être visible
    await expect(
      page.getByPlaceholder("Ex: Distribution alimentaire"),
    ).toBeVisible();
  });

  test("devrait passer à l'étape 3 depuis l'étape 2 (INFO — aucun champ requis)", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    await createTestAssociation(user.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToCreer(page, user, isMobile);

    // Étape 1
    await page
      .getByPlaceholder("Ex: Distribution alimentaire")
      .fill("Ma mission de test");
    await page
      .getByPlaceholder("Décrivez la mission, les activités prévues...")
      .fill(
        "Description suffisamment longue pour passer la validation minimale du formulaire.",
      );
    await page.getByRole("radio", { name: "Information" }).click();
    await page.getByRole("button", { name: /suivant/i }).click();

    // Étape 2 → Suivant (pas de champs requis pour INFO)
    await page.getByRole("button", { name: /suivant/i }).click();

    // Étape 3 : bouton "Créer" visible
    await expect(page.getByRole("button", { name: /^créer$/i })).toBeVisible();
  });
});

// ===========================================================================
// Soumission
// ===========================================================================
test.describe("Page Créer Mission — Soumission", () => {
  test("devrait créer une mission de type INFO et rediriger vers le dashboard", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    await createTestAssociation(user.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToCreer(page, user, isMobile);

    // Étape 1 — Informations
    await page
      .getByPlaceholder("Ex: Distribution alimentaire")
      .fill("Mission Info E2E");
    await page
      .getByPlaceholder("Décrivez la mission, les activités prévues...")
      .fill(
        "Annonce informative à destination des bénévoles de l'association.",
      );
    await page.getByRole("radio", { name: "Information" }).click();
    await page.getByRole("button", { name: /suivant/i }).click();

    // Étape 2 — Détails (vide pour INFO)
    await page.getByRole("button", { name: /suivant/i }).click();

    // Étape 3 — Tags (aucune sélection requise)
    await page.getByRole("button", { name: /^créer$/i }).click();

    // Toast de succès
    await expect(page.getByText(/mission publiée/i)).toBeVisible({
      timeout: 10000,
    });

    // Redirection vers le dashboard
    await expect(page).toHaveURL(/.*association\/missions$/, {
      timeout: 10000,
    });
  });

  test("devrait créer une mission de type MISSION À distance et rediriger", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.workerIndex);
    await createTestAssociation(user.id);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToCreer(page, user, isMobile);

    // Étape 1 — type MISSION + modalité REMOTE
    await page
      .getByPlaceholder("Ex: Distribution alimentaire")
      .fill("Mission Remote E2E");
    await page
      .getByPlaceholder("Décrivez la mission, les activités prévues...")
      .fill(
        "Mission bénévole à distance pour aider les personnes dans le besoin.",
      );
    await page.getByRole("radio", { name: "Mission" }).click();
    await page.getByRole("radio", { name: "À distance" }).click();
    await page.getByRole("button", { name: /suivant/i }).click();

    // Étape 2 — Détails (hasRegistration=true par défaut → volunteersNeeded requis)
    await page.getByPlaceholder("Ex: 10").fill("5");
    await page.getByRole("button", { name: /suivant/i }).click();

    // Étape 3 — Tags
    await page.getByRole("button", { name: /^créer$/i }).click();

    await expect(page.getByText(/mission publiée/i)).toBeVisible({
      timeout: 10000,
    });
    await expect(page).toHaveURL(/.*association\/missions$/, {
      timeout: 10000,
    });
  });
});
