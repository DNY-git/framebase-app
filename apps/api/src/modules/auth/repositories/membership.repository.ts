/**
 * Membership repository — data access for the Membership collection.
 *
 * Memberships link users to tenants with a role. They ARE tenant-scoped
 * (a user's memberships outside the current tenant context are never
 * queryable), so this repository uses direct queries with explicit tenantId
 * scoping. The compound unique index on (userId, tenantId) enforces one
 * role per user per tenant.
 *
 * Services depend on this class via its public methods (PROJECT_RULES §34).
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from '@constructtrack/types';
import { Membership, MembershipDocument } from '../../../schemas/membership.schema';

export interface MembershipDomain {
  id: string;
  userId: string;
  tenantId: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class MembershipRepository {
  private readonly logger = new Logger(MembershipRepository.name);

  constructor(
    @InjectModel(Membership.name) model: Model<MembershipDocument>,
  ) {
    this.model = model;
  }

  protected readonly model: Model<MembershipDocument>;

  /**
   * Finds a membership by (userId, tenantId). Returns null if not found.
   */
  async findByUserAndTenant(
    userId: string,
    tenantId: string,
  ): Promise<MembershipDomain | null> {
    const doc = await this.model
      .findOne({ userId, tenantId })
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  /**
   * Finds all memberships for a user across all tenants.
   * Used for multi-tenant context switching (future).
   */
  async findByUserId(userId: string): Promise<MembershipDomain[]> {
    const docs = await this.model.find({ userId }).exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  /**
   * Creates a membership linking a user to a tenant with a role.
   */
  async create(data: {
    userId: string;
    tenantId: string;
    role: Role;
  }): Promise<MembershipDomain> {
    const doc = await this.model.create({
      userId: data.userId,
      tenantId: data.tenantId,
      role: data.role,
    });
    return this.toDomain(doc);
  }

  /**
   * Updates the role on an existing membership.
   */
  async updateRole(
    userId: string,
    tenantId: string,
    role: Role,
  ): Promise<MembershipDomain | null> {
    const doc = await this.model
      .findOneAndUpdate(
        { userId, tenantId },
        { $set: { role } },
        { new: true },
      )
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  /**
   * Finds all memberships for a tenant — the Team/members list.
   */
  async findByTenant(tenantId: string): Promise<MembershipDomain[]> {
    const docs = await this.model.find({ tenantId }).exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  /**
   * Deletes a membership (removes a user from an organization).
   * Returns true if a document was removed.
   */
  async delete(userId: string, tenantId: string): Promise<boolean> {
    const result = await this.model
      .deleteOne({ userId, tenantId })
      .exec();
    return result.deletedCount > 0;
  }

  /**
   * Counts members holding one of the given roles in a tenant.
   * Used by the "last owner/admin" guard on role changes and removal.
   */
  async countMembersWithRole(
    tenantId: string,
    roles: Role[],
  ): Promise<number> {
    return this.model
      .countDocuments({ tenantId, role: { $in: roles } })
      .exec();
  }

  /**
   * Whether a user is currently a member of the tenant.
   */
  async exists(userId: string, tenantId: string): Promise<boolean> {
    const doc = await this.model
      .findOne({ userId, tenantId })
      .select('_id')
      .lean()
      .exec();
    return doc !== null;
  }

  protected toDomain(doc: MembershipDocument): MembershipDomain {
    return {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      tenantId: doc.tenantId.toString(),
      role: doc.role,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
