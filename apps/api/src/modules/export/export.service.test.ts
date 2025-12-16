import { describe, it, expect, vi, beforeEach } from 'vitest';
import prisma from '../../lib/prisma';
import * as exportService from './export.service';

describe('Export Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exportResources', () => {
    const mockResources = [
      {
        employeeId: 'NV001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        designation: 'Developer',
        band: 'L3',
        status: 'ACTIVE',
        employmentType: 'FTE',
        joinDate: new Date('2024-01-15'),
        capacity: 100,
        billRatePerHour: null,
        costPerHour: null,
        benchSince: null,
        practice: { name: 'Technology', code: 'TECH' },
        location: { name: 'Bangalore', code: 'BLR' },
        skills: [
          { skill: { name: 'Java' } },
          { skill: { name: 'Python' } },
        ],
        allocations: [
          { 
            percentage: 50, 
            project: { name: 'Project A', code: 'PROJ-A' } 
          },
        ],
      },
    ];

    it('should export resources as CSV', async () => {
      // Arrange
      vi.mocked(prisma.resource.findMany).mockResolvedValue(mockResources as any);

      // Act
      const result = await exportService.exportResources('tenant-123', { format: 'csv' });

      // Assert
      expect(result.mimeType).toBe('text/csv');
      expect(result.filename).toContain('resources');
      expect(result.filename).toMatch(/\.csv$/);
      expect(result.recordCount).toBe(1);
      expect(result.data).toContain('employeeId');
      expect(result.data).toContain('NV001');
      expect(result.data).toContain('John');
    });

    it('should export resources as JSON', async () => {
      // Arrange
      vi.mocked(prisma.resource.findMany).mockResolvedValue(mockResources as any);

      // Act
      const result = await exportService.exportResources('tenant-123', { format: 'json' });

      // Assert
      expect(result.mimeType).toBe('application/json');
      expect(result.filename).toMatch(/\.json$/);
      const data = JSON.parse(result.data);
      expect(Array.isArray(data)).toBe(true);
      expect(data[0].employeeId).toBe('NV001');
    });

    it('should include skills as semicolon-separated list', async () => {
      // Arrange
      vi.mocked(prisma.resource.findMany).mockResolvedValue(mockResources as any);

      // Act
      const result = await exportService.exportResources('tenant-123', { format: 'csv' });

      // Assert
      expect(result.data).toContain('Java; Python');
    });

    it('should include current project codes', async () => {
      // Arrange
      vi.mocked(prisma.resource.findMany).mockResolvedValue(mockResources as any);

      // Act
      const result = await exportService.exportResources('tenant-123', { format: 'csv' });

      // Assert
      expect(result.data).toContain('PROJ-A');
    });
  });

  describe('exportProjects', () => {
    const mockProjects = [
      {
        code: 'PROJ-001',
        name: 'Customer Portal',
        type: 'BILLABLE',
        status: 'ACTIVE',
        healthStatus: 'GREEN',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        budgetHours: 2000,
        description: 'Customer portal development',
        client: { name: 'Acme Corp', code: 'ACME' },
        contract: { name: 'MSA 2024', contractNumber: 'MSA-001' },
        allocations: [
          { resourceId: 'r1', resource: { firstName: 'John', lastName: 'Doe' } },
          { resourceId: 'r2', resource: { firstName: 'Jane', lastName: 'Smith' } },
        ],
      },
    ];

    it('should export projects as CSV', async () => {
      // Arrange
      vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects as any);

      // Act
      const result = await exportService.exportProjects('tenant-123', { format: 'csv' });

      // Assert
      expect(result.mimeType).toBe('text/csv');
      expect(result.data).toContain('PROJ-001');
      expect(result.data).toContain('Customer Portal');
      expect(result.data).toContain('Acme Corp');
    });

    it('should calculate team size correctly', async () => {
      // Arrange
      vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects as any);

      // Act
      const result = await exportService.exportProjects('tenant-123', { format: 'json' });

      // Assert
      const data = JSON.parse(result.data);
      expect(data[0].teamSize).toBe(2);
    });
  });

  describe('exportBenchReport', () => {
    const mockBenchResources = [
      {
        employeeId: 'NV002',
        firstName: 'Jane',
        lastName: 'Smith',
        designation: 'Developer',
        band: 'L3',
        benchSince: new Date('2024-11-01'),
        costPerHour: { toNumber: () => 50 },
        practice: { name: 'Technology' },
        location: { name: 'Bangalore' },
        skills: [
          { skill: { name: 'React' } },
        ],
      },
    ];

    it('should export bench report with cost calculations', async () => {
      // Arrange
      vi.mocked(prisma.resource.findMany).mockResolvedValue(mockBenchResources as any);

      // Act
      const result = await exportService.exportBenchReport('tenant-123', { format: 'csv' });

      // Assert
      expect(result.mimeType).toBe('text/csv');
      expect(result.data).toContain('benchDays');
      expect(result.data).toContain('estimatedMonthlyCost');
      expect(result.recordCount).toBe(1);
    });

    it('should calculate bench days correctly', async () => {
      // Arrange
      vi.mocked(prisma.resource.findMany).mockResolvedValue(mockBenchResources as any);

      // Act
      const result = await exportService.exportBenchReport('tenant-123', { format: 'json' });

      // Assert
      const data = JSON.parse(result.data);
      expect(data[0].benchDays).toBeGreaterThan(0);
    });
  });

  describe('exportUtilizationReport', () => {
    const mockResources = [
      {
        employeeId: 'NV001',
        firstName: 'John',
        lastName: 'Doe',
        designation: 'Developer',
        band: 'L3',
        capacity: 100,
        practice: { name: 'Technology', targetUtilization: 85 },
        location: { name: 'Bangalore' },
        allocations: [
          { percentage: 80, isBillable: true, project: { name: 'P1', code: 'P1' } },
          { percentage: 10, isBillable: false, project: { name: 'P2', code: 'P2' } },
        ],
      },
    ];

    it('should calculate billable and non-billable allocations', async () => {
      // Arrange
      vi.mocked(prisma.resource.findMany).mockResolvedValue(mockResources as any);

      // Act
      const result = await exportService.exportUtilizationReport('tenant-123', { format: 'json' });

      // Assert
      const data = JSON.parse(result.data);
      expect(data[0].billableAllocation).toBe(80);
      expect(data[0].nonBillableAllocation).toBe(10);
      expect(data[0].totalAllocation).toBe(90);
      expect(data[0].availableCapacity).toBe(10);
    });

    it('should determine utilization status', async () => {
      // Arrange
      vi.mocked(prisma.resource.findMany).mockResolvedValue(mockResources as any);

      // Act
      const result = await exportService.exportUtilizationReport('tenant-123', { format: 'json' });

      // Assert
      const data = JSON.parse(result.data);
      expect(data[0].status).toBeDefined();
      expect(['On Target', 'Near Target', 'Below Target']).toContain(data[0].status);
    });
  });

  describe('exportClients', () => {
    const mockClients = [
      {
        code: 'ACME',
        name: 'Acme Corporation',
        industry: 'Technology',
        status: 'ACTIVE',
        contactName: 'John Contact',
        contactEmail: 'john@acme.com',
        contactPhone: '+1234567890',
        address: '123 Main St',
        website: 'https://acme.com',
        projects: [
          { name: 'P1', status: 'ACTIVE' },
          { name: 'P2', status: 'COMPLETED' },
        ],
        contracts: [
          { name: 'C1', status: 'ACTIVE' },
        ],
      },
    ];

    it('should export clients with project and contract counts', async () => {
      // Arrange
      vi.mocked(prisma.client.findMany).mockResolvedValue(mockClients as any);

      // Act
      const result = await exportService.exportClients('tenant-123', { format: 'json' });

      // Assert
      const data = JSON.parse(result.data);
      expect(data[0].activeProjects).toBe(1);
      expect(data[0].totalProjects).toBe(2);
      expect(data[0].activeContracts).toBe(1);
      expect(data[0].totalContracts).toBe(1);
    });
  });

  describe('exportSkillsInventory', () => {
    const mockSkills = [
      {
        name: 'Java',
        category: { name: 'Programming Languages' },
        resources: [
          { proficiency: 'EXPERT', resource: { employeeId: 'NV001', firstName: 'J', lastName: 'D', status: 'ACTIVE' } },
          { proficiency: 'INTERMEDIATE', resource: { employeeId: 'NV002', firstName: 'J', lastName: 'S', status: 'ACTIVE' } },
          { proficiency: 'BEGINNER', resource: { employeeId: 'NV003', firstName: 'A', lastName: 'B', status: 'INACTIVE' } },
        ],
      },
    ];

    it('should count resources by proficiency level', async () => {
      // Arrange
      vi.mocked(prisma.skill.findMany).mockResolvedValue(mockSkills as any);

      // Act
      const result = await exportService.exportSkillsInventory('tenant-123', { format: 'json' });

      // Assert
      const data = JSON.parse(result.data);
      expect(data[0].totalResources).toBe(2); // Only active resources
      expect(data[0].experts).toBe(1);
      expect(data[0].intermediate).toBe(1);
      expect(data[0].beginners).toBe(0); // The beginner is inactive
    });
  });
});

