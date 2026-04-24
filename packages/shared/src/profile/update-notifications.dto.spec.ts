import { UpdateNotificationsSchema } from "./update-notifications.dto";

describe("UpdateNotificationsSchema", () => {
  // =========================================================================
  // ✅ Cas valides — emailNotifications
  // =========================================================================

  it("✅ Doit valider avec emailNotifications=true", () => {
    const result = UpdateNotificationsSchema.safeParse({
      emailNotifications: true,
    });
    expect(result.success).toBe(true);
  });

  it("✅ Doit valider avec emailNotifications=false", () => {
    const result = UpdateNotificationsSchema.safeParse({
      emailNotifications: false,
    });
    expect(result.success).toBe(true);
  });

  it("✅ Doit conserver la valeur booléenne sans transformation", () => {
    const result = UpdateNotificationsSchema.safeParse({
      emailNotifications: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.emailNotifications).toBe(true);
    }
  });

  // =========================================================================
  // ✅ Cas valides — matchNotifications
  // =========================================================================

  it("✅ Doit valider avec matchNotifications=true", () => {
    const result = UpdateNotificationsSchema.safeParse({
      matchNotifications: true,
    });
    expect(result.success).toBe(true);
  });

  it("✅ Doit valider avec matchNotifications=false", () => {
    const result = UpdateNotificationsSchema.safeParse({
      matchNotifications: false,
    });
    expect(result.success).toBe(true);
  });

  it("✅ Doit valider avec les deux champs", () => {
    const result = UpdateNotificationsSchema.safeParse({
      emailNotifications: true,
      matchNotifications: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.emailNotifications).toBe(true);
      expect(result.data.matchNotifications).toBe(false);
    }
  });

  // =========================================================================
  // ❌ Champs manquants
  // =========================================================================

  it("❌ Doit rejeter si aucun champ n'est fourni", () => {
    const result = UpdateNotificationsSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  // =========================================================================
  // ❌ Types incorrects — emailNotifications
  // =========================================================================

  it('❌ Doit rejeter si emailNotifications est une string "true"', () => {
    const result = UpdateNotificationsSchema.safeParse({
      emailNotifications: "true",
    });
    expect(result.success).toBe(false);
  });

  it("❌ Doit rejeter si emailNotifications est le nombre 1", () => {
    const result = UpdateNotificationsSchema.safeParse({
      emailNotifications: 1,
    });
    expect(result.success).toBe(false);
  });

  it("❌ Doit rejeter si emailNotifications est null", () => {
    const result = UpdateNotificationsSchema.safeParse({
      emailNotifications: null,
    });
    expect(result.success).toBe(false);
  });

  // =========================================================================
  // ❌ Types incorrects — matchNotifications
  // =========================================================================

  it('❌ Doit rejeter si matchNotifications est une string "true"', () => {
    const result = UpdateNotificationsSchema.safeParse({
      matchNotifications: "true",
    });
    expect(result.success).toBe(false);
  });

  it("❌ Doit rejeter si matchNotifications est le nombre 1", () => {
    const result = UpdateNotificationsSchema.safeParse({
      matchNotifications: 1,
    });
    expect(result.success).toBe(false);
  });

  it("❌ Doit rejeter si matchNotifications est null", () => {
    const result = UpdateNotificationsSchema.safeParse({
      matchNotifications: null,
    });
    expect(result.success).toBe(false);
  });
});
