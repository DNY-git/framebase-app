import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Equipment, EquipmentDocument } from '../../../schemas/equipment.schema';
import { BaseRepository } from '../../../database/base.repository';
import { EquipmentDomain, TenantId } from '@constructtrack/types';
import { CreateEquipmentDto } from '../dto/create-equipment.dto';
import { UpdateEquipmentDto } from '../dto/update-equipment.dto';

@Injectable()
export class EquipmentRepository extends BaseRepository<
  EquipmentDomain,
  EquipmentDocument,
  CreateEquipmentDto,
  UpdateEquipmentDto
> {
  constructor(
    @InjectModel(Equipment.name)
    model: Model<EquipmentDocument>,
  ) {
    super(model);
  }

  protected toDomain(doc: EquipmentDocument): EquipmentDomain {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      name: doc.name,
      serialNumber: doc.serialNumber,
      category: doc.category,
      status: doc.status,
      purchaseDate: doc.purchaseDate,
      purchaseCostCents: doc.purchaseCostCents,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  protected toCreateDoc(
    tenantId: TenantId,
    data: CreateEquipmentDto,
  ): Partial<EquipmentDocument> {
    return {
      tenantId,
      name: data.name,
      serialNumber: data.serialNumber,
      category: data.category,
      // DTO carries an ISO string; Mongoose persists a real Date.
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
      purchaseCostCents: data.purchaseCostCents,
      // status defaults to AVAILABLE in schema
    };
  }

  protected toUpdateDoc(data: UpdateEquipmentDto): Partial<EquipmentDocument> {
    const doc: Partial<EquipmentDocument> = {};
    if (data.name !== undefined) doc.name = data.name;
    if (data.serialNumber !== undefined) doc.serialNumber = data.serialNumber;
    if (data.category !== undefined) doc.category = data.category;
    if (data.status !== undefined) doc.status = data.status;
    if (data.purchaseDate !== undefined) doc.purchaseDate = new Date(data.purchaseDate);
    if (data.purchaseCostCents !== undefined) doc.purchaseCostCents = data.purchaseCostCents;
    return doc;
  }
}
