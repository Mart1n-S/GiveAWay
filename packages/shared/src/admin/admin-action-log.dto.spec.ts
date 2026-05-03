import { AdminLogQuerySchema } from "./admin-action-log.dto";

describe("AdminLogQuerySchema", () => {
  it("Doit appliquer les valeurs par défaut", () => {
    const res = AdminLogQuerySchema.safeParse({});
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.page).toBe(1);
      expect(res.data.limit).toBe(50);
    }
  });

  it("Doit coercer page, limit, adminId, entityId", () => {
    const res = AdminLogQuerySchema.safeParse({
      page: "2",
      limit: "100",
      adminId: "5",
      entityId: "42",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.page).toBe(2);
      expect(res.data.limit).toBe(100);
      expect(res.data.adminId).toBe(5);
      expect(res.data.entityId).toBe(42);
    }
  });

  it("Doit accepter des filtres optionnels", () => {
    const res = AdminLogQuerySchema.safeParse({
      action: "VALIDATE_ASSOCIATION",
      entityType: "ASSOCIATION",
      from: "2026-01-01",
      to: "2026-12-31",
    });
    expect(res.success).toBe(true);
  });

  it("Doit rejeter un limit > 200", () => {
    const res = AdminLogQuerySchema.safeParse({ limit: 201 });
    expect(res.success).toBe(false);
  });

  it("Doit rejeter un page < 1", () => {
    const res = AdminLogQuerySchema.safeParse({ page: 0 });
    expect(res.success).toBe(false);
  });

  it("Doit rejeter un adminId non positif", () => {
    const res = AdminLogQuerySchema.safeParse({ adminId: -1 });
    expect(res.success).toBe(false);
  });
});
