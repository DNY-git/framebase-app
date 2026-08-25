/**
 * Reproduction harness for the Transaction Ledger 500 INTERNAL_ERROR.
 *
 * Uses a REAL in-memory MongoDB (not mocks) + the REAL schemas, repositories
 * and services — mirroring repro-google.spec.ts (Nest DI has a ConfigService
 * quirk under vitest/esbuild, so we wire the graph by hand).
 *
 * Exercises the exact browser flow for /inventory/transactions:
 *   tenant/user -> material -> record transaction(s) -> getTransactions
 * plus GET /materials (with stock levels) and the material catalog seed/list.
 * Any non-DomainException here is the real root cause behind
 * "An unexpected error occurred."
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Model } from 'mongoose';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { Material, MaterialSchema, MaterialDocument } from '../../schemas/material.schema';
import { StockLevel, StockLevelSchema, StockLevelDocument } from '../../schemas/stock-level.schema';
import {
  InventoryTransaction,
  InventoryTransactionSchema,
  InventoryTransactionDocument,
} from '../../schemas/inventory-transaction.schema';
import {
  DeliveryReceipt,
  DeliveryReceiptSchema,
  DeliveryReceiptDocument,
} from '../../schemas/delivery-receipt.schema';
import {
  MaterialCatalogItem,
  MaterialCatalogItemSchema,
} from '../../schemas/material-catalog-item.schema';
import { Tenant, TenantSchema } from '../../schemas/tenant.schema';
import { Role, TransactionType } from '@constructtrack/types';

import { MaterialRepository } from './repositories/material.repository';
import { StockLevelRepository } from './repositories/stock-level.repository';
import { InventoryTransactionRepository } from './repositories/inventory-transaction.repository';
import { DeliveryReceiptRepository } from './repositories/delivery-receipt.repository';
import { InventoryService } from './inventory.service';
import { InventoryCatalogService } from './inventory-catalog.service';
import { MaterialCatalogRepository } from './repositories/material-catalog.repository';
import { AuditService } from '../audit/audit.service';

describe('Transaction ledger 500 reproduction', () => {
  let mongo: MongoMemoryServer;
  let inventory: InventoryService;
  let catalogService: InventoryCatalogService;
  let tenantId: string;
  const auth = { userId: '', tenantId: '', role: Role.OWNER };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 120000 } });
    await mongoose.connect(mongo.getUri());

    const materialModel = mongoose.model(Material.name, MaterialSchema) as unknown as Model<MaterialDocument>;
    const stockModel = mongoose.model(StockLevel.name, StockLevelSchema) as unknown as Model<StockLevelDocument>;
    const txModel = mongoose.model(
      InventoryTransaction.name,
      InventoryTransactionSchema,
    ) as unknown as Model<InventoryTransactionDocument>;
    const deliveryModel = mongoose.model(
      DeliveryReceipt.name,
      DeliveryReceiptSchema,
    ) as unknown as Model<DeliveryReceiptDocument>;
    const catalogModel = mongoose.model(MaterialCatalogItem.name, MaterialCatalogItemSchema);
    const auditModel = mongoose.model('AuditLog', new mongoose.Schema({}, { strict: false }));

    await Promise.all([
      materialModel.createIndexes(),
      stockModel.createIndexes(),
      txModel.createIndexes(),
    ]);

    const tenantDoc = await mongoose.model(Tenant.name, TenantSchema).create({
      name: 'Ledger Repro',
      slug: `ledger-repro-${Date.now()}`,
    });
    tenantId = String(tenantDoc._id);
    auth.userId = 'user-1';
    auth.tenantId = tenantId;

    const auditService = new AuditService(auditModel as never);
    const materialRepo = new MaterialRepository(materialModel);
    const stockRepo = new StockLevelRepository(stockModel);
    const txRepo = new InventoryTransactionRepository(txModel);
    const deliveryRepo = new DeliveryReceiptRepository(deliveryModel);

    inventory = new InventoryService(materialRepo, stockRepo, txRepo, deliveryRepo, auditService);
    catalogService = new InventoryCatalogService(new MaterialCatalogRepository(catalogModel as never));
  }, 180000);

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    if (mongo) await mongo.stop();
  });

  it('catalog seeds and lists (GET /materials/catalog)', async () => {
    await catalogService.onModuleInit();
    const items = await catalogService.list();
    console.log('[REPRO] catalog items:', items.length);
    expect(items.length).toBeGreaterThan(0);
  });

  it('material create + find with stock (GET /materials)', async () => {
    const material = await inventory.create(auth, {
      name: 'Cement Portland 42.5R',
      unit: 'bag',
      sku: 'MAT-CEM-1',
      reorderPoint: 10,
    } as never);
    expect(material.id).toBeTruthy();

    const page = await inventory.find(auth, {}, { page: 1, perPage: 20 });
    console.log('[REPRO] materials:', page.items.length);
    expect(page.items.length).toBe(1);
    // Stock starts at 0 with reorderPoint 10 -> correctly flagged as low.
    expect(page.items[0].isLowStock).toBe(true);
  });

  it('transaction record + list round-trip (POST/GET /inventory/transactions)', async () => {
    const materials = await inventory.find(auth, {}, { page: 1, perPage: 20 });
    const materialId = materials.items[0].id;

    const tx = await inventory.recordTransaction(auth, {
      type: TransactionType.RECEIVE,
      quantity: 10,
      materialId,
    });
    expect(tx.id).toBeTruthy();
    console.log('[REPRO] recorded tx:', tx.id, tx.type, tx.quantity);

    const page = await inventory.getTransactions(auth, {}, { page: 1, perPage: 20 });
    console.log('[REPRO] ledger rows:', page.totalItems);
    expect(page.totalItems).toBe(1);
    expect(page.items[0].materialId).toBe(materialId);

    const filtered = await inventory.getTransactions(
      auth,
      { materialId, type: 'receive' },
      { page: 1, perPage: 20 },
    );
    console.log('[REPRO] filtered rows:', filtered.totalItems);
    expect(filtered.totalItems).toBe(1);
  });

  it('survives legacy-shaped transaction docs (missing/odd fields)', async () => {
    const txModel = mongoose.model(InventoryTransaction.name);
    // Simulate documents written by older code paths / manual inserts.
    await txModel.collection.insertMany([
      {
        tenantId: new mongoose.Types.ObjectId(tenantId),
        type: 'consume',
        quantity: -3,
        materialId: new mongoose.Types.ObjectId(),
        actorId: '',
      },
    ]);

    const page = await inventory.getTransactions(auth, {}, { page: 1, perPage: 20 });
    console.log('[REPRO] legacy-shaped rows ok:', page.totalItems);
    expect(page.totalItems).toBe(2);
  });

  it('delivery records transaction attributed to actor (POST /deliveries)', async () => {
    const materials = await inventory.find(auth, {}, { page: 1, perPage: 20 });
    const materialId = materials.items[0].id;

    const { delivery, transaction } = await inventory.recordDelivery(auth, {
      supplier: 'Acme Steel',
      materialId,
      quantity: 5,
      costCents: 5000,
    });
    expect(delivery.id).toBeTruthy();
    console.log('[REPRO] delivery tx actor:', transaction.actorId);
    expect(transaction.actorId).toBe(auth.userId);
  });
});
