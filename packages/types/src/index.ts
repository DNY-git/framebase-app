/**
 * Shared types for ConstructTrack.
 *
 * These types define the standard API response envelope, pagination,
 * domain identifiers, and role enums used across the platform.
 * See docs/api/standards.md for the full envelope specification.
 */

// ---------------------------------------------------------------------------
// Domain Identifiers
// ---------------------------------------------------------------------------

/** Unique tenant identifier (MongoDB ObjectId stored as string). */
export type TenantId = string;

/** Unique user identifier (MongoDB ObjectId stored as string). */
export type UserId = string;

/** Unique entity identifier (MongoDB ObjectId stored as string). */
export type EntityId = string;

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export enum Role {
  /** Organization administrator. Full access to all tenant data and settings. */
  ADMIN = 'admin',
  /** Project manager. Manages projects, tasks, team assignments, and reports. */
  PROJECT_MANAGER = 'project_manager',
  /** Site engineer / superintendent. Manages daily logs, task execution, safety. */
  SITE_ENGINEER = 'site_engineer',
  /** Field crew member. Creates task updates, logs, and observations. */
  CREW = 'crew',
  /** Procurement / inventory manager. Manages materials, stock levels, deliveries. */
  PROCUREMENT = 'procurement',
  /** Fleet manager. Manages equipment registry, maintenance, utilization. */
  FLEET_MANAGER = 'fleet_manager',
  /** Read-only viewer (executive, stakeholder). */
  VIEWER = 'viewer',
}

// ---------------------------------------------------------------------------
// Standard API Response Envelope
// See: docs/api/standards.md
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  /** Response data. */
  data: T;
  /** Metadata (request ID, timestamp, pagination). */
  meta: ApiMeta;
}

export interface ApiMeta {
  /** Unique request correlation ID. */
  requestId: string;
  /** ISO 8601 timestamp of the response. */
  timestamp: string;
  /** Pagination metadata (present on list endpoints). */
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  /** Current page number (1-indexed). */
  page: number;
  /** Number of items per page. */
  perPage: number;
  /** Total items matching the query. */
  totalItems: number;
  /** Total pages. */
  totalPages: number;
}

/** Standard error response envelope. */
export interface ApiError {
  /** HTTP status code. */
  statusCode: number;
  /** Machine-readable error code (e.g., VALIDATION_ERROR, NOT_FOUND). */
  errorCode: string;
  /** Human-readable error message. */
  message: string;
  /** Field-level validation errors (present on 400 responses). */
  errors?: FieldError[];
  /** Request correlation ID for debugging. */
  requestId: string;
  /** ISO 8601 timestamp. */
  timestamp: string;
}

export interface FieldError {
  /** The field that failed validation. */
  field: string;
  /** The validation constraint that was violated. */
  constraint: string;
  /** Human-readable description. */
  message: string;
  /** The rejected value (never secrets/PII). */
  rejectedValue?: unknown;
}

// ---------------------------------------------------------------------------
// Paginated Response Helper
// ---------------------------------------------------------------------------

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Base DTO Shapes
// ---------------------------------------------------------------------------

export interface BaseDto {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantScopedDto extends BaseDto {
  tenantId: string;
}

// ---------------------------------------------------------------------------
// Pagination Options (used in repository queries)
// ---------------------------------------------------------------------------

export interface PaginationOptions {
  page?: number;
  perPage?: number;
  sort?: Record<string, 1 | -1>;
}
