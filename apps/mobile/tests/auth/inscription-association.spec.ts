import { test, expect, Page } from "../_fixtures";
import {
  cleanDatabaseForWorker,
  createTestUser,
  prisma, getPrisma
} from "../../../api/test/prisma-test-helper";
import {
  MOCK_VALID_NAME,
  MOCK_VALID_POSTAL,
} from "../mock-association-api";

test.beforeEach(async ({}, testInfo) => {
  await cleanDatabaseForWorker(testInfo.parallelIndex);
});

// ----------------------------------------------------------------
// Identifiants RNA mockés (voir tests/mock-association-api.ts)
// ----------------------------------------------------------------
const RNA = {
  VALID_CONSISTENT: "W100000001", // Validée + cohérente → PAS de revue manuelle
  VALID_INCONSISTENT_NAME: "W100000002", // Nom officiel ≠ nom soumis → revue manuelle
  DISSOLVED: "W900000001", // Fermée → blocage
  NOT_AN_ASSOCIATION: "W900000002", // est_association: false → revue manuelle
  UNKNOWN_STATE: "W900000003", // état "X" → revue manuelle
  UNKNOWN_IDENTIFIER: "W123456789", // Aucun résultat → revue manuelle
};

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

async function goToAssociationRegister(page: Page) {
  await page.goto("/");

  const isMobile = test.info().project.name.includes("Mobile");
  const registerButton = page.getByText("S'inscrire").first();

  if (isMobile) {
    const menuButton = page.getByTestId("button-menu");
    await expect(menuButton).toBeVisible();
    await menuButton.click();
  }

  await expect(registerButton).toBeVisible({ timeout: 5000 });
  await registerButton.click();

  await page.getByText(/je suis une association/i).click();
  await expect(page).toHaveURL(/.*inscription\/association/);
}

async function acceptTerms(page: Page) {
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
}

interface AssociationFormData {
  firstName?: string;
  lastName?: string;
  email: string;
  age?: string;
  password?: string;
  confirmPassword?: string;
  /** Nom de l'association — par défaut MOCK_VALID_NAME pour la cohérence avec le mock */
  name?: string;
  rna?: string;
  siret?: string;
  object?: string;
  phone?: string;
  website?: string;
  description?: string;
  /** Code postal du siège — par défaut MOCK_VALID_POSTAL pour la cohérence avec le mock */
  associationPostal?: string;
  legalStatus?: "1901" | "1908" | null;
}

async function fillAssociationForm(page: Page, overrides: AssociationFormData) {
  const data = {
    firstName: "Marie",
    lastName: "Dupont",
    age: "30",
    password: "Password123!",
    confirmPassword: "Password123!",
    name: MOCK_VALID_NAME,
    rna: RNA.VALID_CONSISTENT,
    siret: "",
    object: "Promotion de la solidarité locale et accompagnement des habitants.",
    legalStatus: "1901" as const,
    associationPostal: MOCK_VALID_POSTAL,
    ...overrides,
  };

  // ----- Section owner -----
  await page.getByTestId("input-firstName").fill(data.firstName);
  await page.getByTestId("input-lastName").fill(data.lastName);
  await page.getByTestId("input-email").fill(data.email);
  await page.getByTestId("input-age").fill(data.age);
  await page.getByTestId("input-password").fill(data.password);
  await page.getByTestId("input-confirmPassword").fill(data.confirmPassword);

  // Adresse personnelle du owner
  await page.getByTestId("user-input-address").fill("10 rue de la Paix");
  await page.getByTestId("user-input-postalCode").fill("75001");
  await page.getByTestId("user-input-city").fill("Paris");

  // ----- Section association -----
  await page.getByTestId("input-name").fill(data.name);

  if (data.rna) await page.getByTestId("input-rna").fill(data.rna);
  if (data.siret) await page.getByTestId("input-siret").fill(data.siret);

  // L'objet est un FormTextarea sans testID — sélection par label
  const objectField = page.getByLabel(/objet de l'association/i).first();
  await objectField.fill(data.object);

  // Statut juridique (radio buttons)
  if (data.legalStatus === "1901") {
    await page.getByTestId("btn-legal-status-1901").click();
  } else if (data.legalStatus === "1908") {
    await page.getByTestId("btn-legal-status-1908").click();
  }

  // Adresse du siège
  await page.getByTestId("assoc-input-address").fill("15 avenue de la Liberté");
  await page.getByTestId("assoc-input-postalCode").fill(data.associationPostal);
  await page.getByTestId("assoc-input-city").fill("Paris");

  if (data.phone) await page.getByTestId("input-phone").fill(data.phone);
  if (data.website) await page.getByTestId("input-website").fill(data.website);
}

/**
 * Helper qui récupère l'utilisateur en BDD puis valide l'OTP (id padded 6 chiffres).
 */
async function validateOtp(page: Page, email: string) {
  let userInDb = null;
  for (let i = 0; i < 10; i++) {
    userInDb = await getPrisma(test.info().parallelIndex).user.findUnique({ where: { email } });
    if (userInDb) break;
    await page.waitForTimeout(200);
  }
  if (!userInDb) throw new Error("Utilisateur non trouvé en BDD");

  const magicCode = userInDb.id.toString().padStart(6, "0");
  await page.getByTestId("input-verify-code").fill(magicCode);
  await page.getByTestId("btn-submit-verify-code").click();
}

// ================================================================
// 1. Flux nominal — API validée et cohérente (PAS de revue manuelle)
// ================================================================
test.describe("Flux d'inscription association — API validée (sans revue manuelle)", () => {
  test("devrait créer le compte + l'association, afficher l'écran OTP, valider le code et rediriger", async ({
    page,
  }) => {
    const uniqueEmail = `asso.ok.w${test.info().parallelIndex}.${Date.now()}@test.com`;

    await goToAssociationRegister(page);

    await fillAssociationForm(page, {
      email: uniqueEmail,
      rna: RNA.VALID_CONSISTENT,
      phone: "0606060606",
      website: "https://association.fr",
    });

    await acceptTerms(page);
    await page.getByTestId("btn-submit-register-association").click();

    await expect(page.getByText(/vérifiez votre boîte mail/i)).toBeVisible({
      timeout: 15000,
    });

    // L'association ne doit PAS être en revue manuelle (mock cohérent)
    const association = await getPrisma(test.info().parallelIndex).association.findFirst({
      where: { name: MOCK_VALID_NAME, rna: RNA.VALID_CONSISTENT },
    });
    expect(association).not.toBeNull();
    expect(association?.requiresManualReview).toBe(false);

    await validateOtp(page, uniqueEmail);
    await expect(page).toHaveURL(/.*connexion/);

    // L'utilisateur doit être lié à l'association en tant qu'OWNER
    const user = await getPrisma(test.info().parallelIndex).user.findUnique({
      where: { email: uniqueEmail },
      include: { associations: true },
    });
    expect(user?.associations.length).toBe(1);
    expect(user?.associations[0].role).toBe("OWNER");
  });
});

// ================================================================
// 2. Flux revue manuelle — nom incohérent avec l'API
// ================================================================
test.describe("Flux d'inscription association — API validée mais incohérente", () => {
  test("devrait créer l'association avec requiresManualReview=true si le nom diffère de l'API", async ({
    page,
  }) => {
    const uniqueEmail = `asso.incoherent.w${test.info().parallelIndex}.${Date.now()}@test.com`;

    await goToAssociationRegister(page);

    await fillAssociationForm(page, {
      email: uniqueEmail,
      rna: RNA.VALID_INCONSISTENT_NAME,
    });

    await acceptTerms(page);
    await page.getByTestId("btn-submit-register-association").click();

    await expect(page.getByText(/vérifiez votre boîte mail/i)).toBeVisible({
      timeout: 15000,
    });

    const association = await getPrisma(test.info().parallelIndex).association.findFirst({
      where: { rna: RNA.VALID_INCONSISTENT_NAME },
    });
    expect(association).not.toBeNull();
    expect(association?.requiresManualReview).toBe(true);
  });
});

// ================================================================
// 3. Flux revue manuelle — identifiant inconnu de l'API
// ================================================================
test.describe("Flux d'inscription association — identifiant inconnu de l'API", () => {
  test("devrait créer l'association avec requiresManualReview=true si l'API ne renvoie aucun résultat", async ({
    page,
  }) => {
    const uniqueEmail = `asso.unknown.w${test.info().parallelIndex}.${Date.now()}@test.com`;

    await goToAssociationRegister(page);

    await fillAssociationForm(page, {
      email: uniqueEmail,
      rna: RNA.UNKNOWN_IDENTIFIER,
    });

    await acceptTerms(page);
    await page.getByTestId("btn-submit-register-association").click();

    await expect(page.getByText(/vérifiez votre boîte mail/i)).toBeVisible({
      timeout: 15000,
    });

    const association = await getPrisma(test.info().parallelIndex).association.findFirst({
      where: { rna: RNA.UNKNOWN_IDENTIFIER },
    });
    expect(association?.requiresManualReview).toBe(true);
  });
});

// ================================================================
// 4. Flux revue manuelle — entité existante mais pas une association
// ================================================================
test.describe("Flux d'inscription association — entité non-association", () => {
  test("devrait basculer en revue manuelle si l'entité trouvée n'est pas une association (est_association=false)", async ({
    page,
  }) => {
    const uniqueEmail = `asso.notassoc.w${test.info().parallelIndex}.${Date.now()}@test.com`;

    await goToAssociationRegister(page);

    await fillAssociationForm(page, {
      email: uniqueEmail,
      rna: RNA.NOT_AN_ASSOCIATION,
    });

    await acceptTerms(page);
    await page.getByTestId("btn-submit-register-association").click();

    await expect(page.getByText(/vérifiez votre boîte mail/i)).toBeVisible({
      timeout: 15000,
    });

    const association = await getPrisma(test.info().parallelIndex).association.findFirst({
      where: { rna: RNA.NOT_AN_ASSOCIATION },
    });
    expect(association?.requiresManualReview).toBe(true);
  });
});

// ================================================================
// 5. Flux revue manuelle — état administratif inconnu
// ================================================================
test.describe("Flux d'inscription association — état administratif inconnu", () => {
  test("devrait basculer en revue manuelle si l'état administratif n'est ni A ni F", async ({
    page,
  }) => {
    const uniqueEmail = `asso.unknownstate.w${test.info().parallelIndex}.${Date.now()}@test.com`;

    await goToAssociationRegister(page);

    await fillAssociationForm(page, {
      email: uniqueEmail,
      rna: RNA.UNKNOWN_STATE,
    });

    await acceptTerms(page);
    await page.getByTestId("btn-submit-register-association").click();

    await expect(page.getByText(/vérifiez votre boîte mail/i)).toBeVisible({
      timeout: 15000,
    });

    const association = await getPrisma(test.info().parallelIndex).association.findFirst({
      where: { rna: RNA.UNKNOWN_STATE },
    });
    expect(association?.requiresManualReview).toBe(true);
  });
});

// ================================================================
// 6. BLOCAGE — association dissoute (etat_administratif='F')
// ================================================================
test.describe("Flux d'inscription association — association dissoute", () => {
  test("devrait BLOQUER l'inscription si l'association est dissoute", async ({
    page,
  }) => {
    const uniqueEmail = `asso.dissolved.w${test.info().parallelIndex}.${Date.now()}@test.com`;

    await goToAssociationRegister(page);

    await fillAssociationForm(page, {
      email: uniqueEmail,
      rna: RNA.DISSOLVED,
    });

    await acceptTerms(page);
    await page.getByTestId("btn-submit-register-association").click();

    // L'utilisateur reste sur le formulaire — un message d'erreur s'affiche
    await expect(
      page.getByText(/dissoute|fermée|n'est pas possible/i).first(),
    ).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/.*inscription\/association/);

    // Aucune association ni user ne doivent avoir été créés
    const user = await getPrisma(test.info().parallelIndex).user.findUnique({ where: { email: uniqueEmail } });
    expect(user).toBeNull();
    const association = await getPrisma(test.info().parallelIndex).association.findFirst({
      where: { rna: RNA.DISSOLVED },
    });
    expect(association).toBeNull();
  });
});

// ================================================================
// 7. Cas d'erreur — email déjà utilisé
// ================================================================
test.describe("Flux d'inscription association — email déjà utilisé", () => {
  test("devrait afficher une erreur si l'email est déjà utilisé", async ({
    page,
  }, testInfo) => {
    const existingUser = await createTestUser(testInfo.parallelIndex);

    await goToAssociationRegister(page);

    await fillAssociationForm(page, { email: existingUser.email });
    await acceptTerms(page);
    await page.getByTestId("btn-submit-register-association").click();

    await expect(page.getByText(/cet email est déjà utilisé/i)).toBeVisible({
      timeout: 10000,
    });
    await expect(page).toHaveURL(/.*inscription\/association/);
  });
});

// ================================================================
// 8. Validation Zod — Ni RNA ni SIRET
// ================================================================
test.describe("Flux d'inscription association — validation RNA/SIRET", () => {
  test("devrait afficher une erreur si ni RNA ni SIRET ne sont renseignés", async ({
    page,
  }) => {
    const uniqueEmail = `asso.norna.w${test.info().parallelIndex}.${Date.now()}@test.com`;

    await goToAssociationRegister(page);

    await fillAssociationForm(page, {
      email: uniqueEmail,
      rna: "",
      siret: "",
    });

    await acceptTerms(page);
    await page.getByTestId("btn-submit-register-association").click();

    await expect(
      page.getByText(/au moins le RNA ou le SIRET/i).first(),
    ).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/.*inscription\/association/);
  });

  test("devrait afficher une erreur si le RNA est au mauvais format", async ({
    page,
  }) => {
    const uniqueEmail = `asso.badrna.w${test.info().parallelIndex}.${Date.now()}@test.com`;

    await goToAssociationRegister(page);

    await fillAssociationForm(page, {
      email: uniqueEmail,
      rna: "INVALIDRNA",
      siret: "",
    });

    await acceptTerms(page);
    await page.getByTestId("btn-submit-register-association").click();

    await expect(
      page.getByText(/RNA doit commencer par W/i).first(),
    ).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/.*inscription\/association/);
  });
});

// ================================================================
// 9. Validation — mot de passe ne correspond pas
// ================================================================
test.describe("Flux d'inscription association — mot de passe", () => {
  test("devrait afficher une erreur si la confirmation du mot de passe ne correspond pas", async ({
    page,
  }) => {
    const uniqueEmail = `asso.pwd.w${test.info().parallelIndex}.${Date.now()}@test.com`;

    await goToAssociationRegister(page);

    await fillAssociationForm(page, {
      email: uniqueEmail,
      password: "Password123!",
      confirmPassword: "Password456!",
    });

    await acceptTerms(page);
    await page.getByTestId("btn-submit-register-association").click();

    await expect(
      page.getByText(/Les mots de passe ne correspondent pas/i).first(),
    ).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/.*inscription\/association/);
  });
});

// ================================================================
// 10. Validation — statut juridique non sélectionné
// ================================================================
test.describe("Flux d'inscription association — statut juridique", () => {
  test("devrait afficher une erreur si aucun statut juridique n'est sélectionné", async ({
    page,
  }) => {
    const uniqueEmail = `asso.legal.w${test.info().parallelIndex}.${Date.now()}@test.com`;

    await goToAssociationRegister(page);

    await fillAssociationForm(page, {
      email: uniqueEmail,
      legalStatus: null,
    });

    await acceptTerms(page);
    await page.getByTestId("btn-submit-register-association").click();

    await expect(
      page.getByText(/statut juridique est obligatoire/i).first(),
    ).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/.*inscription\/association/);
  });
});

// ================================================================
// 11. CGU non cochées → bouton submit désactivé
// ================================================================
test.describe("Flux d'inscription association — CGU obligatoires", () => {
  test("le bouton de soumission doit rester désactivé tant que les CGU ne sont pas acceptées", async ({
    page,
  }) => {
    const uniqueEmail = `asso.cgu.w${test.info().parallelIndex}.${Date.now()}@test.com`;

    await goToAssociationRegister(page);

    await fillAssociationForm(page, { email: uniqueEmail });

    const submitBtn = page.getByTestId("btn-submit-register-association");
    await expect(submitBtn).toBeDisabled();

    const userInDb = await getPrisma(test.info().parallelIndex).user.findUnique({
      where: { email: uniqueEmail },
    });
    expect(userInDb).toBeNull();
  });
});
