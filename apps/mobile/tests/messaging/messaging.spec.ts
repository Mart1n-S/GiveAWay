import { test, expect, Page } from "../_fixtures";
import {
  cleanDatabaseForWorker,
  createTestUser,
  createTestAssociation,
  prisma, getPrisma
} from "../../../api/test/prisma-test-helper";

const VALID_PASSWORD = "Password123!";

/**
 * Helper : ordre canonique de la paire d'utilisateurs pour insérer
 * directement une conversation en BDD (user1Id < user2Id, cf. schema Prisma).
 */
function canonicalPair(a: number, b: number) {
  return a < b ? { user1Id: a, user2Id: b } : { user1Id: b, user2Id: a };
}

test.beforeEach(async ({}, testInfo) => {
  await cleanDatabaseForWorker(testInfo.parallelIndex);
});

async function loginAs(page: Page, email: string, isMobile: boolean) {
  await page.goto("/");
  if (isMobile) {
    await page.getByTestId("button-menu").filter({ visible: true }).click();
  }
  await page
    .getByRole("button", { name: /connexion/i })
    .filter({ visible: true })
    .click();
  await page.getByTestId("input-login-email").fill(email);
  await page.getByTestId("input-login-password").fill(VALID_PASSWORD);
  await page.getByTestId("btn-login-submit").filter({ visible: true }).click();
  await expect(page).toHaveURL("/");
}

test.describe("Messagerie — accès et liste", () => {
  test("redirige vers / si non authentifié", async ({ page }) => {
    await page.goto("/messages");
    await expect(page).toHaveURL("/");
  });

  test("affiche la liste vide quand aucune conversation", async ({
    page,
  }, testInfo) => {
    const user = await createTestUser(testInfo.parallelIndex);
    const isMobile = testInfo.project.name.includes("Mobile");
    await loginAs(page, user.email, isMobile);

    await page.goto("/messages");
    await expect(page.getByTestId("messages-screen")).toBeVisible();
    await expect(page.getByTestId("empty-conversations")).toBeVisible();
  });

  test("affiche les conversations existantes avec dernier message et badge non-lu", async ({
    page,
  }, testInfo) => {
    const isMobile = testInfo.project.name.includes("Mobile");
    const volunteer = await createTestUser(testInfo.parallelIndex);
    const member = await createTestUser(testInfo.parallelIndex, 'member');
    const association = await createTestAssociation(member.id, testInfo.parallelIndex);

    // Conv volontaire → membre, avec un message du membre non lu côté volontaire
    const conv = await getPrisma(test.info().parallelIndex).conversation.create({
      data: {
        ...canonicalPair(volunteer.id, member.id),
        lastMessageAt: new Date(),
      },
    });
    await getPrisma(test.info().parallelIndex).message.create({
      data: {
        conversationId: conv.id,
        senderId: member.id,
        content: "Salut depuis le test !",
      },
    });

    await loginAs(page, volunteer.email, isMobile);
    await page.goto("/messages");

    await expect(page.getByTestId(`conv-${conv.id}`)).toBeVisible();
    await expect(page.getByTestId(`conv-${conv.id}`)).toContainText(
      "Salut depuis le test !",
    );
    await expect(
      page.getByTestId(`conv-${conv.id}`).getByTestId("unread-badge"),
    ).toBeVisible();
  });
});

test.describe("Messagerie — discussion", () => {
  test("ouvre une conversation et marque comme lu", async ({
    page,
  }, testInfo) => {
    const isMobile = testInfo.project.name.includes("Mobile");
    const volunteer = await createTestUser(testInfo.parallelIndex);
    const member = await createTestUser(testInfo.parallelIndex, 'member');
    const association = await createTestAssociation(member.id, testInfo.parallelIndex);

    const conv = await getPrisma(test.info().parallelIndex).conversation.create({
      data: {
        ...canonicalPair(volunteer.id, member.id),
        lastMessageAt: new Date(),
      },
    });
    await getPrisma(test.info().parallelIndex).message.create({
      data: {
        conversationId: conv.id,
        senderId: member.id,
        content: "Hello",
      },
    });

    await loginAs(page, volunteer.email, isMobile);
    await page.goto(`/messages/${conv.id}`);

    await expect(page.getByTestId("conversation-screen")).toBeVisible();
    await expect(page.getByTestId("messages-list")).toBeVisible();
    // Le message doit s'afficher dans la liste des messages (scope nécessaire :
    // en mode split-pane web, "Hello" apparaît aussi comme preview du dernier
    // message dans la liste des conversations à gauche).
    await expect(
      page.getByTestId("messages-list").getByText("Hello"),
    ).toBeVisible();
    // Le composer doit être présent
    await expect(page.getByTestId("composer-input")).toBeVisible();

    // Côté serveur : après quelques instants, le message doit être marqué comme lu
    await expect
      .poll(
        async () => {
          const msg = await getPrisma(test.info().parallelIndex).message.findFirst({
            where: { conversationId: conv.id },
          });
          return msg?.readAt;
        },
        { timeout: 10000 },
      )
      .not.toBeNull();
  });

  test("envoie un message via le composer (temps réel)", async ({
    page,
  }, testInfo) => {
    const isMobile = testInfo.project.name.includes("Mobile");
    const volunteer = await createTestUser(testInfo.parallelIndex);
    const member = await createTestUser(testInfo.parallelIndex, 'member');
    const association = await createTestAssociation(member.id, testInfo.parallelIndex);

    const conv = await getPrisma(test.info().parallelIndex).conversation.create({
      data: {
        ...canonicalPair(volunteer.id, member.id),
        lastMessageAt: new Date(),
      },
    });

    await loginAs(page, volunteer.email, isMobile);
    await page.goto(`/messages/${conv.id}`);
    await expect(page.getByTestId("conversation-screen")).toBeVisible();

    const composerInput = page.getByTestId("composer-input");
    await composerInput.fill("Mon premier message E2E");
    await page.getByTestId("composer-send").click();

    // Bulle visible — on cible spécifiquement la bulle du message (testID
    // commence par "msg-") pour ignorer la preview dans la liste des
    // conversations ("conv-*") et le textarea du composer ("composer-input")
    // qui peut ne pas être vidé immédiatement après l'envoi (race condition).
    await expect(
      page
        .locator('[data-testid^="msg-"]')
        .filter({ hasText: "Mon premier message E2E" }),
    ).toBeVisible();

    // Persisté en BDD
    await expect
      .poll(
        async () => {
          const m = await getPrisma(test.info().parallelIndex).message.findFirst({
            where: { conversationId: conv.id, senderId: volunteer.id },
          });
          return m?.content;
        },
        { timeout: 5000 },
      )
      .toBe("Mon premier message E2E");
  });

  test("refuse l'envoi d'un message vide", async ({ page }, testInfo) => {
    const isMobile = testInfo.project.name.includes("Mobile");
    const volunteer = await createTestUser(testInfo.parallelIndex);
    const member = await createTestUser(testInfo.parallelIndex, 'member');
    const association = await createTestAssociation(member.id, testInfo.parallelIndex);

    const conv = await getPrisma(test.info().parallelIndex).conversation.create({
      data: {
        ...canonicalPair(volunteer.id, member.id),
      },
    });

    await loginAs(page, volunteer.email, isMobile);
    await page.goto(`/messages/${conv.id}`);

    // Le bouton est disabled tant que l'input est vide
    const sendButton = page.getByTestId("composer-send");
    await expect(sendButton).toBeDisabled();
  });

  test("refuse un message avec des balises HTML", async ({
    page,
  }, testInfo) => {
    const isMobile = testInfo.project.name.includes("Mobile");
    const volunteer = await createTestUser(testInfo.parallelIndex);
    const member = await createTestUser(testInfo.parallelIndex, 'member');
    const association = await createTestAssociation(member.id, testInfo.parallelIndex);

    const conv = await getPrisma(test.info().parallelIndex).conversation.create({
      data: {
        ...canonicalPair(volunteer.id, member.id),
      },
    });

    await loginAs(page, volunteer.email, isMobile);
    await page.goto(`/messages/${conv.id}`);

    const composerInput = page.getByTestId("composer-input");
    await composerInput.fill("<script>alert(1)</script>");
    await page.getByTestId("composer-send").click();

    // Erreur affichée
    await expect(page.getByTestId("composer-error")).toBeVisible();
  });
});

test.describe("Bouton contact association", () => {
  test("apparaît sur la page publique d'une association", async ({
    page,
  }, testInfo) => {
    const isMobile = testInfo.project.name.includes("Mobile");
    const volunteer = await createTestUser(testInfo.parallelIndex);
    const owner = await createTestUser(testInfo.parallelIndex, 'owner');
    const association = await createTestAssociation(owner.id, testInfo.parallelIndex);

    await loginAs(page, volunteer.email, isMobile);
    await page.goto(`/associations/${association.id}`);

    const btn = page.getByTestId("contact-association-button");
    await expect(btn).toBeVisible();
    await expect(btn).toContainText(/contacter/i);
  });

  test("crée une conversation et redirige", async ({ page }, testInfo) => {
    const isMobile = testInfo.project.name.includes("Mobile");
    const volunteer = await createTestUser(testInfo.parallelIndex);
    const owner = await createTestUser(testInfo.parallelIndex, 'owner');
    const association = await createTestAssociation(owner.id, testInfo.parallelIndex);

    await loginAs(page, volunteer.email, isMobile);
    await page.goto(`/associations/${association.id}`);
    await page.getByTestId("contact-association-button").click();

    // Le bouton ouvre désormais une modale ContactMemberPickerModal
    // (refactor 1-to-1 conversations). On sélectionne explicitement le owner.
    await expect(
      page.getByTestId("contact-member-picker-modal"),
    ).toBeVisible();
    await page.getByTestId(`contact-member-${owner.id}`).click();

    // Redirigé vers /messages/:id
    await page.waitForURL(/\/messages\/\d+/, { timeout: 8000 });
    await expect(page.getByTestId("conversation-screen")).toBeVisible();

    // Une conversation a bien été créée côté BDD
    const conv = await getPrisma(test.info().parallelIndex).conversation.findFirst({
      where: {
        ...canonicalPair(volunteer.id, owner.id),
      },
    });
    expect(conv).not.toBeNull();
  });
});
