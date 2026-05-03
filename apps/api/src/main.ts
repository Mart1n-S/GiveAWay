import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ThrottlerExceptionFilter } from './common/filters/throttler-exception.filter';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.use(cookieParser());

  // En prod, restreindre aux domaines connus (mobile + admin).
  // En dev, on autorise toutes les origines pour faciliter Expo Web/Native.
  const isProd = process.env.NODE_ENV === 'production';
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: isProd ? allowedOrigins : true,
    credentials: true, // Autorise les cookies/headers sécurisés
  });

  // PIPES GLOBAUX
  // On garde le ValidationPipe de base de NestJS pour deux raisons :
  // - "whitelist: true" : Il nettoie automatiquement les champs inconnus du JSON (sécurité)
  // - "transform: true" : Il convertit les types simples (ex: "id": "1" devient le nombre 1)
  // NOTE : La validation Zod se fera, elle, au niveau du Controller via @UsePipes.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true, // Renvoie une erreur si on reçoit un champ qui n'existe pas
    }),
  );

  app.useGlobalFilters(new ThrottlerExceptionFilter());

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
