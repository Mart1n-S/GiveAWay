import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { MulterModule } from '@nestjs/platform-express';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { MailModule } from './mail/mail.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import { FilesModule } from './common/files/files.module';
import { ReferenceModule } from './reference/reference.module';
import { MissionModule } from './mission/mission.module';
import { AssociationModule } from './association/association.module';
import { AdminModule } from './admin/admin.module';
import { MessagingModule } from './messaging/messaging.module';
import { NotificationModule } from './notification/notification.module';
import { MissionReminderModule } from './reminders/mission-reminder.module';

@Module({
  imports: [
    // 1. Configuration (Variables d'environnement)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),

    // configuration uploads locaux
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'), // Chemin sur le disque : apps/api/uploads
      serveRoot: '/uploads', // URL : http://localhost:3000/uploads/...
    }),

    MulterModule.register({
      // On utilise le storage mémoire par défaut
      // Chaque FileInterceptor peut override cette config si besoin
    }),

    // Planificateur (cron jobs)
    ScheduleModule.forRoot(),

    // 2. Sécurité Anti-Bot (Rate Limiting)
    // Configuration "Large" pour l'ensemble du site (Navigation normale)
    // On mettra des règles strictes uniquement sur le Login/Register
    ThrottlerModule.forRootAsync({
      useFactory: () => {
        // Désactivation en E2E / test
        if (process.env.THROTTLER_DISABLED === 'true') {
          return [
            {
              ttl: 1,
              limit: Number.MAX_SAFE_INTEGER,
            },
          ];
        }

        // Configuration normale (prod / dev)
        return [
          {
            ttl: 5 * 60 * 1000, // 5 minutes
            limit: 300, // 300 requêtes max par minute par IP
          },
        ];
      },
    }),

    // 3. Nos Modules Métiers
    PrismaModule, // Base de données
    MailModule, // Gestion des Emails
    AuthModule, // Authentification
    FilesModule, // Gestion des fichiers (upload, stockage, suppression)
    ProfileModule, // Gestion du profil utilisateur
    ReferenceModule, // Endpoints de référence (compétences, causes, etc.)
    AssociationModule, // Gestion des associations (profil, membres, transfert, recherche par géolocalisation)
    MissionModule, // Listing des missions (route publique)
    AdminModule, // Back-office d'administration (auth, modération, CRUD, stats)
    NotificationModule, // Notifications push Expo
    MessagingModule, // Messagerie temps réel (WebSocket)
    MissionReminderModule, // Cron quotidien : rappel J-1 des missions inscrites
  ],
  controllers: [],
  providers: [
    // Guard global Throttler - DÉSACTIVÉ en test
    ...(process.env.THROTTLER_DISABLED === 'true'
      ? [] // Pas de guard en test
      : [
          {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
          },
        ]),
  ],
})
export class AppModule {}
