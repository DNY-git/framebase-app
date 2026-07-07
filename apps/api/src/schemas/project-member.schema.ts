/**
 * Project member schema — links a user to a project with a project-scoped role.
 *
 * This is the join entity for the user↔project relationship. A project-scoped
 * role may narrow (never widen) the tenant-level role. A user who is not a
 * member of a project cannot see it (404, not 403, to avoid leaking existence).
 *
 * The compound unique index on (tenantId, projectId, userId) enforces that a
 * user has exactly one role per project. The (tenantId, userId) index supports
 * "my projects" queries.
 *
 * See docs/features/projects.md → Permissions & Roles and
 * docs/security/authorization.md → Project-Level Roles.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { ProjectRole } from '@constructtrack/types';

export type ProjectMemberDocument = HydratedDocument<ProjectMember>;

@Schema({ timestamps: true })
export class ProjectMember {
  _id!: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    required: true,
    index: true,
  })
  tenantId!: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true,
  })
  projectId!: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: MongooseSchema.Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(ProjectRole),
  })
  role!: ProjectRole;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ProjectMemberSchema = SchemaFactory.createForClass(ProjectMember);

// Enforce one role per (tenant, project, user) — tenant included so the
// index is structurally tenant-safe.
ProjectMemberSchema.index(
  { tenantId: 1, projectId: 1, userId: 1 },
  { unique: true },
);
// Fast lookup of a user's projects across a tenant.
ProjectMemberSchema.index({ tenantId: 1, userId: 1 });
