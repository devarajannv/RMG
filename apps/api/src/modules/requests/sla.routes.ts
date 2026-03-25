/**
 * SLA Routes
 * API routes for SLA management
 */

import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import * as controller from './sla.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================================================
// Business Hours
// ============================================================================

/**
 * @route GET /api/v1/sla/business-hours
 * @desc Get business hours configuration
 * @access Private
 */
router.get('/business-hours', authorize('sla:read'), asyncHandler(controller.getBusinessHours));

/**
 * @route PUT /api/v1/sla/business-hours
 * @desc Update business hours configuration
 * @access Private (Admin)
 */
router.put('/business-hours', authorize('sla:manage'), asyncHandler(controller.updateBusinessHours));

// ============================================================================
// Holidays
// ============================================================================

/**
 * @route GET /api/v1/sla/holidays
 * @desc List holidays
 * @access Private
 */
router.get('/holidays', authorize('sla:read'), asyncHandler(controller.listHolidays));

/**
 * @route POST /api/v1/sla/holidays
 * @desc Add holiday
 * @access Private (Admin)
 */
router.post('/holidays', authorize('sla:manage'), asyncHandler(controller.addHoliday));

/**
 * @route DELETE /api/v1/sla/holidays/:id
 * @desc Remove holiday
 * @access Private (Admin)
 */
router.delete('/holidays/:id', authorize('sla:manage'), asyncHandler(controller.removeHoliday));

// ============================================================================
// Request SLA
// ============================================================================

/**
 * @route GET /api/v1/sla/requests/:id/calculate
 * @desc Calculate SLA for a request
 * @access Private
 */
router.get('/requests/:id/calculate', authorize('sla:read'), asyncHandler(controller.calculateRequestSla));

/**
 * @route POST /api/v1/sla/requests/:id/pause
 * @desc Pause SLA for a request
 * @access Private
 */
router.post('/requests/:id/pause', authorize('sla:manage'), asyncHandler(controller.pauseRequestSla));

/**
 * @route POST /api/v1/sla/requests/:id/resume
 * @desc Resume SLA for a request
 * @access Private
 */
router.post('/requests/:id/resume', authorize('sla:manage'), asyncHandler(controller.resumeRequestSla));

// ============================================================================
// Reports
// ============================================================================

/**
 * @route GET /api/v1/sla/reports/compliance
 * @desc Get SLA compliance report
 * @access Private
 */
router.get('/reports/compliance', authorize('sla:read'), asyncHandler(controller.getSlaComplianceReport));

/**
 * @route GET /api/v1/sla/reports/breaches
 * @desc Get SLA breach summary
 * @access Private
 */
router.get('/reports/breaches', authorize('sla:read'), asyncHandler(controller.getSlaBreachSummary));

/**
 * @route POST /api/v1/sla/check-breaches
 * @desc Trigger SLA breach check
 * @access Private (Admin)
 */
router.post('/check-breaches', authorize('sla:manage'), asyncHandler(controller.checkSlaBreaches));

export default router;
