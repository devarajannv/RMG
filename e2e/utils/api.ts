/**
 * API Testing Utilities for E2E Tests
 * 
 * Provides:
 * - Type-safe API client
 * - Request/Response interceptors
 * - Mock data generators
 * - Response validators
 * 
 * @module e2e/utils/api
 */

import { APIRequestContext, APIResponse } from '@playwright/test';
import { testConfig } from '../playwright.config';

// ============================================================================
// Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApiClientOptions {
  baseUrl?: string;
  token?: string;
  tenantId?: string;
  timeout?: number;
}

// ============================================================================
// API Client Class
// ============================================================================

export class ApiClient {
  private baseUrl: string;
  private token: string;
  private tenantId: string;
  private timeout: number;

  constructor(
    private request: APIRequestContext,
    options: ApiClientOptions = {},
  ) {
    this.baseUrl = options.baseUrl || testConfig.apiURL;
    this.token = options.token || '';
    this.tenantId = options.tenantId || '';
    this.timeout = options.timeout || 30000;
  }

  // ==========================================================================
  // Configuration
  // ==========================================================================

  setToken(token: string): this {
    this.token = token;
    return this;
  }

  setTenantId(tenantId: string): this {
    this.tenantId = tenantId;
    return this;
  }

  // ==========================================================================
  // Request Helpers
  // ==========================================================================

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (this.tenantId) {
      headers['X-Tenant-Id'] = this.tenantId;
    }

    return headers;
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean>): string {
    const url = new URL(`${this.baseUrl}${path}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  private async handleResponse<T>(response: APIResponse): Promise<ApiResponse<T>> {
    const contentType = response.headers()['content-type'] || '';
    
    if (!contentType.includes('application/json')) {
      return {
        success: response.ok(),
        error: response.ok() ? undefined : {
          code: 'NON_JSON_RESPONSE',
          message: await response.text(),
        },
      };
    }

    const data = await response.json();
    
    return {
      success: response.ok(),
      data: response.ok() ? data.data || data : undefined,
      error: response.ok() ? undefined : data.error || { code: 'API_ERROR', message: data.message },
      meta: data.meta,
    };
  }

  // ==========================================================================
  // HTTP Methods
  // ==========================================================================

  async get<T = unknown>(
    path: string,
    params?: Record<string, string | number | boolean>,
  ): Promise<ApiResponse<T>> {
    const response = await this.request.get(this.buildUrl(path, params), {
      headers: this.getHeaders(),
      timeout: this.timeout,
    });
    return this.handleResponse<T>(response);
  }

  async post<T = unknown>(
    path: string,
    data?: unknown,
  ): Promise<ApiResponse<T>> {
    const response = await this.request.post(this.buildUrl(path), {
      headers: this.getHeaders(),
      data,
      timeout: this.timeout,
    });
    return this.handleResponse<T>(response);
  }

  async put<T = unknown>(
    path: string,
    data?: unknown,
  ): Promise<ApiResponse<T>> {
    const response = await this.request.put(this.buildUrl(path), {
      headers: this.getHeaders(),
      data,
      timeout: this.timeout,
    });
    return this.handleResponse<T>(response);
  }

  async patch<T = unknown>(
    path: string,
    data?: unknown,
  ): Promise<ApiResponse<T>> {
    const response = await this.request.patch(this.buildUrl(path), {
      headers: this.getHeaders(),
      data,
      timeout: this.timeout,
    });
    return this.handleResponse<T>(response);
  }

  async delete<T = unknown>(path: string): Promise<ApiResponse<T>> {
    const response = await this.request.delete(this.buildUrl(path), {
      headers: this.getHeaders(),
      timeout: this.timeout,
    });
    return this.handleResponse<T>(response);
  }

  // ==========================================================================
  // Resource Endpoints
  // ==========================================================================

  resources = {
    list: (params?: PaginationParams) => 
      this.get<Resource[]>('/resources', params as Record<string, string | number>),
    
    get: (id: string) => 
      this.get<Resource>(`/resources/${id}`),
    
    create: (data: CreateResourceData) => 
      this.post<Resource>('/resources', data),
    
    update: (id: string, data: Partial<CreateResourceData>) => 
      this.patch<Resource>(`/resources/${id}`, data),
    
    delete: (id: string) => 
      this.delete(`/resources/${id}`),
    
    search: (query: string) => 
      this.get<Resource[]>('/resources', { search: query }),
  };

  // ==========================================================================
  // Project Endpoints
  // ==========================================================================

  projects = {
    list: (params?: PaginationParams) => 
      this.get<Project[]>('/projects', params as Record<string, string | number>),
    
    get: (id: string) => 
      this.get<Project>(`/projects/${id}`),
    
    create: (data: CreateProjectData) => 
      this.post<Project>('/projects', data),
    
    update: (id: string, data: Partial<CreateProjectData>) => 
      this.patch<Project>(`/projects/${id}`, data),
    
    delete: (id: string) => 
      this.delete(`/projects/${id}`),
    
    allocations: (id: string) => 
      this.get<Allocation[]>(`/projects/${id}/allocations`),
  };

  // ==========================================================================
  // Contract Endpoints
  // ==========================================================================

  contracts = {
    list: (params?: PaginationParams) => 
      this.get<Contract[]>('/contracts', params as Record<string, string | number>),
    
    get: (id: string) => 
      this.get<Contract>(`/contracts/${id}`),
    
    create: (data: CreateContractData) => 
      this.post<Contract>('/contracts', data),
    
    update: (id: string, data: Partial<CreateContractData>) => 
      this.patch<Contract>(`/contracts/${id}`, data),
    
    delete: (id: string) => 
      this.delete(`/contracts/${id}`),
    
    activate: (id: string) => 
      this.post(`/contracts/${id}/activate`),
    
    terminate: (id: string, reason: string) => 
      this.post(`/contracts/${id}/terminate`, { reason }),
    
    renew: (id: string, data: RenewContractData) => 
      this.post<Contract>(`/contracts/${id}/renew`, data),
  };

  // ==========================================================================
  // Request Endpoints
  // ==========================================================================

  requests = {
    list: (params?: PaginationParams & { status?: string }) => 
      this.get<Request[]>('/requests', params as Record<string, string | number>),
    
    get: (id: string) => 
      this.get<Request>(`/requests/${id}`),
    
    create: (data: CreateRequestData) => 
      this.post<Request>('/requests', data),
    
    submit: (id: string) => 
      this.post(`/requests/${id}/submit`),
    
    approve: (id: string, comment?: string) => 
      this.post(`/requests/${id}/approve`, { comment }),
    
    reject: (id: string, reason: string) => 
      this.post(`/requests/${id}/reject`, { reason }),
    
    cancel: (id: string) => 
      this.post(`/requests/${id}/cancel`),
  };

  // ==========================================================================
  // Allocation Endpoints
  // ==========================================================================

  allocations = {
    list: (params?: PaginationParams) => 
      this.get<Allocation[]>('/allocations', params as Record<string, string | number>),
    
    get: (id: string) => 
      this.get<Allocation>(`/allocations/${id}`),
    
    create: (data: CreateAllocationData) => 
      this.post<Allocation>('/allocations', data),
    
    update: (id: string, data: Partial<CreateAllocationData>) => 
      this.patch<Allocation>(`/allocations/${id}`, data),
    
    delete: (id: string) => 
      this.delete(`/allocations/${id}`),
  };

  // ==========================================================================
  // Analytics Endpoints
  // ==========================================================================

  analytics = {
    dashboard: () => 
      this.get<DashboardData>('/analytics/dashboard'),
    
    resourceUtilization: (params?: { startDate?: string; endDate?: string }) => 
      this.get('/analytics/resource-utilization', params as Record<string, string>),
    
    projectHealth: () => 
      this.get('/analytics/project-health'),
    
    budgetStatus: (projectId: string) => 
      this.get(`/analytics/budget/projects/${projectId}/budget`),
  };

  // ==========================================================================
  // Auth Endpoints
  // ==========================================================================

  auth = {
    login: (email: string, password: string) => 
      this.post<{ accessToken: string; user: unknown }>('/auth/login', { email, password }),
    
    logout: () => 
      this.post('/auth/logout'),
    
    me: () => 
      this.get<{ user: unknown }>('/auth/me'),
    
    refresh: (refreshToken: string) => 
      this.post('/auth/refresh', { refreshToken }),
  };
}

// ============================================================================
// Type Definitions for API Entities
// ============================================================================

export interface Resource {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  designation: string;
  status: string;
  skills?: Skill[];
  allocations?: Allocation[];
}

export interface CreateResourceData {
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string;
  department: string;
  designation: string;
  employmentType?: string;
  joiningDate?: string;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: string;
  startDate: string;
  endDate?: string;
  budgetHours?: number;
  budgetAmount?: number;
  allocations?: Allocation[];
}

export interface CreateProjectData {
  code: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  status?: string;
  budgetHours?: number;
  budgetAmount?: number;
}

export interface Contract {
  id: string;
  contractNumber: string;
  name: string;
  type: string;
  status: string;
  startDate: string;
  endDate?: string;
  value?: number;
  currency: string;
  clientId?: string;
}

export interface CreateContractData {
  contractNumber: string;
  name: string;
  type: string;
  startDate: string;
  endDate?: string;
  value?: number;
  currency?: string;
  clientId?: string;
}

export interface RenewContractData {
  newEndDate: string;
  newValue?: number;
  notes?: string;
}

export interface Request {
  id: string;
  type: string;
  status: string;
  priority: string;
  title: string;
  description?: string;
  requesterId: string;
  currentStepId?: string;
}

export interface CreateRequestData {
  type: string;
  priority?: string;
  title: string;
  description?: string;
  targetEntityType?: string;
  data?: Record<string, unknown>;
}

export interface Allocation {
  id: string;
  resourceId: string;
  projectId: string;
  startDate: string;
  endDate: string;
  allocationPercentage: number;
  role?: string;
  status: string;
}

export interface CreateAllocationData {
  resourceId: string;
  projectId: string;
  startDate: string;
  endDate: string;
  allocationPercentage: number;
  role?: string;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  level?: number;
}

export interface DashboardData {
  totalResources: number;
  activeProjects: number;
  pendingRequests: number;
  utilizationRate: number;
}

// ============================================================================
// Response Validators
// ============================================================================

export function assertSuccess<T>(response: ApiResponse<T>): asserts response is ApiResponse<T> & { success: true; data: T } {
  if (!response.success) {
    throw new Error(`API call failed: ${response.error?.message || 'Unknown error'}`);
  }
  if (response.data === undefined) {
    throw new Error('API response missing data');
  }
}

export function assertError(response: ApiResponse): asserts response is ApiResponse & { success: false; error: NonNullable<ApiResponse['error']> } {
  if (response.success) {
    throw new Error('Expected API call to fail but it succeeded');
  }
  if (!response.error) {
    throw new Error('API error response missing error details');
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createApiClient(
  request: APIRequestContext,
  options?: ApiClientOptions,
): ApiClient {
  return new ApiClient(request, options);
}
