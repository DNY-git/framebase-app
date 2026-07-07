/**
 * Project member repository — data access for the ProjectMember collection.
 *
 * ProjectMembers link users to projects with a project-scoped role. They ARE
 * tenant-scoped, so every query injects tenantId explicitly. The compound
 * unique index on (tenantId, projectId, userId) enforces one role per user
 * per project.
 *
 * Services depend on this class via its public methods (PROJECT_RULES §34).
 * Authorization logic (who may change membership) lives in
 * AuthorizationService, not here.
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProjectMember, ProjectMemberDocument } from '../../../schemas/project-member.schema';
import {
  ProjectMemberDomain,
  ProjectRole,
  TenantId,
} from '@constructtrack/types';

@Injectable()
export class ProjectMemberRepository {
  constructor(
    @InjectModel(ProjectMember.name) private readonly model: Model<ProjectMemberDocument>,
  ) {}

  /**
   * Finds a single membership by (tenantId, projectId, userId).
   * Returns null if the user is not a member of the project.
   */
  async findByProjectAndUser(
    tenantId: TenantId,
    projectId: string,
    userId: string,
  ): Promise<ProjectMemberDomain | null> {
    const doc = await this.model
      .findOne({ tenantId, projectId, userId })
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  /**
   * Lists all members of a project (tenant-scoped).
   */
  async findByProject(
    tenantId: TenantId,
    projectId: string,
  ): Promise<ProjectMemberDomain[]> {
    const docs = await this.model.find({ tenantId, projectId }).exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  /**
   * Lists all project memberships for a user across a tenant.
   * Used for the "my projects" query and membership-based filtering.
   */
  async findByUser(
    tenantId: TenantId,
    userId: string,
  ): Promise<ProjectMemberDomain[]> {
    const docs = await this.model.find({ tenantId, userId }).exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  /**
   * Counts how many managers a project has. Used to prevent removing the
   * last manager from a project.
   */
  async countManagers(
    tenantId: TenantId,
    projectId: string,
  ): Promise<number> {
    return this.model
      .countDocuments({
        tenantId,
        projectId,
        role: { $in: [ProjectRole.MANAGER, ProjectRole.ADMIN] },
      })
      .exec();
  }

  /**
   * Creates a project membership.
   */
  async create(data: {
    tenantId: string;
    projectId: string;
    userId: string;
    role: ProjectRole;
  }): Promise<ProjectMemberDomain> {
    const doc = await this.model.create({
      tenantId: data.tenantId,
      projectId: data.projectId,
      userId: data.userId,
      role: data.role,
    });
    return this.toDomain(doc);
  }

  /**
   * Updates the role on an existing membership. Returns null if not found.
   */
  async updateRole(
    tenantId: TenantId,
    projectId: string,
    userId: string,
    role: ProjectRole,
  ): Promise<ProjectMemberDomain | null> {
    const doc = await this.model
      .findOneAndUpdate(
        { tenantId, projectId, userId },
        { $set: { role } },
        { new: true },
      )
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  /**
   * Removes a membership. Returns true if a document was deleted.
   */
  async remove(
    tenantId: TenantId,
    projectId: string,
    userId: string,
  ): Promise<boolean> {
    const result = await this.model
      .deleteOne({ tenantId, projectId, userId })
      .exec();
    return result.deletedCount > 0;
  }

  private toDomain(doc: ProjectMemberDocument): ProjectMemberDomain {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      projectId: doc.projectId.toString(),
      userId: doc.userId.toString(),
      role: doc.role,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
