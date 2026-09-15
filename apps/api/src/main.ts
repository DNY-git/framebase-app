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
  const appName = configService.get<string>('appName', { infer: true });
  const corsOrigins = configService.get<string[]>('corsAllowedOrigins', { infer: true });

  // Replace default logger with Winston.
  app.useLogger(createWinstonModule({ nodeEnv, logLevel }));

  // Security + parsing middleware.
  app.use(helmet());
  app.use(compression());
  // Cookie parsing for refresh-token transport (HttpOnly cookies).
  app.use(cookieParser());

  // Global API prefix — all routes live under /api/v1.
  app.setGlobalPrefix('api/v1');

  // CORS — configured origins only (credentials require explicit origins, not "*").
  // Allow the configured list plus Vercel preview deployments for this project
  // (e.g. https://framebase-app-web-abc123.vercel.app) so preview testing
  // works without updating the allow-list on every preview deploy. Keep the
  // match tight to this project's Vercel domain — not a blanket *.vercel.app.
  const vercelPreviewPattern = /^https:\/\/framebase-app(-web)?(-[a-z0-9-]+)?\.vercel\.app$/;
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Non-browser clients (curl, health checks) send no Origin — allow.
      if (!origin) return callback(null, true);
      if (corsOrigins.includes(origin) || vercelPreviewPattern.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
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
  logger.log(`${appName} API running on port ${port} [${nodeEnv}]`);
  logger.log(`Health check: GET /api/v1/health on port ${port}`);
}

void bootstrap().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start:', err);
  process.exit(1);
});