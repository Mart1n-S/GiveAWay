import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { MulterModule } from '@nestjs/platform-express';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    // 1. Configuration (Variables d'environnement)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),

    MulterModule.register({
      // On utilise le storage mémoire par défaut
      // Chaque FileInterceptor peut override cette config si besoin
    }),

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
            limit: 100, // 100 requêtes max par minute par IP
          },
        ];
      },
    }),

    // 3. Nos Modules Métiers
    PrismaModule, // Base de données
    MailModule, // Gestion des Emails
    AuthModule, // Authentification
  ],
  controllers: [AppController],
  providers: [
    AppService,

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
