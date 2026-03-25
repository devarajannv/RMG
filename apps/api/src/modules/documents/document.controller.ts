import { Request, Response, NextFunction } from 'express';
import { documentService } from './document.service';
import { z } from 'zod';
import { DocumentClassification } from '@prisma/client';

// Validation schemas
const uploadDocumentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  classification: z.enum(['PUBLIC', 'INTERNAL', 'RESTRICTED', 'CONFIDENTIAL']).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
  entityType: z.string().max(50).optional(),
  entityId: z.string().uuid().optional(),
});

const updateDocumentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  classification: z.enum(['PUBLIC', 'INTERNAL', 'RESTRICTED', 'CONFIDENTIAL']).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
});

const grantAccessSchema = z.object({
  roleId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  practiceId: z.string().uuid().optional(),
  canView: z.boolean().optional(),
  canDownload: z.boolean().optional(),
  canEdit: z.boolean().optional(),
  canDelete: z.boolean().optional(),
  canShare: z.boolean().optional(),
  expiresAt: z.string().transform(s => new Date(s)).optional(),
});

// Controllers
export const getDocuments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const filters: any = {};
    if (req.query.entityType) filters.entityType = req.query.entityType;
    if (req.query.entityId) filters.entityId = req.query.entityId;
    if (req.query.classification) filters.classification = req.query.classification;
    if (req.query.category) filters.category = req.query.category;
    if (req.query.status) filters.status = req.query.status;
    if (req.query.search) filters.search = req.query.search;

    const documents = await documentService.getDocuments(tenantId, filters);
    res.json(documents);
  } catch (error) {
    next(error);
  }
};

export const getDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const document = await documentService.getDocument(tenantId, req.params.id);
    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    // Check view access
    const hasAccess = await documentService.checkAccess(req.params.id, userId, 'view', tenantId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Log view
    await documentService.logAccess(req.params.id, userId, 'VIEW', req);

    res.json(document);
  } catch (error) {
    next(error);
  }
};

export const uploadDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const metadata = uploadDocumentSchema.parse(req.body);
    
    const document = await documentService.uploadDocument(tenantId, userId, {
      name: metadata.name || req.file.originalname,
      description: metadata.description,
      classification: metadata.classification as DocumentClassification | undefined,
      category: metadata.category,
      tags: metadata.tags,
      entityType: metadata.entityType,
      entityId: metadata.entityId,
      file: {
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
        originalname: req.file.originalname,
        size: req.file.size,
      },
    });

    res.status(201).json(document);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    if (error instanceof Error && error.message.includes('is not allowed by tenant policy')) {
      res.status(400).json({ code: 'DOCUMENT_TAXONOMY_VIOLATION', error: error.message });
      return;
    }
    if (error instanceof Error && error.message.includes('File size')) {
      res.status(400).json({ code: 'FILE_SIZE_ERROR', error: error.message });
      return;
    }
    next(error);
  }
};

export const uploadVersion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const version = await documentService.uploadVersion(tenantId, userId, req.params.id, {
      changeNotes: req.body.changeNotes,
      file: {
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
    });

    res.status(201).json(version);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Document not found') {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error.message === 'Access denied') {
        res.status(403).json({ error: error.message });
        return;
      }
    }
    next(error);
  }
};

export const downloadDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const versionNumber = req.query.version ? parseInt(req.query.version as string) : undefined;

    const { buffer, filename, mimeType } = await documentService.downloadDocument(
      tenantId,
      userId,
      req.params.id,
      versionNumber
    );

    // Sanitize filename for Content-Disposition header (prevent CRLF injection)
    const safeFilename = filename.replace(/[^\w.\-]/g, '_').replace(/\.{2,}/g, '.');

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Document not found' || error.message === 'Version not found') {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error.message === 'Access denied') {
        res.status(403).json({ error: error.message });
        return;
      }
    }
    next(error);
  }
};

export const updateDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const data = updateDocumentSchema.parse(req.body);
    const document = await documentService.updateDocument(tenantId, userId, req.params.id, {
      ...data,
      classification: data.classification as DocumentClassification | undefined,
    });

    res.json(document);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    if (error instanceof Error) {
      if (error.message.includes('is not allowed by tenant policy')) {
        res.status(400).json({ code: 'DOCUMENT_TAXONOMY_VIOLATION', error: error.message });
        return;
      }
      if (error.message === 'Document not found') {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error.message === 'Access denied') {
        res.status(403).json({ error: error.message });
        return;
      }
    }
    next(error);
  }
};

export const deleteDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await documentService.deleteDocument(tenantId, userId, req.params.id);
    res.status(204).send();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Document not found') {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error.message === 'Access denied') {
        res.status(403).json({ error: error.message });
        return;
      }
    }
    next(error);
  }
};

export const grantAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const data = grantAccessSchema.parse(req.body);
    
    if (!data.roleId && !data.userId && !data.practiceId) {
      res.status(400).json({ error: 'One of roleId, userId, or practiceId is required' });
      return;
    }

    const access = await documentService.grantAccess(req.params.id, userId, data, req.user!.tenantId);
    res.status(201).json(access);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    next(error);
  }
};

export const revokeAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    await documentService.revokeAccess(req.params.accessId, tenantId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const getVersions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const versions = await documentService.getVersions(tenantId, req.params.id);
    res.json(versions);
  } catch (error) {
    if (error instanceof Error && error.message === 'Document not found') {
      res.status(404).json({ error: error.message });
      return;
    }
    next(error);
  }
};

export const getAccessLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const logs = await documentService.getAccessLogs(tenantId, req.params.id);
    res.json(logs);
  } catch (error) {
    if (error instanceof Error && error.message === 'Document not found') {
      res.status(404).json({ error: error.message });
      return;
    }
    next(error);
  }
};
