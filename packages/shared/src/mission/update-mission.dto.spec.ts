import { UpdateMissionSchema } from './update-mission.dto';

// ----------------------------------------------------------------
// Payload de référence (optionnel — tous les champs sont partiels)
// ----------------------------------------------------------------

const VALID_FULL_UPDATE = {
  title: 'Titre modifié de la mission',
  description: 'Description modifiée suffisamment longue pour passer la validation minimale.',
  type: 'MISSION' as const,
  availabilityType: 'REMOTE' as const,
};

// ----------------------------------------------------------------
// Suite
// ----------------------------------------------------------------

describe('UpdateMissionSchema', () => {
  // ===========================================================================
  // Partialité — tous les champs sont optionnels
  // ===========================================================================
  describe('✅ Partialité (tous les champs optionnels)', () => {
    it('accepte un objet vide', () => {
      const result = UpdateMissionSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('accepte uniquement le titre', () => {
      const result = UpdateMissionSchema.safeParse({ title: 'Titre valide unique' });
      expect(result.success).toBe(true);
    });

    it('accepte uniquement la description', () => {
      const result = UpdateMissionSchema.safeParse({
        description: 'Description mise à jour suffisamment longue pour passer la validation.',
      });
      expect(result.success).toBe(true);
    });

    it("n'exige pas availabilityType même pour type MISSION (mode partial)", () => {
      const result = UpdateMissionSchema.safeParse({ type: 'MISSION' });
      expect(result.success).toBe(true);
    });

    it("n'exige pas availabilityType même pour type EVENT (mode partial)", () => {
      const result = UpdateMissionSchema.safeParse({ type: 'EVENT' });
      expect(result.success).toBe(true);
    });

    it("n'exige pas availabilityType même pour type COLLECT (mode partial)", () => {
      const result = UpdateMissionSchema.safeParse({ type: 'COLLECT' });
      expect(result.success).toBe(true);
    });

    it('accepte un payload complet valide', () => {
      const result = UpdateMissionSchema.safeParse({
        ...VALID_FULL_UPDATE,
        availabilityType: 'ON_SITE',
        hasRegistration: true,
        volunteersNeeded: 5,
        durationInt: 2,
        frequency: 'WEEKLY',
        startDate: '2025-07-01T08:00:00.000Z',
        endDate: '2025-07-31T18:00:00.000Z',
        address: {
          street: '10 rue de la Paix',
          postalCode: '75001',
          city: 'Paris',
          latitude: 48.87,
          longitude: 2.33,
        },
        skillIds: [1, 2],
        causeIds: [3],
        publicTypeIds: [],
        volunteerTypeIds: [1],
      });
      expect(result.success).toBe(true);
    });

    it('accepte availabilityType=null pour effacer la modalité', () => {
      const result = UpdateMissionSchema.safeParse({ availabilityType: null });
      expect(result.success).toBe(true);
    });

    it('accepte frequency=null pour effacer la fréquence', () => {
      const result = UpdateMissionSchema.safeParse({ frequency: null });
      expect(result.success).toBe(true);
    });

    it('accepte startDate=null pour effacer la date de début', () => {
      const result = UpdateMissionSchema.safeParse({ startDate: null });
      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // Validation des champs individuels (quand fournis)
  // ===========================================================================
  describe('❌ Validation des champs fournis', () => {
    it('rejette un titre trop court (< 3 caractères)', () => {
      const result = UpdateMissionSchema.safeParse({ title: 'AB' });
      expect(result.success).toBe(false);
      if (!result.success) {
        const err = result.error.issues.find((i) => i.path[0] === 'title');
        expect(err).toBeDefined();
      }
    });

    it('rejette un titre trop long (> 150 caractères)', () => {
      const result = UpdateMissionSchema.safeParse({ title: 'A'.repeat(151) });
      expect(result.success).toBe(false);
    });

    it('rejette une description trop courte (< 20 caractères)', () => {
      const result = UpdateMissionSchema.safeParse({ description: 'Trop court.' });
      expect(result.success).toBe(false);
      if (!result.success) {
        const err = result.error.issues.find((i) => i.path[0] === 'description');
        expect(err).toBeDefined();
      }
    });

    it('rejette une description trop longue (> 5000 caractères)', () => {
      const result = UpdateMissionSchema.safeParse({ description: 'D'.repeat(5001) });
      expect(result.success).toBe(false);
    });

    it('rejette un type inconnu', () => {
      const result = UpdateMissionSchema.safeParse({ type: 'INVALID' as any });
      expect(result.success).toBe(false);
    });

    it('rejette une modalité inconnue', () => {
      const result = UpdateMissionSchema.safeParse({ availabilityType: 'UNKNOWN' as any });
      expect(result.success).toBe(false);
    });

    it('rejette une fréquence inconnue', () => {
      const result = UpdateMissionSchema.safeParse({ frequency: 'INVALID' as any });
      expect(result.success).toBe(false);
    });

    it('rejette volunteersNeeded = 0 (minimum 1)', () => {
      const result = UpdateMissionSchema.safeParse({ volunteersNeeded: 0 });
      expect(result.success).toBe(false);
    });

    it('rejette durationInt = 0 (minimum 0,5)', () => {
      const result = UpdateMissionSchema.safeParse({ durationInt: 0 });
      expect(result.success).toBe(false);
    });

    it('accepte durationInt = 0,5 (valeur limite minimale)', () => {
      const result = UpdateMissionSchema.safeParse({ durationInt: 0.5 });
      expect(result.success).toBe(true);
    });

    it('rejette durationInt > 14400', () => {
      const result = UpdateMissionSchema.safeParse({ durationInt: 14401 });
      expect(result.success).toBe(false);
    });

    it('rejette une startDate au format invalide', () => {
      const result = UpdateMissionSchema.safeParse({ startDate: '2025-06-01' });
      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // Règles métier cross-champ (superRefine en mode partial)
  // ===========================================================================
  describe('❌ Règles métier cross-champ', () => {
    it('rejette INFO avec availabilityType fourni', () => {
      const result = UpdateMissionSchema.safeParse({
        type: 'INFO',
        availabilityType: 'REMOTE',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const err = result.error.issues.find((i) => i.path[0] === 'availabilityType');
        expect(err).toBeDefined();
        expect(err?.message).toContain('modalité');
      }
    });

    it('accepte INFO sans availabilityType', () => {
      const result = UpdateMissionSchema.safeParse({ type: 'INFO' });
      expect(result.success).toBe(true);
    });

    it('accepte INFO avec availabilityType=null', () => {
      const result = UpdateMissionSchema.safeParse({
        type: 'INFO',
        availabilityType: null,
      });
      expect(result.success).toBe(true);
    });

    it('rejette COLLECT avec availabilityType=REMOTE', () => {
      const result = UpdateMissionSchema.safeParse({
        type: 'COLLECT',
        availabilityType: 'REMOTE',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const err = result.error.issues.find((i) => i.path[0] === 'availabilityType');
        expect(err).toBeDefined();
      }
    });

    it('rejette COLLECT avec availabilityType=HYBRID', () => {
      const result = UpdateMissionSchema.safeParse({
        type: 'COLLECT',
        availabilityType: 'HYBRID',
      });
      expect(result.success).toBe(false);
    });

    it('accepte COLLECT avec ON_SITE et adresse', () => {
      const result = UpdateMissionSchema.safeParse({
        type: 'COLLECT',
        availabilityType: 'ON_SITE',
        address: { street: '1 rue Test', postalCode: '75001', city: 'Paris' },
      });
      expect(result.success).toBe(true);
    });

    it('rejette ON_SITE sans adresse', () => {
      const result = UpdateMissionSchema.safeParse({ availabilityType: 'ON_SITE' });
      expect(result.success).toBe(false);
      if (!result.success) {
        const err = result.error.issues.find((i) => i.path[0] === 'address');
        expect(err).toBeDefined();
        expect(err?.message).toContain('adresse');
      }
    });

    it('rejette HYBRID sans adresse', () => {
      const result = UpdateMissionSchema.safeParse({ availabilityType: 'HYBRID' });
      expect(result.success).toBe(false);
    });

    it('accepte REMOTE sans adresse', () => {
      const result = UpdateMissionSchema.safeParse({ availabilityType: 'REMOTE' });
      expect(result.success).toBe(true);
    });

    it('accepte ON_SITE avec adresse fournie', () => {
      const result = UpdateMissionSchema.safeParse({
        availabilityType: 'ON_SITE',
        address: { street: '1 rue Test', postalCode: '75001', city: 'Paris' },
      });
      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // Règle métier : volunteersNeeded obligatoire si hasRegistration=true (MISSION/EVENT)
  // ===========================================================================
  describe('❌ volunteersNeeded obligatoire si hasRegistration=true (MISSION / EVENT)', () => {
    it('rejette MISSION + hasRegistration=true sans volunteersNeeded', () => {
      const result = UpdateMissionSchema.safeParse({
        type: 'MISSION' as const,
        hasRegistration: true,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const err = result.error.issues.find((i) => i.path[0] === 'volunteersNeeded');
        expect(err).toBeDefined();
        expect(err?.message).toContain('bénévoles');
      }
    });

    it('rejette EVENT + hasRegistration=true sans volunteersNeeded', () => {
      const result = UpdateMissionSchema.safeParse({
        type: 'EVENT' as const,
        hasRegistration: true,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const err = result.error.issues.find((i) => i.path[0] === 'volunteersNeeded');
        expect(err).toBeDefined();
      }
    });

    it('accepte MISSION + hasRegistration=true avec volunteersNeeded fourni', () => {
      const result = UpdateMissionSchema.safeParse({
        type: 'MISSION' as const,
        availabilityType: 'REMOTE' as const,
        hasRegistration: true,
        volunteersNeeded: 5,
      });
      expect(result.success).toBe(true);
    });

    it('accepte MISSION + hasRegistration=false sans volunteersNeeded', () => {
      const result = UpdateMissionSchema.safeParse({
        type: 'MISSION' as const,
        availabilityType: 'REMOTE' as const,
        hasRegistration: false,
      });
      expect(result.success).toBe(true);
    });

    it('accepte hasRegistration=true seul (type absent — mode partial)', () => {
      // Sans type fourni, la règle ne s'applique pas (type === undefined)
      const result = UpdateMissionSchema.safeParse({ hasRegistration: true });
      expect(result.success).toBe(true);
    });

    it('accepte type MISSION seul (hasRegistration absent — mode partial)', () => {
      // Sans hasRegistration fourni, la règle ne s'applique pas
      const result = UpdateMissionSchema.safeParse({ type: 'MISSION' as const });
      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // Cohérence des dates
  // ===========================================================================
  describe('❌ Cohérence des dates (superRefine)', () => {
    it('rejette endDate antérieure à startDate', () => {
      const result = UpdateMissionSchema.safeParse({
        startDate: '2025-06-15T00:00:00.000Z',
        endDate: '2025-06-01T00:00:00.000Z',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const err = result.error.issues.find((i) => i.path[0] === 'endDate');
        expect(err).toBeDefined();
      }
    });

    it('rejette endDate égale à startDate', () => {
      const same = '2025-06-15T00:00:00.000Z';
      const result = UpdateMissionSchema.safeParse({
        startDate: same,
        endDate: same,
      });
      expect(result.success).toBe(false);
    });

    it('accepte endDate postérieure à startDate', () => {
      const result = UpdateMissionSchema.safeParse({
        startDate: '2025-06-01T00:00:00.000Z',
        endDate: '2025-06-30T00:00:00.000Z',
      });
      expect(result.success).toBe(true);
    });

    it('accepte startDate seule (sans endDate)', () => {
      const result = UpdateMissionSchema.safeParse({
        startDate: '2025-06-01T00:00:00.000Z',
      });
      expect(result.success).toBe(true);
    });

    it('accepte endDate seule (sans startDate)', () => {
      const result = UpdateMissionSchema.safeParse({
        endDate: '2025-06-30T00:00:00.000Z',
      });
      expect(result.success).toBe(true);
    });
  });
});
