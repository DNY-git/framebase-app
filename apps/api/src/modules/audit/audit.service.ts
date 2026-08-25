/**
 * Audit service — records every stateful mutation.
 *
 * Every mutating operation (create, update, delete) on tenant-scoped data
 * writes an audit-log entry capturing who did what, to which entity, and
 * the before/after state. Satisfies PROJECT_RULES.md §31 ("All mutating
 * operations are auditable") and supports compliance.
 *
 * Audit writes are fire-and-forget with error logging — a failed audit
 * write must not break the user's operation, but it IS logged for ops.
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from '../../schemas/audit-log.schema';
import { PaginatedResponse, PaginationOptions, AuditLogDomain } from '@constructtrack/types';

export interface AuditRecord {
  tenantId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  correlationId?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AuditLog.name) private readonly model: Model<AuditLogDocument>,
  ) {}

  /**
   * Records an audit entry. Never throws — failures are logged only.
   */
  async record(data: AuditRecord): Promise<void> {
    try {
      await this.model.create({
        tenantId: data.tenantId,
        actorId: data.actorId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        before: data.before,
        after: data.after,
        correlationId: data.correlationId,
      });
    } catch (err) {
      this.logger.error(
        `Failed to write audit log: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  /**
   * Retrieves all audit logs for a tenant with optional filters.
   */
  async findAll(
    tenantId: string,
    options: PaginationOptions,
    filter: Record<string, unknown> = {},
  ): Promise<PaginatedResponse<AuditLogDomain>> {
    const queryFilter = { tenantId, ...filter };
    const page = options.page || 1;
    const perPage = options.perPage || 20;
    const skip = (page - 1) * perPage;

    const [items, totalItems] = await Promise.all([
      this.model
        .find(queryFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(perPage)
        .lean()
        .exec(),
      this.model.countDocuments(queryFilter).exec(),
    ]);

    return {
      items: items.map(this.mapToDomain),
      page,
      perPage,
      totalItems,
      totalPages: Math.ceil(totalItems / perPage),
    };
  }

  /**
   * Retrieves audit logs for a specific entity.
   */
  async findByEntity(
    tenantId: string,
    entityType: string,
    entityId: string,
    options: PaginationOptions,
  ): Promise<PaginatedResponse<AuditLogDomain>> {
    const filter = { tenantId, entityType, entityId };
    
    const page = options.page || 1;
    const perPage = options.perPage || 20;
    const skip = (page - 1) * perPage;

    const [items, totalItems] = await Promise.all([
      this.model
        .find(filter)
        .sort(options.sort || { createdAt: -1 })
        .skip(skip)
        .limit(perPage)
        .lean()
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return {
      items: items.map(this.mapToDomain),
      page,
      perPage,
      totalItems,
      totalPages: Math.ceil(totalItems / perPage),
    };
  }

  /**
   * Counts audit-log entries per UTC calendar day since `since`.
   * Powers the dashboard activity heatmap with real recorded work activity.
   * Mongoose does NOT cast aggregation stages — tenantId is stored as an
   * ObjectId, so the JWT's string value must be cast explicitly.
   */
  async countByDay(
    tenantId: string,
    since: Date,
  ): Promise<Array<{ date: string; count: number }>> {
    const rows = await this.model.aggregate<{
      _id: string;
      count: number;
    }>([
      { $match: { tenantId: new Types.ObjectId(tenantId), createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
    ]);

    return rows.map((r) => ({ date: r._id, count: r.count }));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapToDomain(doc: any): AuditLogDomain {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      actorId: doc.actorId.toString(),
      action: doc.action,
      entityType: doc.entityType,
      entityId: doc.entityId.toString(),
      before: doc.before,
      after: doc.after,
      correlationId: doc.correlationId,
      createdAt: doc.createdAt,
    };
  }
}
