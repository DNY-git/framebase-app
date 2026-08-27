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
  /** Organization owner — full control, can manage organization and members. */
  OWNER = 'owner',
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
// Standardized Error Codes (T-502)
// See: docs/features/observability.md → Error Classification
// ---------------------------------------------------------------------------

export enum ErrorCode {
  // Auth
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_DISABLED_ACCOUNT = 'AUTH_DISABLED_ACCOUNT',
  AUTH_NO_MEMBERSHIP = 'AUTH_NO_MEMBERSHIP',
  AUTH_INVALID_REFRESH_TOKEN = 'AUTH_INVALID_REFRESH_TOKEN',
  AUTH_REFRESH_TOKEN_REVOKED = 'AUTH_REFRESH_TOKEN_REVOKED',
  AUTH_DUPLICATE_EMAIL = 'AUTH_DUPLICATE_EMAIL',
  AUTH_WEAK_PASSWORD = 'AUTH_WEAK_PASSWORD',
  AUTH_USER_NOT_FOUND = 'AUTH_USER_NOT_FOUND',
  AUTH_INVALID_AVATAR = 'AUTH_INVALID_AVATAR',
  AUTH_GOOGLE_NOT_CONFIGURED = 'AUTH_GOOGLE_NOT_CONFIGURED',
  AUTH_GOOGLE_EMAIL_REQUIRED = 'AUTH_GOOGLE_EMAIL_REQUIRED',
  AUTH_GOOGLE_CODE_INVALID = 'AUTH_GOOGLE_CODE_INVALID',
  AUTH_GOOGLE_CODE_EXPIRED = 'AUTH_GOOGLE_CODE_EXPIRED',

  // Projects
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  PROJECT_DUPLICATE_CODE = 'PROJECT_DUPLICATE_CODE',
  PROJECT_INVALID_STATUS_TRANSITION = 'PROJECT_INVALID_STATUS_TRANSITION',
  PROJECT_LAST_MANAGER = 'PROJECT_LAST_MANAGER',
  PROJECT_MEMBER_NOT_FOUND = 'PROJECT_MEMBER_NOT_FOUND',
  PROJECT_DUPLICATE_MEMBER = 'PROJECT_DUPLICATE_MEMBER',

  // Tasks
  TASK_NOT_FOUND = 'TASK_NOT_FOUND',
  TASK_INVALID_STATUS_TRANSITION = 'TASK_INVALID_STATUS_TRANSITION',
  TASK_PROJECT_ON_HOLD = 'TASK_PROJECT_ON_HOLD',
  TASK_PREDECESSOR_INCOMPLETE = 'TASK_PREDECESSOR_INCOMPLETE',
  TASK_SELF_DEPENDENCY = 'TASK_SELF_DEPENDENCY',
  TASK_DUPLICATE_DEPENDENCY = 'TASK_DUPLICATE_DEPENDENCY',
  TASK_CYCLE_DETECTED = 'TASK_CYCLE_DETECTED',
  TASK_DEPENDENCY_NOT_FOUND = 'TASK_DEPENDENCY_NOT_FOUND',
  TASK_ASSIGNEE_NOT_MEMBER = 'TASK_ASSIGNEE_NOT_MEMBER',
  TASK_CREW_LIMITED = 'TASK_CREW_LIMITED',

  // Equipment
  EQUIPMENT_NOT_FOUND = 'EQUIPMENT_NOT_FOUND',
  EQUIPMENT_DUPLICATE_SERIAL = 'EQUIPMENT_DUPLICATE_SERIAL',
  EQUIPMENT_ASSIGNMENT_CONFLICT = 'EQUIPMENT_ASSIGNMENT_CONFLICT',
  EQUIPMENT_WRONG_STATUS = 'EQUIPMENT_WRONG_STATUS',
  EQUIPMENT_ASSIGNMENT_NOT_FOUND = 'EQUIPMENT_ASSIGNMENT_NOT_FOUND',
  MAINTENANCE_RECORD_NOT_FOUND = 'MAINTENANCE_RECORD_NOT_FOUND',

  // Inventory
  MATERIAL_NOT_FOUND = 'MATERIAL_NOT_FOUND',
  MATERIAL_DUPLICATE_SKU = 'MATERIAL_DUPLICATE_SKU',
  MATERIAL_CATALOG_NOT_FOUND = 'MATERIAL_CATALOG_NOT_FOUND',
  STOCK_LEVEL_NOT_FOUND = 'STOCK_LEVEL_NOT_FOUND',
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  DELIVERY_NOT_FOUND = 'DELIVERY_NOT_FOUND',

  // Notifications
  NOTIFICATION_NOT_FOUND = 'NOTIFICATION_NOT_FOUND',

  // Reports
  REPORT_TEMPLATE_NOT_FOUND = 'REPORT_TEMPLATE_NOT_FOUND',
  REPORT_RUN_NOT_FOUND = 'REPORT_RUN_NOT_FOUND',
  REPORT_TEMPLATE_IN_USE = 'REPORT_TEMPLATE_IN_USE',

  // Documents
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
  DOCUMENT_EMPTY_FILE = 'DOCUMENT_EMPTY_FILE',
  DOCUMENT_STORAGE_ERROR = 'DOCUMENT_STORAGE_ERROR',

  // Organizations
  ORG_NOT_FOUND = 'ORG_NOT_FOUND',
  ORG_MEMBERSHIP_REQUIRED = 'ORG_MEMBERSHIP_REQUIRED',
  ORG_NAME_TAKEN = 'ORG_NAME_TAKEN',
  MEMBER_NOT_FOUND = 'MEMBER_NOT_FOUND',
  MEMBER_ALREADY_EXISTS = 'MEMBER_ALREADY_EXISTS',
  MEMBER_LAST_OWNER = 'MEMBER_LAST_OWNER',
  MEMBER_SELF_ROLE_CHANGE = 'MEMBER_SELF_ROLE_CHANGE',
  MEMBER_SELF_REMOVE = 'MEMBER_SELF_REMOVE',

  // Invitations
  INVITATION_NOT_FOUND = 'INVITATION_NOT_FOUND',
  INVITATION_EXPIRED = 'INVITATION_EXPIRED',
  INVITATION_REVOKED = 'INVITATION_REVOKED',
  INVITATION_ALREADY_ACCEPTED = 'INVITATION_ALREADY_ACCEPTED',
  INVITATION_ALREADY_MEMBER = 'INVITATION_ALREADY_MEMBER',
  INVITATION_DUPLICATE = 'INVITATION_DUPLICATE',
  INVITATION_LOGIN_REQUIRED = 'INVITATION_LOGIN_REQUIRED',
  INVITATION_INVALID_ROLE = 'INVITATION_INVALID_ROLE',

  // AI
  AI_JOB_NOT_FOUND = 'AI_JOB_NOT_FOUND',

  // Common
  FORBIDDEN = 'FORBIDDEN',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  BAD_REQUEST = 'BAD_REQUEST',
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
  /** Current page number (present on list endpoints). */
  page?: number;
  /** Number of items per page (present on list endpoints). */
  perPage?: number;
  /** Total items matching the query (present on list endpoints). */
  totalItems?: number;
  /** Total pages (present on list endpoints). */
  totalPages?: number;
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
  equipment: {
    total: number;
    available: number;
    assigned: number;
    inMaintenance: number;
    utilizationRate: number;
    upcomingMaintenance: number;
  };
  inventory: {
    totalMaterials: number;
    lowStockItems: number;
    totalStockQuantity: number;
  };
  /**
   * Financial aggregates derived from existing records:
   * budget = Σ project.budgetCents, spent = Σ material purchase transactions.
   */
  financial: {
    totalBudgetCents: number;
    totalSpentCents: number;
    remainingBudgetCents: number;
  };
  /**
   * Monthly spending vs allocated budget for the last 6 months.
   * `budget` is the project budget allocated across each project's
   * active months (startDate→endDate); `spent` is real transaction spend.
   */
  spendingTrend: Array<{
    month: string;
    monthKey: string;
    budget: number;
    spent: number;
  }>;
  /** Active projects with time-based progress and budget utilization. */
  projectProgress: Array<{
    id: string;
    name: string;
    code: string;
    status: string;
    progressPercent: number;
    budgetCents: number;
    spentCents: number;
    budgetUtilizationPercent: number;
  }>;
  /** Latest material purchase transactions (receive type). */
  recentExpenses: Array<{
    id: string;
    description: string;
    projectId: string | null;
    projectName: string | null;
    materialName: string;
    amountCents: number;
    createdAt: Date;
  }>;
  /** Latest audit-log entries. */
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    createdAt: Date;
  }>;
  /** Daily work-activity counts (audit-log entries per UTC day) — last 16 weeks. */
  activityHeatmap: Array<{
    date: string;
    count: number;
  }>;
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

/** Shared equipment categories — used by DTO validation, catalog seed data, and UI selects. */
export enum EquipmentCategory {
  EARTHMOVING = 'earthmoving',
  LIFTING = 'lifting',
  TRANSPORT = 'transport',
  CONCRETE = 'concrete',
  POWER = 'power',
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

/** Pre-built construction catalog entry — a TYPE of equipment, not a physical asset. */
export interface EquipmentCatalogItemDomain {
  id: string;
  name: string;
  category: EquipmentCategory;
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
  taskId?: string;
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

// ============================================================================
// INVENTORY DOMAIN
// ============================================================================

export interface MaterialDomain {
  id: string;
  tenantId: string;
  sku: string;
  name: string;
  unit: string;
  reorderPoint: number;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export enum MaterialCategory {
  CONCRETE = 'concrete',
  STEEL = 'steel',
  TIMBER = 'timber',
  ELECTRICAL = 'electrical',
  PLUMBING = 'plumbing',
  FINISHES = 'finishes',
  EARTHWORKS = 'earthworks',
  SAFETY = 'safety',
  GENERAL = 'general',
}

export interface MaterialCatalogItemDomain {
  id: string;
  name: string;
  category: MaterialCategory;
  unit?: string;
  sku?: string;
}

export interface StockLevelDomain {
  id: string;
  tenantId: string;
  materialId: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaterialWithStockDomain extends MaterialDomain {
  stockLevel: StockLevelDomain | null;
  isLowStock: boolean;
}

export enum TransactionType {
  RECEIVE = 'receive',
  CONSUME = 'consume',
  ADJUST = 'adjust',
  TRANSFER = 'transfer',
}

export interface InventoryTransactionDomain {
  id: string;
  tenantId: string;
  type: TransactionType;
  quantity: number;
  materialId: string;
  projectId?: string;
  taskId?: string;
  costCents?: number;
  note?: string;
  actorId: string;
  createdAt: Date;
}

export interface DeliveryReceiptDomain {
  id: string;
  tenantId: string;
  supplier: string;
  materialId: string;
  quantity: number;
  costCents?: number;
  notes?: string;
  createdAt: Date;
}

// ============================================================================
// NOTIFICATIONS DOMAIN
// ============================================================================

export type NotificationType =
  | 'task.assigned'
  | 'task.due_soon'
  | 'task.blocked'
  | 'task.overdue'
  | 'task.unblocked'
  | 'dependency.completed'
  | 'inventory.below_reorder'
  | 'equipment.maintenance_due'
  | 'report.completed'
  | 'report.failed'
  | 'project.status_changed';

export interface NotificationDomain {
  id: string;
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  link?: string;
  readAt?: Date;
  createdAt: Date;
}

export type NotificationChannel = 'in_app' | 'email' | 'push';

export interface NotificationSubscriptionDomain {
  id: string;
  tenantId: string;
  userId: string;
  type: NotificationType;
  channels: NotificationChannel[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// REPORTS DOMAIN
// ============================================================================

export enum ReportStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
}

export interface ReportTemplateDomain {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: string;
  config: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportRunDomain {
  id: string;
  tenantId: string;
  templateId: string;
  status: ReportStatus;
  params: Record<string, unknown>;
  resultUrl?: string;
  errorMessage?: string;
  /** Persisted generated content (sections) for viewing/printing. */
  resultData?: {
    type: string;
    generatedAt: string;
    sections: Array<{ title: string; content: string }>;
  } | null;
  requestedBy: string;
  createdAt: Date;
  completedAt?: Date;
}

// ============================================================================
// AI ASSISTANT DOMAIN
// ============================================================================

export enum AiJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
}

export enum AiJobType {
  QUERY = 'query',
  SUMMARIZE = 'summarize',
  DRAFT_REPORT = 'draft_report',
}

export interface AiConversationDomain {
  id: string;
  tenantId: string;
  userId: string;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AiMessageDomain {
  id: string;
  tenantId: string;
  conversationId?: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{ entityType: string; entityId: string; label: string }>;
  createdAt: Date;
}

export interface AiJobDomain {
  id: string;
  tenantId: string;
  userId: string;
  type: AiJobType;
  status: AiJobStatus;
  params: Record<string, unknown>;
  result?: string;
  citations?: Array<{ entityType: string; entityId: string; label: string }>;
  errorMessage?: string;
  provider: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  costCents?: number;
  createdAt: Date;
  completedAt?: Date;
}

export interface AiFeedbackDomain {
  id: string;
  tenantId: string;
  userId: string;
  messageId: string;
  jobId?: string;
  rating: 'up' | 'down';
  comment?: string;
  createdAt: Date;
}

export interface AiCompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  groundingContext: string;
  maxTokens?: number;
  timeoutMs?: number;
  /** Optional base64 data-URL images attached by the user (multimodal). */
  images?: string[];
}

export interface AiCompletionResponse {
  content: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
}

export interface AIProvider {
  complete(request: AiCompletionRequest): Promise<AiCompletionResponse>;
  embed?(text: string): Promise<number[]>;
}

// ============================================================================
// JOB QUEUE (Provider-agnostic background job abstraction)
// ============================================================================

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
}

export interface JobPayload {
  [key: string]: unknown;
}

export interface JobResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface Job<TPayload extends JobPayload = JobPayload> {
  id: string;
  type: string;
  status: JobStatus;
  payload: TPayload;
  result?: JobResult;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface IJobProcessor<TPayload extends JobPayload = JobPayload> {
  readonly jobType: string;
  process(payload: TPayload): Promise<JobResult>;
}

export interface IJobQueue {
  enqueue<TPayload extends JobPayload>(
    type: string,
    payload: TPayload,
  ): Promise<Job<TPayload>>;
  getJob(id: string): Promise<Job | null>;
  registerProcessor(processor: IJobProcessor): void;
}

// ============================================================================
// DOCUMENTS DOMAIN
// ============================================================================

export interface DocumentDomain {
  id: string;
  tenantId: string;
  /** Sanitised display name (original upload filename). */
  name: string;
  /** MIME type as reported by the upload. */
  mimeType: string;
  /** Size in bytes. */
  sizeBytes: number;
  /** Content hash of the stored file (sha256). */
  fileHash: string;
  /** Relative key under the tenant's uploads root, e.g. stored.hex -> original.pdf. */
  storageKey: string;
  /** Project the document is attached to, if any. */
  projectId?: string;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Explicit exports to ensure downstream packages import these names reliably.
// End of file
