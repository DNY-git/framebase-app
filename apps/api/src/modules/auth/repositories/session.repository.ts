/**
 * Session repository — data access for the Session collection.
 *
 * Sessions track refresh tokens for revocation and multi-device login.
 * They are user-scoped (not tenant-scoped) because a session represents
 * an authentication, not a tenant context. The TTL index auto-expires
 * sessions past their refresh-token expiry.
 *
 * Refresh token rotation: on each refresh, the old session is revoked
 * (isActive = false) and a new one is created. Reuse of a revoked session's
 * token triggers revocation of ALL the user's sessions (theft signal).
 *
 * Services depend on this class via its public methods (PROJECT_RULES §34).
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Session, SessionDocument } from '../../../schemas/session.schema';
import * as crypto from 'node:crypto';

export interface SessionDomain {
  id: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  isActive: boolean;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
}

export interface SessionCreateData {
  userId: string;
  refreshToken: string;
  /** TTL in seconds (must match the refresh token's JWT expiry). */
  ttlSeconds: number;
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class SessionRepository {
  private readonly logger = new Logger(SessionRepository.name);

  constructor(
    @InjectModel(Session.name) model: Model<SessionDocument>,
  ) {
    this.model = model;
  }

  protected readonly model: Model<SessionDocument>;

  /**
   * Creates a new active session for a refresh token.
   * Stores a SHA-256 hash of the token (never the token itself).
   */
  async createSession(data: SessionCreateData): Promise<SessionDomain> {
    const expiresAt = new Date(Date.now() + data.ttlSeconds * 1000);
    const doc = await this.model.create({
      userId: data.userId,
      refreshTokenHash: this.hashToken(data.refreshToken),
      expiresAt,
      isActive: true,
      userAgent: data.userAgent,
      ipAddress: data.ipAddress,
    });
    return this.toDomain(doc);
  }

  /**
   * Finds an active session by refresh token. Returns null if not found
   * or inactive (revoked).
   */
  async findActiveByToken(
    refreshToken: string,
  ): Promise<SessionDomain | null> {
    const doc = await this.model
      .findOne({
        refreshTokenHash: this.hashToken(refreshToken),
        isActive: true,
      })
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  /**
   * Revokes a single session by id (sets isActive = false).
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.model
      .updateOne({ _id: sessionId }, { $set: { isActive: false } })
      .exec();
  }

  /**
   * Revokes ALL sessions for a user (used on password reset, theft signal).
   */
  async revokeAllUserSessions(userId: string): Promise<number> {
    const result = await this.model
      .updateMany(
        { userId, isActive: true },
        { $set: { isActive: false } },
      )
      .exec();
    return result.modifiedCount;
  }

  /**
   * Revokes a session by its refresh token hash.
   * Returns true if a session was revoked, false if no active session matched.
   */
  async revokeSessionByToken(refreshToken: string): Promise<boolean> {
    const result = await this.model
      .updateOne(
        { refreshTokenHash: this.hashToken(refreshToken), isActive: true },
        { $set: { isActive: false } },
      )
      .exec();
    return result.modifiedCount > 0;
  }

  /**
   * Lists active sessions for a user (for the sessions UI).
   */
  async findActiveByUser(userId: string): Promise<SessionDomain[]> {
    const docs = await this.model
      .find({ userId, isActive: true })
      .sort({ createdAt: -1 })
      .exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  protected toDomain(doc: SessionDocument): SessionDomain {
    return {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      refreshTokenHash: doc.refreshTokenHash,
      expiresAt: doc.expiresAt,
      isActive: doc.isActive,
      userAgent: doc.userAgent,
      ipAddress: doc.ipAddress,
      createdAt: doc.createdAt,
    };
  }

  /**
   * Hashes a refresh token with SHA-256 for storage lookup.
   * We don't need bcrypt here (the token is already high-entropy); we just
   * need a one-way mapping so the DB doesn't store the raw token.
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
