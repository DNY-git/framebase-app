/**
 * Application bootstrap.
 *
 * Starts the NestJS HTTP server with:
 *  - Helmet security headers
 *  - CORS (configurable origins)
 *  - Compression
 *  - Global validation pipe (class-validator)
 *  - Structured JSON logging (Winston)
 *  - Graceful shutdown
 *
 * The API prefix is /api/v1 on all routes. Health check is at
 * /api/v1/health. See docs/api/standards.md.
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { createWinstonModule } from './common/logger/logger.service';
import type { AppConfig } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    // Allow the app to start even if Mongoose connection fails.
    // The health check will report the disconnected state.
    abortOnError: false,
  });

  const configService = app.get(ConfigService<AppConfig, true>);
  const nodeEnv = configService.get<string>('nodeEnv', { infer: true });
  const logLevel = configService.get<string>('logLevel', { infer: true });
  const port = configService.get<number>('port', { infer: true });
  const corsOrigins = configService.get<string[]>('corsAllowedOrigins', { infer: true });

  // Replace default logger with Winston.
  app.useLogger(createWinstonModule({ nodeEnv, logLevel }));

  // Security + parsing middleware.
  app.use(helmet());
  app.use(compression());
  // Cookie parsing for refresh-token transport (HttpOnly cookies).
  app.use(cookieParser());

  // CORS — configured origins only.
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Global validation pipe — fail fast on invalid input.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Graceful shutdown.
  app.enableShutdownHooks();

  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`ConstructTrack API running on http://localhost:${port} [${nodeEnv}]`);
  logger.log(`Health check: http://localhost:${port}/api/v1/health`);
}

void bootstrap().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start:', err);
  process.exit(1);
});