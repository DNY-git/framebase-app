/**
 * Password reset token repository — data access for password reset tokens.
 *
 * Follows the same repository pattern used across this codebase.
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PasswordResetToken,
  PasswordResetTokenDocument,
  PasswordResetTokenStatus,
} from '../../../schemas/password-reset-token.schema';

export interface PasswordResetTokenDomain {
  id: string;
  userId: string;
  tokenHash: string;
  status: PasswordResetTokenStatus;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PasswordResetTokenRepository {
  private readonly logger = new Logger(PasswordResetTokenRepository.name);

  constructor(
    @InjectModel(PasswordResetToken.name)
    private readonly model: Model<PasswordResetTokenDocument>,
  ) {}

  async create(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<PasswordResetTokenDomain> {
    const doc = await this.model.create({
      userId: data.userId,
      tokenHash: data.tokenHash,
      status: PasswordResetTokenStatus.PENDING,
      expiresAt: data.expiresAt,
    });
    return this.toDomain(doc);
  }

  async findPendingByHash(
    tokenHash: string,
  ): Promise<PasswordResetTokenDomain | null> {
    const doc = await this.model.findOne({
      tokenHash,
      status: PasswordResetTokenStatus.PENDING,
    });
    return doc ? this.toDomain(doc) : null;
  }

  async markUsed(id: string): Promise<void> {
    await this.model.findByIdAndUpdate(id, {
      $set: { status: PasswordResetTokenStatus.USED, usedAt: new Date() },
    });
  }

  async invalidatePendingForUser(userId: string): Promise<void> {
    await this.model.updateMany(
      { userId, status: PasswordResetTokenStatus.PENDING },
      { $set: { status: PasswordResetTokenStatus.EXPIRED } },
    );
  }

  protected toDomain(doc: PasswordResetTokenDocument): PasswordResetTokenDomain {
    return {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      tokenHash: doc.tokenHash,
      status: doc.status,
      expiresAt: doc.expiresAt,
      usedAt: doc.usedAt ?? null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
