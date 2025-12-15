// Shared TypeScript types

// ============================================================================
// Common Types
// ============================================================================

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface TenantEntity extends BaseEntity {
  tenantId: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  data: T;
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiError {
  error: string;
  code: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

// ============================================================================
// User & Auth Types
// ============================================================================

export interface User extends TenantEntity {
  email: string;
  firstName: string;
  lastName: string;
  status: 'active' | 'inactive' | 'locked';
  emailVerified: boolean;
  mfaEnabled: boolean;
  resourceId?: string | null;
  lastLoginAt?: Date | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string; // userId
  tenantId: string;
  email: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

// ============================================================================
// Resource Types
// ============================================================================

export interface Resource extends TenantEntity {
  employeeId: string;
  email: string;
  firstName: string;
  lastName: string;
  employmentType: 'fte' | 'contractor' | 'intern';
  band: string;
  designation: string;
  status: 'active' | 'inactive' | 'notice';
  dateOfJoining: Date;
  dateOfExit?: Date | null;
  capacity: number;
  practiceId?: string | null;
  locationId?: string | null;
  managerId?: string | null;
  benchSince?: Date | null;
  // Virtual
  fullName?: string;
  isOnBench?: boolean;
  benchDays?: number;
}

// ============================================================================
// Project Types
// ============================================================================

export interface Project extends TenantEntity {
  code: string;
  name: string;
  type: 'billable' | 'internal' | 'presales' | 'support';
  status: 'pipeline' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  startDate: Date;
  endDate?: Date | null;
  clientId?: string | null;
  contractId?: string | null;
  managerId?: string | null;
  practiceId?: string | null;
  billingType?: 'tm' | 'fixed' | 'retainer' | 'milestone' | 'hybrid' | null;
  budgetHours?: number | null;
  budgetAmount?: number | null;
}

// ============================================================================
// Allocation Types
// ============================================================================

export interface Allocation extends TenantEntity {
  resourceId: string;
  projectId: string;
  role: string;
  percentage: number;
  startDate: Date;
  endDate: Date;
  actualEndDate?: Date | null;
  status: 'proposed' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  isBillable: boolean;
  billRate?: number | null;
  notes?: string | null;
}

// ============================================================================
// Contract Types
// ============================================================================

export interface Contract extends TenantEntity {
  clientId: string;
  contractNumber: string;
  name: string;
  type: 'msa' | 'sow' | 'amendment' | 'nda' | 'other';
  status: 'draft' | 'pending_approval' | 'active' | 'expired' | 'terminated' | 'renewed';
  startDate: Date;
  endDate?: Date | null;
  signedDate?: Date | null;
  value?: number | null;
  billingType: 'tm' | 'fixed' | 'retainer' | 'milestone' | 'hybrid';
  paymentTerms?: string | null;
  renewalDate?: Date | null;
  autoRenew: boolean;
}

// ============================================================================
// Client Types
// ============================================================================

export interface Client extends TenantEntity {
  name: string;
  code: string;
  industry?: string | null;
  website?: string | null;
  status: 'active' | 'inactive' | 'prospect';
  tier?: 'strategic' | 'key' | 'standard' | null;
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface DashboardMetrics {
  totalResources: number;
  activeResources: number;
  benchCount: number;
  utilizationRate: number;
  activeProjects: number;
  activeAllocations: number;
  upcomingRolloffs: number;
  benchCost: number;
}

export interface UtilizationData {
  date: string;
  billable: number;
  nonBillable: number;
  bench: number;
}


