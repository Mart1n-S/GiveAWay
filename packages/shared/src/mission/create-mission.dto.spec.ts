import { CreateMissionSchema } from './create-mission.dto';

// ----------------------------------------------------------------
// Payload valide de référence
// ----------------------------------------------------------------

const VALID_PAYLOAD = {
  title: 'Distribution alimentaire',
  description: 'Description suffisamment longue pour passer la validation minimale.',
  type: 'MISSION' as const,
  availabilityType: 'REMOTE' as const,
  volunteersNeeded: 10,
};

const VALID_INFO_PAYLOAD = {
  title: 'Information importante',
  description: 'Ceci est une simple information sans modalité de bénévolat.',
  type: 'INFO' as const,
};

// ----------------------------------------------------------------
// Suite
// ----------------------------------------------------------------

describe('CreateMissionSchema', () => {
  // ===========================================================================
  // Cas valides
  // ===========================================================================
  describe('✅ Cas valides', () => {
    it('accepte un payload minimal MISSION (avec availabilityType REMOTE)', () => {
      const result = CreateMissionSchema.safeParse(VALID_PAYLOAD);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Distribution alimentaire');
        expect(result.data.hasRegistration).toBe(true);
      }
    });

    it('accepte un payload INFO sans availabilityType', () => {
      const result = CreateMissionSchema.safeParse(VALID_INFO_PAYLOAD);
      expect(result.success).toBe(true);
    });

    it('accepte un payload INFO avec availabilityType=null', () => {
      const result = CreateMissionSchema.safeParse({
        ...VALID_INFO_PAYLOAD,
        availabilityType: null,
      });
      expect(result.success).toBe(true);
    });

    it('accepte un payload complet avec toutes les options', () => {
      const result = CreateMissionSchema.safeParse({
        ...VALID_PAYLOAD,
        availabilityType: 'ON_SITE',
        hasRegistration: true,
        volunteersNeeded: 10,
        durationInt: 120,
        frequency: 'WEEKLY',
        startDate: '2025-06-01T08:00:00.000Z',
        endDate: '2025-06-30T18:00:00.000Z',
        address: {
          street: '10 rue de la Paix',
          postalCode: '75001',
          city: 'Paris',
          latitude: 48.87,
          longitude: 2.33,
        },
        skillIds: [1, 2, 3],
        causeIds: [4, 5],
        publicTypeIds: [1],
        volunteerTypeIds: [2],
      });
      expect(result.success).toBe(true);
    });

    it('accepte availabilityType=REMOTE sans adresse', () => {
      const result = CreateMissionSchema.safeParse({
        ...VALID_PAYLOAD,
        availabilityType: 'REMOTE',
      });
      expect(result.success).toBe(true);
    });

    it('accepte ON_SITE avec adresse fournie', () => {
      const result = CreateMissionSchema.safeParse({
        ...VALID_PAYLOAD,
        availabilityType: 'ON_SITE',
        address: {
          street: '1 rue Test',
          postalCode: '75001',
          city: 'Paris',
        },
      });
      expect(result.success).toBe(true);
    });

    it("accepte tous les types d'activité valides (INFO sans modalité)", () => {
      for (const type of ['MISSION', 'EVENT', 'COLLECT', 'INFO'] as const) {
        const payload =
          type === 'INFO'
            ? { ...VALID_INFO_PAYLOAD }
            : {
                ...VALID_PAYLOAD,
                type,
                availabilityType:
                  type === 'COLLECT' ? ('ON_SITE' as const) : ('REMOTE' as const),
                // COLLECT n'a pas de concept d'inscription (règle non applicable)
                ...(type === 'COLLECT' && {
                  hasRegistration: false,
                  volunteersNeeded: undefined,
                  address: { street: '1 rue Test', postalCode: '75001', city: 'Paris' },
                }),
              };
        const result = CreateMissionSchema.safeParse(payload);
        expect(result.success).toBe(true);
      }
    });

    it('accepte toutes les fréquences valides', () => {
      for (const frequency of ['ONCE', 'DAILY', 'WEEKLY', 'MONTHLY'] as const) {
        const result = CreateMissionSchema.safeParse({
          ...VALID_PAYLOAD,
          frequency,
        });
        expect(result.success).toBe(true);
      }
    });

    it('trim le titre et la description', () => {
      const result = CreateMissionSchema.safeParse({
        ...VALID_PAYLOAD,
        title: '  Mission avec espaces  ',
        description: '  Description avec espaces suffisante pour passer le minimum.  ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Mission avec espaces');
      }
    });

    it('convertit volunteersNeeded en nombre', () => {
      const result = CreateMissionSchema.safeParse({
        ...VALID_PAYLOAD,
        volunteersNeeded: '5',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.volunteersNeeded).toBe(5);
      }
    });
  });

  // ===========================================================================
  // Titre
  // ===========================================================================
  describe('❌ title — validation', () => {
    it('rejette un titre trop court (< 3 caractères)', () => {
      const result = CreateMissionSchema.safeParse({
        ...VALID_PAYLOAD,
        title: 'AB',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const titleError = result.error.issues.find(
          (i) => i.path[0] === 'title',
        );
        expect(titleError).toBeDefined();
      }
    });

    it('rejette un titre trop long (> 150 caractères)', () => {
      const result = CreateMissionSchema.safeParse({
        ...VALID_PAYLOAD,
        title: 'A'.repeat(151),
      });
      expect(result.success).toBe(false);
    });

    it('rejette un titre manquant', () => {
      const { title: _, ...noTitle } = VALID_PAYLOAD;
      const result = CreateMissionSchema.safeParse(noTitle);
      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // Description
  // ===========================================================================
  describe('❌ description — validation', () => {
    it('rejette une description trop courte (< 20 caractères)', () => {
      const result = CreateMissionSchema.safeParse({
        ...VALID_PAYLOAD,
        description: 'Trop court.',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const err = result.error.issues.find((i) => i.path[0] === 'description');
        expect(err).toBeDefined();
      }
    });

    it('rejette une description trop longue (> 5000 caractères)', () => {
      const result = CreateMissionSchema.safeParse({
        ...VALID_PAYLOAD,
        description: 'D'.repeat(5001),
      });
      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // Type
  // ===========================================================================
  describe('❌ type — validation', () => {
    it('rejette un type inconnu', () => {
      const result = CreateMissionSchema.safeParse({
        ...VALID_PAYLOAD,
        type: 'UNKNOWN_TYPE',
      });
      expect(result.success).toBe(false);
    });

    it('rejette un type manquant', () => {
      const { type: _, ...noType } = VALID_PAYLOAD;
      const result = CreateMissionSchema.safeParse(noType);
      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // AvailabilityType — règles métier par type d'activité
  // ===========================================================================
  describe('❌ availabilityType — règles par type', () => {
    it('rejette une modalité inconnue', () => {
      const result = CreateMissionSchema.safeParse({
        ...VALID_PAYLOAD,
        availabilityType: 'UNKNOWN',
      });
      expect(result.success).toBe(false);
    });

    it('rejette MISSION sans availabilityType', () => {
      const { availabilityType: _, ...noAvailability } = VALID_PAYLOAD;
      const result = CreateMissionSchema.safeParse(noAvailability);
      expect(result.success).toBe(false);
    });

    it('rejette COLLECT avec availabilityType=REMOTE', () => {
      const result = CreateMissionSchema.safeParse({
        ...VALID_PAYLOAD,
        type: 'COLLECT',
        availabilityType: 'REMOTE',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const err = result.error.issues.find(
          (i) => i.path[0] === 'availabilityType',
        );
        expect(err).toBeDefined();
      }
    });

    it('rejette INFO avec un availabilityType renseigné', () => {
      const result = CreateMissionSchema.safeParse({
        ...VALID_INFO_PAYLOAD,
        availabilityType: 'REMOTE',
      });
      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // volunteersNeeded
  // ===========================================================================
  describe('❌ volunteersNeeded — validation', () => {
    it('rejette 0 bénévole (minimum 1)', () => {
      const result = CreateMissionSchema.safeParse({
        ...VALID_PAYLOAD,
        volunteersNeeded: 0,
      });
      expect(result.success).toBe(false);
    });

    it('accepte un nombre valide de bénévoles', () => {
      const result = CreateMissionSchema.safeParse(VALID_PAYLOAD);
      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // Règle métier : volunteersNeeded obligatoire si hasRegistration=true (MISSION/EVENT)
  // ===========================================================================
  describe('❌ volunteersNeeded obligatoire si hasRegistration=true (MISSION / EVENT)', () => {
    it('rejette MISSION avec hasRegistration=true et volunteersNeeded absent', () => {
      const result = CreateMissionSchema.safeParse({
        ...VALID_PAYLOAD,
        hasRegistration: true,
        volunteersNeeded: undefined,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const err = result.error.issues.find((i) => i.path[0] === 'volunteersNeeded');
        expect(err).toBeDefined();
        expect(err?.message).toContain('bénévoles');
      }
    });

    it('rejette EVENT avec hasRegistration=true et volunteersNeeded absent', () => {
      const result = CreateMissionSchema.safeParse({
        ...VALID_PAYLOAD,
        type: 'EVENT' as const,
        hasRegistration: true,
        volunteersNeeded: undefined,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const err = result.error.issues.find((i) => i.path[0] === 'volunteersNeeded');
        expect(err).toBeDefined();
      }
    });

    it('accepte MISSION avec hasRegistration=false et volunteersNeeded absent', () => {
      const result = CreateMissionSchema.safeParse({
        ...VALID_PAYLOAD,
        hasRegistration: false,
        volunteersNeeded: undefined,
      });
      expect(result.success).toBe(true);
    });

    it('accepte EVENT avec hasRegistration=false et volunteersNeeded absent', () => {
      const result = CreateMissionSchema.safeParse({
        ...VALID_PAYLOAD,
        type: 'EVENT' as const,
        hasRegistration: false,
        volunteersNeeded: undefined,
      });
      expect(result.success).toBe(true);
    });

    it('accepte COLLECT sans volunteersNeeded (règle non applicable)', () => {
      const result = CreateMissionSchema.safeParse({
        ...VALID_PAYLOAD,
        type: 'COLLECT' as const,
        availabilityType: 'ON_SITE' as const,
        volunteersNeeded: undefined,
        address: { street: '1 rue Test', postalCode: '75001', city: 'Paris' },
      });
      expect(result.success).toBe(true);
    });

    it('accepte INFO sans volunteersNeeded (règle non applicable)', () => {
      const result = CreateMissionSchema.safeParse(VALID_INFO_PAYLOAD);
      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // durationInt (exprimé en heures côté formulaire, converti en minutes par le frontend ×60)
  // ===========================================================================
  describe('❌ durationInt — validation', () => {
    it('rejette 0 (inférieur au minimum de 0,5)', () => {
      const result = CreateMissionSchema.safeParse({
        ...VALID_PAYLOAD,
        durationInt: 0,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const err = result.error.issues.find((i) => i.path[0] === 'durationInt');
        expect(err?.message).toContain('30 minutes');
      }
    });

    it('accepte 0,5 (minimum valide)', () => {
      const result = CreateMissionSchema.safeParse({
        ...VALID_PAYLOAD,
        durationInt: 0.5,
      });
      expect(result.success).toBe(true);
    });

    it('rejette une valeur supérieure à 14400', () => {
      const result = CreateMissionSchema.safeParse({
        ...VALID_PAYLOAD,
        durationInt: 14401,
      });
      expect(result.success).toBe(false);
    });

    it('accepte exactement 14400 (valeur limite maximale)', () => {
      const result = CreateMissionSchema.safeParse({
        ...VALID_PAYLOAD,
        durationInt: 14400,
      });
      expect(result.success).toBe(true);
    });

    it('accepte une valeur décimale valide (ex : 1.5)', () => {
      const result = CreateMissionSchema.safeParse({
        ...VALID_PAYLOAD,
        durationInt: 1.5,
      });
      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // Cross-validation : adresse obligatoire pour ON_SITE / HYBRID
  // ===========================================================================
  describe('❌ adresse obligatoire (superRefine)', () => {
    it('rejette ON_SITE sans adresse', () => {
      const result = CreateMissionSchema.safeParse({
        ...VALID_PAYLOAD,
        availabilityType: 'ON_SITE',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const err = result.error.issues.find((i) => i.path[0] === 'address');
        expect(err).toBeDefined();
        expect(err?.message).toContain('adresse');
      }
    });

    it('rejette HYBRID sans adresse', () => {
      const result = CreateMissionSchema.safeParse({
        ...VALID_PAYLOAD,
        availabilityType: 'HYBRID',
      });
      expect(result.success).toBe(false);
    });

    it('accepte REMOTE sans adresse', () => {
      const result = CreateMissionSchema.safeParse({
        ...VALID_PAYLOAD,
        availabilityType: 'REMOTE',
      });
      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // Cross-validation : endDate > startDate
  // ===========================================================================
  describe('❌ cohérence des dates (superRefine)', () => {
    it('rejette endDate <= startDate', () => {
      const result = CreateMissionSchema.safeParse({
        ...VALID_PAYLOAD,
        startDate: '2025-06-15T00:00:00.000Z',
        endDate: '2025-06-01T00:00:00.000Z',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const err = result.error.issues.find((i) => i.path[0] === 'endDate');
        expect(err).toBeDefined();
      }
    });

    it('rejette endDate = startDate', () => {
      const same = '2025-06-15T00:00:00.000Z';
      const result = CreateMissionSchema.safeParse({
        ...VALID_PAYLOAD,
        startDate: same,
        endDate: same,
      });
      expect(result.success).toBe(false);
    });

    it('accepte endDate > startDate', () => {
      const result = CreateMissionSchema.safeParse({
        ...VALID_PAYLOAD,
        startDate: '2025-06-01T00:00:00.000Z',
        endDate: '2025-06-30T00:00:00.000Z',
      });
      expect(result.success).toBe(true);
    });

    it('accepte startDate seul sans endDate', () => {
      const result = CreateMissionSchema.safeParse({
        ...VALID_PAYLOAD,
        startDate: '2025-06-01T00:00:00.000Z',
      });
      expect(result.success).toBe(true);
    });
  });
});
