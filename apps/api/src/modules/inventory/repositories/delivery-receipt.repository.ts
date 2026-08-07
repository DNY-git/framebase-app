import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DeliveryReceipt, DeliveryReceiptDocument } from '../../../schemas/delivery-receipt.schema';
import { BaseRepository } from '../../../database/base.repository';
import { DeliveryReceiptDomain, TenantId } from '@constructtrack/types';
import { CreateDeliveryDto } from '../dto/create-delivery.dto';

@Injectable()
export class DeliveryReceiptRepository extends BaseRepository<
  DeliveryReceiptDomain,
  DeliveryReceiptDocument,
  CreateDeliveryDto,
  Record<string, unknown>
> {
  constructor(
    @InjectModel(DeliveryReceipt.name)
    model: Model<DeliveryReceiptDocument>,
  ) {
    super(model);
  }

  protected toDomain(doc: DeliveryReceiptDocument): DeliveryReceiptDomain {
    return {
      id: doc._id.toString(),
      tenantId: doc.tenantId.toString(),
      supplier: doc.supplier,
      materialId: doc.materialId.toString(),
      quantity: doc.quantity,
      costCents: doc.costCents,
      notes: doc.notes,
      createdAt: doc.createdAt,
    };
  }

  protected toCreateDoc(
    tenantId: TenantId,
    data: CreateDeliveryDto,
  ): Partial<DeliveryReceiptDocument> {
    return {
      tenantId,
      supplier: data.supplier,
      materialId: data.materialId,
      quantity: data.quantity,
      costCents: data.costCents,
      notes: data.notes,
    };
  }

  protected toUpdateDoc(): Partial<DeliveryReceiptDocument> {
    return {};
  }
}
