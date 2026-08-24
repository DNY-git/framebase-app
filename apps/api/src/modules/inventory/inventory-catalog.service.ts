import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MaterialCatalogItemDomain, MaterialCategory } from '@constructtrack/types';
import { MaterialCatalogRepository } from './repositories/material-catalog.repository';

/**
 * Default catalog of common construction materials. Seeded into the
 * `material_catalog_items` collection on first use — users pick from these
 * instead of typing free text; custom entries can still be added.
 */
export const DEFAULT_MATERIAL_CATALOG: Array<{
  name: string;
  category: MaterialCategory;
  unit?: string;
  sku?: string;
}> = [
  { name: 'Cement Portland 42.5R', category: MaterialCategory.CONCRETE, unit: 'bag' },
  { name: 'Ready-Mix Concrete C25', category: MaterialCategory.CONCRETE, unit: 'm3' },
  { name: 'Reinforcement Bar 12mm', category: MaterialCategory.STEEL, unit: 'length' },
  { name: 'Steel I-Beam', category: MaterialCategory.STEEL, unit: 'length' },
  { name: 'Structural Steel Plate', category: MaterialCategory.STEEL, unit: 'sheet' },
  { name: 'Treated Timber 2x4', category: MaterialCategory.TIMBER, unit: 'length' },
  { name: 'Plywood 18mm', category: MaterialCategory.TIMBER, unit: 'sheet' },
  { name: 'Copper Wire 2.5mm2', category: MaterialCategory.ELECTRICAL, unit: 'length' },
  { name: 'PVC Conduit 20mm', category: MaterialCategory.ELECTRICAL, unit: 'length' },
  { name: 'Distribution Board', category: MaterialCategory.ELECTRICAL, unit: 'each' },
  { name: 'PVC Pipe 110mm', category: MaterialCategory.PLUMBING, unit: 'length' },
  { name: 'Copper Pipe 22mm', category: MaterialCategory.PLUMBING, unit: 'length' },
  { name: 'Ball Valve 1in', category: MaterialCategory.PLUMBING, unit: 'each' },
  { name: 'Emulsion Paint White', category: MaterialCategory.FINISHES, unit: 'litre' },
  { name: 'Ceramic Floor Tile 600x600', category: MaterialCategory.FINISHES, unit: 'm2' },
  { name: 'Plasterboard 12.5mm', category: MaterialCategory.FINISHES, unit: 'sheet' },
  { name: 'Aggregate 20mm', category: MaterialCategory.EARTHWORKS, unit: 'tonne' },
  { name: 'Hardcore Fill', category: MaterialCategory.EARTHWORKS, unit: 'tonne' },
  { name: 'Safety Helmet', category: MaterialCategory.SAFETY, unit: 'each' },
  { name: 'Hi-Vis Vest', category: MaterialCategory.SAFETY, unit: 'each' },
  { name: 'General Consumables', category: MaterialCategory.GENERAL, unit: 'each' },
];

@Injectable()
export class InventoryCatalogService implements OnModuleInit {
  private readonly logger = new Logger(InventoryCatalogService.name);

  constructor(private readonly catalogRepository: MaterialCatalogRepository) {}

  /** Seed default items once at startup — idempotent, safe on every boot. */
  async onModuleInit(): Promise<void> {
    try {
      const count = await this.catalogRepository.count();
      if (count === 0) {
        await this.catalogRepository.insertManyIfMissing(DEFAULT_MATERIAL_CATALOG);
        this.logger.log(`Seeded ${DEFAULT_MATERIAL_CATALOG.length} material catalog items.`);
      }
    } catch (err) {
      // Never block API startup because of catalog seeding.
      this.logger.warn(`Material catalog seeding skipped: ${(err as Error).message}`);
    }
  }

  async list(): Promise<MaterialCatalogItemDomain[]> {
    return this.catalogRepository.findAllSorted();
  }
}
