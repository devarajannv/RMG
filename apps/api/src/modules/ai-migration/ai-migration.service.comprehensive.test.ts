/**
 * AI Migration Service - Comprehensive Tests
 * Tests file analysis, entity mapping, and data import functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiMigrationService } from './ai-migration.service';

// Mock dependencies
vi.mock('../../lib/prisma', () => ({
  default: {
    importJob: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    importMapping: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    importRecord: {
      create: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    resource: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    practice: {
      findFirst: vi.fn(),
    },
    location: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn().mockImplementation(cb => cb()),
  },
}));

import prisma from '../../lib/prisma';

describe('AI Migration Service - Comprehensive Tests', () => {
  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createImportJob', () => {
    it('AIMIG-001: should create a new import job', async () => {
      const mockJob = {
        id: 'job-1',
        tenantId: mockTenantId,
        userId: mockUserId,
        name: 'Resource Import',
        status: 'PENDING_ANALYSIS',
        sourceFileName: 'resources.csv',
      };

      vi.mocked(prisma.importJob.create).mockResolvedValue(mockJob as never);

      const result = await aiMigrationService.createImportJob(mockTenantId, mockUserId, {
        name: 'Resource Import',
        sourceFileName: 'resources.csv',
        sourceFileType: 'CSV',
        sourceFileSize: 1024,
        sourceFilePath: '/uploads/resources.csv',
        importPurpose: 'MIGRATION',
      });

      expect(result.id).toBe('job-1');
      expect(result.status).toBe('PENDING_ANALYSIS');
    });

    it('AIMIG-002: should set initial status to PENDING_ANALYSIS', async () => {
      vi.mocked(prisma.importJob.create).mockResolvedValue({ status: 'PENDING_ANALYSIS' } as never);

      await aiMigrationService.createImportJob(mockTenantId, mockUserId, {
        name: 'Test Import',
        sourceFileName: 'test.csv',
        sourceFileType: 'CSV',
        sourceFileSize: 512,
        sourceFilePath: '/uploads/test.csv',
        importPurpose: 'SYNC',
      });

      expect(prisma.importJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PENDING_ANALYSIS',
          }),
        })
      );
    });

    it('AIMIG-003: should store import purpose', async () => {
      vi.mocked(prisma.importJob.create).mockResolvedValue({} as never);

      await aiMigrationService.createImportJob(mockTenantId, mockUserId, {
        name: 'Manual Import',
        sourceFileName: 'data.xlsx',
        sourceFileType: 'XLSX',
        sourceFileSize: 2048,
        sourceFilePath: '/uploads/data.xlsx',
        importPurpose: 'MANUAL',
      });

      expect(prisma.importJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            importPurpose: 'MANUAL',
          }),
        })
      );
    });
  });

  describe('getImportJob', () => {
    it('AIMIG-004: should return import job with mappings', async () => {
      const mockJob = {
        id: 'job-1',
        name: 'Resource Import',
        mappings: [
          { sourceColumn: 'Name', targetField: 'firstName' },
        ],
        records: [],
      };

      vi.mocked(prisma.importJob.findFirst).mockResolvedValue(mockJob as never);

      const result = await aiMigrationService.getImportJob(mockTenantId, 'job-1');

      expect(result?.mappings).toHaveLength(1);
    });

    it('AIMIG-005: should return null for non-existent job', async () => {
      vi.mocked(prisma.importJob.findFirst).mockResolvedValue(null);

      const result = await aiMigrationService.getImportJob(mockTenantId, 'non-existent');

      expect(result).toBeNull();
    });

    it('AIMIG-006: should filter by tenant for security', async () => {
      vi.mocked(prisma.importJob.findFirst).mockResolvedValue(null);

      await aiMigrationService.getImportJob(mockTenantId, 'job-1');

      expect(prisma.importJob.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenantId,
          }),
        })
      );
    });
  });

  describe('listImportJobs', () => {
    it('AIMIG-007: should return paginated list of jobs', async () => {
      const mockJobs = [
        { id: 'job-1', name: 'Import 1' },
        { id: 'job-2', name: 'Import 2' },
      ];

      vi.mocked(prisma.importJob.findMany).mockResolvedValue(mockJobs as never);
      vi.mocked(prisma.importJob.count).mockResolvedValue(2);

      const result = await aiMigrationService.listImportJobs(mockTenantId, {
        limit: 10,
        offset: 0,
      });

      expect(result.jobs).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('AIMIG-008: should filter by status', async () => {
      vi.mocked(prisma.importJob.findMany).mockResolvedValue([]);
      vi.mocked(prisma.importJob.count).mockResolvedValue(0);

      await aiMigrationService.listImportJobs(mockTenantId, {
        status: 'COMPLETED',
      });

      expect(prisma.importJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'COMPLETED',
          }),
        })
      );
    });

    it('AIMIG-009: should order by creation date descending', async () => {
      vi.mocked(prisma.importJob.findMany).mockResolvedValue([]);
      vi.mocked(prisma.importJob.count).mockResolvedValue(0);

      await aiMigrationService.listImportJobs(mockTenantId, {});

      expect(prisma.importJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });
  });

  describe('analyzeFile', () => {
    const mockCSVContent = `Employee ID,First Name,Last Name,Email,Designation
EMP001,John,Doe,john@test.com,Senior Developer
EMP002,Jane,Smith,jane@test.com,Manager`;

    it('AIMIG-010: should analyze CSV file', async () => {
      vi.mocked(prisma.importJob.findFirst)
        .mockResolvedValueOnce({
          id: 'job-1',
          sourceFileType: 'CSV',
        } as never)
        .mockResolvedValueOnce(null); // No existing fingerprint

      vi.mocked(prisma.importJob.update).mockResolvedValue({} as never);
      vi.mocked(prisma.importMapping.create).mockResolvedValue({} as never);

      const result = await aiMigrationService.analyzeFile(
        mockTenantId,
        'job-1',
        mockCSVContent
      );

      expect(result.fileType).toBe('CSV');
      expect(result.totalRows).toBe(2);
      expect(result.columns).toContain('Employee ID');
    });

    it('AIMIG-011: should detect column patterns', async () => {
      vi.mocked(prisma.importJob.findFirst)
        .mockResolvedValueOnce({
          id: 'job-1',
          sourceFileType: 'CSV',
        } as never)
        .mockResolvedValueOnce(null);

      vi.mocked(prisma.importJob.update).mockResolvedValue({} as never);
      vi.mocked(prisma.importMapping.create).mockResolvedValue({} as never);

      const result = await aiMigrationService.analyzeFile(
        mockTenantId,
        'job-1',
        mockCSVContent
      );

      // Should detect common fields
      expect(result.suggestedMappings.length).toBeGreaterThan(0);
      
      const emailMapping = result.suggestedMappings.find(m => m.sourceColumn === 'Email');
      if (emailMapping) {
        expect(emailMapping.targetField).toBe('email');
      }
    });

    it('AIMIG-012: should throw error for non-existent job', async () => {
      vi.mocked(prisma.importJob.findFirst).mockResolvedValue(null);

      await expect(aiMigrationService.analyzeFile(mockTenantId, 'invalid', 'data'))
        .rejects.toThrow('Import job not found');
    });

    it('AIMIG-013: should generate source fingerprint', async () => {
      vi.mocked(prisma.importJob.findFirst)
        .mockResolvedValueOnce({
          id: 'job-1',
          sourceFileType: 'CSV',
        } as never)
        .mockResolvedValueOnce(null);

      vi.mocked(prisma.importJob.update).mockResolvedValue({} as never);
      vi.mocked(prisma.importMapping.create).mockResolvedValue({} as never);

      const result = await aiMigrationService.analyzeFile(
        mockTenantId,
        'job-1',
        mockCSVContent
      );

      expect(result.sourceFingerprint).toBeTruthy();
      expect(typeof result.sourceFingerprint).toBe('string');
    });

    it('AIMIG-014: should reuse existing mappings if fingerprint matches', async () => {
      const existingMappings = [
        {
          sourceColumn: 'Employee ID',
          targetEntity: 'resource',
          targetField: 'employeeId',
          confidence: 0.95,
        },
      ];

      vi.mocked(prisma.importJob.findFirst)
        .mockResolvedValueOnce({
          id: 'job-1',
          sourceFileType: 'CSV',
        } as never)
        .mockResolvedValueOnce({
          id: 'prev-job',
          mappings: existingMappings,
          autonomyLevel: 2,
        } as never);

      vi.mocked(prisma.importJob.update).mockResolvedValue({} as never);
      vi.mocked(prisma.importMapping.create).mockResolvedValue({} as never);

      const result = await aiMigrationService.analyzeFile(
        mockTenantId,
        'job-1',
        mockCSVContent
      );

      expect(result.suggestedMappings[0].reasoning).toContain('Reused');
    });

    it('AIMIG-015: should detect entities in data', async () => {
      vi.mocked(prisma.importJob.findFirst)
        .mockResolvedValueOnce({
          id: 'job-1',
          sourceFileType: 'CSV',
        } as never)
        .mockResolvedValueOnce(null);

      vi.mocked(prisma.importJob.update).mockResolvedValue({} as never);
      vi.mocked(prisma.importMapping.create).mockResolvedValue({} as never);

      const result = await aiMigrationService.analyzeFile(
        mockTenantId,
        'job-1',
        mockCSVContent
      );

      expect(result.detectedEntities.length).toBeGreaterThan(0);
      expect(result.detectedEntities[0]).toHaveProperty('entity');
      expect(result.detectedEntities[0]).toHaveProperty('confidence');
    });

    it('AIMIG-016: should update job status to ANALYZING during analysis', async () => {
      vi.mocked(prisma.importJob.findFirst)
        .mockResolvedValueOnce({
          id: 'job-1',
          sourceFileType: 'CSV',
        } as never)
        .mockResolvedValueOnce(null);

      vi.mocked(prisma.importJob.update).mockResolvedValue({} as never);
      vi.mocked(prisma.importMapping.create).mockResolvedValue({} as never);

      await aiMigrationService.analyzeFile(mockTenantId, 'job-1', mockCSVContent);

      // First update should set status to ANALYZING
      expect(vi.mocked(prisma.importJob.update).mock.calls[0][0]).toMatchObject({
        data: expect.objectContaining({
          status: 'ANALYZING',
        }),
      });
    });

    it('AIMIG-017: should update job status to PENDING_APPROVAL after analysis', async () => {
      vi.mocked(prisma.importJob.findFirst)
        .mockResolvedValueOnce({
          id: 'job-1',
          sourceFileType: 'CSV',
        } as never)
        .mockResolvedValueOnce(null);

      vi.mocked(prisma.importJob.update).mockResolvedValue({} as never);
      vi.mocked(prisma.importMapping.create).mockResolvedValue({} as never);

      await aiMigrationService.analyzeFile(mockTenantId, 'job-1', mockCSVContent);

      // Second update should set status to PENDING_APPROVAL
      const updateCalls = vi.mocked(prisma.importJob.update).mock.calls;
      expect(updateCalls[1][0]).toMatchObject({
        data: expect.objectContaining({
          status: 'PENDING_APPROVAL',
        }),
      });
    });
  });

  describe('parseCSV', () => {
    it('AIMIG-018: should parse CSV content correctly', () => {
      const csv = `Name,Email
John,john@test.com
Jane,jane@test.com`;

      const result = aiMigrationService.parseCSV(csv);

      expect(result.columns).toEqual(['Name', 'Email']);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].Name).toBe('John');
    });

    it('AIMIG-019: should handle quoted values', () => {
      const csv = `Name,Description
"John Doe","Has, comma"
"Jane ""Smith""",Regular`;

      const result = aiMigrationService.parseCSV(csv);

      expect(result.rows[0].Name).toBe('John Doe');
      expect(result.rows[0].Description).toBe('Has, comma');
      expect(result.rows[1].Name).toBe('Jane "Smith"');
    });

    it('AIMIG-020: should handle empty CSV', () => {
      const csv = '';

      const result = aiMigrationService.parseCSV(csv);

      expect(result.columns).toEqual([]);
      expect(result.rows).toEqual([]);
    });

    it('AIMIG-021: should trim whitespace from values', () => {
      const csv = `Name ,  Email  
 John , john@test.com `;

      const result = aiMigrationService.parseCSV(csv);

      expect(result.columns).toEqual(['Name', 'Email']);
      expect(result.rows[0].Name).toBe('John');
      expect(result.rows[0].Email).toBe('john@test.com');
    });
  });

  describe('parseJSON', () => {
    it('AIMIG-022: should parse JSON array', () => {
      const json = JSON.stringify([
        { name: 'John', email: 'john@test.com' },
        { name: 'Jane', email: 'jane@test.com' },
      ]);

      const result = aiMigrationService.parseJSON(json);

      expect(result.columns).toContain('name');
      expect(result.columns).toContain('email');
      expect(result.rows).toHaveLength(2);
    });

    it('AIMIG-023: should handle nested objects', () => {
      const json = JSON.stringify([
        { name: 'John', contact: { email: 'john@test.com', phone: '123' } },
      ]);

      const result = aiMigrationService.parseJSON(json);

      // Should flatten nested objects
      expect(result.columns.length).toBeGreaterThan(0);
    });
  });

  describe('detectEntities', () => {
    it('AIMIG-024: should detect resource entity', () => {
      const columns = ['Employee ID', 'First Name', 'Last Name', 'Email'];
      const rows = [{ 'Employee ID': 'E001', 'First Name': 'John', 'Last Name': 'Doe', 'Email': 'john@test.com' }];

      const result = aiMigrationService.detectEntities(columns, rows);

      expect(result.some(e => e.entity === 'resource')).toBe(true);
    });

    it('AIMIG-025: should return confidence scores', () => {
      const columns = ['Project Code', 'Project Name', 'Client'];
      const rows = [{ 'Project Code': 'P001', 'Project Name': 'Alpha', 'Client': 'ACME' }];

      const result = aiMigrationService.detectEntities(columns, rows);

      expect(result[0].confidence).toBeGreaterThanOrEqual(0);
      expect(result[0].confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('generateFingerprint', () => {
    it('AIMIG-026: should generate consistent fingerprint for same columns', () => {
      const columns1 = ['Name', 'Email', 'Phone'];
      const columns2 = ['Name', 'Email', 'Phone'];

      const fp1 = aiMigrationService.generateFingerprint(columns1);
      const fp2 = aiMigrationService.generateFingerprint(columns2);

      expect(fp1).toBe(fp2);
    });

    it('AIMIG-027: should generate different fingerprint for different columns', () => {
      const columns1 = ['Name', 'Email'];
      const columns2 = ['Name', 'Phone'];

      const fp1 = aiMigrationService.generateFingerprint(columns1);
      const fp2 = aiMigrationService.generateFingerprint(columns2);

      expect(fp1).not.toBe(fp2);
    });
  });
});
