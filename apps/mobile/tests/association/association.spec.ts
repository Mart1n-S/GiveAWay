import { test, expect, Page } from "../_fixtures";
import {
  cleanDatabaseForWorker,
  createTestUser,
  createTestAssociation,
  addAssociationMember,
} from "../../../api/test/prisma-test-helper";
import { AssociationRole } from "../../../api/src/generated/prisma/client";

const VALID_PASSWORD = "Password123!";

test.beforeEach(async ({}, testInfo) => {
  await cleanDatabaseForWorker(testInfo.parallelIndex);
});

// ===========================================================================
// HELPER : connexion standard
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
  await page.waitForLoadState("networkidle");
}

// ===========================================================================
// HELPER : connexion + navigation vers /association
// ===========================================================================
async function loginAndGoToAssociation(
  page: Page,
  user: { email: string },
  isMobile: boolean,
) {
  await loginUser(page, user, isMobile);
  await page.goto("/association");
  await expect(page).toHaveURL(/.*association/);
}

// ===========================================================================
// TESTS : Accès non authentifié
// ===========================================================================
test.describe("Page Association — Accès", () => {
  test("devrait rediriger vers la connexion si non authentifié", async ({
    page,
  }) => {
    await page.goto("/association");

    // Redirigé vers la connexion ou l'accueil
    await expect(page).not.toHaveURL(/.*association$/);
  });
});

// ===========================================================================
// TESTS : État vide (utilisateur sans association)
// ===========================================================================
test.describe("Page Association — État vide", () => {
  test("devrait afficher l'état vide si l'utilisateur n'appartient à aucune association", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociation(page, user, isMobile);

    await expect(page.getByTestId("association-empty-state")).toBeVisible();
    // Le titre exact pour éviter la collision avec le sous-titre
    await expect(page.getByText("Aucune association", { exact: true })).toBeVisible();
  });

  test("devrait afficher un message explicatif dans l'état vide", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociation(page, user, isMobile);

    await expect(
      page.getByText(/n'êtes membre d'aucune association/i),
    ).toBeVisible();
  });
});

// ===========================================================================
// TESTS : Affichage (rôle OWNER — association VALIDATED)
// ===========================================================================
test.describe("Page Association — Affichage (Owner)", () => {
  test("devrait afficher le nom de l'association", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    await createTestAssociation(user.id, testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociation(page, user, isMobile);

    await expect(page.getByTestId("association-name")).toBeVisible();
    await expect(page.getByTestId("association-name")).toContainText(
      "Association E2E Test",
    );
  });

  test("devrait afficher le badge de statut de l'association", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    await createTestAssociation(user.id, testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociation(page, user, isMobile);

    await expect(page.getByTestId("association-status-badge")).toBeVisible();
    // createTestAssociation crée une association VALIDATED
    await expect(page.getByTestId("association-status-badge")).toContainText(
      "Validée",
    );
  });

  test("devrait afficher le nombre de membres", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    await createTestAssociation(user.id, testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociation(page, user, isMobile);

    const memberCount = page.getByTestId("association-member-count");
    await expect(memberCount).toBeVisible();
    await expect(memberCount).toContainText("1");
  });

  test("devrait afficher le nombre de membres mis à jour avec plusieurs membres", async ({
    page,
  }, testInfo) => {
    const owner = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(owner.id, testInfo.parallelIndex);

    // Créer un second membre
    const member = await createTestUser(testInfo.parallelIndex, 'member');
    await addAssociationMember(assoc.id, member.id, AssociationRole.EDITOR);

    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociation(page, owner, isMobile);

    const memberCount = page.getByTestId("association-member-count");
    await expect(memberCount).toContainText("2");
    await expect(memberCount).toContainText("Membres");
  });
});

// ===========================================================================
// TESTS : Actions OWNER (association VALIDATED)
// ===========================================================================
test.describe("Page Association — Actions Owner", () => {
  test("devrait afficher le bouton 'Modifier les informations' pour le propriétaire", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    await createTestAssociation(user.id, testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociation(page, user, isMobile);

    await expect(page.getByTestId("btn-edit-association")).toBeVisible();
  });

  test("devrait naviguer vers la page de modification au clic sur 'Modifier les informations'", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    await createTestAssociation(user.id, testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociation(page, user, isMobile);

    await page.getByTestId("btn-edit-association").scrollIntoViewIfNeeded();
    await page.getByTestId("btn-edit-association").click();

    await expect(page).toHaveURL(/.*association\/modifier/);
  });

  test("devrait afficher le bouton 'Gérer les membres' pour le propriétaire", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    await createTestAssociation(user.id, testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociation(page, user, isMobile);

    await expect(page.getByTestId("btn-manage-members")).toBeVisible();
  });

  test("devrait naviguer vers la page des membres au clic sur 'Gérer les membres'", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    await createTestAssociation(user.id, testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociation(page, user, isMobile);

    await page.getByTestId("btn-manage-members").scrollIntoViewIfNeeded();
    await page.getByTestId("btn-manage-members").click();

    await expect(page).toHaveURL(/.*association\/membres/);
  });

  test("devrait afficher le bouton 'Transférer la propriété'", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    await createTestAssociation(user.id, testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociation(page, user, isMobile);

    await page.getByTestId("btn-transfer-owner").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("btn-transfer-owner")).toBeVisible();
    await expect(page.getByTestId("btn-transfer-owner")).toContainText(
      "Transférer la propriété",
    );
  });

  test("devrait afficher le bouton 'Quitter l'association' pour le propriétaire", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    await createTestAssociation(user.id, testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociation(page, user, isMobile);

    await page
      .getByTestId("btn-leave-association-owner")
      .scrollIntoViewIfNeeded();
    await expect(
      page.getByTestId("btn-leave-association-owner"),
    ).toBeVisible();
  });
});

// ===========================================================================
// TESTS : Actions ADMIN (association VALIDATED)
// ===========================================================================
test.describe("Page Association — Actions Admin", () => {
  test("devrait afficher le bouton 'Gérer les membres' pour l'administrateur", async ({
    page,
  }, testInfo) => {
    const owner = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(owner.id, testInfo.parallelIndex);
    const admin = await createTestUser(testInfo.parallelIndex, 'admin');
    await addAssociationMember(assoc.id, admin.id, AssociationRole.ADMIN);

    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociation(page, admin, isMobile);

    await expect(page.getByTestId("btn-manage-members")).toBeVisible();
  });

  test("devrait afficher le bouton 'Quitter l'association' pour l'administrateur", async ({
    page,
  }, testInfo) => {
    const owner = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(owner.id, testInfo.parallelIndex);
    const admin = await createTestUser(testInfo.parallelIndex, 'admin');
    await addAssociationMember(assoc.id, admin.id, AssociationRole.ADMIN);

    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociation(page, admin, isMobile);

    await page.getByTestId("btn-leave-association").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("btn-leave-association")).toBeVisible();
  });

  test("devrait afficher la modale de confirmation au clic sur 'Quitter l'association' (Admin)", async ({
    page,
  }, testInfo) => {
    const owner = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(owner.id, testInfo.parallelIndex);
    const admin = await createTestUser(testInfo.parallelIndex, 'admin');
    await addAssociationMember(assoc.id, admin.id, AssociationRole.ADMIN);

    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociation(page, admin, isMobile);

    await page.getByTestId("btn-leave-association").scrollIntoViewIfNeeded();
    await page.getByTestId("btn-leave-association").click();

    // La modale de confirmation doit être visible
    await expect(page.getByText(/quitter l'association/i).first()).toBeVisible();
    await expect(page.getByText(/êtes-vous sûr/i)).toBeVisible();
  });

  test("devrait quitter l'association et rediriger vers l'accueil (Admin)", async ({
    page,
  }, testInfo) => {
    const owner = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(owner.id, testInfo.parallelIndex);
    const admin = await createTestUser(testInfo.parallelIndex, 'admin');
    await addAssociationMember(assoc.id, admin.id, AssociationRole.ADMIN);

    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociation(page, admin, isMobile);

    // --- ÉTAPE 1 : Clic sur Quitter ---
    await test.step("Clic sur Quitter l'association", async () => {
      await page.getByTestId("btn-leave-association").scrollIntoViewIfNeeded();
      await page.getByTestId("btn-leave-association").click();
      await expect(page.getByText(/êtes-vous sûr/i)).toBeVisible();
    });

    // --- ÉTAPE 2 : Confirmation ---
    await test.step("Confirmation de la sortie", async () => {
      await page.getByRole("button", { name: /quitter/i }).last().click();
    });

    // --- ÉTAPE 3 : Vérification toast et redirection ---
    await test.step("Redirection vers l'accueil après la sortie", async () => {
      await expect(
        page.getByText(/association quittée/i),
      ).toBeVisible({ timeout: 10000 });
      await expect(page).toHaveURL("/", { timeout: 10000 });
    });
  });

  test("devrait annuler la sortie de l'association (Admin)", async ({
    page,
  }, testInfo) => {
    const owner = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(owner.id, testInfo.parallelIndex);
    const admin = await createTestUser(testInfo.parallelIndex, 'admin');
    await addAssociationMember(assoc.id, admin.id, AssociationRole.ADMIN);

    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociation(page, admin, isMobile);

    await page.getByTestId("btn-leave-association").scrollIntoViewIfNeeded();
    await page.getByTestId("btn-leave-association").click();
    await expect(page.getByText(/êtes-vous sûr/i)).toBeVisible();

    // Clic sur Annuler
    await page.getByRole("button", { name: /annuler/i }).click();

    // On reste sur la page association
    await expect(page).toHaveURL(/.*association/);
    await expect(page.getByTestId("association-name")).toBeVisible();
  });
});

// ===========================================================================
// TESTS : Actions EDITOR (association VALIDATED)
// ===========================================================================
test.describe("Page Association — Actions Editor", () => {
  test("devrait afficher le bouton 'Voir les membres' pour l'éditeur", async ({
    page,
  }, testInfo) => {
    const owner = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(owner.id, testInfo.parallelIndex);
    const editor = await createTestUser(testInfo.parallelIndex, 'editor');
    await addAssociationMember(assoc.id, editor.id, AssociationRole.EDITOR);

    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociation(page, editor, isMobile);

    await expect(page.getByTestId("btn-view-members")).toBeVisible();
  });

  test("ne devrait pas afficher le bouton 'Modifier les informations' pour l'éditeur", async ({
    page,
  }, testInfo) => {
    const owner = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(owner.id, testInfo.parallelIndex);
    const editor = await createTestUser(testInfo.parallelIndex, 'editor');
    await addAssociationMember(assoc.id, editor.id, AssociationRole.EDITOR);

    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociation(page, editor, isMobile);

    await expect(page.getByTestId("btn-edit-association")).not.toBeVisible();
  });

  test("devrait afficher le bouton 'Quitter l'association' pour l'éditeur", async ({
    page,
  }, testInfo) => {
    const owner = await createTestUser(testInfo.parallelIndex);
    const assoc = await createTestAssociation(owner.id, testInfo.parallelIndex);
    const editor = await createTestUser(testInfo.parallelIndex, 'editor');
    await addAssociationMember(assoc.id, editor.id, AssociationRole.EDITOR);

    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociation(page, editor, isMobile);

    await page.getByTestId("btn-leave-association").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("btn-leave-association")).toBeVisible();
  });
});

// ===========================================================================
// TESTS : Missions récentes
// ===========================================================================
test.describe("Page Association — Missions récentes", () => {
  test("devrait afficher la section 'Missions récentes'", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    await createTestAssociation(user.id, testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociation(page, user, isMobile);

    await expect(page.getByText(/missions récentes/i)).toBeVisible();
  });

  test("devrait afficher 'Aucune mission pour le moment' si l'association n'a pas de missions", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    await createTestAssociation(user.id, testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");

    await loginAndGoToAssociation(page, user, isMobile);

    await expect(
      page.getByText(/aucune mission pour le moment/i),
    ).toBeVisible();
  });
});
