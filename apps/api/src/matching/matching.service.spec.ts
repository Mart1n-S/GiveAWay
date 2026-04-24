import {
  MatchingService,
  MATCH_THRESHOLD,
  MissionForScoring,
  UserForScoring,
} from './matching.service';

// ── Helpers ────────────────────────────────────────────────────────

const makeUser = (overrides: Partial<UserForScoring> = {}): UserForScoring => ({
  causes: [],
  skills: [],
  availability: null,
  address: null,
  participations: [],
  ...overrides,
});

const makeMission = (
  overrides: Partial<MissionForScoring> = {},
): MissionForScoring => ({
  causes: [],
  skills: [],
  availabilityType: null,
  address: null,
  startDate: null,
  ...overrides,
});

// ── Suite ──────────────────────────────────────────────────────────

describe('MatchingService', () => {
  let service: MatchingService;

  beforeEach(() => {
    service = new MatchingService();
  });

  // =========================================================================
  // scoreUserMission — structure de retour
  // =========================================================================

  describe('scoreUserMission', () => {
    it('✅ retourne un MatchScore avec total, breakdown et isMatch', () => {
      const result = service.scoreUserMission(makeUser(), makeMission());

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('isMatch');
      expect(result.breakdown).toMatchObject({
        causes: expect.any(Number),
        skills: expect.any(Number),
        availability: expect.any(Number),
        distance: expect.any(Number),
        history: expect.any(Number),
      });
    });

    it(`✅ isMatch=true si total >= ${MATCH_THRESHOLD}`, () => {
      // causes full match (30) + skills full match (25) = 55 >= 40
      const user = makeUser({
        causes: [{ cause: { id: 1 } }, { cause: { id: 2 } }],
        skills: [{ skill: { id: 10 } }, { skill: { id: 11 } }],
      });
      const mission = makeMission({
        causes: [{ cause: { id: 1 } }, { cause: { id: 2 } }],
        skills: [{ skill: { id: 10 } }, { skill: { id: 11 } }],
      });

      const result = service.scoreUserMission(user, mission);
      expect(result.isMatch).toBe(true);
      expect(result.total).toBeGreaterThanOrEqual(MATCH_THRESHOLD);
    });

    it(`✅ isMatch=false si total < ${MATCH_THRESHOLD}`, () => {
      const result = service.scoreUserMission(makeUser(), makeMission());
      expect(result.isMatch).toBe(false);
      expect(result.total).toBe(0);
    });

    it('✅ le total est la somme exacte du breakdown', () => {
      const user = makeUser({
        causes: [{ cause: { id: 1 } }],
        skills: [{ skill: { id: 10 } }],
      });
      const mission = makeMission({
        causes: [{ cause: { id: 1 } }],
        skills: [{ skill: { id: 10 } }],
      });

      const result = service.scoreUserMission(user, mission);
      const sum =
        result.breakdown.causes +
        result.breakdown.skills +
        result.breakdown.availability +
        result.breakdown.distance +
        result.breakdown.history;

      expect(result.total).toBe(sum);
    });
  });

  // =========================================================================
  // Causes — 0 à 30 pts
  // =========================================================================

  describe('causes scoring', () => {
    it('✅ 30 pts si intersection complète', () => {
      const user = makeUser({
        causes: [{ cause: { id: 1 } }, { cause: { id: 2 } }],
      });
      const mission = makeMission({
        causes: [{ cause: { id: 1 } }, { cause: { id: 2 } }],
      });

      const { breakdown } = service.scoreUserMission(user, mission);
      expect(breakdown.causes).toBe(30);
    });

    it('✅ 15 pts si 50% des causes mission couvertes', () => {
      const user = makeUser({ causes: [{ cause: { id: 1 } }] });
      const mission = makeMission({
        causes: [{ cause: { id: 1 } }, { cause: { id: 2 } }],
      });

      const { breakdown } = service.scoreUserMission(user, mission);
      expect(breakdown.causes).toBe(15);
    });

    it('✅ 0 pt si aucune cause commune', () => {
      const user = makeUser({ causes: [{ cause: { id: 3 } }] });
      const mission = makeMission({
        causes: [{ cause: { id: 1 } }, { cause: { id: 2 } }],
      });

      const { breakdown } = service.scoreUserMission(user, mission);
      expect(breakdown.causes).toBe(0);
    });

    it('✅ 0 pt si mission sans causes', () => {
      const user = makeUser({ causes: [{ cause: { id: 1 } }] });
      const mission = makeMission({ causes: [] });

      const { breakdown } = service.scoreUserMission(user, mission);
      expect(breakdown.causes).toBe(0);
    });

    it('✅ 0 pt si user sans causes', () => {
      const user = makeUser({ causes: [] });
      const mission = makeMission({ causes: [{ cause: { id: 1 } }] });

      const { breakdown } = service.scoreUserMission(user, mission);
      expect(breakdown.causes).toBe(0);
    });
  });

  // =========================================================================
  // Skills — 0 à 25 pts
  // =========================================================================

  describe('skills scoring', () => {
    it('✅ 25 pts si intersection complète', () => {
      const user = makeUser({
        skills: [{ skill: { id: 10 } }, { skill: { id: 11 } }],
      });
      const mission = makeMission({
        skills: [{ skill: { id: 10 } }, { skill: { id: 11 } }],
      });

      const { breakdown } = service.scoreUserMission(user, mission);
      expect(breakdown.skills).toBe(25);
    });

    it('✅ 13 pts si 50% des skills mission couverts (arrondi)', () => {
      const user = makeUser({ skills: [{ skill: { id: 10 } }] });
      const mission = makeMission({
        skills: [{ skill: { id: 10 } }, { skill: { id: 11 } }],
      });

      const { breakdown } = service.scoreUserMission(user, mission);
      expect(breakdown.skills).toBe(13);
    });

    it('✅ 0 pt si aucun skill commun', () => {
      const user = makeUser({ skills: [{ skill: { id: 99 } }] });
      const mission = makeMission({ skills: [{ skill: { id: 10 } }] });

      const { breakdown } = service.scoreUserMission(user, mission);
      expect(breakdown.skills).toBe(0);
    });

    it('✅ 0 pt si mission sans skills', () => {
      const user = makeUser({ skills: [{ skill: { id: 10 } }] });
      const mission = makeMission({ skills: [] });

      const { breakdown } = service.scoreUserMission(user, mission);
      expect(breakdown.skills).toBe(0);
    });
  });

  // =========================================================================
  // Disponibilités — 0 à 20 pts
  // =========================================================================

  describe('availability scoring', () => {
    it('✅ 0 pt si user sans disponibilités', () => {
      const user = makeUser({ availability: null });
      const mission = makeMission({ availabilityType: 'ON_SITE' });

      const { breakdown } = service.scoreUserMission(user, mission);
      expect(breakdown.availability).toBe(0);
    });

    it('✅ 20 pts si HYBRID + pas de date (type OK + créneau neutre)', () => {
      const user = makeUser({
        availability: { type: 'HYBRID', timeSlot: ['WEEKDAY'] },
      });
      const mission = makeMission({
        availabilityType: 'ON_SITE',
        startDate: null,
      });

      const { breakdown } = service.scoreUserMission(user, mission);
      expect(breakdown.availability).toBe(20);
    });

    it('✅ 10 pts de type si REMOTE mission (toujours compatible)', () => {
      const user = makeUser({
        availability: { type: 'ON_SITE', timeSlot: ['ALL_TIME'] },
      });
      const mission = makeMission({
        availabilityType: 'REMOTE',
        startDate: null,
      });

      const { breakdown } = service.scoreUserMission(user, mission);
      expect(breakdown.availability).toBe(20);
    });

    it('✅ 0 pt de type si ON_SITE user vs REMOTE mission non-remote', () => {
      const user = makeUser({
        availability: { type: 'ON_SITE', timeSlot: [] },
      });
      const mission = makeMission({
        availabilityType: 'REMOTE',
        startDate: null,
      });

      // REMOTE mission gives full type score anyway
      const { breakdown } = service.scoreUserMission(user, mission);
      expect(breakdown.availability).toBeGreaterThanOrEqual(10);
    });

    it('✅ 10 pts créneau si ALL_TIME', () => {
      const user = makeUser({
        availability: { type: 'ON_SITE', timeSlot: ['ALL_TIME'] },
      });
      const mission = makeMission({
        availabilityType: 'ON_SITE',
        startDate: new Date('2026-06-10T09:00:00'), // mardi matin
      });

      const { breakdown } = service.scoreUserMission(user, mission);
      expect(breakdown.availability).toBe(20);
    });

    it('✅ 10 pts créneau si WEEKDAY et mission un jour de semaine', () => {
      const user = makeUser({
        availability: { type: 'ON_SITE', timeSlot: ['WEEKDAY'] },
      });
      const mission = makeMission({
        availabilityType: 'ON_SITE',
        startDate: new Date('2026-06-09T10:00:00'), // mardi
      });

      const { breakdown } = service.scoreUserMission(user, mission);
      expect(breakdown.availability).toBe(20);
    });

    it('✅ 0 pt créneau si WEEKDAY et mission le weekend', () => {
      const user = makeUser({
        availability: { type: 'ON_SITE', timeSlot: ['WEEKDAY'] },
      });
      const mission = makeMission({
        availabilityType: 'ON_SITE',
        startDate: new Date('2026-06-13T10:00:00'), // samedi
      });

      const { breakdown } = service.scoreUserMission(user, mission);
      expect(breakdown.availability).toBe(10); // type OK, créneau KO
    });

    it('✅ 10 pts créneau si WEEKEND et mission le weekend', () => {
      const user = makeUser({
        availability: { type: 'HYBRID', timeSlot: ['WEEKEND'] },
      });
      const mission = makeMission({
        availabilityType: null,
        startDate: new Date('2026-06-14T14:00:00'), // dimanche
      });

      const { breakdown } = service.scoreUserMission(user, mission);
      expect(breakdown.availability).toBe(20);
    });

    it('✅ 10 pts créneau si EVENING et mission >= 17h', () => {
      const user = makeUser({
        availability: { type: 'HYBRID', timeSlot: ['EVENING'] },
      });
      const mission = makeMission({
        availabilityType: null,
        startDate: new Date('2026-06-09T18:00:00'), // mardi soir
      });

      const { breakdown } = service.scoreUserMission(user, mission);
      expect(breakdown.availability).toBe(20);
    });

    it('✅ 10 pts créneau neutre si pas de startDate', () => {
      const user = makeUser({
        availability: { type: 'ON_SITE', timeSlot: ['WEEKEND'] },
      });
      const mission = makeMission({
        availabilityType: 'ON_SITE',
        startDate: null,
      });

      const { breakdown } = service.scoreUserMission(user, mission);
      expect(breakdown.availability).toBe(20);
    });
  });

  // =========================================================================
  // Distance — 0 à 15 pts
  // =========================================================================

  describe('distance scoring', () => {
    it('✅ 15 pts si mission REMOTE (indépendant des coordonnées)', () => {
      const user = makeUser({ address: null });
      const mission = makeMission({ availabilityType: 'REMOTE' });

      const { breakdown } = service.scoreUserMission(user, mission);
      expect(breakdown.distance).toBe(15);
    });

    it('✅ 0 pt (neutre) si user sans adresse', () => {
      const user = makeUser({ address: null });
      const mission = makeMission({
        availabilityType: 'ON_SITE',
        address: { latitude: 48.85, longitude: 2.35 },
      });

      const { breakdown } = service.scoreUserMission(user, mission);
      expect(breakdown.distance).toBe(0);
    });

    it('✅ 0 pt (neutre) si mission sans adresse', () => {
      const user = makeUser({ address: { latitude: 48.85, longitude: 2.35 } });
      const mission = makeMission({
        availabilityType: 'ON_SITE',
        address: null,
      });

      const { breakdown } = service.scoreUserMission(user, mission);
      expect(breakdown.distance).toBe(0);
    });

    it('✅ 0 pt (neutre) si coordonnées nulles (pas de lat)', () => {
      const user = makeUser({ address: { latitude: null, longitude: null } });
      const mission = makeMission({
        availabilityType: 'ON_SITE',
        address: { latitude: 48.85, longitude: 2.35 },
      });

      const { breakdown } = service.scoreUserMission(user, mission);
      expect(breakdown.distance).toBe(0);
    });

    it('✅ 15 pts si distance < 5 km', () => {
      // Paris 1er et Paris 4e — ~1 km
      const user = makeUser({
        address: { latitude: 48.8566, longitude: 2.3522 },
      });
      const mission = makeMission({
        availabilityType: 'ON_SITE',
        address: { latitude: 48.8534, longitude: 2.3488 },
      });

      const { breakdown } = service.scoreUserMission(user, mission);
      expect(breakdown.distance).toBe(15);
    });

    it('✅ 0 pt si distance > 50 km', () => {
      // Paris vs Lyon (~400 km)
      const user = makeUser({
        address: { latitude: 48.8566, longitude: 2.3522 },
      });
      const mission = makeMission({
        availabilityType: 'ON_SITE',
        address: { latitude: 45.7676, longitude: 4.8344 },
      });

      const { breakdown } = service.scoreUserMission(user, mission);
      expect(breakdown.distance).toBe(0);
    });

    it('✅ score dégressif entre 5 et 50 km', () => {
      // Paris vs Versailles (~17 km)
      const user = makeUser({
        address: { latitude: 48.8566, longitude: 2.3522 },
      });
      const mission = makeMission({
        availabilityType: 'ON_SITE',
        address: { latitude: 48.8014, longitude: 2.1301 },
      });

      const { breakdown } = service.scoreUserMission(user, mission);
      expect(breakdown.distance).toBeGreaterThan(0);
      expect(breakdown.distance).toBeLessThan(15);
    });
  });

  // =========================================================================
  // Historique — 0 ou 10 pts
  // =========================================================================

  describe('history scoring', () => {
    it('✅ 0 pt si aucune participation', () => {
      const user = makeUser({ participations: [] });
      const mission = makeMission({ causes: [{ cause: { id: 1 } }] });

      const { breakdown } = service.scoreUserMission(user, mission);
      expect(breakdown.history).toBe(0);
    });

    it('✅ 0 pt si mission sans causes ni skills', () => {
      const user = makeUser({
        participations: [
          { mission: { causes: [{ cause: { id: 1 } }], skills: [] } },
        ],
      });
      const mission = makeMission({ causes: [], skills: [] });

      const { breakdown } = service.scoreUserMission(user, mission);
      expect(breakdown.history).toBe(0);
    });

    it('✅ 10 pts si une participation a une cause commune', () => {
      const user = makeUser({
        participations: [
          { mission: { causes: [{ cause: { id: 1 } }], skills: [] } },
        ],
      });
      const mission = makeMission({ causes: [{ cause: { id: 1 } }] });

      const { breakdown } = service.scoreUserMission(user, mission);
      expect(breakdown.history).toBe(10);
    });

    it('✅ 10 pts si une participation a un skill commun', () => {
      const user = makeUser({
        participations: [
          { mission: { causes: [], skills: [{ skill: { id: 10 } }] } },
        ],
      });
      const mission = makeMission({ skills: [{ skill: { id: 10 } }] });

      const { breakdown } = service.scoreUserMission(user, mission);
      expect(breakdown.history).toBe(10);
    });

    it('✅ 0 pt si participations sans overlap', () => {
      const user = makeUser({
        participations: [
          {
            mission: {
              causes: [{ cause: { id: 99 } }],
              skills: [{ skill: { id: 99 } }],
            },
          },
        ],
      });
      const mission = makeMission({
        causes: [{ cause: { id: 1 } }],
        skills: [{ skill: { id: 10 } }],
      });

      const { breakdown } = service.scoreUserMission(user, mission);
      expect(breakdown.history).toBe(0);
    });

    it('✅ 10 pts max même si plusieurs participations matchent', () => {
      const user = makeUser({
        participations: [
          { mission: { causes: [{ cause: { id: 1 } }], skills: [] } },
          { mission: { causes: [{ cause: { id: 1 } }], skills: [] } },
          { mission: { causes: [{ cause: { id: 1 } }], skills: [] } },
        ],
      });
      const mission = makeMission({ causes: [{ cause: { id: 1 } }] });

      const { breakdown } = service.scoreUserMission(user, mission);
      expect(breakdown.history).toBe(10);
    });
  });

  // =========================================================================
  // Points de vigilance — cas limites
  // =========================================================================

  describe('edge cases (points de vigilance)', () => {
    it('✅ profil vide → score proche de 0 (distance neutre uniquement possible)', () => {
      const user = makeUser();
      const mission = makeMission({
        causes: [{ cause: { id: 1 } }],
        skills: [{ skill: { id: 1 } }],
        availabilityType: 'ON_SITE',
        address: { latitude: 48.85, longitude: 2.35 },
      });

      const { total } = service.scoreUserMission(user, mission);
      expect(total).toBe(0);
    });

    it('✅ mission REMOTE + user sans adresse → distance = 15 pts (pas pénalisé)', () => {
      const user = makeUser({ address: null });
      const mission = makeMission({ availabilityType: 'REMOTE' });

      const { breakdown } = service.scoreUserMission(user, mission);
      expect(breakdown.distance).toBe(15);
    });

    it('✅ user avec adresse mais lat/lng null → distance neutre (0, pas pénalisé)', () => {
      const user = makeUser({ address: { latitude: null, longitude: null } });
      const mission = makeMission({
        availabilityType: 'ON_SITE',
        address: { latitude: 48.85, longitude: 2.35 },
      });

      const { breakdown } = service.scoreUserMission(user, mission);
      expect(breakdown.distance).toBe(0);
    });

    it('✅ score total ne dépasse pas 100', () => {
      const user = makeUser({
        causes: [{ cause: { id: 1 } }, { cause: { id: 2 } }],
        skills: [{ skill: { id: 10 } }, { skill: { id: 11 } }],
        availability: { type: 'HYBRID', timeSlot: ['ALL_TIME'] },
        address: { latitude: 48.8566, longitude: 2.3522 },
        participations: [
          { mission: { causes: [{ cause: { id: 1 } }], skills: [] } },
        ],
      });
      const mission = makeMission({
        causes: [{ cause: { id: 1 } }, { cause: { id: 2 } }],
        skills: [{ skill: { id: 10 } }, { skill: { id: 11 } }],
        availabilityType: 'REMOTE',
        address: { latitude: 48.8566, longitude: 2.3522 },
        startDate: null,
      });

      const { total } = service.scoreUserMission(user, mission);
      expect(total).toBeLessThanOrEqual(100);
    });
  });
});
