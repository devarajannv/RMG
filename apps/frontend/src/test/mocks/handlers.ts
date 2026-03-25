/**
 * MSW Request Handlers
 * 
 * STRATEGY: These handlers provide minimal, realistic mock responses.
 * When a test fails, investigate THE COMPONENT first - don't add more mocks.
 */

import { http, HttpResponse } from 'msw';

const API_BASE = '/api/v1';

// ═══════════════════════════════════════════════════════════════════════
// MOCK DATA - Minimal realistic test data
// ═══════════════════════════════════════════════════════════════════════

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'ADMIN',
  tenantId: 'tenant-1',
  roles: ['Admin'],
  permissions: [
    // Full permissions for tests (admin user)
    'resources:create',
    'resources:read',
    'resources:update',
    'resources:delete',
    'projects:create',
    'projects:read',
    'projects:update',
    'projects:delete',
    'allocations:create',
    'allocations:read',
    'allocations:update',
    'allocations:delete',
    'allocations:approve',
    'timesheets:create',
    'timesheets:read',
    'timesheets:update',
    'timesheets:approve',
    'clients:create',
    'clients:read',
    'clients:update',
    'clients:delete',
    'contracts:create',
    'contracts:read',
    'contracts:update',
    'contracts:delete',
    'contracts:approve',
    'reports:read',
    'reports:export',
    'analytics:read',
    'settings:read',
    'settings:update',
    'roles:create',
    'roles:read',
    'roles:update',
    'roles:delete',
    'roles:assign',
    'requests:create',
    'requests:read',
    'requests:update',
    'requests:approve',
    'documents:create',
    'documents:read',
    'documents:update',
    'documents:delete',
  ],
};

const mockResources = [
  {
    id: 'res-1',
    employeeId: 'EMP001',
    firstName: 'John',
    lastName: 'Doe',
    name: 'John Doe',
    email: 'john.doe@example.com',
    practice: 'Engineering',
    department: 'Engineering',
    designation: 'Senior Developer',
    role: 'Senior Developer',
    status: 'AVAILABLE',
    availability: 'full-time',
    utilization: 75,
    costRate: 100,
    billRate: 150,
    location: 'New York',
    startDate: '2022-01-15',
    skills: ['React', 'TypeScript', 'Node.js'],
  },
  {
    id: 'res-2',
    employeeId: 'EMP002',
    firstName: 'Jane',
    lastName: 'Smith',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    practice: 'Engineering',
    department: 'Engineering',
    designation: 'Developer',
    role: 'Developer',
    status: 'ALLOCATED',
    availability: 'full-time',
    utilization: 100,
    costRate: 80,
    billRate: 120,
    location: 'Boston',
    startDate: '2023-03-01',
    skills: ['React', 'JavaScript'],
  },
  {
    id: 'res-3',
    employeeId: 'EMP003',
    firstName: 'Bob',
    lastName: 'Wilson',
    name: 'Bob Wilson',
    email: 'bob.wilson@example.com',
    practice: 'QA',
    department: 'QA',
    designation: 'QA Engineer',
    role: 'QA Engineer',
    status: 'BENCH',
    availability: 'bench',
    utilization: 0,
    costRate: 70,
    billRate: 100,
    location: 'Chicago',
    startDate: '2021-06-15',
    skills: ['Selenium', 'Cypress', 'Testing'],
  },
];

const mockProjects = [
  {
    id: 'proj-1',
    code: 'ALPHA',
    name: 'Alpha Project',
    status: 'ACTIVE',
    clientId: 'client-1',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    client: { id: 'client-1', name: 'Acme Corp' },
    manager: { id: 'res-1', firstName: 'John', lastName: 'Doe' },
    _count: { allocations: 3 },
  },
  {
    id: 'proj-2',
    code: 'BETA',
    name: 'Beta Project',
    status: 'PLANNING',
    clientId: 'client-2',
    startDate: '2024-06-01',
    endDate: '2024-12-31',
    client: { id: 'client-2', name: 'Globex Inc' },
    manager: { id: 'res-2', firstName: 'Jane', lastName: 'Smith' },
    _count: { allocations: 1 },
  },
];

const mockClients = [
  {
    id: 'client-1',
    name: 'Acme Corp',
    code: 'ACME',
    industry: 'Technology',
    status: 'ACTIVE',
    tier: 'ENTERPRISE',
    _count: { projects: 2, contracts: 1 },
  },
  {
    id: 'client-2',
    name: 'Globex Inc',
    code: 'GLOB',
    industry: 'Finance',
    status: 'ACTIVE',
    tier: 'STANDARD',
    _count: { projects: 1, contracts: 0 },
  },
];

const mockAllocations = [
  {
    id: 'alloc-1',
    resourceId: 'res-1',
    projectId: 'proj-1',
    percentage: 100,
    startDate: '2024-01-01',
    endDate: '2024-06-30',
    role: 'Senior Developer',
    status: 'ACTIVE',
    isBillable: true,
    billRate: 150,
    resource: {
      id: 'res-1',
      firstName: 'John',
      lastName: 'Doe',
      employeeId: 'EMP001',
      designation: 'Senior Developer',
      practice: { name: 'Engineering' },
    },
    project: {
      id: 'proj-1',
      code: 'ALPHA',
      name: 'Alpha Project',
      client: { name: 'Acme Corp' },
    },
  },
  {
    id: 'alloc-2',
    resourceId: 'res-2',
    projectId: 'proj-2',
    percentage: 50,
    startDate: '2024-02-01',
    endDate: '2024-12-31',
    role: 'Designer',
    status: 'CONFIRMED',
    isBillable: true,
    billRate: 120,
    resource: {
      id: 'res-2',
      firstName: 'Jane',
      lastName: 'Smith',
      employeeId: 'EMP002',
      designation: 'UI Designer',
      practice: { name: 'Design' },
    },
    project: {
      id: 'proj-2',
      code: 'BETA',
      name: 'Beta Project',
      client: { name: 'Globex Inc' },
    },
  },
];

const mockContracts = [
  {
    id: 'contract-1',
    contractNumber: 'CNT-001',
    name: 'Annual Service Agreement',
    type: 'MSA',
    status: 'ACTIVE',
    value: 500000,
    currency: 'INR',
    billingType: 'TM',
    autoRenew: true,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    signedDate: '2023-12-15',
    client: { id: 'client-1', name: 'Acme Corp', code: 'ACME' },
    accountManager: { id: 'res-1', firstName: 'John', lastName: 'Doe' },
    _count: { projects: 2 },
  },
  {
    id: 'contract-2',
    contractNumber: 'CNT-002',
    name: 'Support Contract',
    type: 'SOW',
    status: 'DRAFT',
    value: 150000,
    currency: 'INR',
    billingType: 'FIXED',
    autoRenew: false,
    startDate: '2024-02-01',
    endDate: '2025-01-31',
    client: { id: 'client-2', name: 'Globex Inc', code: 'GLOB' },
    _count: { projects: 1 },
  },
];

const mockSkills = [
  { id: 's1', name: 'React', category: { id: 'cat1', name: 'Frontend' } },
  { id: 's2', name: 'TypeScript', category: { id: 'cat1', name: 'Frontend' } },
  { id: 's3', name: 'Node.js', category: { id: 'cat2', name: 'Backend' } },
  { id: 's4', name: 'Python', category: { id: 'cat2', name: 'Backend' } },
];

// ═══════════════════════════════════════════════════════════════════════
// HANDLERS
// ═══════════════════════════════════════════════════════════════════════

export const handlers = [
  // Auth
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        user: mockUser,
        tokens: { accessToken: 'mock-jwt-token', expiresIn: 3600 },
      });
    }
    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }),

  http.get(`${API_BASE}/auth/me`, () => {
    return HttpResponse.json({ 
      user: {
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        tenantId: mockUser.tenantId,
        roles: mockUser.roles,
        permissions: mockUser.permissions,
      } 
    });
  }),

  http.post(`${API_BASE}/auth/logout`, () => {
    return HttpResponse.json({ success: true });
  }),

  http.post(`${API_BASE}/auth/refresh`, () => {
    return HttpResponse.json({
      tokens: { accessToken: 'mock-jwt-token', expiresIn: 3600 },
    });
  }),

  // Intelligence
  http.get(`${API_BASE}/intelligence/utilization-insights`, () => {
    return HttpResponse.json({
      data: {
        currentUtilization: 72,
        targetUtilization: 75,
        optimalUtilization: 80,
        variance: -3,
        benchCount: 2,
        benchCost: 300000,
        recommendations: [
          {
            type: 'action',
            priority: 'medium',
            message: 'Increase billable allocation for bench resources',
            impact: 'Improve utilization by 2-3%',
          },
        ],
        practiceBreakdown: [
          {
            practiceId: 'prac-1',
            practiceName: 'Engineering',
            utilization: 74,
            target: 75,
            status: 'below',
            recommendation: 'Prioritize allocation matching',
          },
        ],
      },
    });
  }),

  http.get(`${API_BASE}/intelligence/skill-inventory`, () => {
    return HttpResponse.json({
      data: {
        skills: [],
        topInDemand: ['React', 'TypeScript'],
        skillGaps: ['Go'],
        recommendations: ['Upskill backend pool for Go demand'],
      },
    });
  }),

  // AI Migration
  http.get(`${API_BASE}/ai-migration/jobs`, () => {
    return HttpResponse.json({ data: [] });
  }),

  // Webhooks
  http.get(`${API_BASE}/webhooks`, () => {
    return HttpResponse.json({ data: [] });
  }),

  // Resources
  http.get(`${API_BASE}/resources`, () => {
    return HttpResponse.json({ data: mockResources, total: mockResources.length });
  }),

  http.get(`${API_BASE}/resources/:id`, ({ params }) => {
    const resource = mockResources.find(r => r.id === params.id);
    if (!resource) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    return HttpResponse.json({ data: resource });
  }),

  http.post(`${API_BASE}/resources`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const newResource = { id: `res-${Date.now()}`, ...body };
    return HttpResponse.json({ data: newResource }, { status: 201 });
  }),

  http.put(`${API_BASE}/resources/:id`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({ data: { id: params.id, ...body } });
  }),

  http.delete(`${API_BASE}/resources/:id`, () => {
    return HttpResponse.json({ success: true });
  }),

  // Projects
  http.get(`${API_BASE}/projects`, () => {
    return HttpResponse.json({ data: mockProjects, total: mockProjects.length });
  }),

  http.get(`${API_BASE}/projects/:id`, ({ params }) => {
    const project = mockProjects.find(p => p.id === params.id);
    if (!project) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    return HttpResponse.json({ data: project });
  }),

  http.post(`${API_BASE}/projects`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const newProject = { id: `proj-${Date.now()}`, ...body };
    return HttpResponse.json({ data: newProject }, { status: 201 });
  }),

  http.put(`${API_BASE}/projects/:id`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({ data: { id: params.id, ...body } });
  }),

  http.delete(`${API_BASE}/projects/:id`, () => {
    return HttpResponse.json({ success: true });
  }),

  // Clients
  http.get(`${API_BASE}/clients`, () => {
    return HttpResponse.json({ 
      data: mockClients, 
      pagination: {
        page: 1,
        limit: 20,
        total: mockClients.length,
        totalPages: 1,
      }
    });
  }),

  http.get(`${API_BASE}/clients/:id`, ({ params }) => {
    const client = mockClients.find(c => c.id === params.id);
    if (!client) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    return HttpResponse.json({ data: client });
  }),

  http.post(`${API_BASE}/clients`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const newClient = { id: `client-${Date.now()}`, ...body };
    return HttpResponse.json({ data: newClient }, { status: 201 });
  }),

  http.put(`${API_BASE}/clients/:id`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({ data: { id: params.id, ...body } });
  }),

  http.delete(`${API_BASE}/clients/:id`, () => {
    return HttpResponse.json({ success: true });
  }),

  // Allocations
  http.get(`${API_BASE}/allocations`, () => {
    return HttpResponse.json({ 
      data: mockAllocations, 
      pagination: {
        page: 1,
        limit: 20,
        total: mockAllocations.length,
        totalPages: 1,
      }
    });
  }),

  http.get(`${API_BASE}/allocations/rolloffs`, () => {
    return HttpResponse.json({ 
      data: mockAllocations.filter(a => a.status === 'ACTIVE'),
    });
  }),

  http.post(`${API_BASE}/allocations`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const newAllocation = { id: `alloc-${Date.now()}`, ...body };
    return HttpResponse.json({ data: newAllocation }, { status: 201 });
  }),

  http.put(`${API_BASE}/allocations/:id`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({ data: { id: params.id, ...body } });
  }),

  http.delete(`${API_BASE}/allocations/:id`, () => {
    return HttpResponse.json({ success: true });
  }),

  // Contracts
  http.get(`${API_BASE}/contracts`, () => {
    return HttpResponse.json({ 
      data: mockContracts, 
      pagination: {
        page: 1,
        limit: 20,
        total: mockContracts.length,
        totalPages: 1,
      }
    });
  }),

  http.get(`${API_BASE}/contracts/:id`, ({ params }) => {
    const contract = mockContracts.find(c => c.id === params.id);
    if (!contract) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    return HttpResponse.json({ data: contract });
  }),

  http.get(`${API_BASE}/contracts/stats/summary`, () => {
    return HttpResponse.json({
      data: {
        total: mockContracts.length,
        byStatus: { ACTIVE: 1, DRAFT: 1 },
        expiringSoon: 0,
        totalActiveValue: 500000,
      },
    });
  }),

  // Skills
  http.get(`${API_BASE}/skills`, () => {
    return HttpResponse.json({ data: mockSkills });
  }),

  // Dashboard
  http.get(`${API_BASE}/dashboard/stats`, () => {
    return HttpResponse.json({
      data: {
        totalResources: mockResources.length,
        activeProjects: mockProjects.filter(p => p.status === 'ACTIVE').length,
        onBench: mockResources.filter(r => r.status === 'BENCH').length,
        utilization: 78,
      },
    });
  }),

  http.get(`${API_BASE}/dashboard/metrics`, () => {
    return HttpResponse.json({
      data: {
        resources: {
          total: mockResources.length,
          active: mockResources.filter(r => r.status === 'ACTIVE').length,
          onBench: mockResources.filter(r => r.status === 'BENCH').length,
          inNotice: 0,
          contractors: 0,
        },
        utilization: {
          current: 78,
          target: 85,
          billable: 70,
          nonBillable: 8,
          trend: 'up',
        },
        projects: {
          total: mockProjects.length,
          active: mockProjects.filter(p => p.status === 'ACTIVE').length,
          pipeline: mockProjects.filter(p => p.status === 'PIPELINE').length,
          atRisk: mockProjects.filter(p => p.status === 'ON_HOLD').length, // Use status for at-risk
        },
        allocations: {
          active: 2,
          pending: 1,
          rolloffsNext30Days: 1,
        },
        financials: {
          benchCostMonthly: 15000,
          potentialRevenueLoss: 25000,
        },
      },
    });
  }),

  http.get(`${API_BASE}/dashboard/utilization-trend`, () => {
    return HttpResponse.json({
      data: [
        { date: '2024-01', billable: 70, nonBillable: 8, bench: 22, total: 78 },
        { date: '2024-02', billable: 72, nonBillable: 7, bench: 21, total: 79 },
        { date: '2024-03', billable: 73, nonBillable: 8, bench: 19, total: 81 },
      ],
    });
  }),

  http.get(`${API_BASE}/dashboard/practice-utilization`, () => {
    return HttpResponse.json({
      data: [
        { practiceName: 'Engineering', utilizationRate: 85, targetUtilization: 80, variance: 5, totalResources: 10 },
        { practiceName: 'Design', utilizationRate: 75, targetUtilization: 80, variance: -5, totalResources: 5 },
      ],
    });
  }),

  http.get(`${API_BASE}/dashboard/capacity-forecast`, () => {
    return HttpResponse.json({
      data: [
        { week: 'Week 1', currentAllocated: 80, rolloffs: 10, newStarts: 5, projectedAvailable: 15 },
        { week: 'Week 2', currentAllocated: 75, rolloffs: 5, newStarts: 10, projectedAvailable: 20 },
      ],
    });
  }),

  // Analytics
  http.get(`${API_BASE}/analytics/utilization`, () => {
    return HttpResponse.json({
      data: {
        current: 78,
        target: 85,
        trend: [
          { month: 'Oct', value: 75 },
          { month: 'Nov', value: 77 },
          { month: 'Dec', value: 78 },
        ],
      },
    });
  }),

  http.get(`${API_BASE}/analytics/executive`, () => {
    return HttpResponse.json({
      data: {
        summary: {
          totalResources: 50,
          activeResources: 45,
          utilizationRate: 78,
          benchCount: 5,
          benchCostMonthly: 150000,
          activeProjects: 12,
          activeClients: 8,
          healthyProjects: 10,
          atRiskProjects: 2,
        },
        trends: {
          utilizationTrend: [{ month: 'Oct', rate: 75 }, { month: 'Nov', rate: 77 }],
          benchTrend: [{ month: 'Oct', count: 6, cost: 180000 }],
          headcountTrend: [{ month: 'Oct', count: 48 }],
        },
        highlights: [
          { type: 'success', title: 'Utilization', value: '78%', change: '+2%', changeType: 'positive' },
        ],
      },
    });
  }),

  http.get(`${API_BASE}/analytics/practice`, () => {
    return HttpResponse.json({
      data: {
        practices: [
          {
            id: 'p1',
            name: 'Engineering',
            code: 'ENG',
            headCount: 30,
            activeCount: 28,
            benchCount: 2,
            utilizationRate: 85,
            targetUtilization: 80,
            variance: 5,
            billableHours: 1200,
            benchCost: 50000,
            topSkills: ['React', 'Node.js'],
            trend: 'up',
          },
        ],
        summary: {
          totalPractices: 5,
          aboveTarget: 3,
          atTarget: 1,
          belowTarget: 1,
          bestPerforming: 'Engineering',
          needsAttention: 'Support',
        },
      },
    });
  }),

  http.get(`${API_BASE}/analytics/financial`, () => {
    return HttpResponse.json({
      data: {
        summary: {
          monthlyBenchCost: 150000,
          projectedQuarterlyBenchCost: 450000,
          potentialRevenueLoss: 300000,
          avgBillRate: 150,
          avgCostRate: 80,
          grossMarginPotential: 46,
        },
        costBreakdown: {
          byPractice: [{ name: 'Engineering', cost: 50000, percentage: 33 }],
          byBand: [{ band: 'Senior', cost: 80000, count: 3 }],
          byLocation: [{ name: 'Bangalore', cost: 100000, count: 4 }],
        },
      },
    });
  }),

  http.get(`${API_BASE}/analytics/projects`, () => {
    return HttpResponse.json({
      data: {
        summary: {
          totalProjects: 12,
          healthy: 10,
          atRisk: 2,
          critical: 0,
        },
        projects: mockProjects.map(p => ({
          ...p,
          healthScore: 85,
          riskFactors: [],
        })),
      },
    });
  }),

  http.post(`${API_BASE}/currency/exchange-rates/convert`, () => {
    return HttpResponse.json({ convertedAmount: 1, rate: 1 });
  }),

  // Bench endpoints
  http.get(`${API_BASE}/bench/summary`, () => {
    return HttpResponse.json({
      data: {
        totalOnBench: 12,
        totalBenchCost: 2500000,
        avgBenchDays: 18,
        benchByAging: {
          fresh: 5,
          moderate: 4,
          critical: 2,
          severe: 1,
        },
        benchByPractice: [
          { practiceId: 'p-1', practiceName: 'Engineering', count: 6, cost: 1200000, avgDays: 15 },
          { practiceId: 'p-2', practiceName: 'QA', count: 4, cost: 800000, avgDays: 20 },
        ],
        benchByBand: [
          { band: 'B1', count: 3, cost: 600000 },
          { band: 'B2', count: 5, cost: 1000000 },
        ],
        upcomingRolloffs: 8,
        willBeOnBenchIn30Days: 5,
      },
    });
  }),

  http.get(`${API_BASE}/bench/resources`, () => {
    return HttpResponse.json({
      data: [
        {
          id: 'br-1',
          employeeId: 'EMP001',
          firstName: 'John',
          lastName: 'Bench',
          email: 'john.bench@company.com',
          designation: 'Senior Developer',
          band: 'B2',
          practice: { id: 'p-1', name: 'Engineering' },
          location: { id: 'l-1', name: 'Bangalore' },
          benchDays: 15,
          benchSince: '2024-01-15',
          benchCost: 75000,
          costPerHour: 500,
          skills: [{ id: 's-1', name: 'React', category: 'Frontend', proficiency: 'Expert' }],
          lastProject: { id: 'proj-1', name: 'Project Alpha', client: 'Acme Corp' },
          lastAllocationEnd: '2024-01-14',
          agingCategory: 'moderate',
        },
      ],
    });
  }),

  http.get(`${API_BASE}/bench/rolloffs`, () => {
    return HttpResponse.json({
      data: [
        {
          id: 'ro-1',
          resourceId: 'r-1',
          resourceName: 'Jane Developer',
          resourceEmail: 'jane@company.com',
          employeeId: 'EMP002',
          band: 'B2',
          designation: 'Developer',
          practice: 'Engineering',
          project: { id: 'proj-1', name: 'Project Alpha', client: 'Acme Corp' },
          allocationPercentage: 100,
          endDate: '2024-02-15',
          daysUntilRolloff: 10,
          hasNextAllocation: false,
          nextAllocation: null,
          skills: ['React', 'Node.js'],
        },
      ],
    });
  }),

  http.get(`${API_BASE}/bench/alerts`, () => {
    return HttpResponse.json({
      data: [
        {
          id: 'alert-1',
          resourceId: 'r-2',
          resourceName: 'Bob Alert',
          resourceEmail: 'bob@company.com',
          employeeId: 'EMP003',
          band: 'B1',
          designation: 'Junior Developer',
          practice: 'Engineering',
          project: { id: 'proj-2', name: 'Project Beta', client: 'Widget Inc' },
          allocationPercentage: 100,
          endDate: '2024-02-10',
          daysUntilRolloff: 5,
          hasNextAllocation: false,
          nextAllocation: null,
          skills: ['Python'],
        },
      ],
    });
  }),

  http.get(`${API_BASE}/bench/forecast`, () => {
    return HttpResponse.json({
      data: [
        {
          date: '2024-02-01',
          projectedBenchCount: 12,
          projectedBenchCost: 2500000,
          rolloffsCount: 3,
          newAllocationsCount: 2,
          cumulativeChange: 1,
        },
        {
          date: '2024-02-08',
          projectedBenchCount: 14,
          projectedBenchCost: 2900000,
          rolloffsCount: 4,
          newAllocationsCount: 2,
          cumulativeChange: 3,
        },
      ],
    });
  }),

  http.get(`${API_BASE}/bench/analysis`, () => {
    return HttpResponse.json({
      data: {
        benchResources: mockResources.filter(r => r.status === 'BENCH'),
        totalCost: 150000,
        averageDays: 15,
      },
    });
  }),

  // Timesheets
  http.get(`${API_BASE}/timesheets/weekly`, () => {
    return HttpResponse.json({
      data: {
        period: {
          start: '2024-02-05',
          end: '2024-02-11',
          status: 'OPEN',
          periodId: 'period-1',
        },
        entries: [
          {
            projectId: 'proj-1',
            projectName: 'Project Alpha',
            projectCode: 'ALPHA',
            clientName: 'Acme Corp',
            isBillable: true,
            days: {
              '2024-02-05': { id: 'ts-1', hours: 8, status: 'SAVED' },
              '2024-02-06': { id: 'ts-2', hours: 8, status: 'SAVED' },
              '2024-02-07': { hours: 0, status: 'EMPTY' },
            },
          },
        ],
        totals: {
          daily: {
            '2024-02-05': 8,
            '2024-02-06': 8,
          },
          weekly: 16,
          billable: 16,
          nonBillable: 0,
        },
      },
    });
  }),

  http.post(`${API_BASE}/timesheets/save`, () => {
    return HttpResponse.json({
      success: true,
      message: 'Timesheet saved',
    });
  }),

  http.post(`${API_BASE}/timesheets/submit`, () => {
    return HttpResponse.json({
      success: true,
      message: 'Timesheet submitted',
    });
  }),

  // Currency
  http.get(`${API_BASE}/currency/currencies`, () => {
    return HttpResponse.json([
      { id: 'cur-1', code: 'INR', name: 'Indian Rupee', symbol: '₹', isBase: true },
      { id: 'cur-2', code: 'USD', name: 'US Dollar', symbol: '$', isBase: false },
    ]);
  }),
];
