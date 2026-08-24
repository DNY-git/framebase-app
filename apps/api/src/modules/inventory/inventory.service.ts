import { HttpStatus, Injectable } from '@nestjs/common';
import { ErrorCode, Role, TransactionType } from '@constructtrack/types';
import { DomainException } from '../../common/exceptions/domain.exception';
import { MaterialRepository } from './repositories/material.repository';
import { StockLevelRepository } from './repositories/stock-level.repository';
import { InventoryTransactionRepository } from './repositories/inventory-transaction.repository';
import { DeliveryReceiptRepository } from './repositories/delivery-receipt.repository';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { AuthContext } from '../../common/authorization/authorization.types';
import { AuditService } from '../audit/audit.service';
import { MaterialDomain, StockLevelDomain, MaterialWithStockDomain, InventoryTransactionDomain, DeliveryReceiptDomain, PaginationOptions, PaginatedResponse } from '@constructtrack/types';
import { isTenantAdmin } from '../../common/authorization/permissions';

@Injectable()
export class InventoryService {
  constructor(
    private readonly materialRepository: MaterialRepository,
    private readonly stockLevelRepository: StockLevelRepository,
    private readonly transactionRepository: InventoryTransactionRepository,
    private readonly deliveryRepository: DeliveryReceiptRepository,
    private readonly auditService: AuditService,
  ) {}

  private assertManager(auth: AuthContext) {
    if (!isTenantAdmin(auth.role) && auth.role !== Role.PROCUREMENT && auth.role !== Role.PROJECT_MANAGER) {
      throw new DomainException(ErrorCode.FORBIDDEN, HttpStatus.FORBIDDEN, 'Only Procurement, Project Manager, or Admin can manage materials.');
    }
  }

  private assertCanRecordMovement(auth: AuthContext) {
    if (!isTenantAdmin(auth.role) && auth.role !== Role.PROCUREMENT && auth.role !== Role.PROJECT_MANAGER && auth.role !== Role.SITE_ENGINEER) {
      throw new DomainException(ErrorCode.FORBIDDEN, HttpStatus.FORBIDDEN, 'Only Procurement, Project Manager, Site Engineer, or Admin can record movements.');
    }
  }

  // ====== Materials ======

  async create(auth: AuthContext, dto: CreateMaterialDto): Promise<MaterialDomain> {
    this.assertManager(auth);

    const exists = await this.materialRepository.exists(auth.tenantId, { sku: dto.sku });
    if (exists) {
      throw new DomainException(ErrorCode.MATERIAL_DUPLICATE_SKU, HttpStatus.CONFLICT, `Material with SKU ${dto.sku} already exists.`);
    }

    const material = await this.materialRepository.create(auth.tenantId, dto);

    await this.stockLevelRepository.create(auth.tenantId, {
      materialId: material.id,
      quantity: 0,
    });

    this.auditService.record({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      action: 'material.create',
      entityType: 'material',
      entityId: material.id,
      after: material as unknown as Record<string, unknown>,
    });

    return material;
  }

  async find(
    auth: AuthContext,
    filter: Record<string, unknown>,
    options: PaginationOptions,
  ): Promise<PaginatedResponse<MaterialWithStockDomain>> {
    const paginated = await this.materialRepository.find(auth.tenantId, filter, options);

    const materialsWithStock = await Promise.all(
      paginated.items.map(async (material) => {
        const stockLevel = await this.stockLevelRepository.findByMaterialId(
          auth.tenantId,
          material.id,
        );
        return {
          ...material,
          stockLevel,
          isLowStock: stockLevel !== null && stockLevel.quantity <= material.reorderPoint,
        };
      }),
    );

    return {
      ...paginated,
      items: materialsWithStock,
    };
  }

  async findById(auth: AuthContext, id: string): Promise<MaterialWithStockDomain> {
    const material = await this.materialRepository.findById(auth.tenantId, id);
    if (!material) {
      throw new DomainException(ErrorCode.MATERIAL_NOT_FOUND, HttpStatus.NOT_FOUND, 'Material not found');
    }

    const stockLevel = await this.stockLevelRepository.findByMaterialId(auth.tenantId, id);
    return {
      ...material,
      stockLevel,
      isLowStock: stockLevel !== null && stockLevel.quantity <= material.reorderPoint,
    };
  }

  async update(auth: AuthContext, id: string, dto: UpdateMaterialDto): Promise<MaterialDomain> {
    this.assertManager(auth);

    const before = await this.materialRepository.findById(auth.tenantId, id);
    if (!before) {
      throw new DomainException(ErrorCode.MATERIAL_NOT_FOUND, HttpStatus.NOT_FOUND, 'Material not found');
    }

    if (dto.sku && dto.sku !== before.sku) {
      const exists = await this.materialRepository.exists(auth.tenantId, { sku: dto.sku });
      if (exists) {
        throw new DomainException(ErrorCode.MATERIAL_DUPLICATE_SKU, HttpStatus.CONFLICT, `Material with SKU ${dto.sku} already exists.`);
      }
    }

    const material = await this.materialRepository.update(auth.tenantId, id, dto);
    if (!material) throw new DomainException(ErrorCode.MATERIAL_NOT_FOUND, HttpStatus.NOT_FOUND, 'Material not found');

    this.auditService.record({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      action: 'material.update',
      entityType: 'material',
      entityId: id,
      before: before as unknown as Record<string, unknown>,
      after: material as unknown as Record<string, unknown>,
    });

    return material;
  }

  async getStockLevel(auth: AuthContext, id: string): Promise<StockLevelDomain> {
    const material = await this.materialRepository.findById(auth.tenantId, id);
    if (!material) {
      throw new DomainException(ErrorCode.MATERIAL_NOT_FOUND, HttpStatus.NOT_FOUND, 'Material not found');
    }

    const stock = await this.stockLevelRepository.findByMaterialId(auth.tenantId, id);
    if (!stock) {
      throw new DomainException(ErrorCode.STOCK_LEVEL_NOT_FOUND, HttpStatus.NOT_FOUND, 'Stock level not found');
    }

    return stock;
  }

  async getLowStock(auth: AuthContext): Promise<MaterialWithStockDomain[]> {
    const allMaterials = await this.materialRepository.find(auth.tenantId, {}, { page: 1, perPage: 1000 });

    const lowStock: MaterialWithStockDomain[] = [];

    for (const material of allMaterials.items) {
      const stockLevel = await this.stockLevelRepository.findByMaterialId(auth.tenantId, material.id);
      if (stockLevel && stockLevel.quantity <= material.reorderPoint) {
        lowStock.push({
          ...material,
          stockLevel,
          isLowStock: true,
        });
      }
    }

    return lowStock;
  }

  async archive(auth: AuthContext, id: string): Promise<MaterialDomain> {
    this.assertManager(auth);

    const material = await this.materialRepository.findById(auth.tenantId, id);
    if (!material) {
      throw new DomainException(ErrorCode.MATERIAL_NOT_FOUND, HttpStatus.NOT_FOUND, 'Material not found');
    }

    if (material.archivedAt) {
      return material;
    }

    const updated = await this.materialRepository.update(auth.tenantId, id, {
      archivedAt: new Date(),
    } as unknown as UpdateMaterialDto);
    if (!updated) throw new DomainException(ErrorCode.MATERIAL_NOT_FOUND, HttpStatus.NOT_FOUND, 'Material not found');

    this.auditService.record({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      action: 'material.archive',
      entityType: 'material',
      entityId: id,
      before: material as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  // ====== Transactions ======

  async recordTransaction(
    auth: AuthContext,
    dto: CreateTransactionDto,
  ): Promise<InventoryTransactionDomain> {
    this.assertCanRecordMovement(auth);

    const material = await this.materialRepository.findById(auth.tenantId, dto.materialId);
    if (!material) {
      throw new DomainException(ErrorCode.MATERIAL_NOT_FOUND, HttpStatus.NOT_FOUND, 'Material not found');
    }

    if (dto.type === TransactionType.ADJUST) {
      this.assertManager(auth);
    }

    if (dto.type === TransactionType.CONSUME) {
      // Atomic check-and-deduct: prevents race conditions on concurrent requests.
      const updated = await this.stockLevelRepository.atomicConsume(
        auth.tenantId,
        dto.materialId,
        dto.quantity,
      );
      if (!updated) {
        const current = await this.stockLevelRepository.findByMaterialId(auth.tenantId, dto.materialId);
        throw new DomainException(
          ErrorCode.INSUFFICIENT_STOCK,
          HttpStatus.UNPROCESSABLE_ENTITY,
          `Insufficient stock: ${current?.quantity ?? 0} ${material.unit} available, ${dto.quantity} requested.`,
        );
      }
    } else {
      // RECEIVE or ADJUST: atomic increment.
      await this.stockLevelRepository.atomicIncrement(
        auth.tenantId,
        dto.materialId,
        Math.abs(dto.quantity),
      );
    }

    const transaction = await this.transactionRepository.create(auth.tenantId, {
      ...dto,
      type: dto.type,
    });

    this.auditService.record({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      action: `inventory.transaction.${dto.type}`,
      entityType: 'inventory_transaction',
      entityId: transaction.id,
      after: transaction as unknown as Record<string, unknown>,
    });

    return transaction;
  }

  async getTransactions(
    auth: AuthContext,
    filter: Record<string, unknown>,
    options: PaginationOptions,
  ): Promise<PaginatedResponse<InventoryTransactionDomain>> {
    return this.transactionRepository.findByFilter(auth.tenantId, filter, options);
  }

  /** Aggregated purchase spend by project and month (dashboard spending trend). */
  async sumCostCentsByProjectAndMonth(
    auth: AuthContext,
    options: { since: Date },
  ): Promise<Array<{ projectId: string | null; monthKey: string; total: number }>> {
    return this.transactionRepository.sumCostCentsByProjectAndMonth(auth.tenantId, options);
  }

  async getTransactionsByTask(
    auth: AuthContext,
    taskId: string,
    options: PaginationOptions,
  ): Promise<PaginatedResponse<InventoryTransactionDomain>> {
    return this.transactionRepository.findByTask(auth.tenantId, taskId, options);
  }

  async getMaterialTransactions(
    auth: AuthContext,
    materialId: string,
    options: PaginationOptions,
  ): Promise<PaginatedResponse<InventoryTransactionDomain>> {
    const material = await this.materialRepository.findById(auth.tenantId, materialId);
    if (!material) {
      throw new DomainException(ErrorCode.MATERIAL_NOT_FOUND, HttpStatus.NOT_FOUND, 'Material not found');
    }

    return this.transactionRepository.findByMaterial(auth.tenantId, materialId, options);
  }

  // ====== Deliveries ======

  async recordDelivery(
    auth: AuthContext,
    dto: CreateDeliveryDto,
  ): Promise<{ delivery: DeliveryReceiptDomain; transaction: InventoryTransactionDomain }> {
    this.assertManager(auth);

    const material = await this.materialRepository.findById(auth.tenantId, dto.materialId);
    if (!material) {
      throw new DomainException(ErrorCode.MATERIAL_NOT_FOUND, HttpStatus.NOT_FOUND, 'Material not found');
    }

    const delivery = await this.deliveryRepository.create(auth.tenantId, dto);

    const transaction = await this.transactionRepository.create(auth.tenantId, {
      type: TransactionType.RECEIVE,
      quantity: dto.quantity,
      materialId: dto.materialId,
      costCents: dto.costCents,
      note: `Delivery from ${dto.supplier}`,
    } as CreateTransactionDto);

    // Atomic increment — no read-then-write race condition.
    await this.stockLevelRepository.atomicIncrement(
      auth.tenantId,
      dto.materialId,
      dto.quantity,
    );

    this.auditService.record({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      action: 'delivery.create',
      entityType: 'delivery_receipt',
      entityId: delivery.id,
      after: { delivery, transaction } as unknown as Record<string, unknown>,
    });

    return { delivery, transaction };
  }

  async getDeliveryById(auth: AuthContext, id: string): Promise<DeliveryReceiptDomain> {
    const delivery = await this.deliveryRepository.findById(auth.tenantId, id);
    if (!delivery) {
      throw new DomainException(ErrorCode.DELIVERY_NOT_FOUND, HttpStatus.NOT_FOUND, 'Delivery not found');
    }

    return delivery;
  }
}
