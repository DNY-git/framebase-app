/**
 * Typed application configuration.
 * Loaded from environment variables via @nestjs/config.
 * See .env.example for the full variable list and descriptions.
 */
export interface AppConfig {
  nodeEnv: string;
  port: number;
  logLevel: string;
  appName: string;
  appUrl: string;
  apiUrl: string;
  mongodbUri: string | null;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtAccessTtl: string;
  jwtRefreshTtl: string;
  passwordPepper: string;
  bcryptRounds: number;
  cookieSecret: string;
  cookieSecure: boolean;
  corsAllowedOrigins: string[];
  googleClientId: string;
  googleClientSecret: string;
  googleCallbackUrl: string;
  aiProvider: string;
  aiMaxTokens: number;
  aiRequestTimeoutMs: number;
  geminiApiKey: string;
  geminiModel?: string;
  rateLimitAuthLimit: number;
  rateLimitAuthTtl: number;
  rateLimitPublicLimit: number;
  rateLimitPublicTtl: number;
  smtpHost: string | null;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  mailFrom: string;
  invitationTtl: string;
}

export const configuration = (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '4000', 10),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  appName: process.env.APP_NAME ?? 'FrameBase',
  appUrl: process.env.APP_URL ?? 'http://localhost:5173',
  apiUrl: process.env.API_URL ?? 'http://localhost:4000',
  // MongoDB Atlas is optional — app degrades gracefully if not configured.
  // Health check reports DB status accordingly.
  mongodbUri: process.env.MONGODB_URI && process.env.MONGODB_URI.startsWith('mongodb')
    ? process.env.MONGODB_URI
    : null,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? 'change-me-access-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh-secret',
  jwtAccessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  passwordPepper: process.env.PASSWORD_PEPPER ?? 'change-me-pepper',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),
  cookieSecret: process.env.COOKIE_SECRET ?? 'change-me-cookie-secret',
  cookieSecure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
  corsAllowedOrigins: (
    process.env.CORS_ALLOWED_ORIGINS ??
    'http://localhost:5173,https://framebase-app-web.vercel.app'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  googleCallbackUrl:
    process.env.GOOGLE_CALLBACK_URL ??
    'http://localhost:4000/api/v1/auth/google/callback',
  aiProvider: process.env.AI_PROVIDER ?? 'none',
  aiMaxTokens: parseInt(process.env.AI_MAX_TOKENS ?? '1000', 10),
  aiRequestTimeoutMs: parseInt(process.env.AI_REQUEST_TIMEOUT_MS ?? '15000', 10),
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  geminiModel: process.env.GEMINI_MODEL || undefined,
  rateLimitAuthLimit: parseInt(process.env.RATE_LIMIT_AUTH_LIMIT ?? '30', 10),
  rateLimitAuthTtl: parseInt(process.env.RATE_LIMIT_AUTH_TTL ?? '60000', 10),
  rateLimitPublicLimit: parseInt(process.env.RATE_LIMIT_PUBLIC_LIMIT ?? '20', 10),
  rateLimitPublicTtl: parseInt(process.env.RATE_LIMIT_PUBLIC_TTL ?? '60000', 10),
  // SMTP is optional — when absent, invite emails are skipped and the UI
  // falls back to copyable accept links (never a fake "sent" state).
  smtpHost: process.env.SMTP_HOST || null,
  smtpPort: parseInt(process.env.SMTP_PORT ?? '587', 10),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER ?? '',
  smtpPass: process.env.SMTP_PASS ?? '',
  mailFrom: process.env.MAIL_FROM ?? 'FrameBase <no-reply@framebase.local>',
  invitationTtl: process.env.INVITATION_TTL ?? '72h',
});
