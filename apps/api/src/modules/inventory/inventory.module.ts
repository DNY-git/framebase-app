import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { MaterialRepository } from './repositories/material.repository';
import { StockLevelRepository } from './repositories/stock-level.repository';
import { InventoryTransactionRepository } from './repositories/inventory-transaction.repository';
import { DeliveryReceiptRepository } from './repositories/delivery-receipt.repository';
import { Material, MaterialSchema } from '../../schemas/material.schema';
import { StockLevel, StockLevelSchema } from '../../schemas/stock-level.schema';
import { InventoryTransaction, InventoryTransactionSchema } from '../../schemas/inventory-transaction.schema';
import { DeliveryReceipt, DeliveryReceiptSchema } from '../../schemas/delivery-receipt.schema';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Material.name, schema: MaterialSchema },
      { name: StockLevel.name, schema: StockLevelSchema },
      { name: InventoryTransaction.name, schema: InventoryTransactionSchema },
      { name: DeliveryReceipt.name, schema: DeliveryReceiptSchema },
    ]),
    AuditModule,
  ],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    MaterialRepository,
    StockLevelRepository,
    InventoryTransactionRepository,
    DeliveryReceiptRepository,
  ],
  exports: [InventoryService],
})
export class InventoryModule {}
