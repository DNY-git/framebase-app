import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../database/base.repository';
import { Task, TaskDocument } from '../../../schemas/task.schema';
import { TaskDomain, TenantId } from '@constructtrack/types';
import type { PaginationOptions, PaginatedResponse } from '@constructtrack/types';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';

export interface TaskCreateInput extends CreateTaskDto {
  projectId: string;
}

@Injectable()
export class TaskRepository extends BaseRepository<
  TaskDomain,
  TaskDocument,
  TaskCreateInput,
  UpdateTaskDto
> {
  constructor(@InjectModel(Task.name) model: Model<TaskDocument>) {
    super(model);
  }

  async findByProject(
    tenantId: TenantId,
    projectId: string,
    filter: Record<string, unknown> = {},
    options?: PaginationOptions,
  ): Promise<PaginatedResponse<TaskDomain>> {
    const combinedFilter = { ...filter, projectId };
    if (options) {
      return this.find(tenantId, combinedFilter, options);
    }
    // If no pagination provided, fetch all (or use default BaseRepository logic if you want to bypass pagination)
    // BaseRepository `find` always paginates. For all items, we can use model.find
    const docs = await this.model.find({ tenantId, ...combinedFilter }).exec();
    return {
      items: docs.map((doc) => this.toDomain(doc)),
      totalItems: docs.length,
      page: 1,
      perPage: Math.max(docs.length, 1),
      totalPages: 1,
    };
  }

  protected toDomain(doc: TaskDocument): TaskDomain {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      projectId: doc.projectId.toString(),
      phaseId: doc.phaseId?.toString(),
      parentId: doc.parentId?.toString(),
      assigneeId: doc.assigneeId?.toString(),
      title: doc.title,
      description: doc.description,
      status: doc.status,
      priority: doc.priority,
      dueDate: doc.dueDate,
      order: doc.order,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  protected toCreateDoc(
    tenantId: TenantId,
    data: TaskCreateInput,
  ): Partial<TaskDocument> {
    return {
      tenantId: tenantId as unknown as Task['tenantId'],
      projectId: data.projectId as unknown as Task['projectId'],
      phaseId: data.phaseId as unknown as Task['phaseId'],
      parentId: data.parentId as unknown as Task['parentId'],
      assigneeId: data.assigneeId as unknown as Task['assigneeId'],
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      order: data.order ?? 0,
    };
  }

  protected toUpdateDoc(data: UpdateTaskDto): Partial<TaskDocument> {
    const update: Partial<TaskDocument> = {};
    if (data.title !== undefined) update.title = data.title;
    if (data.description !== undefined) update.description = data.description;
    if (data.status !== undefined) update.status = data.status;
    if (data.priority !== undefined) update.priority = data.priority;
    if (data.dueDate !== undefined) update.dueDate = data.dueDate ? new Date(data.dueDate) : undefined;
    if (data.order !== undefined) update.order = data.order;
    if (data.assigneeId !== undefined) update.assigneeId = data.assigneeId as unknown as Task['assigneeId'];
    if (data.phaseId !== undefined) update.phaseId = data.phaseId as unknown as Task['phaseId'];
    if (data.parentId !== undefined) update.parentId = data.parentId as unknown as Task['parentId'];
    return update;
  }
}
