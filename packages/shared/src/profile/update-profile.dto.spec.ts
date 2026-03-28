import { UpdateProfileSchema } from "./update-profile.dto";
import {
  AvailabilityFrequency,
  AvailabilityTime,
  AvailabilityType,
} from "./availability.enums";

const validAddress = {
  street: "12 rue de la Paix",
  postalCode: "75001",
  city: "Paris",
};

const validBase = {
  firstName: "Jean",
  lastName: "Dupont",
  age: 25,
  address: validAddress,
};

describe("Update Profile DTOs", () => {
  describe("UpdateProfileSchema", () => {
    // =========================================================================
    // ✅ Cas Valides — Général
    // =========================================================================
    it("Doit valider un profil minimal correct", () => {
      const res = UpdateProfileSchema.safeParse(validBase);
      expect(res.success).toBe(true);
    });

    it("Doit transformer le prénom en format capitalisé", () => {
      const res = UpdateProfileSchema.safeParse({
        ...validBase,
        firstName: "jean-pierre",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.firstName).toMatch(/^[A-Z]/);
      }
    });

    it("Doit transformer le nom en majuscules", () => {
      const res = UpdateProfileSchema.safeParse({
        ...validBase,
        lastName: "dupont",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.lastName).toBe("DUPONT");
      }
    });

    it("Doit accepter un âge passé en string et le convertir en number", () => {
      const res = UpdateProfileSchema.safeParse({ ...validBase, age: "30" });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(typeof res.data.age).toBe("number");
        expect(res.data.age).toBe(30);
      }
    });

    it("Doit accepter une biographie nulle ou absente", () => {
      const res1 = UpdateProfileSchema.safeParse({
        ...validBase,
        biography: null,
      });
      const res2 = UpdateProfileSchema.safeParse({ ...validBase });
      expect(res1.success).toBe(true);
      expect(res2.success).toBe(true);
    });

    it("Doit accepter skillIds et causeIds sous forme de JSON string (multipart)", () => {
      const res = UpdateProfileSchema.safeParse({
        ...validBase,
        skillIds: "[1, 2, 3]",
        causeIds: "[4, 5]",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.skillIds).toEqual([1, 2, 3]);
        expect(res.data.causeIds).toEqual([4, 5]);
      }
    });

    it("Doit accepter address sous forme de JSON string (multipart)", () => {
      const res = UpdateProfileSchema.safeParse({
        ...validBase,
        address: JSON.stringify(validAddress),
      });
      expect(res.success).toBe(true);
    });

    it("Doit convertir removeProfilePicture='true' en boolean true", () => {
      const res = UpdateProfileSchema.safeParse({
        ...validBase,
        removeProfilePicture: "true",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.removeProfilePicture).toBe(true);
      }
    });

    it("Doit convertir removeProfilePicture=true (boolean natif)", () => {
      const res = UpdateProfileSchema.safeParse({
        ...validBase,
        removeProfilePicture: true,
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.removeProfilePicture).toBe(true);
      }
    });

    // =========================================================================
    // ❌ Cas Invalides — firstName
    // =========================================================================
    it("Doit rejeter un prénom vide", () => {
      const res = UpdateProfileSchema.safeParse({
        ...validBase,
        firstName: "",
      });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un prénom trop court (< 2 caractères)", () => {
      const res = UpdateProfileSchema.safeParse({
        ...validBase,
        firstName: "J",
      });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un prénom trop long (> 50 caractères)", () => {
      const res = UpdateProfileSchema.safeParse({
        ...validBase,
        firstName: "J".repeat(51),
      });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un prénom avec des chiffres", () => {
      const res = UpdateProfileSchema.safeParse({
        ...validBase,
        firstName: "Jean123",
      });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un prénom avec des caractères spéciaux interdits", () => {
      const res = UpdateProfileSchema.safeParse({
        ...validBase,
        firstName: "Jean@",
      });
      expect(res.success).toBe(false);
    });

    // =========================================================================
    // ❌ Cas Invalides — lastName
    // =========================================================================
    it("Doit rejeter un nom vide", () => {
      const res = UpdateProfileSchema.safeParse({ ...validBase, lastName: "" });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un nom trop court (< 2 caractères)", () => {
      const res = UpdateProfileSchema.safeParse({
        ...validBase,
        lastName: "D",
      });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un nom trop long (> 50 caractères)", () => {
      const res = UpdateProfileSchema.safeParse({
        ...validBase,
        lastName: "D".repeat(51),
      });
      expect(res.success).toBe(false);
    });

    // =========================================================================
    // ❌ Cas Invalides — age
    // =========================================================================
    it("Doit rejeter un âge inférieur à 18", () => {
      const res = UpdateProfileSchema.safeParse({ ...validBase, age: 17 });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un âge supérieur à 100", () => {
      const res = UpdateProfileSchema.safeParse({ ...validBase, age: 101 });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un âge non numérique", () => {
      const res = UpdateProfileSchema.safeParse({ ...validBase, age: "abc" });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un âge décimal", () => {
      const res = UpdateProfileSchema.safeParse({ ...validBase, age: 25.5 });
      expect(res.success).toBe(false);
    });

    // =========================================================================
    // ❌ Cas Invalides — biography
    // =========================================================================
    it("Doit rejeter une biographie trop longue (> 1000 caractères)", () => {
      const res = UpdateProfileSchema.safeParse({
        ...validBase,
        biography: "a".repeat(1001),
      });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter une biographie contenant des balises HTML", () => {
      const res = UpdateProfileSchema.safeParse({
        ...validBase,
        biography: "<script>alert('xss')</script>",
      });
      expect(res.success).toBe(false);
    });

    // =========================================================================
    // ✅ / ❌ Cas — address
    // =========================================================================
    it("Doit accepter une adresse avec latitude et longitude valides", () => {
      const res = UpdateProfileSchema.safeParse({
        ...validBase,
        address: { ...validAddress, latitude: 48.8566, longitude: 2.3522 },
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.address.latitude).toBe(48.8566);
        expect(res.data.address.longitude).toBe(2.3522);
      }
    });

    it("Doit forcer latitude et longitude à undefined si un seul est fourni", () => {
      const res = UpdateProfileSchema.safeParse({
        ...validBase,
        address: { ...validAddress, latitude: 48.8566 },
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.address.latitude).toBeUndefined();
        expect(res.data.address.longitude).toBeUndefined();
      }
    });

    it("Doit rejeter un code postal invalide (lettres)", () => {
      const res = UpdateProfileSchema.safeParse({
        ...validBase,
        address: { ...validAddress, postalCode: "ABCDE" },
      });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un code postal trop court", () => {
      const res = UpdateProfileSchema.safeParse({
        ...validBase,
        address: { ...validAddress, postalCode: "7500" },
      });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter une adresse avec des balises HTML", () => {
      const res = UpdateProfileSchema.safeParse({
        ...validBase,
        address: { ...validAddress, street: "<script>bad</script>" },
      });
      expect(res.success).toBe(false);
    });

    // =========================================================================
    // ✅ / ❌ Cas — availability
    // =========================================================================
    it("Doit accepter une availability complète et valide", () => {
      const res = UpdateProfileSchema.safeParse({
        ...validBase,
        availability: {
          frequency: [
            AvailabilityFrequency.HOURS_WEEK,
            AvailabilityFrequency.DAYS_MONTH,
          ],
          timeSlots: [AvailabilityTime.WEEKDAY, AvailabilityTime.EVENING],
          type: AvailabilityType.HYBRID,
        },
      });
      expect(res.success).toBe(true);
    });

    it("Doit accepter une availability partielle (uniquement type)", () => {
      const res = UpdateProfileSchema.safeParse({
        ...validBase,
        availability: { type: AvailabilityType.REMOTE },
      });
      expect(res.success).toBe(true);
    });

    it("Doit accepter une availability sous forme de JSON string (multipart)", () => {
      const res = UpdateProfileSchema.safeParse({
        ...validBase,
        availability: JSON.stringify({
          frequency: [AvailabilityFrequency.PUNCTUAL],
          type: AvailabilityType.ON_SITE,
        }),
      });
      expect(res.success).toBe(true);
    });

    it("Doit rejeter une frequency avec une valeur invalide", () => {
      const res = UpdateProfileSchema.safeParse({
        ...validBase,
        availability: { frequency: ["INVALID_FREQUENCY"] },
      });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un timeSlot invalide", () => {
      const res = UpdateProfileSchema.safeParse({
        ...validBase,
        availability: { timeSlots: ["MORNING"] },
      });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter un type de disponibilité invalide", () => {
      const res = UpdateProfileSchema.safeParse({
        ...validBase,
        availability: { type: "FLYING" },
      });
      expect(res.success).toBe(false);
    });

    // =========================================================================
    // ❌ Cas Invalides — skillIds / causeIds
    // =========================================================================
    it("Doit rejeter des skillIds contenant des valeurs négatives", () => {
      const res = UpdateProfileSchema.safeParse({
        ...validBase,
        skillIds: [-1, 2],
      });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter des skillIds contenant des valeurs non entières", () => {
      const res = UpdateProfileSchema.safeParse({
        ...validBase,
        skillIds: [1.5, 2],
      });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter des causeIds contenant des valeurs négatives", () => {
      const res = UpdateProfileSchema.safeParse({
        ...validBase,
        causeIds: [0],
      });
      expect(res.success).toBe(false);
    });

    it("Doit rejeter des causeIds contenant des strings", () => {
      const res = UpdateProfileSchema.safeParse({
        ...validBase,
        causeIds: ["cause"],
      });
      expect(res.success).toBe(false);
    });
  });
});
