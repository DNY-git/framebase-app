/**
 * Structured JSON logger built on Winston via nest-winston.
 *
 * Outputs JSON in production (for log aggregation) and colorized text in
 * development. Logs never contain secrets or PII beyond what compliance
 * requires — see docs/security/data-protection.md.
 *
 * Correlation IDs and tenant/user context are attached by interceptors,
 * not duplicated here. This service is a thin wrapper that enforces
 * consistent log shape across the app.
 */
import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import type { AppConfig } from '../../config/configuration';

export function createWinstonModule(config: Pick<AppConfig, 'nodeEnv' | 'logLevel'>) {
  const isProduction = config.nodeEnv === 'production';
  const level = config.logLevel;

  const transports: winston.transport[] = [
    new winston.transports.Console({
      level,
      format: isProduction
        ? winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json(),
          )
        : winston.format.combine(
            winston.format.timestamp({ format: 'HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            winston.format.colorize(),
            winston.format.printf(({ level: lvl, message, timestamp, ...meta }) => {
              const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
              return `${timestamp} ${lvl}: ${message}${metaStr}`;
            }),
          ),
    }),
  ];

  return WinstonModule.createLogger({ transports });
}

/**
 * Injectable logger that wraps Winston with consistent metadata.
 * Use `AppLogger` in services/controllers for structured, contextual logs.
 */
@Injectable()
export class AppLogger implements NestLoggerService {
  private context = 'App';

  setContext(context: string): this {
    this.context = context;
    return this;
  }

  constructor(private readonly winston: winston.Logger) {}

  log(message: string, meta?: Record<string, unknown>): void {
    this.winston.info(message, { context: this.context, ...meta });
  }

  error(message: string, meta?: Record<string, unknown>): void;
  error(message: string, trace?: string, meta?: Record<string, unknown>): void;
  error(message: string, traceOrMeta?: string | Record<string, unknown>, meta?: Record<string, unknown>): void {
    if (typeof traceOrMeta === 'string') {
      this.winston.error(message, { context: this.context, trace: traceOrMeta, ...meta });
    } else {
      this.winston.error(message, { context: this.context, ...traceOrMeta });
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.winston.warn(message, { context: this.context, ...meta });
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.winston.debug(message, { context: this.context, ...meta });
  }

  verbose(message: string, meta?: Record<string, unknown>): void {
    this.winston.verbose(message, { context: this.context, ...meta });
  }

  fatal(message: string, meta?: Record<string, unknown>): void {
    this.winston.error(message, { context: this.context, fatal: true, ...meta });
  }
}
