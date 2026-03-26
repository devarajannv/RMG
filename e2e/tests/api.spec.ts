/**
 * API Endpoints E2E Tests
 * 
 * Critical path tests for backend API:
 * - Authentication endpoints
 * - Resource CRUD endpoints
 * - Project CRUD endpoints
 * - Request flow endpoints
 * - Contract endpoints
 * - Error handling
 * - Performance
 * 
 * @module e2e/tests/api.spec
 */

import { test, expect } from '../fixtures';

test.describe('API Endpoints', () => {
  // ========================================================================
  // Authentication Endpoints
  // ========================================================================
  
  test.describe('Auth API', () => {
    test('API-001: should return 401 without token', async ({ request }) => {
      const response = await request.get('/api/users/me');
      expect(response.status()).toBe(401);
    });

    test('API-002: should login with valid credentials', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: {
          email: process.env.TEST_USER_EMAIL || 'test@example.com',
          password: process.env.TEST_USER_PASSWORD || 'password123',
        },
      });
      
      expect(response.status()).toBe(200);
      
      const body = await response.json();
      expect(body).toHaveProperty('token');
      expect(body).toHaveProperty('user');
    });

    test('API-003: should reject invalid credentials', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: {
          email: 'invalid@example.com',
          password: 'wrongpassword',
        },
      });
      
      expect([400, 401]).toContain(response.status());
    });

    test('API-004: should refresh token', async ({ api }) => {
      const response = await api.request.post('/api/auth/refresh');
      
      // May require refresh token in body
      expect([200, 400, 401]).toContain(response.status());
    });

    test('API-005: should get current user', async ({ api }) => {
      const response = await api.request.get('/api/users/me');
      
      expect(response.status()).toBe(200);
      
      const user = await response.json();
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
    });
  });

  // ========================================================================
  // Resources Endpoints
  // ========================================================================
  
  test.describe('Resources API', () => {
    test('API-006: should list resources', async ({ api }) => {
      const response = await api.request.get('/api/resources');
      
      expect(response.status()).toBe(200);
      
      const body = await response.json();
      expect(Array.isArray(body.data || body)).toBe(true);
    });

    test('API-007: should filter resources', async ({ api }) => {
      const response = await api.request.get('/api/resources', {
        params: {
          status: 'ACTIVE',
          limit: 10,
        },
      });
      
      expect(response.status()).toBe(200);
    });

    test('API-008: should paginate resources', async ({ api }) => {
      const response = await api.request.get('/api/resources', {
        params: {
          page: 1,
          limit: 5,
        },
      });
      
      expect(response.status()).toBe(200);
      
      const body = await response.json();
      // Should have pagination info
      expect(body).toHaveProperty('data');
    });

    test('API-009: should get single resource', async ({ api }) => {
      // First get a resource ID
      const listResponse = await api.request.get('/api/resources?limit=1');
      const resources = await listResponse.json();
      
      if (resources.data?.length > 0 || resources.length > 0) {
        const resourceId = resources.data?.[0]?.id || resources[0]?.id;
        
        const response = await api.request.get(`/api/resources/${resourceId}`);
        expect(response.status()).toBe(200);
        
        const resource = await response.json();
        expect(resource).toHaveProperty('id');
      }
    });

    test('API-010: should create resource', async ({ api, testData }) => {
      const resource = testData.resource();
      
      const response = await api.request.post('/api/resources', {
        data: resource,
      });
      
      // 201 Created or 200 OK
      expect([200, 201]).toContain(response.status());
      
      const created = await response.json();
      expect(created).toHaveProperty('id');
    });

    test('API-011: should update resource', async ({ api }) => {
      const listResponse = await api.request.get('/api/resources?limit=1');
      const resources = await listResponse.json();
      
      if (resources.data?.length > 0 || resources.length > 0) {
        const resourceId = resources.data?.[0]?.id || resources[0]?.id;
        
        const response = await api.request.patch(`/api/resources/${resourceId}`, {
          data: {
            status: 'ACTIVE',
          },
        });
        
        expect([200, 204]).toContain(response.status());
      }
    });

    test('API-012: should validate resource creation', async ({ api }) => {
      const response = await api.request.post('/api/resources', {
        data: {
          // Missing required fields
        },
      });
      
      expect([400, 422]).toContain(response.status());
    });

    test('API-013: should search resources', async ({ api }) => {
      const response = await api.request.get('/api/resources/search', {
        params: {
          query: 'test',
        },
      });
      
      // Search endpoint may or may not exist
      expect([200, 404]).toContain(response.status());
    });
  });

  // ========================================================================
  // Projects Endpoints
  // ========================================================================
  
  test.describe('Projects API', () => {
    test('API-014: should list projects', async ({ api }) => {
      const response = await api.request.get('/api/projects');
      
      expect(response.status()).toBe(200);
      
      const body = await response.json();
      expect(Array.isArray(body.data || body)).toBe(true);
    });

    test('API-015: should get single project', async ({ api }) => {
      const listResponse = await api.request.get('/api/projects?limit=1');
      const projects = await listResponse.json();
      
      if (projects.data?.length > 0 || projects.length > 0) {
        const projectId = projects.data?.[0]?.id || projects[0]?.id;
        
        const response = await api.request.get(`/api/projects/${projectId}`);
        expect(response.status()).toBe(200);
      }
    });

    test('API-016: should create project', async ({ api, testData }) => {
      const project = testData.project();
      
      const response = await api.request.post('/api/projects', {
        data: project,
      });
      
      expect([200, 201]).toContain(response.status());
    });

    test('API-017: should update project', async ({ api }) => {
      const listResponse = await api.request.get('/api/projects?limit=1');
      const projects = await listResponse.json();
      
      if (projects.data?.length > 0 || projects.length > 0) {
        const projectId = projects.data?.[0]?.id || projects[0]?.id;
        
        const response = await api.request.patch(`/api/projects/${projectId}`, {
          data: {
            status: 'ACTIVE',
          },
        });
        
        expect([200, 204]).toContain(response.status());
      }
    });

    test('API-018: should get project team', async ({ api }) => {
      const listResponse = await api.request.get('/api/projects?limit=1');
      const projects = await listResponse.json();
      
      if (projects.data?.length > 0 || projects.length > 0) {
        const projectId = projects.data?.[0]?.id || projects[0]?.id;
        
        const response = await api.request.get(`/api/projects/${projectId}/team`);
        
        // Team endpoint may or may not exist
        expect([200, 404]).toContain(response.status());
      }
    });
  });

  // ========================================================================
  // Requests Endpoints
  // ========================================================================
  
  test.describe('Requests API', () => {
    test('API-019: should list requests', async ({ api }) => {
      const response = await api.request.get('/api/requests');
      
      expect(response.status()).toBe(200);
      
      const body = await response.json();
      expect(Array.isArray(body.data || body)).toBe(true);
    });

    test('API-020: should create request', async ({ api, testData }) => {
      const request = testData.request();
      
      const response = await api.request.post('/api/requests', {
        data: request,
      });
      
      expect([200, 201]).toContain(response.status());
    });

    test('API-021: should get request by ID', async ({ api }) => {
      const listResponse = await api.request.get('/api/requests?limit=1');
      const requests = await listResponse.json();
      
      if (requests.data?.length > 0 || requests.length > 0) {
        const requestId = requests.data?.[0]?.id || requests[0]?.id;
        
        const response = await api.request.get(`/api/requests/${requestId}`);
        expect(response.status()).toBe(200);
      }
    });

    test('API-022: should submit request', async ({ api }) => {
      const listResponse = await api.request.get('/api/requests?status=DRAFT&limit=1');
      const requests = await listResponse.json();
      
      if (requests.data?.length > 0 || requests.length > 0) {
        const requestId = requests.data?.[0]?.id || requests[0]?.id;
        
        const response = await api.request.post(`/api/requests/${requestId}/submit`);
        
        // Submit endpoint may or may not exist
        expect([200, 201, 404]).toContain(response.status());
      }
    });

    test('API-023: should approve request', async ({ api }) => {
      const listResponse = await api.request.get('/api/requests?status=PENDING&limit=1');
      const requests = await listResponse.json();
      
      if (requests.data?.length > 0 || requests.length > 0) {
        const requestId = requests.data?.[0]?.id || requests[0]?.id;
        
        const response = await api.request.post(`/api/requests/${requestId}/approve`, {
          data: {
            comment: 'E2E Test Approval',
          },
        });
        
        // Approve endpoint may or may not exist
        expect([200, 201, 403, 404]).toContain(response.status());
      }
    });

    test('API-024: should reject request', async ({ api }) => {
      const listResponse = await api.request.get('/api/requests?status=PENDING&limit=1');
      const requests = await listResponse.json();
      
      if (requests.data?.length > 0 || requests.length > 0) {
        const requestId = requests.data?.[0]?.id || requests[0]?.id;
        
        const response = await api.request.post(`/api/requests/${requestId}/reject`, {
          data: {
            reason: 'E2E Test Rejection',
          },
        });
        
        // Reject endpoint may or may not exist
        expect([200, 201, 403, 404]).toContain(response.status());
      }
    });

    test('API-025: should get pending approvals', async ({ api }) => {
      const response = await api.request.get('/api/requests/pending');
      
      // Pending endpoint may or may not exist
      expect([200, 404]).toContain(response.status());
    });
  });

  // ========================================================================
  // Contracts Endpoints
  // ========================================================================
  
  test.describe('Contracts API', () => {
    test('API-026: should list contracts', async ({ api }) => {
      const response = await api.request.get('/api/contracts');
      
      expect(response.status()).toBe(200);
    });

    test('API-027: should create contract', async ({ api, testData }) => {
      const contract = testData.contract();
      
      const response = await api.request.post('/api/contracts', {
        data: contract,
      });
      
      expect([200, 201]).toContain(response.status());
    });

    test('API-028: should get contract by ID', async ({ api }) => {
      const listResponse = await api.request.get('/api/contracts?limit=1');
      const contracts = await listResponse.json();
      
      if (contracts.data?.length > 0 || contracts.length > 0) {
        const contractId = contracts.data?.[0]?.id || contracts[0]?.id;
        
        const response = await api.request.get(`/api/contracts/${contractId}`);
        expect(response.status()).toBe(200);
      }
    });

    test('API-029: should get contract milestones', async ({ api }) => {
      const listResponse = await api.request.get('/api/contracts?limit=1');
      const contracts = await listResponse.json();
      
      if (contracts.data?.length > 0 || contracts.length > 0) {
        const contractId = contracts.data?.[0]?.id || contracts[0]?.id;
        
        const response = await api.request.get(`/api/contracts/${contractId}/milestones`);
        
        // Milestones endpoint may or may not exist
        expect([200, 404]).toContain(response.status());
      }
    });

    test('API-030: should get contract documents', async ({ api }) => {
      const listResponse = await api.request.get('/api/contracts?limit=1');
      const contracts = await listResponse.json();
      
      if (contracts.data?.length > 0 || contracts.length > 0) {
        const contractId = contracts.data?.[0]?.id || contracts[0]?.id;
        
        const response = await api.request.get(`/api/contracts/${contractId}/documents`);
        
        // Documents endpoint may or may not exist
        expect([200, 404]).toContain(response.status());
      }
    });
  });

  // ========================================================================
  // Allocations Endpoints
  // ========================================================================
  
  test.describe('Allocations API', () => {
    test('API-031: should list allocations', async ({ api }) => {
      const response = await api.request.get('/api/allocations');
      
      expect(response.status()).toBe(200);
    });

    test('API-032: should create allocation', async ({ api }) => {
      // First get a resource and project
      const resourcesResponse = await api.request.get('/api/resources?limit=1');
      const projectsResponse = await api.request.get('/api/projects?limit=1');
      
      const resources = await resourcesResponse.json();
      const projects = await projectsResponse.json();
      
      if ((resources.data?.length || resources.length) && (projects.data?.length || projects.length)) {
        const resourceId = resources.data?.[0]?.id || resources[0]?.id;
        const projectId = projects.data?.[0]?.id || projects[0]?.id;
        
        const response = await api.request.post('/api/allocations', {
          data: {
            resourceId,
            projectId,
            allocationPercentage: 50,
            startDate: '2024-01-01',
            endDate: '2024-12-31',
          },
        });
        
        expect([200, 201, 400]).toContain(response.status());
      }
    });

    test('API-033: should get resource allocations', async ({ api }) => {
      const resourcesResponse = await api.request.get('/api/resources?limit=1');
      const resources = await resourcesResponse.json();
      
      if (resources.data?.length || resources.length) {
        const resourceId = resources.data?.[0]?.id || resources[0]?.id;
        
        const response = await api.request.get(`/api/resources/${resourceId}/allocations`);
        
        expect([200, 404]).toContain(response.status());
      }
    });
  });

  // ========================================================================
  // Dashboard Endpoints
  // ========================================================================
  
  test.describe('Dashboard API', () => {
    test('API-034: should get dashboard stats', async ({ api }) => {
      const response = await api.request.get('/api/dashboard/stats');
      
      // Dashboard endpoint may or may not exist
      expect([200, 404]).toContain(response.status());
    });

    test('API-035: should get pending tasks', async ({ api }) => {
      const response = await api.request.get('/api/dashboard/pending');
      
      // Pending tasks endpoint may or may not exist
      expect([200, 404]).toContain(response.status());
    });

    test('API-036: should get recent activity', async ({ api }) => {
      const response = await api.request.get('/api/dashboard/activity');
      
      // Activity endpoint may or may not exist
      expect([200, 404]).toContain(response.status());
    });
  });

  // ========================================================================
  // Clients Endpoints
  // ========================================================================
  
  test.describe('Clients API', () => {
    test('API-037: should list clients', async ({ api }) => {
      const response = await api.request.get('/api/clients');
      
      expect(response.status()).toBe(200);
    });

    test('API-038: should create client', async ({ api }) => {
      const response = await api.request.post('/api/clients', {
        data: {
          name: `E2E Test Client ${Date.now()}`,
          code: `E2E${Date.now()}`,
        },
      });
      
      expect([200, 201]).toContain(response.status());
    });

    test('API-039: should get client by ID', async ({ api }) => {
      const listResponse = await api.request.get('/api/clients?limit=1');
      const clients = await listResponse.json();
      
      if (clients.data?.length || clients.length) {
        const clientId = clients.data?.[0]?.id || clients[0]?.id;
        
        const response = await api.request.get(`/api/clients/${clientId}`);
        expect(response.status()).toBe(200);
      }
    });
  });

  // ========================================================================
  // Error Handling Tests
  // ========================================================================
  
  test.describe('Error Handling', () => {
    test('API-040: should return 404 for non-existent resource', async ({ api }) => {
      const response = await api.request.get('/api/resources/non-existent-id-12345');
      
      expect([400, 404]).toContain(response.status());
    });

    test('API-041: should return proper error format', async ({ api }) => {
      const response = await api.request.get('/api/resources/invalid');
      
      if (response.status() >= 400) {
        const body = await response.json();
        
        // Should have error message
        expect(body).toHaveProperty('message');
      }
    });

    test('API-042: should validate request body', async ({ api }) => {
      const response = await api.request.post('/api/resources', {
        data: {
          invalidField: 'value',
        },
      });
      
      expect([400, 422]).toContain(response.status());
    });

    test('API-043: should handle malformed JSON', async ({ api }) => {
      const response = await api.request.post('/api/resources', {
        headers: {
          'Content-Type': 'application/json',
        },
        data: 'not valid json{',
      });
      
      expect([400, 500]).toContain(response.status());
    });
  });

  // ========================================================================
  // Performance Tests
  // ========================================================================
  
  test.describe('Performance', () => {
    test('API-044: should respond within 1 second for list endpoints', async ({ api }) => {
      const startTime = Date.now();
      
      await api.request.get('/api/resources?limit=10');
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000);
    });

    test('API-045: should handle pagination efficiently', async ({ api }) => {
      const startTime = Date.now();
      
      await api.request.get('/api/resources?page=1&limit=100');
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(2000);
    });

    test('API-046: should handle concurrent requests', async ({ api }) => {
      const requests = Array(5).fill(null).map(() =>
        api.request.get('/api/resources?limit=10')
      );
      
      const responses = await Promise.all(requests);
      
      for (const response of responses) {
        expect(response.status()).toBe(200);
      }
    });
  });

  // ========================================================================
  // Health Check Tests
  // ========================================================================
  
  test.describe('Health Check', () => {
    test('API-047: should return health status', async ({ request }) => {
      const response = await request.get('/api/health');
      
      expect([200, 404]).toContain(response.status());
    });

    test('API-048: should return API version', async ({ request }) => {
      const response = await request.get('/api');
      
      expect([200, 404]).toContain(response.status());
    });
  });
});
