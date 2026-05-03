import { AdminChangePasswordSchema, AdminLoginSchema } from "./admin-login.dto";

describe("Admin login DTOs", () => {
  describe("AdminLoginSchema", () => {
    it("Doit valider un login correct", () => {
      const res = AdminLoginSchema.safeParse({
        email: "admin@gmail.com",
        password: "secret",
      });
      expect(res.success).toBe(true);
    });

    it("Doit normaliser l'email (trim + toLowerCase)", () => {
      const res = AdminLoginSchema.safeParse({
        email: "  Admin@GMAIL.com  ",
        password: "secret",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.email).toBe("admin@gmail.com");
      }
    });

    it("Doit rejeter un email vide", () => {
      const res = AdminLoginSchema.safeParse({ email: "", password: "secret" });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un email mal formé", () => {
      const res = AdminLoginSchema.safeParse({
        email: "pas-un-email",
        password: "secret",
      });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un mot de passe vide", () => {
      const res = AdminLoginSchema.safeParse({
        email: "admin@gmail.com",
        password: "",
      });
      expect(res.success).toBe(false);
    });
  });

  describe("AdminChangePasswordSchema", () => {
    const validNew = "Abcdef123!@#z";

    it("Doit valider un changement de mot de passe correct", () => {
      const res = AdminChangePasswordSchema.safeParse({
        currentPassword: "oldPwd",
        newPassword: validNew,
      });
      expect(res.success).toBe(true);
    });

    it("Doit rejeter un currentPassword vide", () => {
      const res = AdminChangePasswordSchema.safeParse({
        currentPassword: "",
        newPassword: validNew,
      });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un newPassword trop court", () => {
      const res = AdminChangePasswordSchema.safeParse({
        currentPassword: "x",
        newPassword: "Abc1!",
      });
      expect(res.success).toBe(false);
    });

    it.each([
      ["sans majuscule", "abcdefghijk1!"],
      ["sans minuscule", "ABCDEFGHIJK1!"],
      ["sans chiffre", "Abcdefghijkl!"],
      ["sans caractère spécial", "Abcdefghijk12"],
    ])("Doit rejeter un newPassword %s", (_label, pwd) => {
      const res = AdminChangePasswordSchema.safeParse({
        currentPassword: "x",
        newPassword: pwd,
      });
      expect(res.success).toBe(false);
    });
  });
});
