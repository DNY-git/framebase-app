/**
 * Unit tests for PasswordService.
 *
 * Verifies hash/compare round-trip, pepper application (a hash produced
 * with one pepper must NOT verify against a different pepper), and the
 * password-strength validator's accept/reject boundaries.
 */
import { describe, expect, it } from 'vitest';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/configuration';
import { PasswordService } from './password.service';

function makeConfigService(overrides: Record<string, unknown> = {}): ConfigService<AppConfig, true> {
  const values: Record<string, unknown> = {
    passwordPepper: 'test-pepper',
    bcryptRounds: 4, // low cost for test speed
    ...overrides,
  };
  return {
    get: (key: string) => values[key],
  } as ConfigService<AppConfig, true>;
}

describe('PasswordService', () => {
  describe('hash and compare', () => {
    it('verifies a correct password against its hash', async () => {
      const service = new PasswordService(makeConfigService());
      const hash = await service.hash('S3cureP@ss');
      expect(await service.compare('S3cureP@ss', hash)).toBe(true);
    });

    it('rejects an incorrect password', async () => {
      const service = new PasswordService(makeConfigService());
      const hash = await service.hash('S3cureP@ss');
      expect(await service.compare('wrong-password', hash)).toBe(false);
    });

    it('applies the pepper — a hash with pepper A fails under pepper B', async () => {
      const serviceA = new PasswordService(
        makeConfigService({ passwordPepper: 'pepper-A' }),
      );
      const serviceB = new PasswordService(
        makeConfigService({ passwordPepper: 'pepper-B' }),
      );
      const hash = await serviceA.hash('S3cureP@ss');
      // Same plaintext, different pepper → must NOT match.
      expect(await serviceB.compare('S3cureP@ss', hash)).toBe(false);
    });

    it('produces different hashes for the same password (salt)', async () => {
      const service = new PasswordService(makeConfigService());
      const hash1 = await service.hash('S3cureP@ss');
      const hash2 = await service.hash('S3cureP@ss');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('validateStrength', () => {
    it('accepts a strong password', () => {
      const service = new PasswordService(makeConfigService());
      const result = service.validateStrength('S3cureP@ss1');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects a password shorter than 8 characters', () => {
      const service = new PasswordService(makeConfigService());
      const result = service.validateStrength('Ab1');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('8 characters'))).toBe(true);
    });

    it('rejects a password without an uppercase letter', () => {
      const service = new PasswordService(makeConfigService());
      const result = service.validateStrength('lowercase1');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('uppercase'))).toBe(true);
    });

    it('rejects a password without a digit', () => {
      const service = new PasswordService(makeConfigService());
      const result = service.validateStrength('NoDigitsHere');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('digit'))).toBe(true);
    });
  });
});
