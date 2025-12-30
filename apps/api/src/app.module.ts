import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
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

    // 2. Sécurité Anti-Bot (Rate Limiting)
    // Configuration "Large" pour l'ensemble du site (Navigation normale)
    // On mettra des règles strictes uniquement sur le Login/Register
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 secondes
        limit: 100, // 100 requêtes max par minute par IP
      },
    ]),

    // 3. Nos Modules Métiers
    PrismaModule, // Base de données
    MailModule, // Gestion des Emails
    AuthModule, // Authentification
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Active le garde du corps (Anti-Bot) sur toute l'application
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
