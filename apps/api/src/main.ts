import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ThrottlerExceptionFilter } from './common/filters/throttler-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.enableCors({
    origin: true, // Accepte toutes les origines en dev (TODO: à restreindre en prod)
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
      forbidNonWhitelisted: true, // Renvoie une erreur si on t'envoie un champ qui n'existe pas
    }),
  );

  // PRÉFIXE GLOBAL (Optionnel mais recommandé)
  // Ça transforme tes routes en : http://localhost:3000/api/auth/register
  app.setGlobalPrefix('api');

  app.useGlobalFilters(new ThrottlerExceptionFilter());

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
