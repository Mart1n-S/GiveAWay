import { test, expect, Page } from "@playwright/test";
import {
  cleanDatabase,
  createTestUser,
  createTestAssociation,
  prisma,
} from "../../../api/test/prisma-test-helper";

const VALID_PASSWORD = "Password123!";

test.beforeEach(async () => {
  await cleanDatabase();
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
    const user = await createTestUser(testInfo.workerIndex);
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
    const volunteer = await createTestUser(testInfo.workerIndex);
    const member = await createTestUser(testInfo.workerIndex + 100);
    const association = await createTestAssociation(member.id);

    // Conv volontaire → membre, avec un message du membre non lu côté volontaire
    const conv = await prisma.conversation.create({
      data: {
        volunteerId: volunteer.id,
        associationMemberId: member.id,
        associationId: association.id,
        lastMessageAt: new Date(),
      },
    });
    await prisma.message.create({
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
    const volunteer = await createTestUser(testInfo.workerIndex);
    const member = await createTestUser(testInfo.workerIndex + 100);
    const association = await createTestAssociation(member.id);

    const conv = await prisma.conversation.create({
      data: {
        volunteerId: volunteer.id,
        associationMemberId: member.id,
        associationId: association.id,
        lastMessageAt: new Date(),
      },
    });
    await prisma.message.create({
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
    // Le message doit s'afficher
    await expect(page.getByText("Hello")).toBeVisible();
    // Le composer doit être présent
    await expect(page.getByTestId("composer-input")).toBeVisible();

    // Côté serveur : après quelques instants, le message doit être marqué comme lu
    await expect
      .poll(
        async () => {
          const msg = await prisma.message.findFirst({
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
    const volunteer = await createTestUser(testInfo.workerIndex);
    const member = await createTestUser(testInfo.workerIndex + 100);
    const association = await createTestAssociation(member.id);

    const conv = await prisma.conversation.create({
      data: {
        volunteerId: volunteer.id,
        associationMemberId: member.id,
        associationId: association.id,
        lastMessageAt: new Date(),
      },
    });

    await loginAs(page, volunteer.email, isMobile);
    await page.goto(`/messages/${conv.id}`);
    await expect(page.getByTestId("conversation-screen")).toBeVisible();

    const composerInput = page.getByTestId("composer-input");
    await composerInput.fill("Mon premier message E2E");
    await page.getByTestId("composer-send").click();

    // Bulle visible
    await expect(page.getByText("Mon premier message E2E")).toBeVisible();

    // Persisté en BDD
    await expect
      .poll(
        async () => {
          const m = await prisma.message.findFirst({
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
    const volunteer = await createTestUser(testInfo.workerIndex);
    const member = await createTestUser(testInfo.workerIndex + 100);
    const association = await createTestAssociation(member.id);

    const conv = await prisma.conversation.create({
      data: {
        volunteerId: volunteer.id,
        associationMemberId: member.id,
        associationId: association.id,
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
    const volunteer = await createTestUser(testInfo.workerIndex);
    const member = await createTestUser(testInfo.workerIndex + 100);
    const association = await createTestAssociation(member.id);

    const conv = await prisma.conversation.create({
      data: {
        volunteerId: volunteer.id,
        associationMemberId: member.id,
        associationId: association.id,
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
    const volunteer = await createTestUser(testInfo.workerIndex);
    const owner = await createTestUser(testInfo.workerIndex + 100);
    const association = await createTestAssociation(owner.id);

    await loginAs(page, volunteer.email, isMobile);
    await page.goto(`/associations/${association.id}`);

    const btn = page.getByTestId("contact-association-button");
    await expect(btn).toBeVisible();
    await expect(btn).toContainText(/contacter/i);
  });

  test("crée une conversation et redirige", async ({ page }, testInfo) => {
    const isMobile = testInfo.project.name.includes("Mobile");
    const volunteer = await createTestUser(testInfo.workerIndex);
    const owner = await createTestUser(testInfo.workerIndex + 100);
    const association = await createTestAssociation(owner.id);

    await loginAs(page, volunteer.email, isMobile);
    await page.goto(`/associations/${association.id}`);
    await page.getByTestId("contact-association-button").click();

    // Redirigé vers /messages/:id
    await page.waitForURL(/\/messages\/\d+/, { timeout: 8000 });
    await expect(page.getByTestId("conversation-screen")).toBeVisible();

    // Une conversation a bien été créée côté BDD
    const conv = await prisma.conversation.findFirst({
      where: {
        volunteerId: volunteer.id,
        associationMemberId: owner.id,
        associationId: association.id,
      },
    });
    expect(conv).not.toBeNull();
  });
});
