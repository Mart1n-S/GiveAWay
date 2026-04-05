import { UpdateNotificationsSchema } from "./update-notifications.dto";

describe("UpdateNotificationsSchema", () => {
  // =========================================================================
  // ✅ Cas valides
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
  // ❌ Champs manquants
  // =========================================================================

  it("❌ Doit rejeter si emailNotifications est absent", () => {
    const result = UpdateNotificationsSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((i) => i.path[0]);
      expect(fields).toContain("emailNotifications");
    }
  });

  // =========================================================================
  // ❌ Types incorrects
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
});
