/**
 * Invitation repository — data access for the Invitation collection.
 *
 * Invitations are tenant-scoped documents. Lookups are always explicit
 * about tenantId (or token, which is globally unique per document).
 * See docs/database/tenancy.md.
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from '@constructtrack/types';
import {
  Invitation,
  InvitationDocument,
  InvitationStatus,
} from '../../../schemas/invitation.schema';

export interface InvitationDomain {
  id: string;
  tenantId: string;
  email: string;
  role: Role;
  token: string;
  status: InvitationStatus;
  expiresAt: Date;
  invitedBy: string;
  acceptedAt: Date | null;
  acceptedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class InvitationRepository {
  private readonly logger = new Logger(InvitationRepository.name);

  constructor(@InjectModel(Invitation.name) model: Model<InvitationDocument>) {
    this.model = model;
  }

  protected readonly model: Model<InvitationDocument>;

  async create(data: {
    tenantId: string;
    email: string;
    role: Role;
    token: string;
    expiresAt: Date;
    invitedBy: string;
  }): Promise<InvitationDomain> {
    const doc = await this.model.create({
      tenantId: data.tenantId,
      email: data.email,
      role: data.role,
      token: data.token,
      status: InvitationStatus.PENDING,
      expiresAt: data.expiresAt,
      invitedBy: data.invitedBy,
    });
    return this.toDomain(doc);
  }

  async findByToken(token: string): Promise<InvitationDomain | null> {
    const doc = await this.model.findOne({ token }).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findById(id: string, tenantId: string): Promise<InvitationDomain | null> {
    const doc = await this.model.findOne({ _id: id, tenantId }).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findPendingByTenantAndEmail(
    tenantId: string,
    email: string,
  ): Promise<InvitationDomain | null> {
    const doc = await this.model
      .findOne({ tenantId, email, status: InvitationStatus.PENDING })
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findByTenant(tenantId: string): Promise<InvitationDomain[]> {
    const docs = await this.model
      .find({ tenantId })
      .sort({ createdAt: -1 })
      .exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  async markAccepted(
    id: string,
    acceptedBy: string,
  ): Promise<InvitationDomain | null> {
    const doc = await this.model
      .findByIdAndUpdate(
        id,
        {
          $set: {
            status: InvitationStatus.ACCEPTED,
            acceptedAt: new Date(),
            acceptedBy,
          },
        },
        { new: true },
      )
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  async revoke(id: string): Promise<InvitationDomain | null> {
    const doc = await this.model
      .findByIdAndUpdate(
        id,
        { $set: { status: InvitationStatus.REVOKED } },
        { new: true },
      )
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  async updateExpiresAt(id: string, expiresAt: Date): Promise<InvitationDomain | null> {
    const doc = await this.model
      .findByIdAndUpdate(id, { $set: { expiresAt } }, { new: true })
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  /** Invalidates other pending invitations for the same (tenant, email). */
  async revokePendingForEmail(tenantId: string, email: string): Promise<void> {
    await this.model
      .updateMany(
        {
          tenantId,
          email,
          status: InvitationStatus.PENDING,
        },
        { $set: { status: InvitationStatus.REVOKED } },
      )
      .exec();
  }

  protected toDomain(doc: InvitationDocument): InvitationDomain {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      email: doc.email,
      role: doc.role,
      token: doc.token,
      status: doc.status,
      expiresAt: doc.expiresAt,
      invitedBy: doc.invitedBy.toString(),
      acceptedAt: doc.acceptedAt ?? null,
      acceptedBy: doc.acceptedBy ? doc.acceptedBy.toString() : null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}