/**
 * GDPR Controller
 * C-10: Right to Erasure and Data Portability endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRoles } from '../../middleware/auth';
import * as gdprService from './gdpr.service';
import prisma from '../../lib/prisma';

const router = Router();

/**
 * POST /gdpr/export
 * Export current user's own data (any authenticated user)
 */
router.post(
  '/export',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await gdprService.exportUserData(req.user!.id, req.user!.tenantId);
      res.json({
        message: 'Data export generated',
        data,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /gdpr/erasure-request
 * User requests deletion of their own data
 * Admins can request on behalf of another user
 */
router.post(
  '/erasure-request',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const targetUserId = req.body.userId || req.user!.id;

      // M-25: Only admins can request erasure for other users — use DB-based role check (L-16)
      if (targetUserId !== req.user!.id) {
        const userRoles = await prisma.userRole.findMany({
          where: { userId: req.user!.id },
          include: { role: { select: { name: true } } },
        });
        const isAdmin = userRoles.some(ur =>
          ['ADMIN', 'ORG_ADMIN'].includes(ur.role.name.toUpperCase())
        );
        if (!isAdmin) {
          return res.status(403).json({ error: 'Only admins can request erasure for other users', code: 'FORBIDDEN' });
        }
      }

      const erasureRequest = await gdprService.createErasureRequest(
        req.user!.tenantId,
        targetUserId,
        req.user!.id
      );

      const completedRequest = await gdprService.processErasureRequest(erasureRequest, req.user!.id);

      return res.json({
        message: 'Data anonymization completed',
        data: {
          requestId: completedRequest.id,
          status: completedRequest.status,
          completedAt: completedRequest.completedAt,
        },
      });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * POST /gdpr/admin/export/:userId
 * Admin exports data for a specific user
 */
router.post(
  '/admin/export/:userId',
  authenticate,
  requireRoles('ADMIN', 'ORG_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await gdprService.exportUserData(req.params.userId, req.user!.tenantId);
      res.json({
        message: 'Data export generated',
        data,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
