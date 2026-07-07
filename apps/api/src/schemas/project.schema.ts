/**
 * Project schema — the root container for a construction effort.
 *
 * Every other tenant-scoped domain (tasks, equipment, inventory, reports)
 * hangs off a project. Projects are tenant-scoped: a user never sees
 * another tenant's projects. The compound unique index on (tenantId, code)
 * enforces that codes are unique within a tenant.
 *
 * Status transitions are validated in the service layer via a transition
 * map (planning → active → on_hold/completed → archived). Soft delete uses
 * status: archived plus archivedAt/archivedBy; hard delete is admin-only.
 *
 * See docs/features/projects.md and docs/database/schema.md.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { ProjectStatus } from '@constructtrack/types';

export type ProjectDocument = HydratedDocument<Project>;

@Schema({ timestamps: true })
export class Project {
  _id!: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    required: true,
    index: true,
  })
  tenantId!: MongooseSchema.Types.ObjectId;

  /** Project code — unique within a tenant. Normalized to UPPERCASE. */
  @Prop({ type: String, required: true, trim: true, uppercase: true })
  code!: string;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, trim: true })
  description?: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(ProjectStatus),
    default: ProjectStatus.PLANNING,
  })
  status!: ProjectStatus;

  /** Current phase name (the Phase table holds the full breakdown). */
  @Prop({ type: String, trim: true })
  phase?: string;

  @Prop({ type: Date })
  startDate?: Date;

  @Prop({ type: Date })
  endDate?: Date;

  /** Budget in integer cents — never floats (docs/api/standards.md). */
  @Prop({ type: Number })
  budgetCents?: number;

  @Prop({ type: String, trim: true })
  location?: string;

  /** The user who created the project. */
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  createdBy!: MongooseSchema.Types.ObjectId;

  /** Soft-delete timestamp — set when the project is archived. */
  @Prop({ type: Date })
  archivedAt?: Date;

  /** The user who archived the project. */
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
  })
  archivedBy?: MongooseSchema.Types.ObjectId;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

// Unique code within a tenant.
ProjectSchema.index({ tenantId: 1, code: 1 }, { unique: true });
// Common list query: projects by status within a tenant.
ProjectSchema.index({ tenantId: 1, status: 1 });
