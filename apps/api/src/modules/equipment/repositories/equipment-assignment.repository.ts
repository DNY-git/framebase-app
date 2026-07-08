import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { EquipmentAssignment, EquipmentAssignmentDocument } from '../../../schemas/equipment-assignment.schema';
import { EquipmentAssignmentDomain, TenantId } from '@constructtrack/types';
import { AssignEquipmentDto } from '../dto/assign-equipment.dto';
import { BaseRepository } from '../../../database/base.repository';

@Injectable()
export class EquipmentAssignmentRepository extends BaseRepository<
  EquipmentAssignmentDomain,
  EquipmentAssignmentDocument,
  AssignEquipmentDto & { equipmentId: string },
  { endDate?: Date; active?: boolean }
> {
  constructor(
    @InjectModel(EquipmentAssignment.name)
    model: Model<EquipmentAssignmentDocument>,
  ) {
    super(model);
  }

  protected toDomain(doc: EquipmentAssignmentDocument): EquipmentAssignmentDomain {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      equipmentId: doc.equipmentId.toString(),
      projectId: doc.projectId.toString(),
      operatorId: doc.operatorId?.toString(),
      startDate: doc.startDate,
      endDate: doc.endDate,
      active: doc.active,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  protected toCreateDoc(
    tenantId: TenantId,
    data: AssignEquipmentDto & { equipmentId: string },
  ): Partial<EquipmentAssignmentDocument> {
    return {
      tenantId,
      equipmentId: data.equipmentId,
      projectId: data.projectId,
      operatorId: data.operatorId,
      startDate: data.startDate,
      endDate: data.endDate,
      active: true,
    };
  }

  protected toUpdateDoc(data: { endDate?: Date; active?: boolean }): Partial<EquipmentAssignmentDocument> {
    const doc: Partial<EquipmentAssignmentDocument> = {};
    if (data.endDate !== undefined) doc.endDate = data.endDate;
    if (data.active !== undefined) doc.active = data.active;
    return doc;
  }

  /**
   * Check if there are overlapping active assignments for a given piece of equipment.
   */
  async hasOverlappingAssignment(
    tenantId: TenantId,
    equipmentId: string,
    startDate: Date,
    endDate?: Date,
  ): Promise<boolean> {
    const query: FilterQuery<EquipmentAssignmentDocument> = {
      tenantId,
      equipmentId,
      active: true,
      // overlap logic: existing assignment starts before new end (if new has end),
      // AND existing assignment ends after new start (if existing has end)
    };

    if (endDate) {
      query.startDate = { $lt: endDate };
    }

    const assignments = await this.model.find(query).exec();
    
    // Now verify the other side of the overlap (existing end > new start)
    return assignments.some((a) => {
      if (!a.endDate) return true; // existing is infinite, so it overlaps
      return a.endDate > startDate;
    });
  }
}
