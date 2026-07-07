/**
 * Password service — hashing, comparison, and strength validation.
 *
 * Uses bcryptjs (pure JS, no native compilation) with a per-deployment
 * pepper (PASSWORD_PEPPER) mixed in before hashing. The pepper means a DB
 * leak alone is insufficient to crack passwords — the pepper must also be
 * compromised. See docs/security/authentication.md → Password Storage.
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import type { AppConfig } from '../../config/configuration';

export interface PasswordStrengthResult {
  valid: boolean;
  errors: string[];
}

@Injectable()
export class PasswordService {
  private readonly pepper: string;
  private readonly rounds: number;

  constructor(private readonly configService: ConfigService<AppConfig, true>) {
    this.pepper = configService.get<string>('passwordPepper', { infer: true });
    this.rounds = configService.get<number>('bcryptRounds', { infer: true });
  }

  /**
   * Hashes a plaintext password with pepper + bcrypt.
   * The pepper is appended before hashing and never stored alongside the hash.
   */
  async hash(plaintext: string): Promise<string> {
    const peppered = this.applyPepper(plaintext);
    return bcrypt.hash(peppered, this.rounds);
  }

  /**
   * Compares a plaintext password against a stored bcrypt hash.
   * Applies the same pepper used during hashing.
   */
  async compare(plaintext: string, hash: string): Promise<boolean> {
    const peppered = this.applyPepper(plaintext);
    return bcrypt.compare(peppered, hash);
  }

  /**
   * Validates password strength: min 8 chars, at least one uppercase,
   * one lowercase, and one digit. Extensible for denylists in the future.
   *
   * This is a secondary check — the DTO also enforces via class-validator,
   * but the service re-validates defense-in-depth (PROJECT_RULES §27, §48).
   */
  validateStrength(password: string): PasswordStrengthResult {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long.');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter.');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter.');
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one digit.');
    }

    return { valid: errors.length === 0, errors };
  }

  private applyPepper(plaintext: string): string {
    return `${plaintext}:${this.pepper}`;
  }
}
