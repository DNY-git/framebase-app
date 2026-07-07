/**
 * Repository interface — the swappable persistence abstraction.
 *
 * Every domain module implements this contract. Services depend on the
 * interface, never on Mongoose directly. This makes the database swappable:
 * replacing MongoDB with PostgreSQL means writing a new repository
 * implementation, not rewriting business logic.
 *
 * See ADR-002 and docs/database/security.md.
 */
import type {
  EntityId,
  PaginationOptions,
  PaginatedResponse,
  TenantId,
} from '@constructtrack/types';

/**
 * Generic repository contract for tenant-scoped entities.
 * Tenant scoping is enforced by the implementation — callers do not pass
 * tenantId in the filter; it is injected from the request context.
 */
export interface IBaseRepository<T, CreateDto, UpdateDto> {
  findById(tenantId: TenantId, id: EntityId): Promise<T | null>;
  find(
    tenantId: TenantId,
    filter: Record<string, unknown>,
    options?: PaginationOptions,
  ): Promise<PaginatedResponse<T>>;
  create(tenantId: TenantId, data: CreateDto): Promise<T>;
  update(tenantId: TenantId, id: EntityId, data: UpdateDto): Promise<T | null>;
  delete(tenantId: TenantId, id: EntityId): Promise<boolean>;
  exists(tenantId: TenantId, filter: Record<string, unknown>): Promise<boolean>;
  count(tenantId: TenantId, filter: Record<string, unknown>): Promise<number>;
}
