import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EquipmentCatalogItemDomain, EquipmentCategory } from '@constructtrack/types';
import { EquipmentCatalogRepository } from './repositories/equipment-catalog.repository';

/**
 * Default catalog of common construction equipment types. Seeded into the
 * `equipment_catalog_items` collection on first use — users pick from these
 * instead of typing free text; custom entries can still be added.
 */
export const DEFAULT_EQUIPMENT_CATALOG: Array<{ name: string; category: EquipmentCategory }> = [
  { name: 'Excavator', category: EquipmentCategory.EARTHMOVING },
  { name: 'Bulldozer', category: EquipmentCategory.EARTHMOVING },
  { name: 'Backhoe Loader', category: EquipmentCategory.EARTHMOVING },
  { name: 'Wheel Loader', category: EquipmentCategory.EARTHMOVING },
  { name: 'Motor Grader', category: EquipmentCategory.EARTHMOVING },
  { name: 'Compactor', category: EquipmentCategory.EARTHMOVING },
  { name: 'Road Roller', category: EquipmentCategory.EARTHMOVING },
  { name: 'Crane', category: EquipmentCategory.LIFTING },
  { name: 'Forklift', category: EquipmentCategory.LIFTING },
  { name: 'Scaffolding Set', category: EquipmentCategory.LIFTING },
  { name: 'Dump Truck', category: EquipmentCategory.TRANSPORT },
  { name: 'Water Tanker', category: EquipmentCategory.TRANSPORT },
  { name: 'Concrete Mixer', category: EquipmentCategory.CONCRETE },
  { name: 'Concrete Pump', category: EquipmentCategory.CONCRETE },
  { name: 'Generator', category: EquipmentCategory.POWER },
  { name: 'Welding Machine', category: EquipmentCategory.POWER },
  { name: 'Air Compressor', category: EquipmentCategory.POWER },
  { name: 'Power Tools', category: EquipmentCategory.POWER },
];

@Injectable()
export class EquipmentCatalogService implements OnModuleInit {
  private readonly logger = new Logger(EquipmentCatalogService.name);

  constructor(private readonly catalogRepository: EquipmentCatalogRepository) {}

  /** Seed default items once at startup — idempotent, safe on every boot. */
  async onModuleInit(): Promise<void> {
    try {
      const count = await this.catalogRepository.count();
      if (count === 0) {
        await this.catalogRepository.insertManyIfMissing(DEFAULT_EQUIPMENT_CATALOG);
        this.logger.log(`Seeded ${DEFAULT_EQUIPMENT_CATALOG.length} equipment catalog items.`);
      }
    } catch (err) {
      // Never block API startup because of catalog seeding.
      this.logger.warn(`Equipment catalog seeding skipped: ${(err as Error).message}`);
    }
  }

  async list(): Promise<EquipmentCatalogItemDomain[]> {
    return this.catalogRepository.findAllSorted();
  }
}
