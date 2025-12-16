import { describe, it, expect, vi, beforeEach } from 'vitest';
import prisma from '../../lib/prisma';
import * as importService from './import.service';

describe('Import Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('importResources', () => {
    const validCsvData = `employeeId,firstName,lastName,email,designation,band,practiceCode,locationCode,status
NV100,John,Doe,john.doe@company.com,Developer,L3,TECH,BLR,ACTIVE
NV101,Jane,Smith,jane.smith@company.com,Senior Developer,L4,TECH,BLR,ACTIVE`;

    const mockPractices = [
      { id: 'practice-1', code: 'TECH' },
    ];

    const mockLocations = [
      { id: 'location-1', code: 'BLR' },
    ];

    it('should import resources successfully', async () => {
      // Arrange
      vi.mocked(prisma.practice.findMany).mockResolvedValue(mockPractices as any);
      vi.mocked(prisma.location.findMany).mockResolvedValue(mockLocations as any);
      vi.mocked(prisma.resource.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.resource.create).mockResolvedValue({ id: 'new-resource' } as any);

      // Act
      const result = await importService.importResources(
        'tenant-123',
        validCsvData,
        'user-123'
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.totalRows).toBe(2);
      expect(result.importedRows).toBe(2);
      expect(result.skippedRows).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should skip existing resources without updateExisting flag', async () => {
      // Arrange
      vi.mocked(prisma.practice.findMany).mockResolvedValue(mockPractices as any);
      vi.mocked(prisma.location.findMany).mockResolvedValue(mockLocations as any);
      vi.mocked(prisma.resource.findFirst).mockResolvedValue({ id: 'existing' } as any);

      // Act
      const result = await importService.importResources(
        'tenant-123',
        validCsvData,
        'user-123',
        { updateExisting: false }
      );

      // Assert
      expect(result.skippedRows).toBe(2);
      expect(result.importedRows).toBe(0);
    });

    it('should update existing resources with updateExisting flag', async () => {
      // Arrange
      vi.mocked(prisma.practice.findMany).mockResolvedValue(mockPractices as any);
      vi.mocked(prisma.location.findMany).mockResolvedValue(mockLocations as any);
      vi.mocked(prisma.resource.findFirst).mockResolvedValue({ id: 'existing' } as any);
      vi.mocked(prisma.resource.update).mockResolvedValue({ id: 'existing' } as any);

      // Act
      const result = await importService.importResources(
        'tenant-123',
        validCsvData,
        'user-123',
        { updateExisting: true }
      );

      // Assert
      expect(result.importedRows).toBe(2);
      expect(prisma.resource.update).toHaveBeenCalled();
    });

    it('should report errors for rows with missing required fields', async () => {
      // Arrange
      const invalidCsvData = `employeeId,firstName,lastName,email
,John,Doe,john@company.com`;

      vi.mocked(prisma.practice.findMany).mockResolvedValue(mockPractices as any);
      vi.mocked(prisma.location.findMany).mockResolvedValue(mockLocations as any);

      // Act
      const result = await importService.importResources(
        'tenant-123',
        invalidCsvData,
        'user-123'
      );

      // Assert
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Missing required fields');
      expect(result.skippedRows).toBe(1);
    });
  });

  describe('importAllocations', () => {
    const validCsvData = `resourceEmployeeId,projectCode,role,percentage,startDate,endDate,status,isBillable
NV001,PROJ-001,Developer,100,2024-01-01,2024-06-30,ACTIVE,true`;

    const mockResources = [
      { id: 'resource-1', employeeId: 'NV001' },
    ];

    const mockProjects = [
      { id: 'project-1', code: 'PROJ-001' },
    ];

    it('should import allocations successfully', async () => {
      // Arrange
      vi.mocked(prisma.resource.findMany).mockResolvedValue(mockResources as any);
      vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects as any);
      vi.mocked(prisma.allocation.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.allocation.create).mockResolvedValue({ id: 'new-allocation' } as any);

      // Act
      const result = await importService.importAllocations(
        'tenant-123',
        validCsvData,
        'user-123'
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.importedRows).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should report error for non-existent resource', async () => {
      // Arrange
      vi.mocked(prisma.resource.findMany).mockResolvedValue([]);
      vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects as any);

      // Act
      const result = await importService.importAllocations(
        'tenant-123',
        validCsvData,
        'user-123'
      );

      // Assert
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Resource not found');
    });

    it('should report error for non-existent project', async () => {
      // Arrange
      vi.mocked(prisma.resource.findMany).mockResolvedValue(mockResources as any);
      vi.mocked(prisma.project.findMany).mockResolvedValue([]);

      // Act
      const result = await importService.importAllocations(
        'tenant-123',
        validCsvData,
        'user-123'
      );

      // Assert
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Project not found');
    });

    it('should report error for invalid dates', async () => {
      // Arrange
      const invalidCsvData = `resourceEmployeeId,projectCode,role,percentage,startDate,endDate
NV001,PROJ-001,Developer,100,invalid-date,2024-06-30`;

      vi.mocked(prisma.resource.findMany).mockResolvedValue(mockResources as any);
      vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects as any);

      // Act
      const result = await importService.importAllocations(
        'tenant-123',
        invalidCsvData,
        'user-123'
      );

      // Assert
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Invalid date');
    });
  });

  describe('importProjects', () => {
    const validCsvData = `code,name,clientCode,type,status,startDate
PROJ-001,Customer Portal,ACME,BILLABLE,ACTIVE,2024-01-01`;

    const mockClients = [
      { id: 'client-1', code: 'ACME' },
    ];

    it('should import projects successfully', async () => {
      // Arrange
      vi.mocked(prisma.client.findMany).mockResolvedValue(mockClients as any);
      vi.mocked(prisma.project.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.project.create).mockResolvedValue({ id: 'new-project' } as any);

      // Act
      const result = await importService.importProjects(
        'tenant-123',
        validCsvData,
        'user-123'
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.importedRows).toBe(1);
    });

    it('should report error for missing required fields', async () => {
      // Arrange
      const invalidCsvData = `code,name
,`;

      vi.mocked(prisma.client.findMany).mockResolvedValue(mockClients as any);

      // Act
      const result = await importService.importProjects(
        'tenant-123',
        invalidCsvData,
        'user-123'
      );

      // Assert
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Missing required fields');
    });
  });

  describe('getImportTemplate', () => {
    it('should return resources template', () => {
      const template = importService.getImportTemplate('resources');
      expect(template).toContain('employeeId');
      expect(template).toContain('firstName');
      expect(template).toContain('lastName');
      expect(template).toContain('email');
    });

    it('should return allocations template', () => {
      const template = importService.getImportTemplate('allocations');
      expect(template).toContain('resourceEmployeeId');
      expect(template).toContain('projectCode');
      expect(template).toContain('startDate');
      expect(template).toContain('endDate');
    });

    it('should return projects template', () => {
      const template = importService.getImportTemplate('projects');
      expect(template).toContain('code');
      expect(template).toContain('name');
    });

    it('should return empty string for unknown type', () => {
      const template = importService.getImportTemplate('unknown' as any);
      expect(template).toBe('');
    });
  });
});

