/**
 * Unit tests for MailerService.
 *
 * Verifies:
 *  - Reports not_configured when RESEND_API_KEY is absent
 *  - Sends email via Resend SDK when configured
 *  - Handles Resend API errors gracefully
 *  - sendInvitationEmail and sendPasswordResetEmail delegate to sendMail
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/configuration';

const { mockSendFn } = vi.hoisted(() => ({
  mockSendFn: vi.fn(),
}));

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: mockSendFn,
    },
  })),
}));

import { MailerService } from './mailer.service';

function mockConfigService(overrides: Partial<Record<keyof AppConfig, unknown>> = {}): ConfigService<AppConfig, true> {
  return {
    get: <K extends keyof AppConfig>(key: K): AppConfig[K] => {
      if (key === 'resendApiKey') return (overrides.resendApiKey ?? '') as AppConfig[K];
      if (key === 'mailFrom') return (overrides.mailFrom ?? 'Test <test@test.com>') as AppConfig[K];
      return '' as AppConfig[K];
    },
  } as ConfigService<AppConfig, true>;
}

describe('MailerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when RESEND_API_KEY is not set', () => {
    it('reports not_configured and logs a warning', async () => {
      const loggerWarn = vi.spyOn(
        require('@nestjs/common').Logger.prototype,
        'warn',
      );
      const service = new MailerService(mockConfigService());

      expect(service.isConfigured).toBe(false);

      const result = await service.sendMail({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
        text: 'Hello',
      });

      expect(result).toEqual({ sent: false, reason: 'not_configured' });
      expect(loggerWarn).toHaveBeenCalledWith(
        expect.stringContaining('RESEND_API_KEY not configured'),
      );
    });
  });

  describe('when RESEND_API_KEY is set', () => {
    let service: MailerService;

    beforeEach(() => {
      service = new MailerService(
        mockConfigService({ resendApiKey: 're_test_key', mailFrom: 'FrameBase <test@test.com>' }),
      );
    });

    it('reports isConfigured as true', () => {
      expect(service.isConfigured).toBe(true);
    });

    it('sends email via Resend SDK and returns sent: true', async () => {
      mockSendFn.mockResolvedValue({ data: { id: 'email-1' }, error: null });

      const result = await service.sendMail({
        to: 'user@example.com',
        subject: 'Hello',
        html: '<p>Hello</p>',
        text: 'Hello',
      });

      expect(result).toEqual({ sent: true });
      expect(mockSendFn).toHaveBeenCalledWith({
        from: 'FrameBase <test@test.com>',
        to: ['user@example.com'],
        subject: 'Hello',
        html: '<p>Hello</p>',
        text: 'Hello',
      });
    });

    it('handles Resend API errors gracefully', async () => {
      mockSendFn.mockResolvedValue({
        data: null,
        error: { message: 'Invalid email', name: 'validation_error' },
      });

      const result = await service.sendMail({
        to: 'bad-email',
        subject: 'Hello',
        html: '<p>Hello</p>',
        text: 'Hello',
      });

      expect(result).toEqual({
        sent: false,
        reason: 'error',
        error: 'Invalid email',
      });
    });

    it('handles network/throw errors gracefully', async () => {
      mockSendFn.mockRejectedValue(new Error('Network timeout'));

      const result = await service.sendMail({
        to: 'user@example.com',
        subject: 'Hello',
        html: '<p>Hello</p>',
        text: 'Hello',
      });

      expect(result).toEqual({
        sent: false,
        reason: 'error',
        error: 'Network timeout',
      });
    });

    it('sendInvitationEmail delegates to sendMail with correct content', async () => {
      mockSendFn.mockResolvedValue({ data: { id: 'email-1' }, error: null });

      const result = await service.sendInvitationEmail({
        to: 'invitee@example.com',
        inviteUrl: 'https://app.example.com/invite/abc123',
        expiresAt: new Date('2026-10-01'),
        organizationName: 'Acme Corp',
        role: 'admin',
      });

      expect(result).toEqual({ sent: true });
      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['invitee@example.com'],
          subject: expect.stringContaining('Acme Corp'),
        }),
      );
    });

    it('sendPasswordResetEmail delegates to sendMail with correct content', async () => {
      mockSendFn.mockResolvedValue({ data: { id: 'email-1' }, error: null });

      const result = await service.sendPasswordResetEmail({
        to: 'user@example.com',
        resetUrl: 'https://app.example.com/reset?token=abc123',
        expiresAt: new Date('2026-10-01'),
      });

      expect(result).toEqual({ sent: true });
      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['user@example.com'],
          subject: expect.stringContaining('password'),
        }),
      );
    });
  });
});
