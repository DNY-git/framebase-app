import { InventoryService } from './inventory.service';
import { Role, TransactionType } from '@constructtrack/types';
import { DomainException } from '../../common/exceptions/domain.exception';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('InventoryService', () => {
  let service: InventoryService;
  let materialRepo: Record<string, ReturnType<typeof vi.fn>>;
  let stockLevelRepo: Record<string, ReturnType<typeof vi.fn>>;
  let transactionRepo: Record<string, ReturnType<typeof vi.fn>>;
  let deliveryRepo: Record<string, ReturnType<typeof vi.fn>>;
  let auditService: Record<string, ReturnType<typeof vi.fn>>;

  const mockAuthContext = {
    userId: 'user-1',
    tenantId: 'tenant-1',
    role: Role.PROCUREMENT,
  };

  const mockEngineerAuth = {
    userId: 'user-2',
    tenantId: 'tenant-1',
    role: Role.SITE_ENGINEER,
  };

  const mockMaterial = {
    id: 'mat-1',
    tenantId: 'tenant-1',
    sku: 'REBAR-12',
    name: 'Rebar 12mm',
    unit: 'ton',
    reorderPoint: 10,
    archivedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const mockStockLevel = {
    id: 'sl-1',
    tenantId: 'tenant-1',
    materialId: 'mat-1',
    quantity: 25,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const mockTransaction = {
    id: 'tx-1',
    tenantId: 'tenant-1',
    type: TransactionType.RECEIVE,
    quantity: 10,
    materialId: 'mat-1',
    actorId: 'user-1',
    createdAt: new Date(),
  };

  const mockDelivery = {
    id: 'del-1',
    tenantId: 'tenant-1',
    supplier: 'Acme Steel',
    materialId: 'mat-1',
    quantity: 10,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    materialRepo = {
      create: vi.fn(),
      exists: vi.fn(),
      find: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
    };

    stockLevelRepo = {
      create: vi.fn(),
      findByMaterialId: vi.fn(),
      update: vi.fn(),
      atomicConsume: vi.fn(),
      atomicIncrement: vi.fn(),
    };

    transactionRepo = {
      create: vi.fn(),
      findByFilter: vi.fn(),
      findByMaterial: vi.fn(),
    };

    deliveryRepo = {
      create: vi.fn(),
      findById: vi.fn(),
    };

    auditService = {
      record: vi.fn(),
    };

    service = new InventoryService(
      materialRepo as never,
      stockLevelRepo as never,
      transactionRepo as never,
      deliveryRepo as never,
      auditService as never,
    );
  });

  // ====== Material Tests (existing) ======

  describe('create', () => {
    it('creates material and initial stock level if procurement', async () => {
      materialRepo.exists.mockResolvedValue(false);
      materialRepo.create.mockResolvedValue(mockMaterial);
      stockLevelRepo.create.mockResolvedValue(mockStockLevel);

      const dto = { sku: 'REBAR-12', name: 'Rebar 12mm', unit: 'ton', reorderPoint: 10 };
      const result = await service.create(mockAuthContext, dto);

      expect(result).toEqual(mockMaterial);
      expect(stockLevelRepo.create).toHaveBeenCalledWith('tenant-1', {
        materialId: 'mat-1',
        quantity: 0,
      });
      expect(auditService.record).toHaveBeenCalled();
    });

    it('throws Forbidden if not procurement/manager/admin', async () => {
      await expect(service.create({ ...mockAuthContext, role: Role.CREW }, {} as never))
        .rejects.toThrow(DomainException);
    });

    it('throws Conflict if SKU exists', async () => {
      materialRepo.exists.mockResolvedValue(true);
      await expect(service.create(mockAuthContext, { sku: 'REBAR-12' } as never))
        .rejects.toThrow(DomainException);
    });
  });

  describe('find', () => {
    it('returns materials with stock levels', async () => {
      materialRepo.find.mockResolvedValue({
        items: [mockMaterial],
        page: 1, perPage: 20, totalItems: 1, totalPages: 1,
      });
      stockLevelRepo.findByMaterialId.mockResolvedValue(mockStockLevel);

      const result = await service.find(mockAuthContext, {}, { page: 1, perPage: 20 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].isLowStock).toBe(false);
    });
  });

  describe('findById', () => {
    it('returns material with stock level when found', async () => {
      materialRepo.findById.mockResolvedValue(mockMaterial);
      stockLevelRepo.findByMaterialId.mockResolvedValue(mockStockLevel);

      const result = await service.findById(mockAuthContext, 'mat-1');
      expect(result.id).toBe('mat-1');
    });
  });

  describe('update', () => {
    it('updates material and records audit', async () => {
      materialRepo.findById.mockResolvedValue(mockMaterial);
      materialRepo.exists.mockResolvedValue(false);
      const updated = { ...mockMaterial, name: 'Updated Rebar' };
      materialRepo.update.mockResolvedValue(updated);

      const result = await service.update(mockAuthContext, 'mat-1', { name: 'Updated Rebar' });
      expect(result).toEqual(updated);
    });
  });

  describe('getStockLevel', () => {
    it('returns stock level when material exists', async () => {
      materialRepo.findById.mockResolvedValue(mockMaterial);
      stockLevelRepo.findByMaterialId.mockResolvedValue(mockStockLevel);
      const result = await service.getStockLevel(mockAuthContext, 'mat-1');
      expect(result).toEqual(mockStockLevel);
    });
  });

  describe('getLowStock', () => {
    it('returns materials with stock <= reorderPoint', async () => {
      materialRepo.find.mockResolvedValue({
        items: [mockMaterial],
        page: 1, perPage: 1000, totalItems: 1, totalPages: 1,
      });
      stockLevelRepo.findByMaterialId.mockResolvedValue({ ...mockStockLevel, quantity: 5 });

      const result = await service.getLowStock(mockAuthContext);
      expect(result).toHaveLength(1);
    });
  });

  describe('archive', () => {
    it('archives material and records audit', async () => {
      materialRepo.findById.mockResolvedValue(mockMaterial);
      const archived = { ...mockMaterial, archivedAt: new Date() };
      materialRepo.update.mockResolvedValue(archived);

      const result = await service.archive(mockAuthContext, 'mat-1');
      expect(result.archivedAt).not.toBeNull();
    });
  });

  // ====== Transaction Tests ======

  describe('recordTransaction', () => {
    it('records a receive transaction and updates stock', async () => {
      materialRepo.findById.mockResolvedValue(mockMaterial);
      transactionRepo.create.mockResolvedValue(mockTransaction);
      stockLevelRepo.atomicIncrement.mockResolvedValue({ ...mockStockLevel, quantity: 35 });

      const dto = {
        type: TransactionType.RECEIVE,
        quantity: 10,
        materialId: 'mat-1',
      };
      const result = await service.recordTransaction(mockAuthContext, dto);

      expect(result).toEqual(mockTransaction);
      expect(stockLevelRepo.atomicIncrement).toHaveBeenCalledWith('tenant-1', 'mat-1', 10);
      expect(auditService.record).toHaveBeenCalled();
    });

    it('records a consume transaction and decreases stock', async () => {
      materialRepo.findById.mockResolvedValue(mockMaterial);
      transactionRepo.create.mockResolvedValue({ ...mockTransaction, type: TransactionType.CONSUME, quantity: -5 });
      stockLevelRepo.atomicConsume.mockResolvedValue({ ...mockStockLevel, quantity: 20 });

      const dto = {
        type: TransactionType.CONSUME,
        quantity: 5,
        materialId: 'mat-1',
        projectId: 'proj-1',
      };
      const result = await service.recordTransaction(mockAuthContext, dto);

      expect(result).toEqual(expect.objectContaining({ type: TransactionType.CONSUME }));
      expect(stockLevelRepo.atomicConsume).toHaveBeenCalledWith('tenant-1', 'mat-1', 5);
    });

    it('allows site engineer to record consumption', async () => {
      materialRepo.findById.mockResolvedValue(mockMaterial);
      transactionRepo.create.mockResolvedValue(mockTransaction);
      stockLevelRepo.atomicConsume.mockResolvedValue(mockStockLevel);

      const dto = {
        type: TransactionType.CONSUME,
        quantity: 1,
        materialId: 'mat-1',
      };
      const result = await service.recordTransaction(mockEngineerAuth, dto);
      expect(result).toBeDefined();
    });

    it('throws UnprocessableEntityException on insufficient stock for consume', async () => {
      materialRepo.findById.mockResolvedValue(mockMaterial);
      stockLevelRepo.atomicConsume.mockResolvedValue(null);
      stockLevelRepo.findByMaterialId.mockResolvedValue(mockStockLevel);

      const dto = {
        type: TransactionType.CONSUME,
        quantity: 100,
        materialId: 'mat-1',
      };
      await expect(service.recordTransaction(mockAuthContext, dto))
        .rejects.toThrow(DomainException);
    });

    it('throws NotFoundException if material does not exist', async () => {
      materialRepo.findById.mockResolvedValue(null);

      await expect(
        service.recordTransaction(mockAuthContext, {
          type: TransactionType.RECEIVE,
          quantity: 10,
          materialId: 'nonexistent',
        }),
      ).rejects.toThrow(DomainException);
    });

    it('requires manager role for adjust transactions', async () => {
      materialRepo.findById.mockResolvedValue(mockMaterial);
      stockLevelRepo.findByMaterialId.mockResolvedValue(mockStockLevel);

      await expect(
        service.recordTransaction(mockEngineerAuth, {
          type: TransactionType.ADJUST,
          quantity: 5,
          materialId: 'mat-1',
        }),
      ).rejects.toThrow(DomainException);
    });

    it('throws Forbidden if viewer tries to record', async () => {
      materialRepo.findById.mockResolvedValue(mockMaterial);

      await expect(
        service.recordTransaction({ ...mockAuthContext, role: Role.VIEWER }, {
          type: TransactionType.RECEIVE,
          quantity: 10,
          materialId: 'mat-1',
        }),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('getTransactions', () => {
    it('returns paginated transactions with filter', async () => {
      const paginated = {
        items: [mockTransaction],
        page: 1, perPage: 20, totalItems: 1, totalPages: 1,
      };
      transactionRepo.findByFilter.mockResolvedValue(paginated);

      const result = await service.getTransactions(mockAuthContext, { materialId: 'mat-1' }, { page: 1, perPage: 20 });
      expect(result.items).toHaveLength(1);
      expect(transactionRepo.findByFilter).toHaveBeenCalledWith('tenant-1', { materialId: 'mat-1' }, { page: 1, perPage: 20 });
    });
  });

  describe('getMaterialTransactions', () => {
    it('returns transactions for a material', async () => {
      materialRepo.findById.mockResolvedValue(mockMaterial);
      const paginated = {
        items: [mockTransaction],
        page: 1, perPage: 20, totalItems: 1, totalPages: 1,
      };
      transactionRepo.findByMaterial.mockResolvedValue(paginated);

      const result = await service.getMaterialTransactions(mockAuthContext, 'mat-1', { page: 1, perPage: 20 });
      expect(result.items).toHaveLength(1);
    });

    it('throws NotFoundException if material does not exist', async () => {
      materialRepo.findById.mockResolvedValue(null);
      await expect(service.getMaterialTransactions(mockAuthContext, 'nonexistent', { page: 1, perPage: 20 }))
        .rejects.toThrow(DomainException);
    });
  });

  // ====== Delivery Tests ======

  describe('recordDelivery', () => {
    it('creates delivery, transaction, and updates stock', async () => {
      materialRepo.findById.mockResolvedValue(mockMaterial);
      deliveryRepo.create.mockResolvedValue(mockDelivery);
      transactionRepo.create.mockResolvedValue(mockTransaction);
      stockLevelRepo.atomicIncrement.mockResolvedValue({ ...mockStockLevel, quantity: 35 });

      const dto = {
        supplier: 'Acme Steel',
        materialId: 'mat-1',
        quantity: 10,
        costCents: 500000,
      };
      const result = await service.recordDelivery(mockAuthContext, dto);

      expect(result.delivery).toEqual(mockDelivery);
      expect(result.transaction).toEqual(mockTransaction);
      expect(stockLevelRepo.atomicIncrement).toHaveBeenCalledWith('tenant-1', 'mat-1', 10);
      expect(auditService.record).toHaveBeenCalled();
    });

    it('throws NotFoundException if material does not exist', async () => {
      materialRepo.findById.mockResolvedValue(null);
      await expect(
        service.recordDelivery(mockAuthContext, {
          supplier: 'Acme',
          materialId: 'nonexistent',
          quantity: 10,
        }),
      ).rejects.toThrow(DomainException);
    });

    it('throws Forbidden if not manager', async () => {
      await expect(
        service.recordDelivery({ ...mockAuthContext, role: Role.CREW }, {
          supplier: 'Acme',
          materialId: 'mat-1',
          quantity: 10,
        }),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('getDeliveryById', () => {
    it('returns delivery when found', async () => {
      deliveryRepo.findById.mockResolvedValue(mockDelivery);
      const result = await service.getDeliveryById(mockAuthContext, 'del-1');
      expect(result).toEqual(mockDelivery);
    });

    it('throws NotFoundException when not found', async () => {
      deliveryRepo.findById.mockResolvedValue(null);
      await expect(service.getDeliveryById(mockAuthContext, 'nonexistent'))
        .rejects.toThrow(DomainException);
    });
  });
});
