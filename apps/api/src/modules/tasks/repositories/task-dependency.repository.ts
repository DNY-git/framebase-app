import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TaskDependency, TaskDependencyDocument } from '../../../schemas/task-dependency.schema';
import { TaskDependencyDomain, TenantId } from '@constructtrack/types';

@Injectable()
export class TaskDependencyRepository {
  constructor(
    @InjectModel(TaskDependency.name)
    private readonly model: Model<TaskDependencyDocument>,
  ) {}

  async create(data: {
    tenantId: string;
    projectId: string;
    predecessorId: string;
    successorId: string;
  }): Promise<TaskDependencyDomain> {
    const created = new this.model(data);
    const doc = await created.save();
    return this.toDomain(doc);
  }

  async delete(tenantId: TenantId, predecessorId: string, successorId: string): Promise<boolean> {
    const result = await this.model.deleteOne({ tenantId, predecessorId, successorId }).exec();
    return result.deletedCount > 0;
  }

  async findByProject(tenantId: TenantId, projectId: string): Promise<TaskDependencyDomain[]> {
    const docs = await this.model.find({ tenantId, projectId }).exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  async findPredecessors(tenantId: TenantId, successorId: string): Promise<TaskDependencyDomain[]> {
    const docs = await this.model.find({ tenantId, successorId }).exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  async findSuccessors(tenantId: TenantId, predecessorId: string): Promise<TaskDependencyDomain[]> {
    const docs = await this.model.find({ tenantId, predecessorId }).exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  async exists(tenantId: TenantId, predecessorId: string, successorId: string): Promise<boolean> {
    const count = await this.model.countDocuments({ tenantId, predecessorId, successorId }).exec();
    return count > 0;
  }

  private toDomain(doc: TaskDependencyDocument): TaskDependencyDomain {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      projectId: doc.projectId.toString(),
      predecessorId: doc.predecessorId.toString(),
      successorId: doc.successorId.toString(),
      createdAt: doc.createdAt,
    };
  }
}
