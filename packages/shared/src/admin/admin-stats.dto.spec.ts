import {
  BreakdownQuerySchema,
  StatsRangeSchema,
  TimeseriesQuerySchema,
  TopQuerySchema,
} from "./admin-stats.dto";

describe("Admin stats DTOs", () => {
  describe("StatsRangeSchema", () => {
    it("Doit accepter un objet vide", () => {
      const res = StatsRangeSchema.safeParse({});
      expect(res.success).toBe(true);
    });

    it("Doit accepter from et to", () => {
      const res = StatsRangeSchema.safeParse({
        from: "2026-01-01",
        to: "2026-12-31",
      });
      expect(res.success).toBe(true);
    });
  });

  describe("TimeseriesQuerySchema", () => {
    it("Doit appliquer la granularité par défaut (day)", () => {
      const res = TimeseriesQuerySchema.safeParse({ metric: "user_signups" });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.granularity).toBe("day");
      }
    });

    it.each([
      "user_signups",
      "association_signups",
      "missions_created",
      "participations",
    ])("Doit accepter la métrique %s", (metric) => {
      const res = TimeseriesQuerySchema.safeParse({ metric });
      expect(res.success).toBe(true);
    });

    it("Doit accepter une granularité valide", () => {
      const res = TimeseriesQuerySchema.safeParse({
        metric: "user_signups",
        granularity: "month",
      });
      expect(res.success).toBe(true);
    });

    it("Doit rejeter une métrique inconnue", () => {
      const res = TimeseriesQuerySchema.safeParse({ metric: "unknown" });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter une granularité inconnue", () => {
      const res = TimeseriesQuerySchema.safeParse({
        metric: "user_signups",
        granularity: "year",
      });
      expect(res.success).toBe(false);
    });
  });

  describe("BreakdownQuerySchema", () => {
    it("Doit appliquer le limit par défaut (10)", () => {
      const res = BreakdownQuerySchema.safeParse({ dimension: "mission_type" });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.limit).toBe(10);
      }
    });

    it("Doit coercer le limit fourni en string", () => {
      const res = BreakdownQuerySchema.safeParse({
        dimension: "top_causes",
        limit: "25",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.limit).toBe(25);
      }
    });

    it("Doit rejeter une dimension inconnue", () => {
      const res = BreakdownQuerySchema.safeParse({ dimension: "other" });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un limit > 100", () => {
      const res = BreakdownQuerySchema.safeParse({
        dimension: "top_skills",
        limit: 200,
      });
      expect(res.success).toBe(false);
    });
  });

  describe("TopQuerySchema", () => {
    it("Doit appliquer le limit par défaut", () => {
      const res = TopQuerySchema.safeParse({ entity: "recent_users" });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.limit).toBe(10);
      }
    });

    it.each([
      "associations_by_volunteers",
      "missions_by_participants",
      "recent_users",
      "recent_associations",
    ])("Doit accepter l'entité %s", (entity) => {
      const res = TopQuerySchema.safeParse({ entity });
      expect(res.success).toBe(true);
    });

    it("Doit rejeter une entité inconnue", () => {
      const res = TopQuerySchema.safeParse({ entity: "wrong" });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un limit nul ou négatif", () => {
      expect(
        TopQuerySchema.safeParse({ entity: "recent_users", limit: 0 }).success,
      ).toBe(false);
      expect(
        TopQuerySchema.safeParse({ entity: "recent_users", limit: -1 }).success,
      ).toBe(false);
    });
  });
});
