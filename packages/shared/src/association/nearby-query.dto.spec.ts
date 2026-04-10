import { NearbyQuerySchema } from "./nearby-query.dto";

/**
 * Simule les query params HTTP : les nombres arrivent en string.
 * Les valeurs absentes sont undefined.
 */
describe('NearbyQuerySchema', () => {
  const validBase = { lat: '48.85', lng: '2.35' };

  // =========================================================================
  // Champs obligatoires : lat / lng
  // =========================================================================
  describe('lat et lng obligatoires', () => {
    it('✅ Doit accepter des coordonnées valides', () => {
      const result = NearbyQuerySchema.parse(validBase);
      expect(result.lat).toBe(48.85);
      expect(result.lng).toBe(2.35);
    });

    it('❌ Doit rejeter si lat est absent', () => {
      const result = NearbyQuerySchema.safeParse({ lng: '2.35' });
      expect(result.success).toBe(false);
    });

    it('❌ Doit rejeter si lng est absent', () => {
      const result = NearbyQuerySchema.safeParse({ lat: '48.85' });
      expect(result.success).toBe(false);
    });

    it('❌ Doit rejeter lat > 90', () => {
      const result = NearbyQuerySchema.safeParse({ lat: '91', lng: '0' });
      expect(result.success).toBe(false);
    });

    it('❌ Doit rejeter lat < -90', () => {
      const result = NearbyQuerySchema.safeParse({ lat: '-91', lng: '0' });
      expect(result.success).toBe(false);
    });

    it('✅ Doit accepter lat = 90 (pôle Nord)', () => {
      const result = NearbyQuerySchema.safeParse({ lat: '90', lng: '0' });
      expect(result.success).toBe(true);
    });

    it('✅ Doit accepter lat = -90 (pôle Sud)', () => {
      const result = NearbyQuerySchema.safeParse({ lat: '-90', lng: '0' });
      expect(result.success).toBe(true);
    });

    it('❌ Doit rejeter lng > 180', () => {
      const result = NearbyQuerySchema.safeParse({ lat: '0', lng: '181' });
      expect(result.success).toBe(false);
    });

    it('❌ Doit rejeter lng < -180', () => {
      const result = NearbyQuerySchema.safeParse({ lat: '0', lng: '-181' });
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // Coercion string → number
  // =========================================================================
  describe('Coercion string → number', () => {
    it('✅ Doit convertir lat et lng en number depuis string', () => {
      const result = NearbyQuerySchema.parse(validBase);
      expect(typeof result.lat).toBe('number');
      expect(typeof result.lng).toBe('number');
    });

    it('✅ Doit convertir radius en number depuis string', () => {
      const result = NearbyQuerySchema.parse({ ...validBase, radius: '20' });
      expect(result.radius).toBe(20);
      expect(typeof result.radius).toBe('number');
    });
  });

  // =========================================================================
  // radius
  // =========================================================================
  describe('radius', () => {
    it('✅ Doit appliquer radius=10 par défaut si absent', () => {
      const result = NearbyQuerySchema.parse(validBase);
      expect(result.radius).toBe(10);
    });

    it('✅ Doit appliquer radius=10 si chaîne vide', () => {
      const result = NearbyQuerySchema.parse({ ...validBase, radius: '' });
      expect(result.radius).toBe(10);
    });

    it('✅ Doit accepter radius=50 (maximum)', () => {
      const result = NearbyQuerySchema.safeParse({ ...validBase, radius: '50' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.radius).toBe(50);
    });

    it('❌ Doit rejeter radius=51 (au-dessus du maximum)', () => {
      const result = NearbyQuerySchema.safeParse({ ...validBase, radius: '51' });
      expect(result.success).toBe(false);
    });

    it('❌ Doit rejeter radius=0', () => {
      const result = NearbyQuerySchema.safeParse({ ...validBase, radius: '0' });
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // limit
  // =========================================================================
  describe('limit', () => {
    it('✅ Doit appliquer limit=200 par défaut si absent', () => {
      const result = NearbyQuerySchema.parse(validBase);
      expect(result.limit).toBe(200);
    });

    it('✅ Doit accepter limit=100', () => {
      const result = NearbyQuerySchema.parse({ ...validBase, limit: '100' });
      expect(result.limit).toBe(100);
    });

    it('✅ Doit accepter limit=200 (maximum)', () => {
      const result = NearbyQuerySchema.safeParse({ ...validBase, limit: '200' });
      expect(result.success).toBe(true);
    });

    it('❌ Doit rejeter limit=201 (au-dessus du maximum)', () => {
      const result = NearbyQuerySchema.safeParse({ ...validBase, limit: '201' });
      expect(result.success).toBe(false);
    });

    it('❌ Doit rejeter limit=0', () => {
      const result = NearbyQuerySchema.safeParse({ ...validBase, limit: '0' });
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // categoryIds
  // =========================================================================
  describe('categoryIds', () => {
    it('✅ Doit parser "1,2,3" en tableau [1, 2, 3]', () => {
      const result = NearbyQuerySchema.parse({
        ...validBase,
        categoryIds: '1,2,3',
      });
      expect(result.categoryIds).toEqual([1, 2, 3]);
    });

    it('✅ Doit parser un seul ID "5" en tableau [5]', () => {
      const result = NearbyQuerySchema.parse({
        ...validBase,
        categoryIds: '5',
      });
      expect(result.categoryIds).toEqual([5]);
    });

    it('✅ Doit filtrer les valeurs non-numériques de la liste', () => {
      const result = NearbyQuerySchema.parse({
        ...validBase,
        categoryIds: '1,abc,3',
      });
      expect(result.categoryIds).toEqual([1, 3]);
    });

    it('✅ Doit retourner undefined si categoryIds est absent', () => {
      const result = NearbyQuerySchema.parse(validBase);
      expect(result.categoryIds).toBeUndefined();
    });

    it('✅ Doit retourner undefined si categoryIds est une chaîne vide', () => {
      const result = NearbyQuerySchema.parse({ ...validBase, categoryIds: '' });
      expect(result.categoryIds).toBeUndefined();
    });
  });

  // =========================================================================
  // createdAfter / createdBefore
  // =========================================================================
  describe('createdAfter et createdBefore', () => {
    it('✅ Doit transformer une date ISO en objet Date', () => {
      const result = NearbyQuerySchema.parse({
        ...validBase,
        createdAfter: '2024-01-01',
      });
      expect(result.createdAfter).toBeInstanceOf(Date);
    });

    it('✅ Doit transformer createdBefore en objet Date', () => {
      const result = NearbyQuerySchema.parse({
        ...validBase,
        createdBefore: '2025-12-31',
      });
      expect(result.createdBefore).toBeInstanceOf(Date);
    });

    it('❌ Doit rejeter une date invalide pour createdAfter', () => {
      const result = NearbyQuerySchema.safeParse({
        ...validBase,
        createdAfter: 'not-a-date',
      });
      expect(result.success).toBe(false);
    });

    it('❌ Doit rejeter une date invalide pour createdBefore', () => {
      const result = NearbyQuerySchema.safeParse({
        ...validBase,
        createdBefore: '99-99-9999',
      });
      expect(result.success).toBe(false);
    });

    it('✅ Doit retourner undefined si createdAfter est absent', () => {
      const result = NearbyQuerySchema.parse(validBase);
      expect(result.createdAfter).toBeUndefined();
    });

    it('✅ Doit retourner undefined si createdAfter est une chaîne vide', () => {
      const result = NearbyQuerySchema.parse({
        ...validBase,
        createdAfter: '',
      });
      expect(result.createdAfter).toBeUndefined();
    });
  });

  // =========================================================================
  // Combinaison complète
  // =========================================================================
  describe('Combinaison complète', () => {
    it('✅ Doit parser un ensemble complet de query params', () => {
      const result = NearbyQuerySchema.parse({
        lat: '48.85',
        lng: '2.35',
        radius: '15',
        limit: '50',
        categoryIds: '1,3',
        createdAfter: '2024-01-01',
        createdBefore: '2025-01-01',
      });

      expect(result.lat).toBe(48.85);
      expect(result.lng).toBe(2.35);
      expect(result.radius).toBe(15);
      expect(result.limit).toBe(50);
      expect(result.categoryIds).toEqual([1, 3]);
      expect(result.createdAfter).toBeInstanceOf(Date);
      expect(result.createdBefore).toBeInstanceOf(Date);
    });
  });
});
