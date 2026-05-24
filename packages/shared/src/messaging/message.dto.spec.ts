import { SendMessageSchema, MESSAGE_MAX_LENGTH } from "./message.dto";

describe("SendMessageSchema", () => {
  const validPayload = {
    conversationId: 1,
    content: "Bonjour, je suis intéressé par votre mission.",
  };

  it("accepte un payload valide", () => {
    const result = SendMessageSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.conversationId).toBe(1);
      expect(result.data.content).toBe(validPayload.content);
    }
  });

  it("trim le contenu", () => {
    const result = SendMessageSchema.safeParse({
      ...validPayload,
      content: "   hello   ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe("hello");
    }
  });

  it("refuse un contenu vide", () => {
    const result = SendMessageSchema.safeParse({ ...validPayload, content: "" });
    expect(result.success).toBe(false);
  });

  it("refuse un contenu composé uniquement d'espaces", () => {
    const result = SendMessageSchema.safeParse({
      ...validPayload,
      content: "      ",
    });
    expect(result.success).toBe(false);
  });

  it(`refuse un contenu de plus de ${MESSAGE_MAX_LENGTH} caractères`, () => {
    const result = SendMessageSchema.safeParse({
      ...validPayload,
      content: "a".repeat(MESSAGE_MAX_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it("accepte un contenu de longueur maximale", () => {
    const result = SendMessageSchema.safeParse({
      ...validPayload,
      content: "a".repeat(MESSAGE_MAX_LENGTH),
    });
    expect(result.success).toBe(true);
  });

  it("refuse un contenu avec balises HTML", () => {
    const result = SendMessageSchema.safeParse({
      ...validPayload,
      content: "<script>alert('xss')</script>",
    });
    expect(result.success).toBe(false);
  });

  it("refuse un caractère <", () => {
    const result = SendMessageSchema.safeParse({
      ...validPayload,
      content: "hello <there",
    });
    expect(result.success).toBe(false);
  });

  it("refuse un caractère >", () => {
    const result = SendMessageSchema.safeParse({
      ...validPayload,
      content: "hello > there",
    });
    expect(result.success).toBe(false);
  });

  it("refuse conversationId non-entier", () => {
    const result = SendMessageSchema.safeParse({
      ...validPayload,
      conversationId: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("refuse conversationId nul ou négatif", () => {
    expect(
      SendMessageSchema.safeParse({ ...validPayload, conversationId: 0 })
        .success,
    ).toBe(false);
    expect(
      SendMessageSchema.safeParse({ ...validPayload, conversationId: -1 })
        .success,
    ).toBe(false);
  });

  it("refuse conversationId manquant", () => {
    const result = SendMessageSchema.safeParse({ content: "salut" });
    expect(result.success).toBe(false);
  });

  it("refuse content non-string", () => {
    const result = SendMessageSchema.safeParse({
      conversationId: 1,
      content: 42,
    });
    expect(result.success).toBe(false);
  });
});
