import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { parseISO } from 'date-fns';
import * as timesheetService from './timesheet.service';
import { authenticate } from '../../middleware/auth';

const router = Router();

// All timesheet routes require authentication
router.use(authenticate);

// ============================================================================
// Validation Schemas
// ============================================================================

const createEntrySchema = z.object({
  resourceId: z.string().uuid(),
  projectId: z.string().uuid(),
  allocationId: z.string().uuid().optional(),
  date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  hours: z.number().min(0).max(24),
  taskType: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  isBillable: z.boolean().optional(),
  isOvertime: z.boolean().optional(),
});

const updateEntrySchema = z.object({
  hours: z.number().min(0).max(24).optional(),
  taskType: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  isBillable: z.boolean().optional(),
  isOvertime: z.boolean().optional(),
});

const saveWeeklySchema = z.object({
  resourceId: z.string().uuid(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  entries: z.array(z.object({
    projectId: z.string().uuid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    hours: z.number().min(0).max(24),
    isBillable: z.boolean().optional(),
    description: z.string().max(1000).optional(),
  })),
});

const submitTimesheetSchema = z.object({
  resourceId: z.string().uuid(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const approveRejectSchema = z.object({
  periodId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

// ============================================================================
// Middleware
// ============================================================================

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================================================
// Routes
// ============================================================================

// Get timesheet entries with filters
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });

    const { resourceId, projectId, startDate, endDate, status, page, limit } = req.query;

    const result = await timesheetService.getTimesheetEntries({
      tenantId,
      resourceId: resourceId as string,
      projectId: projectId as string,
      startDate: startDate ? parseISO(startDate as string) : undefined,
      endDate: endDate ? parseISO(endDate as string) : undefined,
      status: status ? (status as string).split(',') as any : undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });

    res.json(result);
  })
);

// Get weekly timesheet view
router.get(
  '/weekly',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });

    const { resourceId, weekStart } = req.query;

    if (!resourceId) {
      return res.status(400).json({ error: 'resourceId is required' });
    }

    const week = weekStart ? parseISO(weekStart as string) : new Date();
    const result = await timesheetService.getWeeklyTimesheet(
      tenantId,
      resourceId as string,
      week
    );

    res.json({ data: result });
  })
);

// Create a single timesheet entry
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });

    const validated = createEntrySchema.parse(req.body);
    const result = await timesheetService.createTimesheetEntry({
      tenantId,
      resourceId: validated.resourceId,
      projectId: validated.projectId,
      allocationId: validated.allocationId,
      date: parseISO(validated.date),
      hours: validated.hours,
      taskType: validated.taskType,
      description: validated.description,
      isBillable: validated.isBillable,
      isOvertime: validated.isOvertime,
    });

    res.status(201).json({ data: result });
  })
);

// Update a timesheet entry
router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const validated = updateEntrySchema.parse(req.body);

    const result = await timesheetService.updateTimesheetEntry(id, tenantId, validated);
    res.json({ data: result });
  })
);

// Delete a timesheet entry
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    await timesheetService.deleteTimesheetEntry(id, tenantId);
    res.status(204).send();
  })
);

// Save weekly timesheet (bulk)
router.post(
  '/weekly/save',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });

    const validated = saveWeeklySchema.parse(req.body);
    const result = await timesheetService.saveWeeklyTimesheet(
      tenantId,
      validated.resourceId,
      parseISO(validated.weekStart),
      validated.entries
    );

    res.json({ data: result, message: `Saved ${result.length} entries` });
  })
);

// Submit timesheet
router.post(
  '/submit',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });

    const validated = submitTimesheetSchema.parse(req.body);
    const result = await timesheetService.submitTimesheet(
      tenantId,
      validated.resourceId,
      parseISO(validated.weekStart)
    );

    res.json({ data: result, message: 'Timesheet submitted for approval' });
  })
);

// Get pending approvals
router.get(
  '/pending-approvals',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });

    // For managers, filter to their direct reports
    const result = await timesheetService.getPendingApprovals(tenantId, userId);
    res.json({ data: result });
  })
);

// Approve timesheet
router.post(
  '/approve',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(401).json({ error: 'Unauthorized' });

    const { periodId } = approveRejectSchema.parse(req.body);
    const result = await timesheetService.approveTimesheet(tenantId, periodId, userId);
    res.json({ data: result, message: 'Timesheet approved' });
  })
);

// Reject timesheet
router.post(
  '/reject',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(401).json({ error: 'Unauthorized' });

    const { periodId, reason } = approveRejectSchema.parse(req.body);
    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const result = await timesheetService.rejectTimesheet(tenantId, periodId, userId, reason);
    res.json({ data: result, message: 'Timesheet rejected' });
  })
);

// Get timesheet statistics
router.get(
  '/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });

    const { resourceId, startDate, endDate } = req.query;

    const result = await timesheetService.getTimesheetStats(
      tenantId,
      resourceId as string,
      startDate ? parseISO(startDate as string) : undefined,
      endDate ? parseISO(endDate as string) : undefined
    );

    res.json({ data: result });
  })
);

export default router;

