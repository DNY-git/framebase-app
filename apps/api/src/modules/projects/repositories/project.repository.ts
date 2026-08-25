/**
 * Project repository — data access for the Project collection.
 *
 * Extends BaseRepository so every query is automatically scoped by tenantId
 * (PROJECT_RULES.md §35). Adds project-specific lookups: by code and the
 * "accessible projects" query used by the list endpoint (admins see all
 * tenant projects; others see only projects they're members of).
 *
 * The repository is the only layer that touches Mongoose models directly
 * (PROJECT_RULES.md §34).
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../../database/base.repository';
import { Project, ProjectDocument } from '../../../schemas/project.schema';
import {
  ProjectDomain,
  ProjectStatus,
  TenantId,
} from '@constructtrack/types';
import type {
  PaginationOptions,
  PaginatedResponse,
} from '@constructtrack/types';
import { UpdateProjectDto } from '../dto/update-project.dto';

/**
 * Internal create payload — the service normalizes the code and supplies
 * createdBy before calling the repository, since BaseRepository.toCreateDoc
 * only receives (tenantId, data).
 */
export interface ProjectCreateInput {
  code: string; // already uppercased
  name: string;
  description?: string;
  phase?: string;
  startDate?: Date;
  endDate?: Date;
  budgetCents?: number;
  location?: string;
  createdBy: string;
}

@Injectable()
export class ProjectRepository extends BaseRepository<
  ProjectDomain,
  ProjectDocument,
  ProjectCreateInput,
  UpdateProjectDto
> {
  constructor(
    @InjectModel(Project.name) model: Model<ProjectDocument>,
  ) {
    super(model);
  }

  /**
   * Finds a project by its (tenant-scoped) code. Returns null if not found.
   */
  async findByCode(
    tenantId: TenantId,
    code: string,
  ): Promise<ProjectDomain | null> {
    const normalized = code.trim().toUpperCase();
    const doc = await this.model
      .findOne({ tenantId, code: normalized })
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  /**
   * Returns true if a project with the given code exists in the tenant.
   */
  async existsByCode(tenantId: TenantId, code: string): Promise<boolean> {
    const normalized = code.trim().toUpperCase();
    return this.exists(tenantId, { code: normalized });
  }

  /**
   * Lists projects a user may access. When `accessibleProjectIds` is omitted,
   * returns ALL tenant projects (admin view). When provided, restricts to
   * those ids (membership-filtered view). Applies pagination + status filter.
   */
  async findAccessibleProjects(
    tenantId: TenantId,
    options: PaginationOptions & {
      status?: ProjectStatus;
      accessibleProjectIds?: string[];
    },
  ): Promise<PaginatedResponse<ProjectDomain>> {
    const filter: Record<string, unknown> = {};
    if (options.status) {
      filter.status = options.status;
    }
    if (options.accessibleProjectIds) {
      filter._id = { $in: options.accessibleProjectIds };
    }
    return this.find(tenantId, filter, options);
  }

  /**
   * Sums budgetCents across projects matching the filter (used by dashboard KPIs).
   * Mongoose does NOT cast values inside aggregation stages — tenantId and
   * _id members must be ObjectIds here, unlike find()/countDocuments().
   */
  async sumBudgetCents(
    tenantId: TenantId,
    filter: Record<string, unknown> = {},
  ): Promise<number> {
    const { _id, ...rest } = filter;
    const match: Record<string, unknown> = {
      tenantId: new Types.ObjectId(tenantId),
      ...rest,
    };
    if (_id && typeof _id === 'object' && Array.isArray((_id as { $in?: unknown[] }).$in)) {
      match._id = {
        $in: ((_id as { $in: unknown[] }).$in).map(
          (id) => new Types.ObjectId(id as string),
        ),
      };
    } else if (_id !== undefined) {
      match._id = _id;
    }
    const rows = await this.model.aggregate<{ total: number }>([
      { $match: match },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$budgetCents', 0] } } } },
    ]);
    return rows.length > 0 ? rows[0].total : 0;
  }

  protected toDomain(doc: ProjectDocument): ProjectDomain {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      code: doc.code,
      name: doc.name,
      description: doc.description,
      status: doc.status,
      phase: doc.phase,
      startDate: doc.startDate,
      endDate: doc.endDate,
      budgetCents: doc.budgetCents,
      location: doc.location,
      createdBy: doc.createdBy.toString(),
      archivedAt: doc.archivedAt ?? null,
      archivedBy: doc.archivedBy ? doc.archivedBy.toString() : null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  protected toCreateDoc(
    tenantId: TenantId,
    data: ProjectCreateInput,
  ): Partial<ProjectDocument> {
    return {
      tenantId: tenantId as unknown as Project['tenantId'],
      code: data.code.toUpperCase(),
      name: data.name,
      description: data.description,
      phase: data.phase,
      startDate: data.startDate,
      endDate: data.endDate,
      budgetCents: data.budgetCents,
      location: data.location,
      status: ProjectStatus.PLANNING,
      createdBy: data.createdBy as unknown as Project['createdBy'],
    };
  }

  protected toUpdateDoc(data: UpdateProjectDto): Partial<ProjectDocument> {
    const update: Partial<ProjectDocument> = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.description !== undefined) update.description = data.description;
    if (data.status !== undefined) update.status = data.status;
    if (data.phase !== undefined) update.phase = data.phase;
    if (data.startDate !== undefined) {
      update.startDate = data.startDate ? new Date(data.startDate) : undefined;
    }
    if (data.endDate !== undefined) {
      update.endDate = data.endDate ? new Date(data.endDate) : undefined;
    }
    if (data.budgetCents !== undefined) update.budgetCents = data.budgetCents;
    if (data.location !== undefined) update.location = data.location;
    return update;
  }
}
