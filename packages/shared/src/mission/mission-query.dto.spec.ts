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
  });
});
