import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Material, MaterialDocument } from '../../../schemas/material.schema';
import { BaseRepository } from '../../../database/base.repository';
import { MaterialDomain, TenantId } from '@constructtrack/types';
import { CreateMaterialDto } from '../dto/create-material.dto';
import { UpdateMaterialDto } from '../dto/update-material.dto';

@Injectable()
export class MaterialRepository extends BaseRepository<
  MaterialDomain,
  MaterialDocument,
  CreateMaterialDto,
  UpdateMaterialDto
> {
  constructor(
    @InjectModel(Material.name)
    model: Model<MaterialDocument>,
  ) {
    super(model);
  }

  protected toDomain(doc: MaterialDocument): MaterialDomain {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      sku: doc.sku,
      name: doc.name,
      unit: doc.unit,
      reorderPoint: doc.reorderPoint,
      archivedAt: doc.archivedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  protected toCreateDoc(
    tenantId: TenantId,
    data: CreateMaterialDto,
  ): Partial<MaterialDocument> {
    return {
      tenantId,
      sku: data.sku,
      name: data.name,
      unit: data.unit,
      reorderPoint: data.reorderPoint ?? 0,
    };
  }

  protected toUpdateDoc(data: UpdateMaterialDto): Partial<MaterialDocument> {
    const doc: Partial<MaterialDocument> = {};
    if (data.sku !== undefined) doc.sku = data.sku;
    if (data.name !== undefined) doc.name = data.name;
    if (data.unit !== undefined) doc.unit = data.unit;
    if (data.reorderPoint !== undefined) doc.reorderPoint = data.reorderPoint;
    if (data.archivedAt !== undefined) doc.archivedAt = data.archivedAt;
    return doc;
  }
}
