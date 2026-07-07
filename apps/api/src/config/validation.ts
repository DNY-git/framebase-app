/**
 * Fail-fast environment validation.
 * In production, secrets must not be the `change-me-*` placeholders.
 * The app refuses to start if critical security vars are left as defaults.
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from './configuration';

const PLACEHOLDER_PATTERN = /^change-me/;

@Injectable()
export class ConfigValidationService {
  private readonly logger = new Logger(ConfigValidationService.name);

  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  /**
   * Validates critical configuration. Logs warnings for dev-mode defaults,
   * throws in production if secrets are left as placeholders.
   */
  validate(): void {
    const nodeEnv = this.configService.get<string>('nodeEnv', { infer: true });
    const isProduction = nodeEnv === 'production';

    const secrets: Array<{ key: keyof AppConfig; label: string }> = [
      { key: 'jwtAccessSecret', label: 'JWT_ACCESS_SECRET' },
      { key: 'jwtRefreshSecret', label: 'JWT_REFRESH_SECRET' },
      { key: 'passwordPepper', label: 'PASSWORD_PEPPER' },
      { key: 'cookieSecret', label: 'COOKIE_SECRET' },
    ];

    const insecure: string[] = [];
    for (const { key, label } of secrets) {
      const value = this.configService.get<string>(key, { infer: true });
      if (PLACEHOLDER_PATTERN.test(value)) {
        insecure.push(label);
      }
    }

    if (insecure.length === 0) {
      return;
    }

    const message = `Insecure default secrets detected: ${insecure.join(', ')}.`;

    if (isProduction) {
      throw new Error(
        `${message} Replace all change-me-* placeholders before running in production.`,
      );
    }

    this.logger.warn(`${message} Acceptable in development only.`);
  }
}
