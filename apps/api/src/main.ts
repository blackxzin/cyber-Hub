import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import fastifyHelmet from '@fastify/helmet';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './shared/filters/all-exceptions.filter';
import { PinoLoggerService } from './shared/logger/pino-logger.service';
import { config } from '@cyberhub/shared';

async function bootstrap(): Promise<void> {
  const cfg = config();
  const adapter = new FastifyAdapter({ logger: false });
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    bufferLogs: true,
  });

  // Helmet (segurança) e cookie (auth httpOnly) — ordem importa.
  await app.register(fastifyHelmet, { contentSecurityPolicy: false });
  await app.register(fastifyCookie);

  // CORS allowlist via .env.
  await app.register(fastifyCors, {
    origin: cfg.CORS_ORIGINS.split(',').map((o) => o.trim()),
    credentials: true,
  });

  // Logger pino global + filtro de exceções global.
  app.useLogger(new PinoLoggerService());
  app.useGlobalFilters(new AllExceptionsFilter());

  // Validação de payload genérica (fallback p/ quem não usar ZodValidationPipe).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableShutdownHooks();

  await app.listen(cfg.API_PORT, cfg.API_HOST);
  new Logger('bootstrap').log(`🛡️  CyberHub API em http://${cfg.API_HOST}:${cfg.API_PORT}`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Falha ao iniciar API:', err);
  process.exit(1);
});
