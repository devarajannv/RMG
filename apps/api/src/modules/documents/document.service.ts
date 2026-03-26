import { PrismaClient, Document, DocumentVersion, DocumentAccess, DocumentClassification, DocumentStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { getTenantDocumentTaxonomyPolicy, resolveDocumentCategory } from '../../config/document-taxonomy';

const prisma = new PrismaClient();

// Storage configuration
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '52428800'); // 50MB default

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const documentService = {
  // Get all documents for a tenant with optional filters
  async getDocuments(tenantId: string, filters?: {
    entityType?: string;
    entityId?: string;
    classification?: DocumentClassification;
    category?: string;
    status?: DocumentStatus;
    search?: string;
  }): Promise<Document[]> {
    const where: any = { tenantId, deletedAt: null };

    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.entityId) where.entityId = filters.entityId;
    if (filters?.classification) where.classification = filters.classification;
    if (filters?.category) where.category = filters.category;
    if (filters?.status) where.status = filters.status;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.document.findMany({
      where,
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
        accessRules: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  },

  // Get a single document
  async getDocument(tenantId: string, id: string): Promise<Document | null> {
    return prisma.document.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
        accessRules: true,
        accessLogs: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
      },
    });
  },

  // Check if user has access to document
  async checkAccess(documentId: string, userId: string, action: 'view' | 'download' | 'edit' | 'delete' | 'share', tenantId: string): Promise<boolean> {
    const document = await prisma.document.findFirst({
      where: { id: documentId, tenantId },
      include: { accessRules: true },
    });

    if (!document) return false;

    // Check user-specific access
    const userAccess = document.accessRules.find(
      r => r.userId === userId && !r.revokedAt && (!r.expiresAt || r.expiresAt > new Date())
    );

    if (userAccess) {
      switch (action) {
        case 'view': return userAccess.canView;
        case 'download': return userAccess.canDownload;
        case 'edit': return userAccess.canEdit;
        case 'delete': return userAccess.canDelete;
        case 'share': return userAccess.canShare;
      }
    }

    // Check role-based access (would need to get user's roles)
    // For now, allow document creator full access
    if (document.uploadedById === userId) return true;

    return false;
  },

  // Upload a document
  async uploadDocument(tenantId: string, userId: string, data: {
    name: string;
    description?: string;
    classification?: DocumentClassification;
    category?: string;
    tags?: string[];
    entityType?: string;
    entityId?: string;
    file: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
      size: number;
    };
  }): Promise<Document> {
    if (data.file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    const documentTaxonomy = await getTenantDocumentTaxonomyPolicy(tenantId);
    const category = resolveDocumentCategory(documentTaxonomy, data.category);

    // Generate unique filename
    const ext = path.extname(data.file.originalname);
    const filename = `${crypto.randomUUID()}${ext}`;
    const storagePath = path.join(UPLOAD_DIR, tenantId, filename);

    // Ensure tenant directory exists
    const tenantDir = path.join(UPLOAD_DIR, tenantId);
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }

    // Calculate checksum
    const checksum = crypto.createHash('sha256').update(data.file.buffer).digest('hex');

    // Write file to disk
    fs.writeFileSync(storagePath, data.file.buffer);

    // Create document record
    const document = await prisma.document.create({
      data: {
        tenantId,
        name: data.name || data.file.originalname,
        description: data.description,
        mimeType: data.file.mimetype,
        fileSize: data.file.size,
        classification: data.classification || 'INTERNAL',
        category,
        tags: data.tags || [],
        storageProvider: 'LOCAL',
        storagePath,
        checksum,
        entityType: data.entityType,
        entityId: data.entityId,
        uploadedById: userId,
        versionCount: 1,
      },
    });

    // Create initial version
    const version = await prisma.documentVersion.create({
      data: {
        documentId: document.id,
        versionNumber: 1,
        storagePath,
        fileSize: data.file.size,
        checksum,
        changeNotes: 'Initial upload',
        createdById: userId,
      },
    });

    // Update document with current version
    await prisma.document.update({
      where: { id: document.id },
      data: { currentVersionId: version.id },
    });

    // Log access
    await this.logAccess(document.id, userId, 'UPLOAD');

    return this.getDocument(tenantId, document.id) as Promise<Document>;
  },

  // Upload a new version
  async uploadVersion(tenantId: string, userId: string, documentId: string, data: {
    changeNotes?: string;
    file: {
      buffer: Buffer;
      mimetype: string;
      size: number;
    };
  }): Promise<DocumentVersion> {
    const document = await prisma.document.findFirst({
      where: { id: documentId, tenantId },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Check access
    const hasAccess = await this.checkAccess(documentId, userId, 'edit', tenantId);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    // Generate new storage path
    const ext = path.extname(document.storagePath);
    const filename = `${crypto.randomUUID()}${ext}`;
    const storagePath = path.join(UPLOAD_DIR, tenantId, filename);

    // Calculate checksum
    const checksum = crypto.createHash('sha256').update(data.file.buffer).digest('hex');

    // Write file to disk
    fs.writeFileSync(storagePath, data.file.buffer);

    // Create new version
    const newVersionNumber = document.versionCount + 1;
    const version = await prisma.documentVersion.create({
      data: {
        documentId,
        versionNumber: newVersionNumber,
        storagePath,
        fileSize: data.file.size,
        checksum,
        changeNotes: data.changeNotes || `Version ${newVersionNumber}`,
        createdById: userId,
      },
    });

    // Update document
    await prisma.document.update({
      where: { id: documentId },
      data: {
        currentVersionId: version.id,
        versionCount: newVersionNumber,
        storagePath,
        fileSize: data.file.size,
        checksum,
        mimeType: data.file.mimetype,
      },
    });

    // Log access
    await this.logAccess(documentId, userId, 'EDIT');

    return version;
  },

  // Download a document
  async downloadDocument(tenantId: string, userId: string, documentId: string, versionNumber?: number): Promise<{
    buffer: Buffer;
    filename: string;
    mimeType: string;
  }> {
    const document = await prisma.document.findFirst({
      where: { id: documentId, tenantId },
      include: { versions: true },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Check access
    const hasAccess = await this.checkAccess(documentId, userId, 'download', tenantId);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    // Get the requested version or current
    let storagePath = document.storagePath;
    if (versionNumber) {
      const version = document.versions.find(v => v.versionNumber === versionNumber);
      if (!version) {
        throw new Error('Version not found');
      }
      storagePath = version.storagePath;
    }

    // Read file from disk
    if (!fs.existsSync(storagePath)) {
      throw new Error('File not found on storage');
    }

    const buffer = fs.readFileSync(storagePath);

    // Log access
    await this.logAccess(documentId, userId, 'DOWNLOAD');

    return {
      buffer,
      filename: document.name,
      mimeType: document.mimeType,
    };
  },

  // Update document metadata
  async updateDocument(tenantId: string, userId: string, documentId: string, data: {
    name?: string;
    description?: string;
    classification?: DocumentClassification;
    category?: string;
    tags?: string[];
  }): Promise<Document> {
    const document = await prisma.document.findFirst({
      where: { id: documentId, tenantId },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Check access
    const hasAccess = await this.checkAccess(documentId, userId, 'edit', tenantId);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    const documentTaxonomy = await getTenantDocumentTaxonomyPolicy(tenantId);
    const nextCategory = data.category !== undefined
      ? resolveDocumentCategory(documentTaxonomy, data.category)
      : undefined;

    await prisma.document.update({
      where: { id: documentId },
      data: {
        ...data,
        ...(data.category !== undefined ? { category: nextCategory } : {}),
      },
    });

    // Log access
    await this.logAccess(documentId, userId, 'EDIT');

    return this.getDocument(tenantId, documentId) as Promise<Document>;
  },

  // Delete a document (soft delete)
  async deleteDocument(tenantId: string, userId: string, documentId: string): Promise<void> {
    const document = await prisma.document.findFirst({
      where: { id: documentId, tenantId },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Check access
    const hasAccess = await this.checkAccess(documentId, userId, 'delete', tenantId);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { deletedAt: new Date(), status: 'DELETED' },
    });

    // Log access
    await this.logAccess(documentId, userId, 'DELETE');
  },

  // Grant access to a document
  async grantAccess(documentId: string, grantedBy: string, data: {
    roleId?: string;
    userId?: string;
    practiceId?: string;
    canView?: boolean;
    canDownload?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
    canShare?: boolean;
    expiresAt?: Date;
  }, tenantId: string): Promise<DocumentAccess> {
    // Verify document belongs to the caller's tenant
    const document = await prisma.document.findFirst({
      where: { id: documentId, tenantId },
    });
    if (!document) {
      throw new Error('Document not found');
    }

    return prisma.documentAccess.create({
      data: {
        documentId,
        roleId: data.roleId,
        userId: data.userId,
        practiceId: data.practiceId,
        canView: data.canView ?? true,
        canDownload: data.canDownload ?? false,
        canEdit: data.canEdit ?? false,
        canDelete: data.canDelete ?? false,
        canShare: data.canShare ?? false,
        expiresAt: data.expiresAt,
        grantedById: grantedBy,
      },
    });
  },

  // Revoke access
  async revokeAccess(accessId: string, tenantId: string): Promise<void> {
    // Verify the access record's document belongs to the caller's tenant
    const access = await prisma.documentAccess.findUnique({
      where: { id: accessId },
      include: { document: { select: { tenantId: true } } },
    });
    if (!access || access.document.tenantId !== tenantId) {
      throw new Error('Access record not found');
    }

    await prisma.documentAccess.update({
      where: { id: accessId },
      data: { revokedAt: new Date() },
    });
  },

  // Log document access
  async logAccess(documentId: string, userId: string, action: string, req?: any): Promise<void> {
    await prisma.documentAccessLog.create({
      data: {
        documentId,
        userId,
        action,
        ipAddress: req?.ip,
        userAgent: req?.headers?.['user-agent'],
      },
    });
  },

  // Get document access logs
  async getAccessLogs(tenantId: string, documentId: string): Promise<any[]> {
    const document = await prisma.document.findFirst({
      where: { id: documentId, tenantId },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    return prisma.documentAccessLog.findMany({
      where: { documentId },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
  },

  // Get document versions
  async getVersions(tenantId: string, documentId: string): Promise<DocumentVersion[]> {
    const document = await prisma.document.findFirst({
      where: { id: documentId, tenantId },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    return prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { versionNumber: 'desc' },
    });
  },
};

export default documentService;

