import { CreateConversationSchema } from "./create-conversation.dto";
import { MESSAGE_MAX_LENGTH } from "./message.dto";

describe("CreateConversationSchema", () => {
  const validPayload = {
    associationId: 10,
    recipientId: 20,
  };

  it("accepte un payload minimal", () => {
    const result = CreateConversationSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("accepte un payload avec message initial", () => {
    const result = CreateConversationSchema.safeParse({
      ...validPayload,
      initialMessage: "Bonjour !",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.initialMessage).toBe("Bonjour !");
    }
  });

  it("refuse associationId manquant", () => {
    const result = CreateConversationSchema.safeParse({ recipientId: 20 });
    expect(result.success).toBe(false);
  });

  it("refuse recipientId manquant", () => {
    const result = CreateConversationSchema.safeParse({ associationId: 10 });
    expect(result.success).toBe(false);
  });

  it("refuse associationId négatif", () => {
    const result = CreateConversationSchema.safeParse({
      ...validPayload,
      associationId: -5,
    });
    expect(result.success).toBe(false);
  });

  it("refuse recipientId non entier", () => {
    const result = CreateConversationSchema.safeParse({
      ...validPayload,
      recipientId: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("refuse un initialMessage trop long", () => {
    const result = CreateConversationSchema.safeParse({
      ...validPayload,
      initialMessage: "a".repeat(MESSAGE_MAX_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it("refuse un initialMessage avec balises HTML", () => {
    const result = CreateConversationSchema.safeParse({
      ...validPayload,
      initialMessage: "<b>hi</b>",
    });
    expect(result.success).toBe(false);
  });

  it("refuse un initialMessage vide après trim", () => {
    const result = CreateConversationSchema.safeParse({
      ...validPayload,
      initialMessage: "    ",
    });
    expect(result.success).toBe(false);
  });
});
