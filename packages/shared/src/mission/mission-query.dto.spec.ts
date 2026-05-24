import { MissionListQuerySchema } from "./mission-query.dto";

/**
 * Simule les query params HTTP : toutes les valeurs arrivent en string.
 * Les valeurs absentes arrivent comme undefined.
 */
describe('MissionListQuerySchema', () => {
  // =========================================================================
  // Valeurs par défaut
  // =========================================================================
  describe('Valeurs par défaut', () => {
    it('✅ Doit appliquer page=1 et pageSize=12 si absents', () => {
      const result = MissionListQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(12);
    });

    it('✅ Doit appliquer page=1 si le champ est une chaîne vide', () => {
      const result = MissionListQuerySchema.parse({ page: '' });
      expect(result.page).toBe(1);
    });

    it('✅ Doit appliquer pageSize=12 si le champ est une chaîne vide', () => {
      const result = MissionListQuerySchema.parse({ pageSize: '' });
      expect(result.pageSize).toBe(12);
    });

    it('✅ Doit laisser les filtres optionnels à undefined si absents', () => {
      const result = MissionListQuerySchema.parse({});
      expect(result.type).toBeUndefined();
      expect(result.causeId).toBeUndefined();
      expect(result.city).toBeUndefined();
      expect(result.search).toBeUndefined();
    });
  });

  // =========================================================================
  // Coercion string → number (comportement réel HTTP)
  // =========================================================================
  describe('Coercion string → number', () => {
    it('✅ Doit convertir page "3" en 3', () => {
      const result = MissionListQuerySchema.parse({ page: '3' });
      expect(result.page).toBe(3);
      expect(typeof result.page).toBe('number');
    });

    it('✅ Doit convertir pageSize "25" en 25', () => {
      const result = MissionListQuerySchema.parse({ pageSize: '25' });
      expect(result.pageSize).toBe(25);
    });

    it('✅ Doit convertir causeId "7" en 7', () => {
      const result = MissionListQuerySchema.parse({ causeId: '7' });
      expect(result.causeId).toBe(7);
    });
  });

  // =========================================================================
  // page
  // =========================================================================
  describe('page', () => {
    it('✅ Doit accepter page=1 (minimum)', () => {
      const result = MissionListQuerySchema.safeParse({ page: '1' });
      expect(result.success).toBe(true);
    });

    it('❌ Doit rejeter page=0 (sous le minimum)', () => {
      const result = MissionListQuerySchema.safeParse({ page: '0' });
      expect(result.success).toBe(false);
    });

    it('❌ Doit rejeter page=-1', () => {
      const result = MissionListQuerySchema.safeParse({ page: '-1' });
      expect(result.success).toBe(false);
    });

    it('❌ Doit rejeter une page décimale', () => {
      const result = MissionListQuerySchema.safeParse({ page: '1.5' });
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // pageSize
  // =========================================================================
  describe('pageSize', () => {
    it('✅ Doit accepter pageSize=100 (maximum)', () => {
      const result = MissionListQuerySchema.safeParse({ pageSize: '100' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.pageSize).toBe(100);
    });

    it('❌ Doit rejeter pageSize=101 (au-dessus du maximum)', () => {
      const result = MissionListQuerySchema.safeParse({ pageSize: '101' });
      expect(result.success).toBe(false);
    });

    it('❌ Doit rejeter pageSize=0', () => {
      const result = MissionListQuerySchema.safeParse({ pageSize: '0' });
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // type (enum ActivityType)
  // =========================================================================
  describe('type', () => {
    it.each(['MISSION', 'EVENT', 'COLLECT', 'INFO'])(
      '✅ Doit accepter type="%s"',
      (type) => {
        const result = MissionListQuerySchema.safeParse({ type });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.type).toBe(type);
      },
    );

    it('❌ Doit rejeter un type inconnu', () => {
      const result = MissionListQuerySchema.safeParse({ type: 'UNKNOWN' });
      expect(result.success).toBe(false);
    });

    it('❌ Doit rejeter un type en minuscules', () => {
      const result = MissionListQuerySchema.safeParse({ type: 'mission' });
      expect(result.success).toBe(false);
    });

    it('✅ Doit traiter type="" comme absent (undefined)', () => {
      const result = MissionListQuerySchema.parse({ type: '' });
      expect(result.type).toBeUndefined();
    });
  });

  // =========================================================================
  // causeId
  // =========================================================================
  describe('causeId', () => {
    it('✅ Doit accepter causeId=1 (minimum)', () => {
      const result = MissionListQuerySchema.safeParse({ causeId: '1' });
      expect(result.success).toBe(true);
    });

    it('❌ Doit rejeter causeId=0', () => {
      const result = MissionListQuerySchema.safeParse({ causeId: '0' });
      expect(result.success).toBe(false);
    });

    it('✅ Doit traiter causeId="" comme absent', () => {
      const result = MissionListQuerySchema.parse({ causeId: '' });
      expect(result.causeId).toBeUndefined();
    });
  });

  // =========================================================================
  // city
  // =========================================================================
  describe('city', () => {
    it('✅ Doit accepter une ville valide', () => {
      const result = MissionListQuerySchema.parse({ city: 'Paris' });
      expect(result.city).toBe('Paris');
    });

    it('✅ Doit traiter city="" comme absent', () => {
      const result = MissionListQuerySchema.parse({ city: '' });
      expect(result.city).toBeUndefined();
    });

    it('❌ Doit rejeter une ville de plus de 100 caractères', () => {
      const result = MissionListQuerySchema.safeParse({ city: 'a'.repeat(101) });
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // search
  // =========================================================================
  describe('search', () => {
    it('✅ Doit accepter un terme de recherche valide', () => {
      const result = MissionListQuerySchema.parse({ search: 'repas chauds' });
      expect(result.search).toBe('repas chauds');
    });

    it('✅ Doit traiter search="" comme absent', () => {
      const result = MissionListQuerySchema.parse({ search: '' });
      expect(result.search).toBeUndefined();
    });

    it('❌ Doit rejeter une recherche de plus de 200 caractères', () => {
      const result = MissionListQuerySchema.safeParse({
        search: 'a'.repeat(201),
      });
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // types (tableau de ActivityType)
  // =========================================================================
  describe('types (multiples)', () => {
    it('✅ Doit parser "MISSION,EVENT" en tableau ["MISSION", "EVENT"]', () => {
      const result = MissionListQuerySchema.parse({ types: 'MISSION,EVENT' });
      expect(result.types).toEqual(['MISSION', 'EVENT']);
    });

    it('✅ Doit accepter un type unique via types', () => {
      const result = MissionListQuerySchema.parse({ types: 'COLLECT' });
      expect(result.types).toEqual(['COLLECT']);
    });

    it('✅ Doit retourner undefined si types est absent', () => {
      const result = MissionListQuerySchema.parse({});
      expect(result.types).toBeUndefined();
    });

    it('✅ Doit retourner undefined si types est une chaîne vide', () => {
      const result = MissionListQuerySchema.parse({ types: '' });
      expect(result.types).toBeUndefined();
    });

    it('❌ Doit rejeter un type invalide dans le tableau', () => {
      const result = MissionListQuerySchema.safeParse({ types: 'MISSION,UNKNOWN' });
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // causeIds (tableau d'entiers)
  // =========================================================================
  describe('causeIds (multiples)', () => {
    it('✅ Doit parser "1,2,3" en tableau [1, 2, 3]', () => {
      const result = MissionListQuerySchema.parse({ causeIds: '1,2,3' });
      expect(result.causeIds).toEqual([1, 2, 3]);
    });

    it('✅ Doit retourner undefined si causeIds est absent', () => {
      const result = MissionListQuerySchema.parse({});
      expect(result.causeIds).toBeUndefined();
    });

    it('✅ Doit retourner undefined si causeIds est une chaîne vide', () => {
      const result = MissionListQuerySchema.parse({ causeIds: '' });
      expect(result.causeIds).toBeUndefined();
    });

    it('✅ Doit filtrer les valeurs non-numériques', () => {
      const result = MissionListQuerySchema.parse({ causeIds: '1,abc,3' });
      expect(result.causeIds).toEqual([1, 3]);
    });
  });

  // =========================================================================
  // skillIds
  // =========================================================================
  describe('skillIds', () => {
    it('✅ Doit parser "2,5" en tableau [2, 5]', () => {
      const result = MissionListQuerySchema.parse({ skillIds: '2,5' });
      expect(result.skillIds).toEqual([2, 5]);
    });

    it('✅ Doit retourner undefined si skillIds est absent', () => {
      const result = MissionListQuerySchema.parse({});
      expect(result.skillIds).toBeUndefined();
    });
  });

  // =========================================================================
  // publicTypeIds
  // =========================================================================
  describe('publicTypeIds', () => {
    it('✅ Doit parser "1,4" en tableau [1, 4]', () => {
      const result = MissionListQuerySchema.parse({ publicTypeIds: '1,4' });
      expect(result.publicTypeIds).toEqual([1, 4]);
    });

    it('✅ Doit retourner undefined si publicTypeIds est absent', () => {
      const result = MissionListQuerySchema.parse({});
      expect(result.publicTypeIds).toBeUndefined();
    });
  });

  // =========================================================================
  // volunteerTypeIds
  // =========================================================================
  describe('volunteerTypeIds', () => {
    it('✅ Doit parser "3,7" en tableau [3, 7]', () => {
      const result = MissionListQuerySchema.parse({ volunteerTypeIds: '3,7' });
      expect(result.volunteerTypeIds).toEqual([3, 7]);
    });

    it('✅ Doit retourner undefined si volunteerTypeIds est absent', () => {
      const result = MissionListQuerySchema.parse({});
      expect(result.volunteerTypeIds).toBeUndefined();
    });
  });

  // =========================================================================
  // frequency
  // =========================================================================
  describe('frequency', () => {
    it.each(['ONCE', 'DAILY', 'WEEKLY', 'MONTHLY'])(
      '✅ Doit accepter frequency="%s"',
      (frequency) => {
        const result = MissionListQuerySchema.safeParse({ frequency });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.frequency).toBe(frequency);
      },
    );

    it('❌ Doit rejeter une fréquence inconnue', () => {
      const result = MissionListQuerySchema.safeParse({ frequency: 'BIWEEKLY' });
      expect(result.success).toBe(false);
    });

    it('✅ Doit traiter frequency="" comme absent (undefined)', () => {
      const result = MissionListQuerySchema.parse({ frequency: '' });
      expect(result.frequency).toBeUndefined();
    });
  });

  // =========================================================================
  // startDateFrom / startDateTo
  // =========================================================================
  describe('startDateFrom et startDateTo', () => {
    it('✅ Doit accepter une date au format YYYY-MM-DD pour startDateFrom', () => {
      const result = MissionListQuerySchema.safeParse({ startDateFrom: '2025-01-15' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.startDateFrom).toBe('2025-01-15');
    });

    it('✅ Doit accepter une date au format YYYY-MM-DD pour startDateTo', () => {
      const result = MissionListQuerySchema.safeParse({ startDateTo: '2025-12-31' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.startDateTo).toBe('2025-12-31');
    });

    it('❌ Doit rejeter un format de date invalide pour startDateFrom', () => {
      const result = MissionListQuerySchema.safeParse({ startDateFrom: '15/01/2025' });
      expect(result.success).toBe(false);
    });

    it('❌ Doit rejeter un format de date invalide pour startDateTo', () => {
      const result = MissionListQuerySchema.safeParse({ startDateTo: '2025-1-5' });
      expect(result.success).toBe(false);
    });

    it('✅ Doit retourner undefined si startDateFrom est une chaîne vide', () => {
      const result = MissionListQuerySchema.parse({ startDateFrom: '' });
      expect(result.startDateFrom).toBeUndefined();
    });

    it('✅ Doit retourner undefined si les champs de date sont absents', () => {
      const result = MissionListQuerySchema.parse({});
      expect(result.startDateFrom).toBeUndefined();
      expect(result.startDateTo).toBeUndefined();
    });
  });

  // =========================================================================
  // hasAvailableSpots
  // =========================================================================
  describe('hasAvailableSpots', () => {
    it('✅ Doit convertir "true" en true', () => {
      const result = MissionListQuerySchema.parse({ hasAvailableSpots: 'true' });
      expect(result.hasAvailableSpots).toBe(true);
    });

    it('✅ Doit convertir "false" en false', () => {
      const result = MissionListQuerySchema.parse({ hasAvailableSpots: 'false' });
      expect(result.hasAvailableSpots).toBe(false);
    });

    it('✅ Doit retourner undefined si hasAvailableSpots est absent', () => {
      const result = MissionListQuerySchema.parse({});
      expect(result.hasAvailableSpots).toBeUndefined();
    });

    it('✅ Doit retourner undefined si hasAvailableSpots est une chaîne vide', () => {
      const result = MissionListQuerySchema.parse({ hasAvailableSpots: '' });
      expect(result.hasAvailableSpots).toBeUndefined();
    });

    it('✅ Doit accepter un booléen natif true', () => {
      const result = MissionListQuerySchema.parse({ hasAvailableSpots: true });
      expect(result.hasAvailableSpots).toBe(true);
    });
  });

  // =========================================================================
  // locationMode
  // =========================================================================
  describe('locationMode', () => {
    it('✅ Doit accepter locationMode="nearby"', () => {
      const result = MissionListQuerySchema.safeParse({ locationMode: 'nearby' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.locationMode).toBe('nearby');
    });

    it('✅ Doit accepter locationMode="remote"', () => {
      const result = MissionListQuerySchema.safeParse({ locationMode: 'remote' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.locationMode).toBe('remote');
    });

    it('❌ Doit rejeter locationMode="hybrid"', () => {
      const result = MissionListQuerySchema.safeParse({ locationMode: 'hybrid' });
      expect(result.success).toBe(false);
    });

    it('✅ Doit retourner undefined si locationMode est une chaîne vide', () => {
      const result = MissionListQuerySchema.parse({ locationMode: '' });
      expect(result.locationMode).toBeUndefined();
    });
  });

  // =========================================================================
  // associationId
  // =========================================================================
  describe('associationId', () => {
    it('✅ Doit accepter associationId=1 (minimum)', () => {
      const result = MissionListQuerySchema.safeParse({ associationId: '1' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.associationId).toBe(1);
    });

    it('✅ Doit convertir "5" en 5', () => {
      const result = MissionListQuerySchema.parse({ associationId: '5' });
      expect(result.associationId).toBe(5);
      expect(typeof result.associationId).toBe('number');
    });

    it('❌ Doit rejeter associationId=0 (sous le minimum)', () => {
      const result = MissionListQuerySchema.safeParse({ associationId: '0' });
      expect(result.success).toBe(false);
    });

    it('❌ Doit rejeter associationId=-1', () => {
      const result = MissionListQuerySchema.safeParse({ associationId: '-1' });
      expect(result.success).toBe(false);
    });

    it('✅ Doit retourner undefined si associationId est absent', () => {
      const result = MissionListQuerySchema.parse({});
      expect(result.associationId).toBeUndefined();
    });

    it('✅ Doit traiter associationId="" comme absent (undefined)', () => {
      const result = MissionListQuerySchema.parse({ associationId: '' });
      expect(result.associationId).toBeUndefined();
    });
  });

  // =========================================================================
  // Combinaisons
  // =========================================================================
  describe('Combinaisons de paramètres', () => {
    it('✅ Doit parser un ensemble complet de query params string (simulation HTTP)', () => {
      const result = MissionListQuerySchema.parse({
        page: '2',
        pageSize: '6',
        type: 'EVENT',
        causeId: '5',
        city: 'Aix-en-Provence',
        search: 'repas',
      });

      expect(result).toEqual({
        page: 2,
        pageSize: 6,
        type: 'EVENT',
        causeId: 5,
        city: 'Aix-en-Provence',
        search: 'repas',
      });
    });

    it('✅ Doit parser un ensemble complet avec les nouveaux filtres', () => {
      const result = MissionListQuerySchema.parse({
        page: '1',
        pageSize: '12',
        types: 'MISSION,COLLECT',
        causeIds: '1,3',
        skillIds: '2,5',
        frequency: 'WEEKLY',
        startDateFrom: '2025-03-01',
        startDateTo: '2025-06-30',
        hasAvailableSpots: 'true',
        locationMode: 'nearby',
      });

      expect(result.types).toEqual(['MISSION', 'COLLECT']);
      expect(result.causeIds).toEqual([1, 3]);
      expect(result.skillIds).toEqual([2, 5]);
      expect(result.frequency).toBe('WEEKLY');
      expect(result.startDateFrom).toBe('2025-03-01');
      expect(result.startDateTo).toBe('2025-06-30');
      expect(result.hasAvailableSpots).toBe(true);
      expect(result.locationMode).toBe('nearby');
    });
  });

  // =========================================================================
  // withMatching — opt-in pour le scoring de matching
  // =========================================================================
  describe('withMatching', () => {
    it('✅ Doit être undefined si absent', () => {
      const result = MissionListQuerySchema.parse({});
      expect(result.withMatching).toBeUndefined();
    });

    it('✅ Doit accepter le boolean true', () => {
      const result = MissionListQuerySchema.parse({ withMatching: true });
      expect(result.withMatching).toBe(true);
    });

    it('✅ Doit accepter le boolean false', () => {
      const result = MissionListQuerySchema.parse({ withMatching: false });
      expect(result.withMatching).toBe(false);
    });

    it('✅ Doit convertir la string "true" en boolean true (query-string)', () => {
      const result = MissionListQuerySchema.parse({ withMatching: 'true' });
      expect(result.withMatching).toBe(true);
      expect(typeof result.withMatching).toBe('boolean');
    });

    it('✅ Doit convertir la string "false" en boolean false', () => {
      const result = MissionListQuerySchema.parse({ withMatching: 'false' });
      expect(result.withMatching).toBe(false);
    });

    it('✅ Doit convertir une string vide en undefined', () => {
      const result = MissionListQuerySchema.parse({ withMatching: '' });
      expect(result.withMatching).toBeUndefined();
    });

    it('❌ Doit rejeter une valeur non parsable (string arbitraire → undefined → OK car optional)', () => {
      const result = MissionListQuerySchema.parse({ withMatching: 'maybe' });
      expect(result.withMatching).toBeUndefined();
    });
  });
});
