import {
  PrismaClient,
  UserStatus,
  AdminRole,
  AssociationRole,
  ActivityType,
  MissionStatus,
  MissionFrequency,
  Association,
  User,
  AvailabilityFrequency,
  AvailabilityTime,
  AvailabilityType,
} from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../../.env' });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not defined');
}
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Labels de référence (source de vérité)
const skillsList = [
  'Informatique',
  'Communication',
  'Gestion de projets',
  'Gestion administrative',
  'Travaux manuels',
  'Logistique',
  'Gestion financière / comptabilité',
  'Gestion des ressources humaines',
  'Secourisme et sécurité civile',
  'Droit et conseil juridique',
  'Médical',
  'Traduction',
  'Cuisine',
  'Jardinage',
  'Animation',
  'Photographie / Vidéo',
] as const;

const causesList = [
  "Lutte contre l'isolement",
  'Animation / Loisirs',
  'Mentorat & Parrainage',
  'Actions de sensibilisation',
  'Soutien scolaire et formation',
  'Accueil / Information',
  'Événementiel',
  'Activités sportives',
  'Services à la personne',
  'Alphabétisation / Apprentissage du français (FLE)',
  'Aide aux démarches administratives',
  'Vie citoyenne',
  'Distribution',
  'Recherche de partenariats',
  'Collecte de produits',
  'Écoute / Aide psychologique',
  'Soins aux animaux',
  'Médiation culturelle',
  'Gouvernance',
  'Accompagnement à la mobilité',
  'Dialogue interculturel',
  'Collecte de fonds',
  "Aménagement d'espaces naturels",
  'Valorisation du patrimoine',
  'Maraude',
  'Ramassage de déchets',
  "Protection de l'environnement",
  "Droits de l'homme",
] as const;

const publicsList = [
  'Enfants',
  'Adolescents',
  'Séniors',
  'Personnes handicapées',
  'Personnes sans-abri',
  'Réfugiés / Migrants',
  'Familles en difficulté',
  'Étudiants',
  'Animaux',
  'Nature / Espaces verts',
] as const;

const volunteerTypesList = [
  'Ouvert à tous',
  'Majeurs uniquement',
  'Bonne condition physique',
  'Accessible PMR',
  'Femmes uniquement',
  'Experts / Professionnels',
  'Étudiants',
  'Bilingue requis',
] as const;

const categoriesList = [
  'Humanitaire & Solidarité',
  'Environnement & Nature',
  'Éducation & Jeunesse',
  'Santé & Médical',
  'Culture & Patrimoine',
  'Sport',
  'Défense des animaux',
  "Aide à l'insertion",
  'Loisirs & Vie sociale',
] as const;

type SkillLabel = (typeof skillsList)[number];
type CauseLabel = (typeof causesList)[number];
type PublicLabel = (typeof publicsList)[number];
type VolunteerTypeLabel = (typeof volunteerTypesList)[number];
type CategoryName = (typeof categoriesList)[number];

async function main() {
  console.log('🗑️ Reset complet de la base...');

  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "admin_logs", "admins", "mission_participants", "mission_public_types",
      "mission_volunteer_types", "mission_skills", "mission_causes", "missions",
      "volunteer_types", "public_types", "skills", "causes", "user_availabilities",
      "user_skills", "user_causes", "refresh_tokens", "token", "association_documents",
      "association_users", "associations", "association_categories", "users", "addresses"
    RESTART IDENTITY CASCADE;
  `);

  console.log('✅ Base reset. Début du seeding...');

  const passwordHash = await argon2.hash('password');
  const now = new Date();
  const inOneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const inTwoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const inOneMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    // =========================================================================
    // 1. Références
    // =========================================================================
    await tx.skill.createMany({ data: skillsList.map((label) => ({ label })) });
    await tx.cause.createMany({ data: causesList.map((label) => ({ label })) });
    await tx.publicType.createMany({
      data: publicsList.map((label) => ({ label })),
    });
    await tx.volunteerType.createMany({
      data: volunteerTypesList.map((label) => ({ label })),
    });
    await tx.associationCategory.createMany({
      data: categoriesList.map((name) => ({ name })),
    });

    const allSkills = await tx.skill.findMany();
    const allCauses = await tx.cause.findMany();
    const allPublics = await tx.publicType.findMany();
    const allVolunteerTypes = await tx.volunteerType.findMany();
    const categories = await tx.associationCategory.findMany();

    const skillId = (label: SkillLabel) =>
      allSkills.find((x) => x.label === label)!.id;
    const causeId = (label: CauseLabel) =>
      allCauses.find((x) => x.label === label)!.id;
    const publicId = (label: PublicLabel) =>
      allPublics.find((x) => x.label === label)!.id;
    const volunteerTypeId = (label: VolunteerTypeLabel) =>
      allVolunteerTypes.find((x) => x.label === label)!.id;
    const categoryId = (name: CategoryName) =>
      categories.find((x) => x.name === name)!.id;

    // =========================================================================
    // 2. Admin Système
    // =========================================================================
    await tx.admin.create({
      data: {
        email: 'superadmin@giveaway.fr',
        password: passwordHash,
        firstName: 'Master',
        lastName: 'Admin',
        role: AdminRole.SUPER_ADMIN,
      },
    });

    await tx.admin.create({
      data: {
        email: 'admin@gmail.com',
        password: passwordHash,
        firstName: 'Martin',
        lastName: 'Simon',
        role: AdminRole.SUPER_ADMIN,
      },
    });

    // =========================================================================
    // 3. Utilisateurs
    // =========================================================================
    const usersData = [
      // index 0
      {
        email: 'admin@gmail.com',
        firstName: 'Admin',
        lastName: 'GiveAway',
        age: 30,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        street: '123 Rue de la Solidarité',
        cp: '13100',
        city: 'Aix-en-Provence',
        lat: 43.5297,
        lng: 5.4474,
        availability: {
          frequency: [
            AvailabilityFrequency.HOURS_WEEK,
            AvailabilityFrequency.DAYS_WEEK,
          ],
          timeSlot: [AvailabilityTime.WEEKDAY, AvailabilityTime.WEEKEND],
          type: AvailabilityType.HYBRID,
        },
        skills: [
          'Gestion de projets',
          'Communication',
          'Gestion administrative',
        ] satisfies SkillLabel[],
        causes: [
          "Lutte contre l'isolement",
          'Distribution',
          'Maraude',
        ] satisfies CauseLabel[],
      },
      // index 1
      {
        email: 'user1@gmail.com',
        firstName: 'Jean',
        lastName: 'Dupont',
        age: 25,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        street: '45 Cours Mirabeau',
        cp: '13100',
        city: 'Aix-en-Provence',
        lat: 43.5263,
        lng: 5.4453,
        availability: {
          frequency: [AvailabilityFrequency.HOURS_WEEK],
          timeSlot: [AvailabilityTime.EVENING, AvailabilityTime.WEEKEND],
          type: AvailabilityType.ON_SITE,
        },
        skills: ['Cuisine', 'Logistique', 'Animation'] satisfies SkillLabel[],
        causes: [
          'Distribution',
          'Événementiel',
          'Animation / Loisirs',
        ] satisfies CauseLabel[],
      },
      // index 2
      {
        email: 'user2@gmail.com',
        firstName: 'Marie',
        lastName: 'Curie',
        age: 28,
        status: UserStatus.PENDING,
        emailVerified: false,
        street: '12 Rue Paul Bert',
        cp: '13100',
        city: 'Aix-en-Provence',
        lat: 43.5283,
        lng: 5.4502,
        availability: null,
        skills: [] as SkillLabel[],
        causes: [] as CauseLabel[],
      },
      // index 3
      {
        email: 'user3@gmail.com',
        firstName: 'Jane',
        lastName: 'Doe',
        age: 32,
        status: UserStatus.SUSPENDED,
        emailVerified: true,
        street: '78 Avenue des Belges',
        cp: '13100',
        city: 'Aix-en-Provence',
        lat: 43.5341,
        lng: 5.4412,
        availability: null,
        skills: [] as SkillLabel[],
        causes: [] as CauseLabel[],
      },
      // index 4
      {
        email: 'user4@gmail.com',
        firstName: 'John',
        lastName: 'Doe',
        age: 28,
        status: UserStatus.DELETED,
        emailVerified: true,
        street: '56 Rue Espariat',
        cp: '13100',
        city: 'Aix-en-Provence',
        lat: 43.5291,
        lng: 5.4466,
        availability: null,
        skills: [] as SkillLabel[],
        causes: [] as CauseLabel[],
      },
      // index 5
      {
        email: 'benevole1@gmail.com',
        firstName: 'Sophie',
        lastName: 'Martin',
        age: 35,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        street: '3 Rue des Cordeliers',
        cp: '13100',
        city: 'Aix-en-Provence',
        lat: 43.5275,
        lng: 5.4489,
        availability: {
          frequency: [
            AvailabilityFrequency.DAYS_WEEK,
            AvailabilityFrequency.HOURS_MONTH,
          ],
          timeSlot: [AvailabilityTime.ALL_TIME],
          type: AvailabilityType.HYBRID,
        },
        skills: [
          'Médical',
          'Secourisme et sécurité civile',
        ] satisfies SkillLabel[],
        causes: [
          'Écoute / Aide psychologique',
          'Services à la personne',
          "Lutte contre l'isolement",
        ] satisfies CauseLabel[],
      },
      // index 6
      {
        email: 'benevole2@gmail.com',
        firstName: 'Lucas',
        lastName: 'Bernard',
        age: 22,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        street: '18 Rue de la Molle',
        cp: '13100',
        city: 'Aix-en-Provence',
        lat: 43.5312,
        lng: 5.4521,
        availability: {
          frequency: [
            AvailabilityFrequency.PUNCTUAL,
            AvailabilityFrequency.ONE_DAY,
          ],
          timeSlot: [AvailabilityTime.WEEKEND],
          type: AvailabilityType.ON_SITE,
        },
        skills: ['Jardinage', 'Travaux manuels'] satisfies SkillLabel[],
        causes: [
          'Ramassage de déchets',
          "Protection de l'environnement",
          "Aménagement d'espaces naturels",
        ] satisfies CauseLabel[],
      },
      // index 7 — responsable Croix-Rouge
      {
        email: 'responsable1@gmail.com',
        firstName: 'Claire',
        lastName: 'Fontaine',
        age: 42,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        street: '22 Rue Joseph Cabassol',
        cp: '13100',
        city: 'Aix-en-Provence',
        lat: 43.5308,
        lng: 5.4512,
        availability: {
          frequency: [AvailabilityFrequency.DAYS_WEEK],
          timeSlot: [AvailabilityTime.WEEKDAY],
          type: AvailabilityType.ON_SITE,
        },
        skills: [
          'Secourisme et sécurité civile',
          'Gestion de projets',
        ] satisfies SkillLabel[],
        causes: [
          'Écoute / Aide psychologique',
          'Maraude',
        ] satisfies CauseLabel[],
      },
      // index 8 — responsable Mémoires de Provence
      {
        email: 'responsable2@gmail.com',
        firstName: 'Marc',
        lastName: 'Aubert',
        age: 50,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        street: '9 Rue Gaston de Saporta',
        cp: '13100',
        city: 'Aix-en-Provence',
        lat: 43.5294,
        lng: 5.4477,
        availability: {
          frequency: [AvailabilityFrequency.HOURS_WEEK],
          timeSlot: [AvailabilityTime.WEEKDAY, AvailabilityTime.WEEKEND],
          type: AvailabilityType.HYBRID,
        },
        skills: [
          'Gestion administrative',
          'Photographie / Vidéo',
        ] satisfies SkillLabel[],
        causes: [
          'Médiation culturelle',
          'Valorisation du patrimoine',
        ] satisfies CauseLabel[],
      },

      // ========================================================================
      // 🎯 PROFILS DE TEST POUR LE MATCHING (mot de passe : "password")
      // Ces utilisateurs sont conçus pour démontrer l'algorithme de matching
      // (apps/api/src/matching/matching.service.ts) et la mise en avant côté
      // mobile (toggle "Pour moi" sur la carte et la liste des missions).
      // Seuil de match : 40 / 100.
      // ========================================================================

      // index 9 — match-strong : profil aligné sur "Distribution de repas chauds"
      // (Restos du Cœur). Skills = Cuisine + Logistique (overlap 100%) ;
      // Causes = Distribution + Maraude (overlap 100%) ; Dispo ON_SITE compatible ;
      // Adresse à Aix (distance < 5 km → 15 pts). Score attendu ≥ 80.
      {
        email: 'match-strong@gmail.com',
        firstName: 'Strong',
        lastName: 'Match',
        age: 30,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        street: '60 Avenue Sainte-Victoire',
        cp: '13100',
        city: 'Aix-en-Provence',
        lat: 43.5328,
        lng: 5.458,
        availability: {
          frequency: [AvailabilityFrequency.HOURS_WEEK],
          timeSlot: [AvailabilityTime.ALL_TIME],
          type: AvailabilityType.ON_SITE,
        },
        skills: ['Cuisine', 'Logistique'] satisfies SkillLabel[],
        causes: [
          'Distribution',
          'Maraude',
          "Lutte contre l'isolement",
        ] satisfies CauseLabel[],
      },

      // index 10 — match-medium : profil partiellement aligné. Match modéré
      // attendu sur plusieurs missions (40-65), aucun match parfait.
      {
        email: 'match-medium@gmail.com',
        firstName: 'Medium',
        lastName: 'Match',
        age: 27,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        street: '14 Rue Granet',
        cp: '13100',
        city: 'Aix-en-Provence',
        lat: 43.5298,
        lng: 5.4482,
        availability: {
          frequency: [AvailabilityFrequency.PUNCTUAL],
          timeSlot: [AvailabilityTime.WEEKEND],
          type: AvailabilityType.HYBRID,
        },
        skills: ['Animation', 'Communication'] satisfies SkillLabel[],
        causes: ['Événementiel'] satisfies CauseLabel[],
      },

      // index 11 — match-none : profil rempli mais orthogonal aux missions
      // existantes (skills/causes peu sollicités). Score attendu < 40 partout.
      {
        email: 'match-none@gmail.com',
        firstName: 'None',
        lastName: 'Match',
        age: 40,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        street: '5 Rue Espariat',
        cp: '13100',
        city: 'Aix-en-Provence',
        lat: 43.5288,
        lng: 5.4459,
        availability: {
          frequency: [AvailabilityFrequency.HOURS_MONTH],
          timeSlot: [AvailabilityTime.WEEKDAY],
          type: AvailabilityType.ON_SITE,
        },
        skills: [
          'Droit et conseil juridique',
          'Gestion financière / comptabilité',
        ] satisfies SkillLabel[],
        causes: [
          "Droits de l'homme",
          'Dialogue interculturel',
        ] satisfies CauseLabel[],
      },

      // index 12 — match-remote : profil 100% distanciel, pour tester la
      // mission "Traduction collaborative" (REMOTE). Distance neutralisée
      // (REMOTE = 15 pts pleins). Score attendu fort (~80-95) sur cette mission.
      {
        email: 'match-remote@gmail.com',
        firstName: 'Remote',
        lastName: 'Match',
        age: 33,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        street: '12 Rue de la République',
        cp: '69002',
        city: 'Lyon',
        lat: 45.7578,
        lng: 4.832,
        availability: {
          frequency: [AvailabilityFrequency.HOURS_WEEK],
          timeSlot: [AvailabilityTime.EVENING, AvailabilityTime.WEEKEND],
          type: AvailabilityType.REMOTE,
        },
        skills: ['Traduction', 'Informatique'] satisfies SkillLabel[],
        causes: [
          'Valorisation du patrimoine',
          'Médiation culturelle',
        ] satisfies CauseLabel[],
      },

      // index 13 — match-far : skills/causes parfaitement alignés sur "Maraude
      // de nuit" (Croix-Rouge), mais habite Marseille (~30 km). Sert à
      // démontrer l'impact du score distance dans le breakdown.
      {
        email: 'match-far@gmail.com',
        firstName: 'Far',
        lastName: 'Match',
        age: 38,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        street: '20 Rue de la République',
        cp: '13002',
        city: 'Marseille',
        lat: 43.299,
        lng: 5.3781,
        availability: {
          frequency: [AvailabilityFrequency.PUNCTUAL],
          timeSlot: [AvailabilityTime.EVENING],
          type: AvailabilityType.ON_SITE,
        },
        skills: [
          'Secourisme et sécurité civile',
          'Logistique',
        ] satisfies SkillLabel[],
        causes: [
          'Maraude',
          "Lutte contre l'isolement",
          'Distribution',
        ] satisfies CauseLabel[],
      },

      // index 14 — match-empty : profil minimal, sans skills/causes/dispo.
      // Permet de vérifier le comportement edge (score = 0 partout, badge
      // "Complétez votre profil" éventuel côté UI).
      {
        email: 'match-empty@gmail.com',
        firstName: 'Empty',
        lastName: 'Profile',
        age: 22,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        street: '1 Place de la Mairie',
        cp: '13100',
        city: 'Aix-en-Provence',
        lat: 43.5283,
        lng: 5.4474,
        availability: null,
        skills: [] as SkillLabel[],
        causes: [] as CauseLabel[],
      },
    ];

    const createdUsers: User[] = [];
    for (const u of usersData) {
      const user = await tx.user.create({
        data: {
          email: u.email,
          password: passwordHash,
          firstName: u.firstName,
          lastName: u.lastName,
          age: u.age,
          status: u.status,
          emailVerifiedAt: u.emailVerified ? now : null,
          address: {
            create: {
              street: u.street,
              postalCode: u.cp,
              city: u.city,
              latitude: u.lat,
              longitude: u.lng,
            },
          },
        },
      });
      createdUsers.push(user);

      if (u.availability) {
        await tx.userAvailability.create({
          data: {
            userId: user.id,
            frequency: u.availability.frequency,
            timeSlot: u.availability.timeSlot,
            type: u.availability.type,
          },
        });
      }
      if (u.skills.length > 0) {
        await tx.userSkill.createMany({
          data: u.skills.map((label) => ({
            userId: user.id,
            skillId: skillId(label),
          })),
        });
      }
      if (u.causes.length > 0) {
        await tx.userCause.createMany({
          data: u.causes.map((label) => ({
            userId: user.id,
            causeId: causeId(label),
          })),
        });
      }
    }

    // =========================================================================
    // 4. Associations + Missions
    // =========================================================================
    interface MissionSeed {
      title: string;
      description: string;
      type: ActivityType;
      status: MissionStatus;
      hasRegistration: boolean;
      volunteersNeeded: number | null;
      durationInt: number | null;
      frequency: MissionFrequency | null;
      startDate: Date | null;
      endDate?: Date;
      skills: SkillLabel[];
      causes: CauseLabel[];
      publics: PublicLabel[];
      volunteerTypes: VolunteerTypeLabel[];
      /** Mode d'exécution. Défaut : ON_SITE (cohérent avec le schéma Prisma). */
      availabilityType?: AvailabilityType;
    }

    interface AssociationSeed {
      name: string;
      siret: string;
      rna?: string;
      phone?: string;
      website?: string;
      description?: string;
      object: string;
      legalStatus: string;
      categoryName: CategoryName;
      ownerIndex: number;
      street: string;
      cp: string;
      city: string;
      lat: number;
      lng: number;
      missions: MissionSeed[];
    }

    const associationsData: AssociationSeed[] = [
      // ------------------------------------------------------------------
      // A. Humanitaire & Solidarité — Les Restos du Cœur
      // ------------------------------------------------------------------
      {
        name: 'Les Restos du Cœur Aix',
        siret: '77568736901230',
        rna: 'W133004794',
        phone: '0442273388',
        website: 'https://www.restosducoeur.org',
        description: 'Association d\'aide alimentaire et d\'insertion sociale, antenne aixoise des Restaurants du Cœur fondés par Coluche en 1985.',
        object: 'Aider et participer au reclassement social et économique des personnes en difficulté par la distribution de repas gratuits.',
        legalStatus: 'Association loi 1901',
        categoryName: 'Humanitaire & Solidarité',
        ownerIndex: 0,
        street: '55 Avenue Sainte-Victoire',
        cp: '13100',
        city: 'Aix-en-Provence',
        lat: 43.5325,
        lng: 5.4578,
        missions: [
          {
            title: 'Distribution de repas chauds',
            description:
              'Chaque mardi soir, nous distribuons des repas chauds aux personnes sans-abri du centre-ville. Venez nous aider à préparer et distribuer les repas.',
            type: ActivityType.MISSION,
            status: MissionStatus.ACTIVE,
            hasRegistration: true,
            volunteersNeeded: 8,
            durationInt: 180,
            frequency: MissionFrequency.WEEKLY,
            startDate: inOneWeek,
            skills: ['Cuisine', 'Logistique'],
            causes: ['Distribution', 'Maraude'],
            publics: ['Personnes sans-abri'],
            volunteerTypes: ['Majeurs uniquement'],
          },
          {
            title: 'Collecte alimentaire de printemps',
            description:
              "Grande collecte alimentaire dans les supermarchés partenaires d'Aix. Nous avons besoin de bénévoles pour accueillir les clients et récolter les dons.",
            type: ActivityType.COLLECT,
            status: MissionStatus.ACTIVE,
            hasRegistration: true,
            volunteersNeeded: 20,
            durationInt: 240,
            frequency: MissionFrequency.ONCE,
            startDate: inTwoWeeks,
            endDate: inTwoWeeks,
            skills: ['Communication', 'Logistique'],
            causes: ['Collecte de produits', 'Distribution'],
            publics: ['Familles en difficulté', 'Personnes sans-abri'],
            volunteerTypes: ['Ouvert à tous'],
          },
          {
            title: 'Gala annuel de solidarité',
            description:
              "Soirée de gala organisée pour lever des fonds pour nos actions. Nous recherchons des bénévoles pour l'accueil, le service et la coordination.",
            type: ActivityType.EVENT,
            status: MissionStatus.ACTIVE,
            hasRegistration: true,
            volunteersNeeded: 15,
            durationInt: 300,
            frequency: MissionFrequency.ONCE,
            startDate: inOneMonth,
            skills: ['Animation', 'Communication', 'Logistique'],
            causes: ['Collecte de fonds', 'Événementiel'],
            publics: ['Familles en difficulté'],
            volunteerTypes: ['Ouvert à tous'],
          },
          {
            title: "Nouvelle permanence d'accueil",
            description:
              "Nous ouvrons une nouvelle permanence d'accueil pour les bénéficiaires. Venez vous inscrire comme bénévole régulier pour les permanences du samedi matin.",
            type: ActivityType.INFO,
            status: MissionStatus.ACTIVE,
            hasRegistration: false,
            volunteersNeeded: null,
            durationInt: null,
            frequency: null,
            startDate: null,
            skills: [],
            causes: ['Accueil / Information'],
            publics: [],
            volunteerTypes: [],
          },
        ],
      },

      // ------------------------------------------------------------------
      // B. Environnement & Nature — Aix Environnement
      // ------------------------------------------------------------------
      {
        name: 'Aix Environnement',
        siret: '89234567890123',
        rna: 'W132017845',
        phone: '0442219900',
        website: 'https://www.aix-environnement.fr',
        description: 'Association de protection de l\'environnement et de sensibilisation à l\'écologie dans le bassin aixois.',
        object: 'Protéger, valoriser et restaurer les espaces naturels et la biodiversité du territoire d\'Aix-en-Provence et de ses environs.',
        legalStatus: 'Association loi 1901',
        categoryName: 'Environnement & Nature',
        ownerIndex: 1,
        street: '8 Chemin des Infirmeries',
        cp: '13100',
        city: 'Aix-en-Provence',
        lat: 43.5421,
        lng: 5.4389,
        missions: [
          {
            title: 'Nettoyage du Parc de la Torse',
            description:
              'Rejoignez-nous pour une matinée de nettoyage du Parc de la Torse. Gants et sacs poubelle fournis. Bonne condition physique souhaitée.',
            type: ActivityType.MISSION,
            status: MissionStatus.ACTIVE,
            hasRegistration: true,
            volunteersNeeded: 25,
            durationInt: 180,
            frequency: MissionFrequency.MONTHLY,
            startDate: inOneWeek,
            skills: ['Jardinage', 'Travaux manuels'],
            causes: ['Ramassage de déchets', "Protection de l'environnement"],
            publics: ['Nature / Espaces verts'],
            volunteerTypes: ['Bonne condition physique', 'Ouvert à tous'],
          },
          {
            title: "Plantation d'arbres sur le Mont Sainte-Victoire",
            description:
              "Journée de reforestation sur les flancs du Mont Sainte-Victoire après les incendies. Transport organisé depuis le centre d'Aix.",
            type: ActivityType.MISSION,
            status: MissionStatus.ACTIVE,
            hasRegistration: true,
            volunteersNeeded: 30,
            durationInt: 480,
            frequency: MissionFrequency.ONCE,
            startDate: inTwoWeeks,
            endDate: inTwoWeeks,
            skills: ['Jardinage', 'Travaux manuels'],
            causes: [
              "Aménagement d'espaces naturels",
              "Protection de l'environnement",
            ],
            publics: ['Nature / Espaces verts'],
            volunteerTypes: ['Bonne condition physique', 'Majeurs uniquement'],
          },
          {
            title: 'Conférence : Biodiversité en Provence',
            description:
              'Soirée de sensibilisation à la biodiversité locale avec des experts du CNRS. Entrée libre, venez nombreux !',
            type: ActivityType.EVENT,
            status: MissionStatus.ACTIVE,
            hasRegistration: false,
            volunteersNeeded: null,
            durationInt: 120,
            frequency: MissionFrequency.ONCE,
            startDate: inOneWeek,
            skills: ['Communication'],
            causes: [
              'Actions de sensibilisation',
              "Protection de l'environnement",
            ],
            publics: ['Nature / Espaces verts'],
            volunteerTypes: ['Ouvert à tous'],
          },
          {
            title: 'Mission archivée : Nettoyage Arc de Berre (2024)',
            description:
              "Mission terminée — Nettoyage des berges de l'Arc effectué en novembre 2024.",
            type: ActivityType.MISSION,
            status: MissionStatus.ARCHIVED,
            hasRegistration: false,
            volunteersNeeded: 15,
            durationInt: 240,
            frequency: MissionFrequency.ONCE,
            startDate: lastMonth,
            endDate: lastMonth,
            skills: ['Travaux manuels'],
            causes: ['Ramassage de déchets'],
            publics: ['Nature / Espaces verts'],
            volunteerTypes: ['Ouvert à tous'],
          },
        ],
      },

      // ------------------------------------------------------------------
      // C. Éducation & Jeunesse — La Chance aux Jeunes
      // ------------------------------------------------------------------
      {
        name: 'La Chance aux Jeunes Aix',
        siret: '43219876543210',
        rna: 'W133008521',
        phone: '0442271155',
        website: 'https://www.lachanceauxjeunes-aix.fr',
        description: 'Association de soutien scolaire, de mentorat et d\'insertion professionnelle pour les jeunes des quartiers prioritaires d\'Aix-en-Provence.',
        object: 'Favoriser l\'égalité des chances en accompagnant les jeunes en difficulté scolaire et sociale vers la réussite et l\'insertion professionnelle.',
        legalStatus: 'Association loi 1901',
        categoryName: 'Éducation & Jeunesse',
        ownerIndex: 5,
        street: '20 Rue des Écoles',
        cp: '13100',
        city: 'Aix-en-Provence',
        lat: 43.5246,
        lng: 5.4502,
        missions: [
          {
            title: 'Soutien scolaire en mathématiques',
            description:
              'Accompagnement scolaire hebdomadaire pour des collégiens en difficulté dans les quartiers nord. 2h par semaine suffisent pour faire la différence !',
            type: ActivityType.MISSION,
            status: MissionStatus.ACTIVE,
            hasRegistration: true,
            volunteersNeeded: 10,
            durationInt: 120,
            frequency: MissionFrequency.WEEKLY,
            startDate: now,
            skills: ['Animation', 'Communication'],
            causes: ['Soutien scolaire et formation', 'Mentorat & Parrainage'],
            publics: ['Enfants', 'Adolescents'],
            volunteerTypes: ['Étudiants', 'Experts / Professionnels'],
          },
          {
            title: "Atelier CV et recherche d'emploi",
            description:
              'Aidez des jeunes de 18-25 ans à rédiger leur CV et préparer leurs entretiens. Interventions ponctuelles possibles.',
            type: ActivityType.MISSION,
            status: MissionStatus.ACTIVE,
            hasRegistration: true,
            volunteersNeeded: 5,
            durationInt: 180,
            frequency: MissionFrequency.WEEKLY,
            startDate: inOneWeek,
            skills: ['Communication', 'Gestion des ressources humaines'],
            causes: [
              'Mentorat & Parrainage',
              'Aide aux démarches administratives',
            ],
            publics: ['Étudiants', 'Adolescents'],
            volunteerTypes: ['Experts / Professionnels'],
          },
          {
            title: 'Forum des métiers 2025',
            description:
              "Grande journée de rencontres entre professionnels et jeunes en recherche d'orientation. Bénévoles recherchés pour l'organisation et l'accueil.",
            type: ActivityType.EVENT,
            status: MissionStatus.ACTIVE,
            hasRegistration: true,
            volunteersNeeded: 12,
            durationInt: 480,
            frequency: MissionFrequency.ONCE,
            startDate: inOneMonth,
            skills: ['Communication', 'Logistique', 'Animation'],
            causes: ['Événementiel', 'Soutien scolaire et formation'],
            publics: ['Étudiants', 'Adolescents'],
            volunteerTypes: ['Ouvert à tous'],
          },
          {
            title: 'Collecte de matériel scolaire',
            description:
              'Collecte de fournitures scolaires (cahiers, stylos, calculatrices) pour les familles en difficulté. Dépôts dans les écoles partenaires.',
            type: ActivityType.COLLECT,
            status: MissionStatus.ACTIVE,
            hasRegistration: false,
            volunteersNeeded: null,
            durationInt: null,
            frequency: null,
            startDate: inOneWeek,
            endDate: inOneMonth,
            skills: ['Logistique'],
            causes: ['Collecte de produits', 'Soutien scolaire et formation'],
            publics: ['Enfants', 'Adolescents'],
            volunteerTypes: ['Ouvert à tous'],
          },
        ],
      },

      // ------------------------------------------------------------------
      // D. Santé & Médical — Croix-Rouge
      // ------------------------------------------------------------------
      {
        name: 'Croix-Rouge Aix-en-Provence',
        siret: '77567432100987',
        rna: 'W133000128',
        phone: '0442381200',
        website: 'https://www.croix-rouge.fr',
        description: 'Délégation locale de la Croix-Rouge française, engagée dans les secours d\'urgence, l\'aide sociale et la formation aux premiers secours.',
        object: 'Prévenir et atténuer les souffrances humaines, protéger la vie, la santé et la dignité humaine, sans discrimination.',
        legalStatus: 'Association reconnue d\'utilité publique',
        categoryName: 'Santé & Médical',
        ownerIndex: 7,
        street: '15 Boulevard du Roi René',
        cp: '13100',
        city: 'Aix-en-Provence',
        lat: 43.5301,
        lng: 5.4534,
        missions: [
          {
            title: 'Maraude de nuit',
            description:
              "Maraude nocturne pour aller à la rencontre des personnes à la rue, distribuer boissons chaudes, nourriture et produits d'hygiène. Formation préalable assurée.",
            type: ActivityType.MISSION,
            status: MissionStatus.ACTIVE,
            hasRegistration: true,
            volunteersNeeded: 6,
            durationInt: 240,
            frequency: MissionFrequency.WEEKLY,
            startDate: inOneWeek,
            skills: ['Secourisme et sécurité civile', 'Logistique'],
            causes: ['Maraude', "Lutte contre l'isolement", 'Distribution'],
            publics: ['Personnes sans-abri'],
            volunteerTypes: ['Majeurs uniquement', 'Bonne condition physique'],
          },
          {
            title: 'Formation Premiers Secours (PSC1)',
            description:
              'Nous organisons des sessions de formation aux gestes de premiers secours ouvertes au grand public. Venez vous former et former vos proches.',
            type: ActivityType.EVENT,
            status: MissionStatus.ACTIVE,
            hasRegistration: true,
            volunteersNeeded: 20,
            durationInt: 420,
            frequency: MissionFrequency.MONTHLY,
            startDate: inTwoWeeks,
            skills: ['Secourisme et sécurité civile', 'Médical'],
            causes: ['Actions de sensibilisation'],
            publics: ['Adolescents', 'Étudiants'],
            volunteerTypes: ['Ouvert à tous'],
          },
          {
            title: 'Accompagnement de personnes âgées',
            description:
              'Visites hebdomadaires de personnes âgées isolées à domicile ou en EHPAD. Un simple moment de présence peut tout changer.',
            type: ActivityType.MISSION,
            status: MissionStatus.ACTIVE,
            hasRegistration: true,
            volunteersNeeded: 12,
            durationInt: 90,
            frequency: MissionFrequency.WEEKLY,
            startDate: now,
            skills: ['Communication'],
            causes: ["Lutte contre l'isolement", 'Services à la personne'],
            publics: ['Séniors'],
            volunteerTypes: ['Ouvert à tous', 'Majeurs uniquement'],
          },
          {
            title: 'Journée don du sang',
            description:
              "L'EFS organise une collecte de sang à Aix. Bénévoles recherchés pour l'accueil et l'orientation des donneurs.",
            type: ActivityType.COLLECT,
            status: MissionStatus.ACTIVE,
            hasRegistration: true,
            volunteersNeeded: 8,
            durationInt: 480,
            frequency: MissionFrequency.ONCE,
            startDate: inTwoWeeks,
            endDate: inTwoWeeks,
            skills: ['Communication'],
            causes: ['Actions de sensibilisation', 'Accueil / Information'],
            publics: ['Étudiants'],
            volunteerTypes: ['Ouvert à tous'],
          },
        ],
      },

      // ------------------------------------------------------------------
      // E. Culture & Patrimoine — Mémoires de Provence
      // ------------------------------------------------------------------
      {
        name: 'Mémoires de Provence',
        siret: '55123456789012',
        rna: 'W133012034',
        phone: '0442263311',
        website: 'https://www.memoires-provence.fr',
        description: 'Association dédiée à la préservation, la transmission et la valorisation du patrimoine historique et culturel provençal.',
        object: 'Collecter, conserver et diffuser le patrimoine culturel, mémoriel et historique de la Provence auprès du grand public.',
        legalStatus: 'Association loi 1901',
        categoryName: 'Culture & Patrimoine',
        ownerIndex: 8,
        street: '2 Place des Cardeurs',
        cp: '13100',
        city: 'Aix-en-Provence',
        lat: 43.5286,
        lng: 5.4481,
        missions: [
          {
            title: 'Guides bénévoles au Musée Granet',
            description:
              'Devenez guide bénévole pour accompagner des groupes scolaires ou des visiteurs en situation de handicap au Musée Granet. Formation assurée.',
            type: ActivityType.MISSION,
            status: MissionStatus.ACTIVE,
            hasRegistration: true,
            volunteersNeeded: 6,
            durationInt: 120,
            frequency: MissionFrequency.WEEKLY,
            startDate: now,
            skills: ['Animation', 'Communication', 'Traduction'],
            causes: ['Médiation culturelle', 'Valorisation du patrimoine'],
            publics: ['Enfants', 'Personnes handicapées', 'Séniors'],
            volunteerTypes: ['Ouvert à tous'],
          },
          {
            title: 'Festival Cézanne — Nuit des musées',
            description:
              "Grande nuit culturelle autour de l'œuvre de Cézanne. Bénévoles pour l'accueil, la médiation et la logistique de cet événement incontournable.",
            type: ActivityType.EVENT,
            status: MissionStatus.ACTIVE,
            hasRegistration: true,
            volunteersNeeded: 30,
            durationInt: 360,
            frequency: MissionFrequency.ONCE,
            startDate: inOneMonth,
            skills: [
              'Animation',
              'Logistique',
              'Communication',
              'Photographie / Vidéo',
            ],
            causes: ['Événementiel', 'Médiation culturelle'],
            publics: [],
            volunteerTypes: ['Ouvert à tous'],
          },
          {
            title: "Numérisation d'archives historiques",
            description:
              'Projet de numérisation de documents historiques aixois. Bénévoles recherchés pour la saisie informatique et la mise en forme des données.',
            type: ActivityType.MISSION,
            status: MissionStatus.ACTIVE,
            hasRegistration: true,
            volunteersNeeded: 4,
            durationInt: 180,
            frequency: MissionFrequency.WEEKLY,
            startDate: now,
            skills: ['Informatique', 'Gestion administrative'],
            causes: ['Valorisation du patrimoine', 'Gouvernance'],
            publics: [],
            volunteerTypes: ['Experts / Professionnels', 'Étudiants'],
          },
          {
            title: 'Traduction collaborative de récits provençaux',
            description:
              'Mission 100% à distance : traduisez des témoignages historiques provençaux en anglais ou en italien depuis chez vous. Travail asynchrone, à votre rythme.',
            type: ActivityType.MISSION,
            status: MissionStatus.ACTIVE,
            availabilityType: AvailabilityType.REMOTE,
            hasRegistration: true,
            volunteersNeeded: 5,
            durationInt: 120,
            frequency: MissionFrequency.WEEKLY,
            startDate: now,
            skills: ['Traduction', 'Informatique'],
            causes: ['Valorisation du patrimoine', 'Médiation culturelle'],
            publics: [],
            volunteerTypes: ['Bilingue requis', 'Experts / Professionnels'],
          },
        ],
      },

      // ------------------------------------------------------------------
      // F. Défense des animaux — SPA Aix
      // ------------------------------------------------------------------
      {
        name: 'SPA Aix-en-Provence',
        siret: '34567891234567',
        rna: 'W133005667',
        phone: '0442200044',
        website: 'https://www.spa.asso.fr',
        description: 'Refuge de la Société Protectrice des Animaux d\'Aix-en-Provence, accueillant chiens, chats et NAC abandonnés ou maltraités.',
        object: 'Protéger les animaux contre toutes formes de mauvais traitements, recueillir les animaux abandonnés et favoriser leur adoption.',
        legalStatus: 'Association loi 1901',
        categoryName: 'Défense des animaux',
        ownerIndex: 6,
        street: '480 Chemin de la Madeleine',
        cp: '13100',
        city: 'Aix-en-Provence',
        lat: 43.5512,
        lng: 5.4213,
        missions: [
          {
            title: 'Promenades de chiens au refuge',
            description:
              "Les chiens du refuge ont besoin de sorties quotidiennes. Venez promener nos pensionnaires et leur offrir de l'affection. Aucune expérience requise.",
            type: ActivityType.MISSION,
            status: MissionStatus.ACTIVE,
            hasRegistration: true,
            volunteersNeeded: 10,
            durationInt: 90,
            frequency: MissionFrequency.DAILY,
            startDate: now,
            skills: [],
            causes: ['Soins aux animaux'],
            publics: ['Animaux'],
            volunteerTypes: ['Ouvert à tous', 'Bonne condition physique'],
          },
          {
            title: 'Journée portes ouvertes adoptions',
            description:
              "Grande journée d'adoption au refuge. Nous cherchons des bénévoles pour présenter les animaux, accueillir les familles et gérer la logistique.",
            type: ActivityType.EVENT,
            status: MissionStatus.ACTIVE,
            hasRegistration: true,
            volunteersNeeded: 15,
            durationInt: 360,
            frequency: MissionFrequency.ONCE,
            startDate: inTwoWeeks,
            skills: ['Communication', 'Animation'],
            causes: ['Soins aux animaux', 'Événementiel'],
            publics: ['Animaux'],
            volunteerTypes: ['Ouvert à tous'],
          },
          {
            title: 'Collecte de croquettes et litière',
            description:
              "Collecte de nourriture et d'accessoires pour les animaux du refuge. Points de collecte dans plusieurs animaleries partenaires d'Aix.",
            type: ActivityType.COLLECT,
            status: MissionStatus.ACTIVE,
            hasRegistration: false,
            volunteersNeeded: null,
            durationInt: null,
            frequency: null,
            startDate: now,
            endDate: inOneMonth,
            skills: ['Logistique'],
            causes: ['Collecte de produits', 'Soins aux animaux'],
            publics: ['Animaux'],
            volunteerTypes: ['Ouvert à tous'],
          },
        ],
      },
    ];

    // =========================================================================
    // 5. Création des associations et missions
    // =========================================================================
    const createdAssociations: Association[] = [];

    for (const assoData of associationsData) {
      const asso = await tx.association.create({
        data: {
          name: assoData.name,
          siret: assoData.siret,
          rna: assoData.rna,
          phone: assoData.phone,
          website: assoData.website,
          description: assoData.description,
          object: assoData.object,
          legalStatus: assoData.legalStatus,
          status: 'VALIDATED',
          requiresManualReview: false,
          category: { connect: { id: categoryId(assoData.categoryName) } },
          address: {
            create: {
              street: assoData.street,
              postalCode: assoData.cp,
              city: assoData.city,
              latitude: assoData.lat,
              longitude: assoData.lng,
            },
          },
          members: {
            create: {
              userId: createdUsers[assoData.ownerIndex].id,
              role: AssociationRole.OWNER,
            },
          },
        },
      });
      createdAssociations.push(asso);

      for (const m of assoData.missions) {
        const mission = await tx.mission.create({
          data: {
            title: m.title,
            description: m.description,
            type: m.type,
            status: m.status,
            availabilityType: m.availabilityType ?? AvailabilityType.ON_SITE,
            hasRegistration: m.hasRegistration,
            volunteersNeeded: m.volunteersNeeded ?? null,
            durationInt: m.durationInt ?? null,
            frequency: m.frequency ?? null,
            startDate: m.startDate ?? null,
            endDate: m.endDate ?? null,
            associationId: asso.id,
            addressId: asso.addressId,
          },
        });

        if (m.skills.length > 0) {
          await tx.missionSkill.createMany({
            data: m.skills.map((label) => ({
              missionId: mission.id,
              skillId: skillId(label),
            })),
          });
        }
        if (m.causes.length > 0) {
          await tx.missionCause.createMany({
            data: m.causes.map((label) => ({
              missionId: mission.id,
              causeId: causeId(label),
            })),
          });
        }
        if (m.publics.length > 0) {
          await tx.missionPublicType.createMany({
            data: m.publics.map((label) => ({
              missionId: mission.id,
              publicTypeId: publicId(label),
            })),
          });
        }
        if (m.volunteerTypes.length > 0) {
          await tx.missionVolunteerType.createMany({
            data: m.volunteerTypes.map((label) => ({
              missionId: mission.id,
              volunteerTypeId: volunteerTypeId(label),
            })),
          });
        }
      }
    }

    // =========================================================================
    // 6. Participations
    // =========================================================================
    const missionDistrib = await tx.mission.findFirst({
      where: { title: 'Distribution de repas chauds' },
    });
    if (missionDistrib) {
      await tx.missionParticipant.create({
        data: { missionId: missionDistrib.id, userId: createdUsers[1].id },
      });
    }

    const missionPersonnesAgees = await tx.mission.findFirst({
      where: { title: 'Accompagnement de personnes âgées' },
    });
    if (missionPersonnesAgees) {
      await tx.missionParticipant.create({
        data: {
          missionId: missionPersonnesAgees.id,
          userId: createdUsers[5].id,
        },
      });
    }

    const missionParc = await tx.mission.findFirst({
      where: { title: 'Nettoyage du Parc de la Torse' },
    });
    if (missionParc) {
      await tx.missionParticipant.create({
        data: { missionId: missionParc.id, userId: createdUsers[6].id },
      });
    }

    // Participations pour le bonus "history" du matching :
    // match-strong (index 9) a déjà participé à une collecte alimentaire,
    // ce qui doit lui donner +10 pts d'historique sur les missions partageant
    // une cause/skill (Distribution, Logistique, etc.).
    const missionCollecte = await tx.mission.findFirst({
      where: { title: 'Collecte alimentaire de printemps' },
    });
    if (missionCollecte) {
      await tx.missionParticipant.create({
        data: { missionId: missionCollecte.id, userId: createdUsers[9].id },
      });
    }

    console.log('✅ Transaction terminée');
  });

  console.log('🚀 Seed terminé avec succès !');
  console.log(`
📊 Résumé :
  - 15 utilisateurs au total (mot de passe : "password")
      • 1 admin test, 2 bénévoles actifs, 2 responsables d'association
      • 1 pending, 1 suspendu, 1 supprimé
      • 6 profils dédiés au test du matching (voir ci-dessous)
  - Chaque utilisateur actif est propriétaire d'au plus une association
  - 6 associations validées à Aix-en-Provence
  - 21 missions (MISSION, EVENT, COLLECT, INFO — ACTIVE et ARCHIVED)
      dont 1 mission REMOTE ("Traduction collaborative de récits provençaux")
  - 4 participations de démonstration (dont 1 pour le bonus "history")

🎯 Profils de test pour le matching ("Pour moi" toggle, seuil 40/100) :
  • match-strong@gmail.com  → match très fort (~95+) sur "Distribution de
                              repas chauds" (Restos du Cœur). Bonus history
                              actif via participation "Collecte alimentaire".
  • match-medium@gmail.com  → match modéré (40-65) sur les missions Event /
                              Animation. Aucun match parfait.
  • match-none@gmail.com    → profil rempli mais orthogonal aux missions
                              existantes → score < 40 partout, aucune mise
                              en avant attendue.
  • match-remote@gmail.com  → match fort sur "Traduction collaborative"
                              (REMOTE) malgré une adresse à Lyon (distance
                              neutralisée pour les missions distancielles).
  • match-far@gmail.com     → skills/causes alignés sur "Maraude de nuit"
                              (Croix-Rouge) mais adresse à Marseille (~30 km)
                              → match probable mais pénalisé par la distance.
  • match-empty@gmail.com   → profil sans skills/causes/dispo → score 0
                              partout, edge case (UI : "Complétez votre
                              profil pour profiter du matching").
  `);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Erreur durant le seed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
