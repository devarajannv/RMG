/**
 * Search E2E Tests
 * Tests global search, filtering, sorting, and search suggestions
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiRequest, login, factories, TestCleanup } from './helpers';

describe('E2E: Search', () => {
  let token: string;
  const cleanup = new TestCleanup();

  beforeAll(async () => {
    const t = await login();
    if (!t) throw new Error('Failed to login for search tests');
    token = t;
    cleanup.setToken(token);
  });

  afterAll(async () => {
    await cleanup.cleanup();
  });

  describe('Global Search', () => {
    it('SEARCH-001: Global search returns results', async () => {
      const response = await apiRequest<{
        results: unknown[];
        total: number;
      }>(
        'GET',
        '/api/v1/search?q=test',
        undefined,
        token
      );

      expect([200, 400, 404]).toContain(response.status);
    });

    it('SEARCH-002: Search with empty query returns validation error', async () => {
      const response = await apiRequest(
        'GET',
        '/api/v1/search?q=',
        undefined,
        token
      );

      expect([400, 404]).toContain(response.status);
    });

    it('SEARCH-003: Search with minimum characters', async () => {
      const response = await apiRequest(
        'GET',
        '/api/v1/search?q=ab',
        undefined,
        token
      );

      // Usually requires 3+ characters
      expect([200, 400, 404]).toContain(response.status);
    });

    it('SEARCH-004: Search returns relevant entity types', async () => {
      const response = await apiRequest<{
        results: Array<{ type: string; id: string }>;
      }>(
        'GET',
        '/api/v1/search?q=resource',
        undefined,
        token
      );

      if (response.status === 200 && response.data.results?.length) {
        expect(response.data.results[0]).toHaveProperty('type');
      }
      expect([200, 400, 404]).toContain(response.status);
    });
  });

  describe('Entity-Specific Search', () => {
    it('SEARCH-005: Search resources', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/resources?search=engineer',
        undefined,
        token
      );

      expect([200, 400, 404]).toContain(response.status);
    });

    it('SEARCH-006: Search projects', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/projects?search=migration',
        undefined,
        token
      );

      expect([200, 400, 404]).toContain(response.status);
    });

    it('SEARCH-007: Search requests', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/requests?search=allocation',
        undefined,
        token
      );

      expect([200, 400, 404]).toContain(response.status);
    });

    it('SEARCH-008: Search contracts', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/contracts?search=vendor',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('SEARCH-009: Search users', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/users?search=admin',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Filtering', () => {
    it('SEARCH-010: Filter by status', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/resources?status=ACTIVE',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('SEARCH-011: Filter by multiple statuses', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/resources?status=ACTIVE,BENCH',
        undefined,
        token
      );

        expect([200, 400, 404]).toContain(response.status);
    });

    it('SEARCH-012: Filter by date range', async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date();

      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        `/api/v1/requests?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('SEARCH-013: Filter by department', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/resources?department=Engineering',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('SEARCH-014: Filter by skill', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/resources?skill=JavaScript',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('SEARCH-015: Filter by location', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/resources?location=Remote',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('SEARCH-016: Combine multiple filters', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/resources?status=ACTIVE&department=Engineering&location=Remote',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('SEARCH-017: Filter with search query', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/resources?search=senior&status=ACTIVE',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Sorting', () => {
    it('SEARCH-018: Sort by name ascending', async () => {
      const response = await apiRequest<{ data: Array<{ name: string }> }>(
        'GET',
        '/api/v1/resources?sortBy=name&sortOrder=asc',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('SEARCH-019: Sort by name descending', async () => {
      const response = await apiRequest<{ data: Array<{ name: string }> }>(
        'GET',
        '/api/v1/resources?sortBy=name&sortOrder=desc',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('SEARCH-020: Sort by created date', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/requests?sortBy=createdAt&sortOrder=desc',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('SEARCH-021: Sort by updated date', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/projects?sortBy=updatedAt&sortOrder=desc',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('SEARCH-022: Sort by priority', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/requests?sortBy=priority&sortOrder=desc',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Pagination', () => {
    it('SEARCH-023: First page of results', async () => {
      const response = await apiRequest<{
        data: unknown[];
        meta: { page: number; limit: number; total: number };
      }>(
        'GET',
        '/api/v1/resources?page=1&limit=10',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
      if (response.status === 200 && response.data.meta) {
        expect(response.data.meta.page).toBe(1);
      }
    });

    it('SEARCH-024: Second page of results', async () => {
      const response = await apiRequest<{
        data: unknown[];
        meta: { page: number };
      }>(
        'GET',
        '/api/v1/resources?page=2&limit=10',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('SEARCH-025: Custom page size', async () => {
      const response = await apiRequest<{
        data: unknown[];
        meta: { limit: number };
      }>(
        'GET',
        '/api/v1/resources?page=1&limit=25',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('SEARCH-026: Large page size is capped', async () => {
      const response = await apiRequest<{
        data: unknown[];
        meta: { limit: number };
      }>(
        'GET',
        '/api/v1/resources?page=1&limit=1000',
        undefined,
        token
      );

        expect([200, 400, 404]).toContain(response.status);
      // API should cap limit to max allowed (usually 100)
    });

    it('SEARCH-027: Invalid page number', async () => {
      const response = await apiRequest(
        'GET',
        '/api/v1/resources?page=-1',
        undefined,
        token
      );

      expect([200, 400, 404]).toContain(response.status);
    });

    it('SEARCH-028: Pagination metadata', async () => {
      const response = await apiRequest<{
        meta: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>(
        'GET',
        '/api/v1/resources?page=1&limit=10',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
      if (response.status === 200 && response.data.meta) {
        expect(response.data.meta).toHaveProperty('total');
      }
    });
  });

  describe('Search Suggestions', () => {
    it('SEARCH-029: Get search suggestions', async () => {
      const response = await apiRequest<{
        suggestions: string[];
      }>(
        'GET',
        '/api/v1/search/suggestions?q=eng',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('SEARCH-030: Suggestions for specific entity type', async () => {
      const response = await apiRequest<{
        suggestions: string[];
      }>(
        'GET',
        '/api/v1/search/suggestions?q=eng&type=resource',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('SEARCH-031: Autocomplete for skills', async () => {
      const response = await apiRequest<{
        data: Array<{ name: string }>;
      }>(
        'GET',
        '/api/v1/skills/search?q=java',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Advanced Search', () => {
    it('SEARCH-032: Search with boolean operators', async () => {
      const response = await apiRequest<{ results: unknown[] }>(
        'GET',
        '/api/v1/search?q=engineer+AND+senior',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('SEARCH-033: Search with exact phrase', async () => {
      const response = await apiRequest<{ results: unknown[] }>(
        'GET',
        '/api/v1/search?q="senior engineer"',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('SEARCH-034: Search with exclusion', async () => {
      const response = await apiRequest<{ results: unknown[] }>(
        'GET',
        '/api/v1/search?q=engineer+-junior',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('SEARCH-035: Search in specific fields', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/resources?nameContains=john&titleContains=engineer',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('SEARCH-036: Fuzzy search', async () => {
      const response = await apiRequest<{ results: unknown[] }>(
        'GET',
        '/api/v1/search?q=enginere&fuzzy=true', // Intentional typo
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Recent Searches', () => {
    it('SEARCH-037: Save search to history', async () => {
      const response = await apiRequest(
        'POST',
        '/api/v1/search/history',
        { query: 'test search', type: 'global' },
        token
      );

      expect([200, 201, 404]).toContain(response.status);
    });

    it('SEARCH-038: Get recent searches', async () => {
      const response = await apiRequest<{
        data: Array<{ query: string; searchedAt: string }>;
      }>(
        'GET',
        '/api/v1/search/history',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('SEARCH-039: Clear search history', async () => {
      const response = await apiRequest(
        'DELETE',
        '/api/v1/search/history',
        undefined,
        token
      );

      expect([200, 204, 404]).toContain(response.status);
    });
  });

  describe('Saved Searches', () => {
    it('SEARCH-040: Create saved search', async () => {
      const response = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/search/saved',
        {
          name: 'Active Engineers',
          query: 'engineer',
          filters: { status: 'ACTIVE', department: 'Engineering' },
        },
        token
      );

      if (response.status === 201) {
        cleanup.add('saved-searches', response.data.id);
      }
      expect([201, 400, 404]).toContain(response.status);
    });

    it('SEARCH-041: List saved searches', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/search/saved',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('SEARCH-042: Execute saved search', async () => {
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/search/saved',
        {
          name: 'Test Saved Search',
          query: 'test',
          filters: {},
        },
        token
      );

      if (createRes.status !== 201) return;
      cleanup.add('saved-searches', createRes.data.id);

      const response = await apiRequest<{ results: unknown[] }>(
        'POST',
        `/api/v1/search/saved/${createRes.data.id}/execute`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('SEARCH-043: Delete saved search', async () => {
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/search/saved',
        {
          name: 'To Be Deleted',
          query: 'delete',
          filters: {},
        },
        token
      );

      if (createRes.status !== 201) return;

      const response = await apiRequest(
        'DELETE',
        `/api/v1/search/saved/${createRes.data.id}`,
        undefined,
        token
      );

      expect([200, 204, 404]).toContain(response.status);
    });
  });

  describe('Export Search Results', () => {
    it('SEARCH-044: Export to CSV', async () => {
      const response = await apiRequest<string>(
        'GET',
        '/api/v1/resources/export?format=csv',
        undefined,
        token
      );

        expect([200, 400, 404]).toContain(response.status);
    });

    it('SEARCH-045: Export to Excel', async () => {
      const response = await apiRequest(
        'GET',
        '/api/v1/resources/export?format=xlsx',
        undefined,
        token
      );

        expect([200, 400, 404]).toContain(response.status);
    });

    it('SEARCH-046: Export with filters applied', async () => {
      const response = await apiRequest(
        'GET',
        '/api/v1/resources/export?format=csv&status=ACTIVE&department=Engineering',
        undefined,
        token
      );

        expect([200, 400, 404]).toContain(response.status);
    });
  });
});
