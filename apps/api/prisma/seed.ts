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
  ];

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
  ];

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
  ];

  const volunteerTypesList = [
    'Ouvert à tous',
    'Majeurs uniquement',
    'Bonne condition physique',
    'Accessible PMR',
    'Femmes uniquement',
    'Experts / Professionnels',
    'Étudiants',
    'Bilingue requis',
  ];

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
  ];

  await prisma.$transaction(async (tx) => {
    // 1. Références
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

    // 2. Admin Système
    await tx.admin.create({
      data: {
        email: 'superadmin@giveaway.fr',
        password: passwordHash,
        firstName: 'Master',
        lastName: 'Admin',
        role: AdminRole.SUPER_ADMIN,
      },
    });

    // 3. Utilisateurs
    const usersData = [
      {
        email: 'admin@gmail.com',
        firstName: 'Admin',
        lastName: 'GiveAway',
        age: 30,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        street: '123 Rue de la Solidarité',
        cp: '75001',
        city: 'Paris',
      },
      {
        email: 'user1@gmail.com',
        firstName: 'Jean',
        lastName: 'Dupont',
        age: 25,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        street: '45 Av des Champs-Élysées',
        cp: '75008',
        city: 'Paris',
      },
      {
        email: 'user2@gmail.com',
        firstName: 'Marie',
        lastName: 'Curie',
        age: 28,
        status: UserStatus.PENDING,
        emailVerified: false,
        street: '12 Bd Saint-Germain',
        cp: '75005',
        city: 'Paris',
      },
      {
        email: 'user3@gmail.com',
        firstName: 'Jane',
        lastName: 'Doe',
        age: 28,
        status: UserStatus.SUSPENDED,
        emailVerified: true,
        street: '78 Rue de la République',
        cp: '69002',
        city: 'Lyon',
      },
      {
        email: 'user4@gmail.com',
        firstName: 'John',
        lastName: 'Doe',
        age: 28,
        status: UserStatus.DELETED,
        emailVerified: true,
        street: '56 Cours Mirabeau',
        cp: '13100',
        city: 'Aix',
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
            create: { street: u.street, postalCode: u.cp, city: u.city },
          },
        },
      });
      createdUsers.push(user);
    }

    // 4. Association
    const category = await tx.associationCategory.findFirst({
      where: { name: 'Humanitaire & Solidarité' },
    });

    const association: Association = await tx.association.create({
      data: {
        name: 'Les Restos du Coeur',
        email: 'contact@restos.fr',
        siret: '12345678901234',
        status: 'VALIDATED',
        category: { connect: { id: category?.id } },
        address: {
          create: {
            street: '55 Av. Sainte-Victoire',
            postalCode: '13100',
            city: 'Aix-en-Provence',
            latitude: 43.53254808858699,
            longitude: 5.457842428836389,
          },
        },
        members: {
          create: { userId: createdUsers[0].id, role: AssociationRole.OWNER },
        },
      },
    });

    // 5. Missions d'exemple
    await tx.mission.create({
      data: {
        title: 'Distribution de repas chauds',
        description:
          'Nous avons besoin de bras pour distribuer des repas aux plus démunis à Aix-en-Provence.',
        type: ActivityType.MISSION,
        status: MissionStatus.ACTIVE,
        hasRegistration: true,
        volunteersNeeded: 5,
        durationInt: 180, // 3h
        frequency: MissionFrequency.WEEKLY,
        startDate: now,
        associationId: association.id,
        addressId: association.addressId, // Utilise l'adresse de l'asso
      },
    });

    console.log('✅ Transaction terminée');
  });

  console.log('🚀 Seed terminé avec succès !');
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
