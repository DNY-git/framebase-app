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

// ---------------------------------------------------------------------------
// Project Domain
// ---------------------------------------------------------------------------

export enum ProjectStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

export enum ProjectRole {
  VIEWER = 'viewer',
  CREW = 'crew',
  ENGINEER = 'engineer',
  MANAGER = 'manager',
  ADMIN = 'admin',
}

export interface ProjectDomain {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  phase?: string;
  startDate?: Date;
  endDate?: Date;
  budgetCents?: number;
  location?: string;
  createdBy: string;
  archivedAt?: Date | null;
  archivedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Project member domain shape returned by repositories and services.
 */
export interface ProjectMemberDomain {
  id: string;
  tenantId: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// TASKS DOMAIN
// ============================================================================

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  BLOCKED = 'blocked',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface TaskDomain {
  id: string;
  tenantId: string;
  projectId: string;
  phaseId?: string;
  parentId?: string;
  assigneeId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskDependencyDomain {
  id: string;
  tenantId: string;
  projectId: string;
  predecessorId: string;
  successorId: string;
  createdAt: Date;
}

// ============================================================================
// DASHBOARD DOMAIN
// ============================================================================

export interface DashboardOverview {
  projects: {
    active: number;
    onHold: number;
    completingSoon: number;
  };
  tasks: {
    atRisk: number;
    mineToday: number;
  };
}

// ============================================================================
// AUDIT DOMAIN
// ============================================================================

export interface AuditLogDomain {
  id: string;
  tenantId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  correlationId?: string;
  createdAt: Date;
}

// ============================================================================
// EQUIPMENT DOMAIN
// ============================================================================

export enum EquipmentStatus {
  AVAILABLE = 'available',
  ASSIGNED = 'assigned',
  MAINTENANCE = 'maintenance',
  RETIRED = 'retired',
}

export interface EquipmentDomain {
  id: string;
  tenantId: string;
  name: string;
  serialNumber: string;
  category: string;
  status: EquipmentStatus;
  purchaseDate?: Date;
  purchaseCostCents?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EquipmentAssignmentDomain {
  id: string;
  tenantId: string;
  equipmentId: string;
  projectId: string;
  operatorId?: string;
  startDate: Date;
  endDate?: Date;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EquipmentUsageLogDomain {
  id: string;
  tenantId: string;
  equipmentId: string;
  date: Date;
  hoursUsed: number;
  operatorId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum MaintenanceType {
  SCHEDULED = 'scheduled',
  REPAIR = 'repair',
}

export enum MaintenanceStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
}

export interface MaintenanceRecordDomain {
  id: string;
  tenantId: string;
  equipmentId: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  date?: Date;
  nextDueAt?: Date;
  costCents?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum DowntimeReason {
  BREAKDOWN = 'breakdown',
  WEATHER = 'weather',
  OTHER = 'other',
}

export interface DowntimeLogDomain {
  id: string;
  tenantId: string;
  equipmentId: string;
  startDate: Date;
  endDate?: Date;
  reason: DowntimeReason;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

