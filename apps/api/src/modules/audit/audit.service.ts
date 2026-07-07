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
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from '../../schemas/audit-log.schema';

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
}
