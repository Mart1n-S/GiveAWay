/**
 * CLI standalone pour déclencher manuellement le cron de rappel J-1.
 *
 * Usage :
 *   npm run reminders:test                  → simule un déclenchement "aujourd'hui"
 *                                              (donc rappels pour les missions de demain)
 *   npm run reminders:test -- --date=YYYY-MM-DD
 *                                            → simule un déclenchement à la date donnée
 *                                              (utile pour tester avec une mission à une date précise :
 *                                               passer J-1 par rapport à la startDate de la mission)
 *
 * Le script boot un ApplicationContext Nest (pas de serveur HTTP), résout le
 * MissionReminderService et appelle sendReminders(date). Les emails et push
 * sont effectivement envoyés (Brevo + Expo) sauf en mode log (NODE_ENV=test
 * ou USE_DETERMINISTIC_OTP=true), auquel cas tout est juste loggé.
 */
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { MissionReminderService } from './mission-reminder.service';

function parseDateArg(): Date {
  const arg = process.argv.find((a) => a.startsWith('--date='));
  if (!arg) return new Date();

  const value = arg.split('=')[1];
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new TypeError(
      `Date invalide: "${value}". Format attendu : YYYY-MM-DD ou ISO 8601.`,
    );
  }
  return parsed;
}

async function bootstrap() {
  const logger = new Logger('ReminderCLI');
  const referenceDate = parseDateArg();

  logger.log(
    `Déclenchement manuel — date de référence : ${referenceDate.toISOString()}`,
  );
  logger.log(
    `Rappels pour les missions du lendemain (${new Date(referenceDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]})`,
  );

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const service = app.get(MissionReminderService);
    await service.sendReminders(referenceDate);
    logger.log('✅ Terminé');
  } catch (err) {
    logger.error("❌ Erreur lors de l'envoi des rappels", err);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void bootstrap();
