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
}

export const configuration = (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '4000', 10),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  appName: process.env.APP_NAME ?? 'ConstructTrack',
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
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
});
