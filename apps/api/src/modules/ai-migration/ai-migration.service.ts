import prisma from '../../lib/prisma';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import * as XLSX from 'xlsx';

// ============================================================================
// Types
// ============================================================================

export interface FileAnalysisResult {
  fileType: 'CSV' | 'XLSX' | 'JSON' | 'PDF' | 'IMAGE';
  totalRows: number;
  columns: string[];
  sampleData: Record<string, string>[];
  detectedEntities: {
    entity: string;
    confidence: number;
    matchedColumns: string[];
  }[];
  suggestedMappings: {
    sourceColumn: string;
    targetEntity: string;
    targetField: string;
    confidence: number;
    reasoning: string;
    sampleValues: string[];
  }[];
  dependencyOrder: string[];
  missingReferences: {
    entity: string;
    field: string;
    values: string[];
    count: number;
  }[];
  sourceFingerprint: string;
}

export interface ImportJobCreateInput {
  name: string;
  description?: string;
  sourceFileName: string;
  sourceFileType: string;
  sourceFileSize: number;
  sourceFilePath: string;
  importPurpose: 'MIGRATION' | 'SYNC' | 'MANUAL';
}

export interface ImportExecutionResult {
  totalRecords: number;
  importedRecords: number;
  skippedRecords: number;
  errorRecords: number;
  autoCreatedRefs: Record<string, string[]>;
  errors: Array<{ row: number; field?: string; message: string }>;
}

// ============================================================================
// Entity Definitions (for AI mapping)
// ============================================================================

const ENTITY_DEFINITIONS = {
  resource: {
    requiredFields: ['employeeId', 'firstName', 'lastName', 'email'],
    optionalFields: ['designation', 'band', 'practiceId', 'locationId', 'phone', 'joinDate', 'employmentType', 'capacity', 'costPerHour', 'billRateDefault', 'status', 'department'],
    identifierFields: ['employeeId', 'email'],
    referenceFields: {
      practiceId: 'practice',
      locationId: 'location',
      managerId: 'resource',
    },
  },
  project: {
    requiredFields: ['code', 'name'],
    optionalFields: ['clientId', 'contractId', 'type', 'status', 'startDate', 'endDate', 'budgetHours', 'description', 'managerId', 'practiceId'],
    identifierFields: ['code'],
    referenceFields: {
      clientId: 'client',
      contractId: 'contract',
      managerId: 'resource',
      practiceId: 'practice',
    },
  },
  allocation: {
    requiredFields: ['resourceId', 'projectId', 'startDate', 'endDate', 'percentage'],
    optionalFields: ['role', 'status', 'isBillable', 'billRate'],
    identifierFields: [],
    referenceFields: {
      resourceId: 'resource',
      projectId: 'project',
    },
  },
  client: {
    requiredFields: ['code', 'name'],
    optionalFields: ['industry', 'website', 'status', 'tier', 'contacts', 'notes'],
    identifierFields: ['code'],
    referenceFields: {},
  },
  contract: {
    requiredFields: ['contractNumber', 'name', 'clientId', 'type', 'startDate'],
    optionalFields: ['endDate', 'value', 'currency', 'billingType', 'status', 'description'],
    identifierFields: ['contractNumber'],
    referenceFields: {
      clientId: 'client',
      accountMgrId: 'resource',
    },
  },
  skill: {
    requiredFields: ['name'],
    optionalFields: ['categoryId', 'description', 'isVerifiable'],
    identifierFields: ['name'],
    referenceFields: {
      categoryId: 'skillCategory',
    },
  },
  practice: {
    requiredFields: ['code', 'name'],
    optionalFields: ['description', 'headId', 'parentId', 'targetUtilization', 'costCenter'],
    identifierFields: ['code'],
    referenceFields: {
      headId: 'resource',
      parentId: 'practice',
    },
  },
  location: {
    requiredFields: ['code', 'name', 'type', 'timezone', 'country'],
    optionalFields: ['address', 'isOnshore'],
    identifierFields: ['code'],
    referenceFields: {},
  },
};

// Column name patterns for AI inference
const COLUMN_PATTERNS: Record<string, RegExp[]> = {
  employeeId: [/emp.*(id|code|no)/i, /employee.*(id|code|no)/i, /staff.*(id|code)/i, /^id$/i],
  firstName: [/first.*name/i, /fname/i, /given.*name/i, /^first$/i],
  lastName: [/last.*name/i, /lname/i, /sur.*name/i, /family.*name/i, /^last$/i],
  email: [/e.?mail/i, /email.*address/i],
  designation: [/designation/i, /title/i, /job.*title/i, /position/i, /role/i],
  band: [/band/i, /grade/i, /level/i],
  department: [/department/i, /dept/i, /division/i, /unit/i],
  phone: [/phone/i, /mobile/i, /contact.*no/i, /tel/i],
  joinDate: [/join.*date/i, /doj/i, /date.*join/i, /start.*date/i, /hire.*date/i],
  status: [/status/i, /state/i, /active/i],
  employmentType: [/employ.*type/i, /emp.*type/i, /type/i, /fte|contractor/i],
  practiceCode: [/practice/i, /bu/i, /business.*unit/i],
  locationCode: [/location/i, /office/i, /city/i, /site/i],
  projectCode: [/project.*code/i, /proj.*id/i, /project.*id/i],
  projectName: [/project.*name/i, /proj.*name/i],
  clientCode: [/client.*code/i, /client.*id/i, /customer.*code/i],
  clientName: [/client.*name/i, /customer.*name/i, /account.*name/i],
  percentage: [/percent/i, /allocation/i, /%/i, /utilization/i],
  startDate: [/start.*date/i, /from.*date/i, /begin/i],
  endDate: [/end.*date/i, /to.*date/i, /finish/i],
  costPerHour: [/cost.*hour/i, /hourly.*cost/i, /ctc/i, /salary/i, /rate/i],
  billRateDefault: [/bill.*rate/i, /billing.*rate/i, /charge.*rate/i],
  skills: [/skill/i, /competenc/i, /technolog/i, /expertise/i],
  name: [/^name$/i, /full.*name/i],
  code: [/^code$/i, /^id$/i],
  description: [/desc/i, /notes/i, /comments/i],
  value: [/value/i, /amount/i, /worth/i],
  industry: [/industry/i, /sector/i, /vertical/i],
};

// ============================================================================
// AI Migration Service
// ============================================================================

export const aiMigrationService = {
  // Create a new import job
  async createImportJob(
    tenantId: string,
    userId: string,
    input: ImportJobCreateInput
  ) {
    return prisma.importJob.create({
      data: {
        tenantId,
        userId,
        name: input.name,
        description: input.description,
        sourceFileName: input.sourceFileName,
        sourceFileType: input.sourceFileType,
        sourceFileSize: input.sourceFileSize,
        sourceFilePath: input.sourceFilePath,
        importPurpose: input.importPurpose,
        status: 'PENDING_ANALYSIS',
      },
    });
  },

  // Get import job by ID
  async getImportJob(tenantId: string, jobId: string) {
    return prisma.importJob.findFirst({
      where: { id: jobId, tenantId },
      include: {
        mappings: true,
        records: {
          take: 100,
          orderBy: { rowNumber: 'asc' },
        },
      },
    });
  },

  // List import jobs
  async listImportJobs(tenantId: string, filters?: {
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = { tenantId };
    if (filters?.status) {
      where.status = filters.status;
    }

    const [jobs, total] = await Promise.all([
      prisma.importJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters?.limit || 20,
        skip: filters?.offset || 0,
      }),
      prisma.importJob.count({ where }),
    ]);

    return { jobs, total };
  },

  // Analyze uploaded file using AI
  async analyzeFile(
    tenantId: string,
    jobId: string,
    fileContent: string | Buffer
  ): Promise<FileAnalysisResult> {
    const job = await prisma.importJob.findFirst({
      where: { id: jobId, tenantId },
    });

    if (!job) {
      throw new Error('Import job not found');
    }

    // Update status
    await prisma.importJob.update({
      where: { id: jobId },
      data: { status: 'ANALYZING', analysisStarted: new Date() },
    });

    try {
      // Parse file based on type
      const { columns, rows } = this.parseFile(fileContent, job.sourceFileType);
      
      // Generate source fingerprint
      const fingerprint = this.generateFingerprint(columns);
      
      // Check for existing mappings with same fingerprint
      const existingJob = await prisma.importJob.findFirst({
        where: {
          tenantId,
          sourceFingerprint: fingerprint,
          status: { in: ['COMPLETED', 'COMPLETED_WITH_ERRORS'] },
        },
        include: { mappings: true },
        orderBy: { createdAt: 'desc' },
      });

      // Detect entities in the data
      const detectedEntities = this.detectEntities(columns, rows);
      
      // Generate field mappings (use existing if available)
      let suggestedMappings;
      if (existingJob?.mappings.length) {
        // Reuse learned mappings
        suggestedMappings = existingJob.mappings.map(m => ({
          sourceColumn: m.sourceColumn,
          targetEntity: m.targetEntity,
          targetField: m.targetField,
          confidence: Number(m.confidence),
          reasoning: 'Reused from previous successful import',
          sampleValues: [],
        }));
      } else {
        suggestedMappings = await this.generateMappings(columns, rows, detectedEntities);
      }

      // Determine dependency order
      const dependencyOrder = this.calculateDependencyOrder(detectedEntities.map(e => e.entity));
      
      // Find missing references
      const missingReferences = await this.findMissingReferences(
        tenantId,
        rows,
        suggestedMappings
      );

      // Calculate autonomy level based on history
      const autonomyLevel = existingJob ? Math.min(existingJob.autonomyLevel + 1, 3) : 1;

      // Save analysis results
      const result: FileAnalysisResult = {
        fileType: job.sourceFileType as any,
        totalRows: rows.length,
        columns,
        sampleData: rows.slice(0, 5),
        detectedEntities,
        suggestedMappings,
        dependencyOrder,
        missingReferences,
        sourceFingerprint: fingerprint,
      };

      // Update job with analysis
      await prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: 'PENDING_APPROVAL',
          analysisCompleted: new Date(),
          detectedEntities: detectedEntities,
          fieldMappings: suggestedMappings,
          dependencyOrder: dependencyOrder,
          referencesToCreate: missingReferences,
          sourceFingerprint: fingerprint,
          autonomyLevel,
          totalRecords: rows.length,
        },
      });

      // Save mappings
      for (const mapping of suggestedMappings) {
        await prisma.importMapping.create({
          data: {
            importJobId: jobId,
            sourceColumn: mapping.sourceColumn,
            targetEntity: mapping.targetEntity,
            targetField: mapping.targetField,
            confidence: mapping.confidence,
            aiReasoning: mapping.reasoning,
            sourceSampleValues: mapping.sampleValues,
          },
        });
      }

      return result;
    } catch (error) {
      await prisma.importJob.update({
        where: { id: jobId },
        data: { status: 'FAILED' },
      });
      throw error;
    }
  },

  // Parse file content based on type
  parseFile(content: string | Buffer, fileType: string): { columns: string[]; rows: Record<string, string>[] } {
    switch (fileType.toUpperCase()) {
      case 'CSV':
        return this.parseCSV(content.toString());
      case 'XLSX':
      case 'XLS':
        return this.parseExcel(content as Buffer);
      case 'JSON':
        return this.parseJSON(content.toString());
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  },

  parseCSV(content: string): { columns: string[]; rows: Record<string, string>[] } {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 1) return { columns: [], rows: [] };

    const columns = this.parseCSVLine(lines[0]);
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === columns.length) {
        const row: Record<string, string> = {};
        columns.forEach((col, idx) => {
          row[col.trim()] = values[idx]?.trim() ?? '';
        });
        rows.push(row);
      }
    }

    return { columns: columns.map(c => c.trim()), rows };
  },

  parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  },

  parseExcel(buffer: Buffer): { columns: string[]; rows: Record<string, string>[] } {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];

    if (jsonData.length < 1) return { columns: [], rows: [] };

    const columns = jsonData[0].map(c => String(c || '').trim());
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < jsonData.length; i++) {
      const rowData = jsonData[i];
      if (rowData && rowData.some(cell => cell !== null && cell !== undefined && cell !== '')) {
        const row: Record<string, string> = {};
        columns.forEach((col, idx) => {
          row[col] = String(rowData[idx] ?? '').trim();
        });
        rows.push(row);
      }
    }

    return { columns, rows };
  },

  parseJSON(content: string): { columns: string[]; rows: Record<string, string>[] } {
    const data = JSON.parse(content);
    const rows = Array.isArray(data) ? data : [data];
    
    if (rows.length === 0) return { columns: [], rows: [] };
    
    const columns = [...new Set(rows.flatMap(row => Object.keys(row)))];
    const normalizedRows = rows.map(row => {
      const normalized: Record<string, string> = {};
      columns.forEach(col => {
        normalized[col] = String(row[col] ?? '');
      });
      return normalized;
    });

    return { columns, rows: normalizedRows };
  },

  // Generate fingerprint from column structure
  generateFingerprint(columns: string[]): string {
    const normalized = columns.map(c => c.toLowerCase().replace(/[^a-z0-9]/g, '')).sort().join('|');
    return createHash('sha256').update(normalized).digest('hex').substring(0, 16);
  },

  // Detect which entities are present in the data
  detectEntities(columns: string[], _rows: Record<string, string>[]): { entity: string; confidence: number; matchedColumns: string[] }[] {
    const results: { entity: string; confidence: number; matchedColumns: string[] }[] = [];

    for (const [entityName, entityDef] of Object.entries(ENTITY_DEFINITIONS)) {
      const matchedRequired: string[] = [];
      const matchedOptional: string[] = [];

      for (const col of columns) {
        const normalizedCol = col.toLowerCase();
        
        // Check required fields
        for (const field of entityDef.requiredFields) {
          if (this.columnMatchesField(normalizedCol, field)) {
            matchedRequired.push(col);
          }
        }
        
        // Check optional fields
        for (const field of entityDef.optionalFields) {
          if (this.columnMatchesField(normalizedCol, field)) {
            matchedOptional.push(col);
          }
        }
      }

      const requiredMatch = matchedRequired.length / entityDef.requiredFields.length;
      const optionalMatch = matchedOptional.length / (entityDef.optionalFields.length || 1);
      
      // Calculate confidence based on matched fields
      const confidence = (requiredMatch * 0.7) + (optionalMatch * 0.3);
      
      if (confidence > 0.3) {
        results.push({
          entity: entityName,
          confidence,
          matchedColumns: [...new Set([...matchedRequired, ...matchedOptional])],
        });
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  },

  // Check if a column name matches a field
  columnMatchesField(column: string, field: string): boolean {
    // Direct match
    if (column === field.toLowerCase()) return true;
    
    // Pattern match
    const patterns = COLUMN_PATTERNS[field];
    if (patterns) {
      return patterns.some(pattern => pattern.test(column));
    }
    
    // Fuzzy match
    return column.includes(field.toLowerCase()) || field.toLowerCase().includes(column);
  },

  // Generate field mappings using AI-like inference
  async generateMappings(
    columns: string[],
    rows: Record<string, string>[],
    detectedEntities: { entity: string; confidence: number; matchedColumns: string[] }[]
  ) {
    const mappings: {
      sourceColumn: string;
      targetEntity: string;
      targetField: string;
      confidence: number;
      reasoning: string;
      sampleValues: string[];
    }[] = [];

    const primaryEntity = detectedEntities[0]?.entity || 'resource';

    for (const column of columns) {
      const sampleValues = rows.slice(0, 5).map(r => r[column]).filter(Boolean);
      let bestMatch = this.inferFieldMapping(column, sampleValues, primaryEntity);
      
      if (bestMatch) {
        mappings.push({
          sourceColumn: column,
          targetEntity: bestMatch.entity,
          targetField: bestMatch.field,
          confidence: bestMatch.confidence,
          reasoning: bestMatch.reasoning,
          sampleValues,
        });
      }
    }

    return mappings;
  },

  // Infer the best field mapping for a column
  inferFieldMapping(column: string, sampleValues: string[], defaultEntity: string): {
    entity: string;
    field: string;
    confidence: number;
    reasoning: string;
  } | null {
    const normalizedCol = column.toLowerCase();
    
    // Check against known patterns
    for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(normalizedCol)) {
          // Determine which entity this field belongs to
          const entity = this.findEntityForField(field) || defaultEntity;
          return {
            entity,
            field,
            confidence: 0.85,
            reasoning: `Column name "${column}" matches pattern for ${field}`,
          };
        }
      }
    }

    // Infer from data patterns
    const dataInference = this.inferFromData(sampleValues);
    if (dataInference) {
      return {
        entity: defaultEntity,
        field: dataInference.field,
        confidence: dataInference.confidence,
        reasoning: dataInference.reasoning,
      };
    }

    // Low confidence fallback - use column name as-is
    const entityDef = ENTITY_DEFINITIONS[defaultEntity as keyof typeof ENTITY_DEFINITIONS];
    const allFields = [...(entityDef?.requiredFields || []), ...(entityDef?.optionalFields || [])];
    const directMatch = allFields.find(f => f.toLowerCase() === normalizedCol);
    
    if (directMatch) {
      return {
        entity: defaultEntity,
        field: directMatch,
        confidence: 0.9,
        reasoning: `Direct field name match`,
      };
    }

    return null;
  },

  // Find which entity a field belongs to
  findEntityForField(field: string): string | null {
    for (const [entity, def] of Object.entries(ENTITY_DEFINITIONS)) {
      if ([...def.requiredFields, ...def.optionalFields].includes(field)) {
        return entity;
      }
    }
    return null;
  },

  // Infer field type from sample data
  inferFromData(samples: string[]): { field: string; confidence: number; reasoning: string } | null {
    if (samples.length === 0) return null;

    // Email pattern
    if (samples.every(s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))) {
      return { field: 'email', confidence: 0.95, reasoning: 'Data matches email pattern' };
    }

    // Date pattern
    if (samples.every(s => !isNaN(Date.parse(s)))) {
      return { field: 'joinDate', confidence: 0.6, reasoning: 'Data appears to be dates' };
    }

    // Percentage/number pattern
    if (samples.every(s => !isNaN(parseFloat(s)))) {
      const values = samples.map(s => parseFloat(s));
      if (values.every(v => v >= 0 && v <= 100)) {
        return { field: 'percentage', confidence: 0.5, reasoning: 'Data appears to be percentages (0-100)' };
      }
    }

    return null;
  },

  // Calculate entity dependency order
  calculateDependencyOrder(entities: string[]): string[] {
    const dependencyGraph: Record<string, string[]> = {
      skillCategory: [],
      location: [],
      practice: ['location'],
      skill: ['skillCategory'],
      client: [],
      contract: ['client'],
      resource: ['practice', 'location'],
      project: ['client', 'contract', 'practice'],
      allocation: ['resource', 'project'],
    };

    // Topological sort
    const sorted: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (entity: string) => {
      if (visited.has(entity)) return;
      if (visiting.has(entity)) throw new Error('Circular dependency detected');
      
      visiting.add(entity);
      const deps = dependencyGraph[entity] || [];
      for (const dep of deps) {
        if (entities.includes(dep)) {
          visit(dep);
        }
      }
      visiting.delete(entity);
      visited.add(entity);
      sorted.push(entity);
    };

    for (const entity of entities) {
      visit(entity);
    }

    return sorted;
  },

  // Find references that need to be created
  async findMissingReferences(
    tenantId: string,
    rows: Record<string, string>[],
    mappings: { sourceColumn: string; targetEntity: string; targetField: string }[]
  ) {
    const missing: { entity: string; field: string; values: string[]; count: number }[] = [];

    // Get reference mappings
    const refMappings = mappings.filter(m => {
      const entityDef = ENTITY_DEFINITIONS[m.targetEntity as keyof typeof ENTITY_DEFINITIONS];
      return entityDef?.referenceFields?.[m.targetField as keyof typeof entityDef.referenceFields];
    });

    for (const refMapping of refMappings) {
      const entityDef = ENTITY_DEFINITIONS[refMapping.targetEntity as keyof typeof ENTITY_DEFINITIONS];
      const refEntity = entityDef?.referenceFields?.[refMapping.targetField as keyof typeof entityDef.referenceFields];
      
      if (!refEntity) continue;

      // Get unique values from data
      const values = [...new Set(rows.map(r => r[refMapping.sourceColumn]).filter(Boolean))];
      
      // Check which exist in database
      const existingValues = await this.getExistingReferenceValues(tenantId, refEntity as string, values);
      const missingValues = values.filter(v => !existingValues.includes(v.toLowerCase()));

      if (missingValues.length > 0) {
        missing.push({
          entity: refEntity as string,
          field: refMapping.targetField,
          values: missingValues,
          count: missingValues.length,
        });
      }
    }

    return missing;
  },

  // Get existing reference values from database
  async getExistingReferenceValues(tenantId: string, entity: string, values: string[]): Promise<string[]> {
    const normalizedValues = values.map(v => v.toLowerCase());
    
    switch (entity) {
      case 'practice': {
        const practices = await prisma.practice.findMany({
          where: { tenantId, OR: [
            { code: { in: normalizedValues, mode: 'insensitive' } },
            { name: { in: normalizedValues, mode: 'insensitive' } },
          ]},
          select: { code: true, name: true },
        });
        return [...practices.map(p => p.code.toLowerCase()), ...practices.map(p => p.name.toLowerCase())];
      }
      case 'location': {
        const locations = await prisma.location.findMany({
          where: { tenantId, OR: [
            { code: { in: normalizedValues, mode: 'insensitive' } },
            { name: { in: normalizedValues, mode: 'insensitive' } },
          ]},
          select: { code: true, name: true },
        });
        return [...locations.map(l => l.code.toLowerCase()), ...locations.map(l => l.name.toLowerCase())];
      }
      case 'client': {
        const clients = await prisma.client.findMany({
          where: { tenantId, OR: [
            { code: { in: normalizedValues, mode: 'insensitive' } },
            { name: { in: normalizedValues, mode: 'insensitive' } },
          ]},
          select: { code: true, name: true },
        });
        return [...clients.map(c => c.code.toLowerCase()), ...clients.map(c => c.name.toLowerCase())];
      }
      default:
        return [];
    }
  },

  // Approve mappings and references
  async approveImport(
    tenantId: string,
    jobId: string,
    approvals: {
      mappingOverrides?: Record<string, { targetEntity: string; targetField: string }>;
      createReferences?: boolean;
    }
  ) {
    const job = await prisma.importJob.findFirst({
      where: { id: jobId, tenantId },
      include: { mappings: true },
    });

    if (!job) throw new Error('Import job not found');
    if (job.status !== 'PENDING_APPROVAL') throw new Error('Job is not pending approval');

    // Apply mapping overrides
    if (approvals.mappingOverrides) {
      for (const [sourceColumn, override] of Object.entries(approvals.mappingOverrides)) {
        await prisma.importMapping.updateMany({
          where: { importJobId: jobId, sourceColumn },
          data: {
            targetEntity: override.targetEntity,
            targetField: override.targetField,
            userOverridden: true,
            userApproved: true,
          },
        });
      }
    }

    // Mark all mappings as approved
    await prisma.importMapping.updateMany({
      where: { importJobId: jobId },
      data: { userApproved: true },
    });

    // Update job status
    await prisma.importJob.update({
      where: { id: jobId },
      data: { status: 'APPROVED' },
    });

    return this.getImportJob(tenantId, jobId);
  },

  // Execute the import
  async executeImport(
    tenantId: string,
    jobId: string,
    fileContent: string | Buffer
  ): Promise<ImportExecutionResult> {
    const job = await prisma.importJob.findFirst({
      where: { id: jobId, tenantId },
      include: { mappings: true },
    });

    if (!job) throw new Error('Import job not found');
    if (job.status !== 'APPROVED') throw new Error('Job must be approved before execution');

    // Update status
    await prisma.importJob.update({
      where: { id: jobId },
      data: { status: 'IMPORTING', importStarted: new Date() },
    });

    const result: ImportExecutionResult = {
      totalRecords: 0,
      importedRecords: 0,
      skippedRecords: 0,
      errorRecords: 0,
      autoCreatedRefs: {},
      errors: [],
    };

    try {
      // Parse file
      const { rows } = this.parseFile(fileContent, job.sourceFileType);
      result.totalRecords = rows.length;

      // Create missing references if approved
      if (job.referencesToCreate && Array.isArray(job.referencesToCreate)) {
        result.autoCreatedRefs = await this.createMissingReferences(
          tenantId,
          job.referencesToCreate as any[]
        );
      }

      // Get dependency order
      const order = (job.dependencyOrder as string[]) || ['resource'];
      
      // Group rows by entity
      const primaryEntity = order[order.length - 1] || 'resource';
      
      // Build mapping lookup
      const mappingLookup: Record<string, { targetEntity: string; targetField: string }> = {};
      for (const m of job.mappings) {
        mappingLookup[m.sourceColumn] = {
          targetEntity: m.targetEntity,
          targetField: m.targetField,
        };
      }

      // Import rows
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // 1-indexed + header

        try {
          const importResult = await this.importRow(
            tenantId,
            job.userId,
            row,
            mappingLookup,
            primaryEntity,
            job.importPurpose as any,
            jobId
          );

          if (importResult.imported) {
            result.importedRecords++;
          } else if (importResult.skipped) {
            result.skippedRecords++;
          }

          // Record result
          await prisma.importJobRecord.create({
            data: {
              importJobId: jobId,
              rowNumber: rowNum,
              sourceData: row,
              targetEntity: primaryEntity,
              targetId: importResult.recordId,
              status: importResult.imported ? 'IMPORTED' : importResult.skipped ? 'SKIPPED' : 'ERROR',
              wasCreated: importResult.wasCreated,
              previousData: importResult.previousData,
            },
          });
        } catch (error) {
          result.errorRecords++;
          result.errors.push({
            row: rowNum,
            message: error instanceof Error ? error.message : 'Unknown error',
          });

          await prisma.importJobRecord.create({
            data: {
              importJobId: jobId,
              rowNumber: rowNum,
              sourceData: row,
              targetEntity: primaryEntity,
              status: 'ERROR',
              errors: [error instanceof Error ? error.message : 'Unknown error'],
            },
          });
        }
      }

      // Update job status
      const finalStatus = result.errorRecords > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED';
      await prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: finalStatus,
          importCompleted: new Date(),
          importedRecords: result.importedRecords,
          skippedRecords: result.skippedRecords,
          errorRecords: result.errorRecords,
          autoCreatedRefs: result.autoCreatedRefs,
          rollbackExpires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        },
      });

      return result;
    } catch (error) {
      await prisma.importJob.update({
        where: { id: jobId },
        data: { status: 'FAILED' },
      });
      throw error;
    }
  },

  // Create missing references
  async createMissingReferences(
    tenantId: string,
    references: { entity: string; values: string[] }[]
  ): Promise<Record<string, string[]>> {
    const created: Record<string, string[]> = {};

    for (const ref of references) {
      created[ref.entity] = [];
      
      for (const value of ref.values) {
        try {
          switch (ref.entity) {
            case 'practice':
              await prisma.practice.create({
                data: {
                  tenantId,
                  code: value.toUpperCase().replace(/\s+/g, '_').substring(0, 20),
                  name: value,
                  status: 'ACTIVE',
                },
              });
              created[ref.entity].push(value);
              break;
            case 'location':
              await prisma.location.create({
                data: {
                  tenantId,
                  code: value.toUpperCase().replace(/\s+/g, '_').substring(0, 20),
                  name: value,
                  type: 'OFFICE',
                  timezone: 'Asia/Kolkata',
                  country: 'IN',
                  status: 'ACTIVE',
                },
              });
              created[ref.entity].push(value);
              break;
            case 'client':
              await prisma.client.create({
                data: {
                  tenantId,
                  code: value.toUpperCase().replace(/\s+/g, '_').substring(0, 20),
                  name: value,
                  status: 'ACTIVE',
                },
              });
              created[ref.entity].push(value);
              break;
          }
        } catch (e) {
          // Ignore duplicates
        }
      }
    }

    return created;
  },

  // Import a single row
  async importRow(
    tenantId: string,
    userId: string,
    row: Record<string, string>,
    mappings: Record<string, { targetEntity: string; targetField: string }>,
    primaryEntity: string,
    importPurpose: 'MIGRATION' | 'SYNC' | 'MANUAL',
    _jobId: string
  ): Promise<{ imported: boolean; skipped: boolean; recordId?: string; wasCreated: boolean; previousData?: any }> {
    // Build entity data from mappings
    const entityData: Record<string, any> = {};
    
    for (const [sourceCol, mapping] of Object.entries(mappings)) {
      if (mapping.targetEntity === primaryEntity && row[sourceCol]) {
        entityData[mapping.targetField] = this.transformValue(row[sourceCol], mapping.targetField);
      }
    }

    // Resolve references
    entityData.tenantId = tenantId;
    await this.resolveReferences(tenantId, entityData, primaryEntity);

    // Handle based on entity type
    switch (primaryEntity) {
      case 'resource':
        return this.importResource(tenantId, entityData, importPurpose);
      case 'project':
        return this.importProject(tenantId, entityData, importPurpose);
      case 'allocation':
        return this.importAllocation(tenantId, userId, entityData, importPurpose);
      case 'client':
        return this.importClient(tenantId, entityData, importPurpose);
      default:
        throw new Error(`Unsupported entity type: ${primaryEntity}`);
    }
  },

  // Transform value based on field type
  transformValue(value: string, field: string): any {
    if (!value) return null;

    // Date fields
    if (['joinDate', 'startDate', 'endDate', 'dateOfJoining'].includes(field)) {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }

    // Number fields
    if (['capacity', 'percentage', 'costPerHour', 'billRateDefault', 'budgetHours'].includes(field)) {
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    }

    // Boolean fields
    if (['isBillable', 'isActive'].includes(field)) {
      return ['true', '1', 'yes', 'y'].includes(value.toLowerCase());
    }

    // Status fields - uppercase
    if (['status', 'employmentType', 'type'].includes(field)) {
      return value.toUpperCase();
    }

    // Email - lowercase
    if (field === 'email') {
      return value.toLowerCase();
    }

    return value;
  },

  // Resolve reference fields to IDs
  async resolveReferences(tenantId: string, data: Record<string, any>, entity: string) {
    const entityDef = ENTITY_DEFINITIONS[entity as keyof typeof ENTITY_DEFINITIONS];
    if (!entityDef?.referenceFields) return;

    for (const [field, refEntity] of Object.entries(entityDef.referenceFields)) {
      const sourceField = field.replace('Id', 'Code').replace('id', 'code');
      const value = data[sourceField] || data[field];
      
      if (value && typeof value === 'string' && !value.match(/^[0-9a-f-]{36}$/i)) {
        // It's a code/name, need to resolve to ID
        const resolved = await this.resolveReferenceId(tenantId, refEntity, value);
        if (resolved) {
          data[field] = resolved;
        }
        delete data[sourceField];
      }
    }
  },

  // Resolve a reference value to its ID
  async resolveReferenceId(tenantId: string, entity: string, value: string): Promise<string | null> {
    switch (entity) {
      case 'practice': {
        const practice = await prisma.practice.findFirst({
          where: { tenantId, OR: [
            { code: { equals: value, mode: 'insensitive' } },
            { name: { equals: value, mode: 'insensitive' } },
          ]},
        });
        return practice?.id || null;
      }
      case 'location': {
        const location = await prisma.location.findFirst({
          where: { tenantId, OR: [
            { code: { equals: value, mode: 'insensitive' } },
            { name: { equals: value, mode: 'insensitive' } },
          ]},
        });
        return location?.id || null;
      }
      case 'client': {
        const client = await prisma.client.findFirst({
          where: { tenantId, OR: [
            { code: { equals: value, mode: 'insensitive' } },
            { name: { equals: value, mode: 'insensitive' } },
          ]},
        });
        return client?.id || null;
      }
      case 'resource': {
        const resource = await prisma.resource.findFirst({
          where: { tenantId, OR: [
            { employeeId: { equals: value, mode: 'insensitive' } },
            { email: { equals: value, mode: 'insensitive' } },
          ]},
        });
        return resource?.id || null;
      }
      case 'project': {
        const project = await prisma.project.findFirst({
          where: { tenantId, code: { equals: value, mode: 'insensitive' } },
        });
        return project?.id || null;
      }
      default:
        return null;
    }
  },

  // Import resource
  async importResource(
    tenantId: string,
    data: Record<string, any>,
    importPurpose: 'MIGRATION' | 'SYNC' | 'MANUAL'
  ) {
    const existing = await prisma.resource.findFirst({
      where: {
        tenantId,
        OR: [
          { employeeId: data.employeeId },
          { email: data.email },
        ],
      },
    });

    if (existing) {
      if (importPurpose === 'MIGRATION') {
        return { imported: false, skipped: true, wasCreated: false };
      }
      if (importPurpose === 'SYNC') {
        const previousData = { ...existing };
        await prisma.resource.update({
          where: { id: existing.id },
          data: {
            ...data,
            tenantId: undefined,
          },
        });
        return { imported: true, skipped: false, recordId: existing.id, wasCreated: false, previousData };
      }
      // MANUAL - flag for review
      return { imported: false, skipped: true, wasCreated: false };
    }

    // Create new
    const resource = await prisma.resource.create({
      data: {
        ...data,
        employmentType: data.employmentType || 'FTE',
        band: data.band || 'L3',
        designation: data.designation || 'Associate',
        dateOfJoining: data.joinDate || data.dateOfJoining || new Date(),
        status: data.status || 'ACTIVE',
        benchSince: new Date(),
      } as Prisma.ResourceUncheckedCreateInput,
    });

    return { imported: true, skipped: false, recordId: resource.id, wasCreated: true };
  },

  // Import project
  async importProject(
    tenantId: string,
    data: Record<string, any>,
    importPurpose: 'MIGRATION' | 'SYNC' | 'MANUAL'
  ) {
    const existing = await prisma.project.findFirst({
      where: { tenantId, code: data.code },
    });

    if (existing) {
      if (importPurpose === 'MIGRATION') {
        return { imported: false, skipped: true, wasCreated: false };
      }
      if (importPurpose === 'SYNC') {
        const previousData = { ...existing };
        await prisma.project.update({
          where: { id: existing.id },
          data: { ...data, tenantId: undefined },
        });
        return { imported: true, skipped: false, recordId: existing.id, wasCreated: false, previousData };
      }
      return { imported: false, skipped: true, wasCreated: false };
    }

    const project = await prisma.project.create({
      data: {
        ...data,
        type: data.type || 'BILLABLE',
        status: data.status || 'ACTIVE',
        startDate: data.startDate || new Date(),
      } as Prisma.ProjectUncheckedCreateInput,
    });

    return { imported: true, skipped: false, recordId: project.id, wasCreated: true };
  },

  // Import allocation
  async importAllocation(
    tenantId: string,
    userId: string,
    data: Record<string, any>,
    importPurpose: 'MIGRATION' | 'SYNC' | 'MANUAL'
  ) {
    if (!data.resourceId || !data.projectId) {
      throw new Error('Resource and Project are required for allocation');
    }

    const existing = await prisma.allocation.findFirst({
      where: {
        tenantId,
        resourceId: data.resourceId,
        projectId: data.projectId,
        startDate: data.startDate,
        deletedAt: null,
      },
    });

    if (existing) {
      if (importPurpose === 'MIGRATION') {
        return { imported: false, skipped: true, wasCreated: false };
      }
      if (importPurpose === 'SYNC') {
        const previousData = { ...existing };
        await prisma.allocation.update({
          where: { id: existing.id },
          data: { ...data, tenantId: undefined },
        });
        return { imported: true, skipped: false, recordId: existing.id, wasCreated: false, previousData };
      }
      return { imported: false, skipped: true, wasCreated: false };
    }

    const allocation = await prisma.allocation.create({
      data: {
        ...data,
        requestedById: userId,
        status: data.status || 'ACTIVE',
        role: data.role || 'Team Member',
        isBillable: data.isBillable ?? true,
      } as Prisma.AllocationUncheckedCreateInput,
    });

    return { imported: true, skipped: false, recordId: allocation.id, wasCreated: true };
  },

  // Import client
  async importClient(
    tenantId: string,
    data: Record<string, any>,
    importPurpose: 'MIGRATION' | 'SYNC' | 'MANUAL'
  ) {
    const existing = await prisma.client.findFirst({
      where: { tenantId, code: data.code },
    });

    if (existing) {
      if (importPurpose === 'MIGRATION') {
        return { imported: false, skipped: true, wasCreated: false };
      }
      if (importPurpose === 'SYNC') {
        const previousData = { ...existing };
        await prisma.client.update({
          where: { id: existing.id },
          data: { ...data, tenantId: undefined },
        });
        return { imported: true, skipped: false, recordId: existing.id, wasCreated: false, previousData };
      }
      return { imported: false, skipped: true, wasCreated: false };
    }

    const client = await prisma.client.create({
      data: {
        ...data,
        status: data.status || 'ACTIVE',
      } as Prisma.ClientUncheckedCreateInput,
    });

    return { imported: true, skipped: false, recordId: client.id, wasCreated: true };
  },

  // Rollback an import
  async rollbackImport(tenantId: string, jobId: string, userId: string) {
    const job = await prisma.importJob.findFirst({
      where: { id: jobId, tenantId },
      include: { records: true },
    });

    if (!job) throw new Error('Import job not found');
    if (!job.canRollback) throw new Error('This import cannot be rolled back');
    if (job.status === 'ROLLED_BACK') throw new Error('Import already rolled back');

    // Rollback each record
    for (const record of job.records) {
      if (record.status === 'IMPORTED' || record.status === 'UPDATED') {
        try {
          if (record.wasCreated && record.targetId) {
            // Delete created record
            await this.deleteRecord(record.targetEntity, record.targetId);
          } else if (record.previousData && record.targetId) {
            // Restore previous data
            await this.restoreRecord(record.targetEntity, record.targetId, record.previousData as any);
          }
        } catch (e) {
          // Log but continue
          console.error(`Failed to rollback record ${record.id}:`, e);
        }
      }
    }

    // Update job status
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'ROLLED_BACK',
        rolledBackAt: new Date(),
        rolledBackBy: userId,
      },
    });

    return { success: true, message: 'Import rolled back successfully' };
  },

  // Delete a record
  async deleteRecord(entity: string, id: string) {
    switch (entity) {
      case 'resource':
        await prisma.resource.delete({ where: { id } });
        break;
      case 'project':
        await prisma.project.delete({ where: { id } });
        break;
      case 'allocation':
        await prisma.allocation.delete({ where: { id } });
        break;
      case 'client':
        await prisma.client.delete({ where: { id } });
        break;
    }
  },

  // Restore a record to previous state
  async restoreRecord(entity: string, id: string, data: Record<string, any>) {
    const { id: _id, createdAt, updatedAt, ...restoreData } = data;
    
    switch (entity) {
      case 'resource':
        await prisma.resource.update({ where: { id }, data: restoreData });
        break;
      case 'project':
        await prisma.project.update({ where: { id }, data: restoreData });
        break;
      case 'allocation':
        await prisma.allocation.update({ where: { id }, data: restoreData });
        break;
      case 'client':
        await prisma.client.update({ where: { id }, data: restoreData });
        break;
    }
  },
};

export default aiMigrationService;
