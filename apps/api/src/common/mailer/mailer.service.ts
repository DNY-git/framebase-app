/**
 * MailerService — optional SMTP email delivery via nodemailer.
 *
 * When SMTP_HOST is not configured the service reports `sent: false` instead
 * of pretending an email went out; callers surface a copyable link fallback.
 * See .env.example for the SMTP_* / MAIL_FROM variable contract.
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
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
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(configService: ConfigService<AppConfig, true>) {
    this.from = configService.get('mailFrom', { infer: true });
    const host = configService.get('smtpHost', { infer: true });
    if (!host) {
      this.transporter = null;
      return;
    }
    this.transporter = nodemailer.createTransport({
      host,
      port: configService.get('smtpPort', { infer: true }),
      secure: configService.get('smtpSecure', { infer: true }),
      auth:
        configService.get('smtpUser', { infer: true })
          ? {
              user: configService.get('smtpUser', { infer: true }),
              pass: configService.get('smtpPass', { infer: true }),
            }
          : undefined,
    });
  }

  get isConfigured(): boolean {
    return this.transporter !== null;
  }

  async sendMail(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<SendMailResult> {
    if (!this.transporter) {
      return { sent: false, reason: 'not_configured' };
    }
    try {
      await this.transporter.sendMail({ from: this.from, ...options });
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
