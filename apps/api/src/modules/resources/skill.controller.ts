import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as skillService from './skill.service';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// ============================================================================
// Skill Category Routes
// ============================================================================

/**
 * GET /api/v1/skills/categories
 */
router.get(
  '/categories',
  authorize('resource:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await skillService.listSkillCategories(req.tenantId!);
      res.json({ data: categories });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/skills/categories
 */
router.post(
  '/categories',
  authorize('resource:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        name: z.string().min(1).max(100),
        color: z.string().max(7).optional(),
        sortOrder: z.number().int().optional(),
      });
      const input = schema.parse(req.body);
      const category = await skillService.createSkillCategory(req.tenantId!, input);
      res.status(201).json({ data: category });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/skills/categories/:id
 */
router.put(
  '/categories/:id',
  authorize('resource:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        name: z.string().min(1).max(100).optional(),
        color: z.string().max(7).optional(),
        sortOrder: z.number().int().optional(),
      });
      const input = schema.parse(req.body);
      const category = await skillService.updateSkillCategory(
        req.tenantId!,
        req.params.id,
        input
      );
      res.json({ data: category });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/skills/categories/:id
 */
router.delete(
  '/categories/:id',
  authorize('resource:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await skillService.deleteSkillCategory(req.tenantId!, req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// Skill Routes
// ============================================================================

/**
 * GET /api/v1/skills
 */
router.get(
  '/',
  authorize('resource:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        categoryId: req.query.categoryId as string | undefined,
        status: req.query.status as 'ACTIVE' | 'DEPRECATED' | undefined,
      };
      const skills = await skillService.listSkills(req.tenantId!, filters);
      res.json({ data: skills });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/skills
 */
router.post(
  '/',
  authorize('resource:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        categoryId: z.string().uuid().optional(),
        isVerifiable: z.boolean().optional(),
      });
      const input = schema.parse(req.body);
      const skill = await skillService.createSkill(req.tenantId!, input);
      res.status(201).json({ data: skill });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/skills/:id
 */
router.put(
  '/:id',
  authorize('resource:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        categoryId: z.string().uuid().optional(),
        isVerifiable: z.boolean().optional(),
        status: z.enum(['ACTIVE', 'DEPRECATED']).optional(),
      });
      const input = schema.parse(req.body);
      const skill = await skillService.updateSkill(req.tenantId!, req.params.id, input);
      res.json({ data: skill });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/skills/search-resources
 * Find resources with specific skills
 */
router.post(
  '/search-resources',
  authorize('resource:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        skillIds: z.array(z.string().uuid()).min(1),
        minProficiency: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional(),
      });
      const input = schema.parse(req.body);
      const resources = await skillService.findResourcesBySkills(
        req.tenantId!,
        input.skillIds,
        input.minProficiency
      );
      res.json({ data: resources });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// Resource Skill Routes
// ============================================================================

/**
 * GET /api/v1/resources/:resourceId/skills
 */
router.get(
  '/resources/:resourceId/skills',
  authorize('resource:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const skills = await skillService.getResourceSkills(
        req.tenantId!,
        req.params.resourceId
      );
      res.json({ data: skills });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/resources/:resourceId/skills
 */
router.post(
  '/resources/:resourceId/skills',
  authorize('resource:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        skillId: z.string().uuid(),
        proficiency: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
        yearsExp: z.number().min(0).max(50).optional(),
        lastUsed: z.coerce.date().optional(),
        certified: z.boolean().optional(),
        certExpiry: z.coerce.date().optional(),
        notes: z.string().max(500).optional(),
      });
      const input = schema.parse(req.body);
      const resourceSkill = await skillService.assignSkillToResource(
        req.tenantId!,
        req.params.resourceId,
        input,
        req.user!.id
      );
      res.status(201).json({ data: resourceSkill });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/resources/:resourceId/skills/:skillId
 */
router.delete(
  '/resources/:resourceId/skills/:skillId',
  authorize('resource:write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await skillService.removeSkillFromResource(
        req.tenantId!,
        req.params.resourceId,
        req.params.skillId
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;

