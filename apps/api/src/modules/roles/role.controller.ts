import { Request, Response, NextFunction } from 'express';
import { roleService } from './role.service';
import { z } from 'zod';

// Validation schemas
const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  level: z.number().min(0).max(10).optional(),
  parentRoleId: z.string().uuid().optional(),
  permissions: z.array(z.string().min(1)).optional(),
  permissionIds: z.array(z.string().uuid()).optional(),
});

const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  level: z.number().min(0).max(10).optional(),
  parentRoleId: z.string().uuid().nullable().optional(),
  permissions: z.array(z.string().min(1)).optional(),
  permissionIds: z.array(z.string().uuid()).optional(),
});

const assignRoleSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
});

const revokeRoleSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

const provisionSystemRoleSchema = z.object({
  presetCode: z.string().min(1),
});

// Controllers
export const getRoles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const roles = await roleService.getRoles(tenantId);
    res.json(roles);
  } catch (error) {
    next(error);
  }
};

export const getRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const role = await roleService.getRole(tenantId, req.params.id);
    if (!role) {
      res.status(404).json({ error: 'Role not found' });
      return;
    }
    res.json(role);
  } catch (error) {
    next(error);
  }
};

export const getPermissionCatalog = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json(roleService.getPermissionCatalog());
  } catch (error) {
    next(error);
  }
};

export const createRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const data = createRoleSchema.parse(req.body);
    const role = await roleService.createRole(tenantId, data);
    res.status(201).json(role);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    next(error);
  }
};

export const provisionSystemRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const data = provisionSystemRoleSchema.parse(req.body);
    const role = await roleService.provisionSystemRole(tenantId, data.presetCode);
    res.status(201).json(role);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    if (error instanceof Error) {
      if (error.message.startsWith('Unknown role preset:')) {
        res.status(404).json({ code: 'PRESET_NOT_FOUND', error: error.message });
        return;
      }
      if (error.message.includes('already in use by a custom role')) {
        res.status(409).json({ code: 'ROLE_NAME_CONFLICT', error: error.message });
        return;
      }
    }
    next(error);
  }
};

export const updateRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const data = updateRoleSchema.parse(req.body);
    const role = await roleService.updateRole(tenantId, req.params.id, {
      ...data,
      parentRoleId: data.parentRoleId ?? undefined,
    });
    res.json(role);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    if (error instanceof Error) {
      if (error.message === 'Role not found') {
        res.status(404).json({ code: 'NOT_FOUND', error: error.message });
        return;
      }
      if (error.message === 'Cannot rename system roles') {
        res.status(400).json({ code: 'SYSTEM_ROLE_ERROR', error: error.message });
        return;
      }
    }
    next(error);
  }
};

export const deleteRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await roleService.deleteRole(tenantId, req.params.id);
    res.status(204).send();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Role not found') {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error.message.includes('Cannot delete')) {
        res.status(400).json({ error: error.message });
        return;
      }
    }
    next(error);
  }
};

export const assignRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const assignedBy = req.user?.id;
    if (!assignedBy) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const data = assignRoleSchema.parse(req.body);

    // M-23: Prevent self-role-assignment
    if (data.userId === assignedBy) {
      res.status(400).json({ error: 'Cannot assign roles to yourself' });
      return;
    }

    const tenantId = req.user!.tenantId;
    await roleService.assignRole(data.userId, data.roleId, assignedBy, tenantId);
    res.json({ message: 'Role assigned successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    next(error);
  }
};

export const revokeRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const revokedBy = req.user?.id;
    if (!revokedBy) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const data = revokeRoleSchema.parse(req.body);
    const tenantId = req.user!.tenantId;
    await roleService.revokeRole(data.userId, data.roleId, revokedBy, tenantId, data.reason);
    res.json({ message: 'Role revoked successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    next(error);
  }
};

export const getUserPermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.params.userId || req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const permissions = await roleService.getUserPermissions(userId, req.user!.tenantId);
    res.json({ userId, permissions });
  } catch (error) {
    next(error);
  }
};

export const checkPermission = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { permission } = req.query;
    if (!permission || typeof permission !== 'string') {
      res.status(400).json({ error: 'Permission query parameter required' });
      return;
    }

    const hasPermission = await roleService.hasPermission(userId, permission);
    res.json({ permission, hasPermission });
  } catch (error) {
    next(error);
  }
};

export const getAssignmentAudit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const filters: any = {};
    if (req.query.userId) filters.userId = req.query.userId;
    if (req.query.roleId) filters.roleId = req.query.roleId;
    if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
    if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);

    const audit = await roleService.getAssignmentAudit(tenantId, filters);
    res.json(audit);
  } catch (error) {
    next(error);
  }
};

export const initializePermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await roleService.initializePermissions(tenantId);
    res.json({ message: 'Permissions initialized successfully' });
  } catch (error) {
    next(error);
  }
};
