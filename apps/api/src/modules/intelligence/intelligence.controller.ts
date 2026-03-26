import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as intelligenceService from './intelligence.service';
import { authenticate, authorize } from '../../middleware/auth';
import { intelligenceQueryLimiter } from '../../middleware/rateLimiter';
import prisma from '../../lib/prisma';

const router = Router();

router.use(authenticate);

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/v1/intelligence/match
 * Find matching resources based on criteria
 */
router.post(
  '/match',
  intelligenceQueryLimiter,
  authorize('resource:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        requiredSkills: z.array(z.string().uuid()).optional(),
        preferredSkills: z.array(z.string().uuid()).optional(),
        minProficiency: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        allocationPercentage: z.number().min(1).max(100).optional(),
        practiceId: z.string().uuid().optional(),
        locationId: z.string().uuid().optional(),
        band: z.array(z.string()).optional(),
        excludeResourceIds: z.array(z.string().uuid()).optional(),
        limit: z.number().min(1).max(50).default(10),
        includePartialMatches: z.boolean().default(true),
      });

      const input = schema.parse(req.body);

      const matches = await intelligenceService.findMatchingResources(
        req.tenantId!,
        {
          requiredSkills: input.requiredSkills,
          preferredSkills: input.preferredSkills,
          minProficiency: input.minProficiency,
          startDate: input.startDate,
          endDate: input.endDate,
          allocationPercentage: input.allocationPercentage,
          practiceId: input.practiceId,
          locationId: input.locationId,
          band: input.band,
          excludeResourceIds: input.excludeResourceIds,
        },
        {
          limit: input.limit,
          includePartialMatches: input.includePartialMatches,
        }
      );

      res.json({
        data: matches,
        meta: {
          totalMatches: matches.length,
          criteria: {
            requiredSkillCount: input.requiredSkills?.length ?? 0,
            preferredSkillCount: input.preferredSkills?.length ?? 0,
          },
        },
      });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/v1/intelligence/skill-gap/:projectId
 * Analyze skill gaps for a project
 */
router.get(
  '/skill-gap/:projectId',
  intelligenceQueryLimiter,
  authorize('project:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId;

      const analysis = await intelligenceService.analyzeProjectSkillGap(
        req.tenantId!,
        projectId
      );

      res.json({ data: analysis });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/v1/intelligence/utilization-insights
 * Get intelligent utilization insights and recommendations
 */
router.get(
  '/utilization-insights',
  intelligenceQueryLimiter,
  authorize('report:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const insights = await intelligenceService.getUtilizationInsights(req.tenantId!);
      res.json({ data: insights });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/v1/intelligence/recommendations/:projectId
 * Get resource recommendations for a project
 */
router.get(
  '/recommendations/:projectId',
  intelligenceQueryLimiter,
  authorize('resource:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        count: z.coerce.number().min(1).max(20).default(5),
        skills: z.string().transform(s => s.split(',')).optional(),
      });

      const query = schema.parse(req.query);
      const projectId = req.params.projectId;

      const recommendations = await intelligenceService.getResourceRecommendations(
        req.tenantId!,
        projectId,
        {
          count: query.count,
          requiredSkills: query.skills,
        }
      );

      res.json({ data: recommendations });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/v1/intelligence/skill-inventory
 * Get organization skill inventory with supply/demand analysis
 */
router.get(
  '/skill-inventory',
  intelligenceQueryLimiter,
  authorize('report:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const inventory = await intelligenceService.getSkillInventory(req.tenantId!);
      res.json({ data: inventory });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * POST /api/v1/intelligence/quick-match
 * Quick skill-based resource search
 */
router.post(
  '/quick-match',
  intelligenceQueryLimiter,
  authorize('resource:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        skillNames: z.array(z.string()).min(1),
        availableOnly: z.boolean().default(true),
        limit: z.number().min(1).max(20).default(5),
      });

      const input = schema.parse(req.body);

      // Find skill IDs by name
      const skills = await prisma.skill.findMany({
        where: {
          tenantId: req.tenantId!,
          name: { in: input.skillNames, mode: 'insensitive' },
        },
        select: { id: true, name: true },
      });

      if (skills.length === 0) {
        return res.json({
          data: [],
          meta: { message: 'No matching skills found' },
        });
      }

      const matches = await intelligenceService.findMatchingResources(
        req.tenantId!,
        {
          requiredSkills: skills.map((s: { id: string; name: string }) => s.id),
          allocationPercentage: input.availableOnly ? 50 : undefined,
        },
        {
          limit: input.limit,
          includePartialMatches: true,
        }
      );

      return res.json({
        data: matches,
        meta: {
          searchedSkills: skills.map((s: { id: string; name: string }) => s.name),
          matchCount: matches.length,
        },
      });
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * GET /api/v1/intelligence/optimal-team/:projectId
 * Get optimal team composition suggestions
 */
router.get(
  '/optimal-team/:projectId',
  authorize('project:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId;

      // Get skill gap analysis
      const skillGap = await intelligenceService.analyzeProjectSkillGap(
        req.tenantId!,
        projectId
      );

      // Get recommendations for each gap
      const teamSuggestions: Array<{
        skill: string;
        gap: number;
        suggestedResources: Array<{
          resourceId: string;
          resourceName: string;
          score: number;
          available: boolean;
        }>;
      }> = [];

      for (const skill of skillGap.requiredSkills.filter(s => s.gap > 0).slice(0, 5)) {
        const matches = await intelligenceService.findMatchingResources(
          req.tenantId!,
          { requiredSkills: [skill.skillId] },
          { limit: 3, includePartialMatches: false }
        );

        teamSuggestions.push({
          skill: skill.skillName,
          gap: skill.gap,
          suggestedResources: matches.map(m => ({
            resourceId: m.resourceId,
            resourceName: m.resourceName,
            score: m.overallScore,
            available: m.availableCapacity >= 50,
          })),
        });
      }

      res.json({
        data: {
          projectId,
          projectName: skillGap.projectName,
          currentCoverage: skillGap.overallCoverage,
          criticalGaps: skillGap.criticalGaps,
          teamSuggestions,
          overallRecommendations: skillGap.recommendations,
        },
      });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;

