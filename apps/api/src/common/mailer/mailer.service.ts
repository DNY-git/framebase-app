/**
 * MailerService — optional email delivery via Resend's HTTP API.
 *
 * Resend sends over HTTPS (port 443), which Render's free tier does not
 * block — unlike SMTP on ports 25/465/587.
 *
 * When RESEND_API_KEY is not configured the service reports `sent: false`
 * instead of pretending an email went out; callers surface a copyable
 * link fallback. See .env.example for the RESEND_API_KEY variable.
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type { AppConfig } from '../../config/configuration';

export interface SendMailResult {
  sent: boolean;
  /** Present when `sent` is false — why delivery did not happen. */
  reason?: 'not_configured' | 'error';
  error?: string;
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(configService: ConfigService<AppConfig, true>) {
    this.from = configService.get('mailFrom', { infer: true });
    const apiKey = configService.get('resendApiKey', { infer: true });
    if (!apiKey) {
      this.resend = null;
      this.logger.warn(
        'RESEND_API_KEY not configured — email delivery disabled. ' +
        'Set RESEND_API_KEY in your environment to enable email.',
      );
      return;
    }
    this.resend = new Resend(apiKey);
  }

  get isConfigured(): boolean {
    return this.resend !== null;
  }

  async sendMail(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<SendMailResult> {
    if (!this.resend) {
      return { sent: false, reason: 'not_configured' };
    }
    try {
      const { error } = await this.resend.emails.send({
        from: this.from,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (error) {
        this.logger.error(`Resend API error for ${options.to}: ${error.message}`);
        return { sent: false, reason: 'error', error: error.message };
      }

      return { sent: true };
    } catch (err) {
      this.logger.error(`Failed to send mail to ${options.to}: ${(err as Error).message}`);
      return { sent: false, reason: 'error', error: (err as Error).message };
    }
  }

  async sendInvitationEmail(options: {
    to: string;
    inviteUrl: string;
    expiresAt: Date;
    organizationName?: string;
    role?: string;
  }): Promise<SendMailResult> {
    const org = options.organizationName ?? 'your organization';
    const expiry = options.expiresAt.toISOString().slice(0, 10);
    return this.sendMail({
      to: options.to,
      subject: `You're invited to join ${org} on FrameBase`,
      text:
        `You have been invited to join ${org} on FrameBase${options.role ? ` as ${options.role}` : ''}.\n\n` +
        `Accept your invitation before ${expiry}:\n${options.inviteUrl}\n`,
      html:
        `<p>You have been invited to join <strong>${escapeHtml(org)}</strong> on FrameBase` +
        `${options.role ? ` as <strong>${escapeHtml(options.role)}</strong>` : ''}.</p>` +
        `<p><a href="${options.inviteUrl}">Accept your invitation</a></p>` +
        `<p style="color:#71717a;font-size:12px">This link expires on ${expiry}. If you weren't expecting this invitation, you can ignore this email.</p>`,
    });
  }

  async sendPasswordResetEmail(options: {
    to: string;
    resetUrl: string;
    expiresAt: Date;
  }): Promise<SendMailResult> {
    const expiry = options.expiresAt.toISOString().slice(0, 10);
    return this.sendMail({
      to: options.to,
      subject: 'Reset your FrameBase password',
      text:
        `We received a request to reset your password.\n\n` +
        `Click the link below to set a new password (expires ${expiry}):\n${options.resetUrl}\n\n` +
        `If you didn't request this, you can safely ignore this email.`,
      html:
        `<p>We received a request to reset your password.</p>` +
        `<p><a href="${options.resetUrl}">Reset your password</a></p>` +
        `<p style="color:#71717a;font-size:12px">This link expires on ${expiry}. If you didn't request this, you can safely ignore this email.</p>`,
    });
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
