/**
 * User Controller
 * Full user management endpoints
 */

import { Request, Response, NextFunction } from 'express';
import * as userService from './user.service';

// List all users
export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const includeInactive = req.query.includeInactive === 'true';
    const users = await userService.listUsers(tenantId, includeInactive);

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    return next(error);
  }
}

// Get single user
export async function getUserById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const user = await userService.getUserById(id, tenantId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    return res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    return next(error);
  }
}

// Create new user
export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const { email, firstName, lastName, password, status, roleIds } = req.body;

    if (!email || !firstName || !lastName || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email, firstName, lastName, and password are required',
      });
    }

    const user = await userService.createUser(tenantId, {
      email,
      firstName,
      lastName,
      password,
      status,
      roleIds,
    });

    return res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: error.message,
      });
    }
    return next(error);
  }
}

// Update user
export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const { firstName, lastName, email, status } = req.body;

    const user = await userService.updateUser(id, tenantId, {
      firstName,
      lastName,
      email,
      status,
    });

    return res.json({
      success: true,
      data: user,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: error.message,
      });
    }
    return next(error);
  }
}

// Delete user
export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    // Prevent self-deletion
    if (id === req.user!.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account',
      });
    }

    await userService.deleteUser(id, tenantId);

    return res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    return next(error);
  }
}

// Assign role to user
export async function assignRole(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { roleId } = req.body;
    const assignedBy = req.user!.id;

    if (!roleId) {
      return res.status(400).json({
        success: false,
        error: 'roleId is required',
      });
    }

    await userService.assignRoleToUser(id, roleId, assignedBy);

    return res.json({
      success: true,
      message: 'Role assigned successfully',
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('already has')) {
      return res.status(409).json({
        success: false,
        error: error.message,
      });
    }
    return next(error);
  }
}

// Remove role from user
export async function removeRole(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, roleId } = req.params;

    await userService.removeRoleFromUser(id, roleId);

    res.json({
      success: true,
      message: 'Role removed successfully',
    });
  } catch (error) {
    return next(error);
  }
}

// Reset user password
export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters',
      });
    }

    await userService.resetUserPassword(id, tenantId, newPassword);

    return res.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    return next(error);
  }
}

// Toggle user status (active/inactive)
export async function toggleStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    // Prevent self-deactivation
    if (id === req.user!.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot change your own status',
      });
    }

    const user = await userService.toggleUserStatus(id, tenantId);

    return res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    return next(error);
  }
}
