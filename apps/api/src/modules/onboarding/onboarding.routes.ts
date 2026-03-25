/**
 * Onboarding Routes
 * 
 * API routes for Organization Onboarding module
 */

import { Router } from 'express';
import { authenticate, requireRoles } from '../../middleware/auth';
import { invitationAcceptLimiter } from '../../middleware/rateLimiter';
import { rateLimit } from 'express-rate-limit';
import * as Controller from './onboarding.controller';

const router = Router();

// M-05: Rate limiter for public onboarding endpoints
const publicOnboardingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

// =============================================================================
// PUBLIC ROUTES (No Auth)
// =============================================================================

// Accept invitation (public)
router.post('/invitations/accept', invitationAcceptLimiter, Controller.acceptInvitation);

// Get industries list (public reference data, M-05: rate limited)
router.get('/industries', publicOnboardingLimiter, Controller.getIndustries);

// =============================================================================
// AUTHENTICATED ROUTES
// =============================================================================

// Apply authentication to all routes below
router.use(authenticate);

// Org admin guard for all onboarding write operations
const orgAdmin = requireRoles('ADMIN', 'ORG_ADMIN');

// -----------------------------------------------------------------------------
// Progress & Orchestration
// -----------------------------------------------------------------------------
router.get('/progress', Controller.getProgress);
router.get('/summary', Controller.getSummary);
router.get('/phases', Controller.getPhasesConfig);
router.post('/steps/complete', orgAdmin, Controller.completeStep);
router.post('/steps/skip', orgAdmin, Controller.skipStep);
router.post('/initialize-defaults', orgAdmin, Controller.initializeDefaults);

// -----------------------------------------------------------------------------
// Phase 1: Identity
// -----------------------------------------------------------------------------
router.get('/profile', Controller.getProfile);
router.put('/profile', orgAdmin, Controller.createOrUpdateProfile);
router.patch('/profile/branding', orgAdmin, Controller.updateBranding);
router.patch('/profile/regional', orgAdmin, Controller.updateRegionalSettings);

// -----------------------------------------------------------------------------
// Phase 2: Structure
// -----------------------------------------------------------------------------

// Departments
router.get('/departments', Controller.getDepartments);
router.get('/departments/:id', Controller.getDepartmentById);
router.post('/departments', orgAdmin, Controller.createDepartment);
router.put('/departments/:id', orgAdmin, Controller.updateDepartment);
router.delete('/departments/:id', orgAdmin, Controller.deleteDepartment);

// Teams
router.get('/teams', Controller.getTeams);
router.post('/teams', orgAdmin, Controller.createTeam);
router.put('/teams/:id', orgAdmin, Controller.updateTeam);
router.delete('/teams/:id', orgAdmin, Controller.deleteTeam);

// Cost Centers
router.get('/cost-centers', Controller.getCostCenters);
router.post('/cost-centers', orgAdmin, Controller.createCostCenter);
router.put('/cost-centers/:id', orgAdmin, Controller.updateCostCenter);
router.delete('/cost-centers/:id', orgAdmin, Controller.deleteCostCenter);

// -----------------------------------------------------------------------------
// Phase 3: Business Roles
// -----------------------------------------------------------------------------

// Business Roles
router.get('/business-roles', Controller.getBusinessRoles);
router.post('/business-roles', orgAdmin, Controller.createBusinessRole);
router.put('/business-roles/:id', orgAdmin, Controller.updateBusinessRole);
router.delete('/business-roles/:id', orgAdmin, Controller.deleteBusinessRole);

// Grade Bands — M-07: sensitive salary data requires admin access
router.get('/grade-bands', orgAdmin, Controller.getGradeBands);
router.post('/grade-bands', orgAdmin, Controller.createGradeBand);
router.put('/grade-bands/:id', orgAdmin, Controller.updateGradeBand);
router.delete('/grade-bands/:id', orgAdmin, Controller.deleteGradeBand);

// -----------------------------------------------------------------------------
// Phase 4: People
// -----------------------------------------------------------------------------

// Resources
router.get('/resources', Controller.getResources);
router.get('/resources/stats', Controller.getPeopleStats);
// M-07: Export contains PII — requires admin access
router.get('/resources/export', orgAdmin, Controller.exportResources);
router.post('/resources/validate-import', orgAdmin, Controller.validateImport);
router.post('/resources/import', orgAdmin, Controller.importResources);
router.get('/resources/:id', Controller.getResourceById);
router.post('/resources', orgAdmin, Controller.createResource);
router.put('/resources/:id', orgAdmin, Controller.updateResource);
router.delete('/resources/:id', orgAdmin, Controller.deleteResource);

// User accounts
router.post('/users/create-for-resource', orgAdmin, Controller.createUserForResource);

// Invitations — M-07: contains emails, requires admin access
router.get('/invitations', orgAdmin, Controller.getInvitations);
router.post('/invitations', orgAdmin, Controller.sendInvitation);
router.delete('/invitations/:id', orgAdmin, Controller.revokeInvitation);

// -----------------------------------------------------------------------------
// Phase 5: Governance
// -----------------------------------------------------------------------------

router.get('/governance/status', Controller.getGovernanceStatus);

// Delegation Rules
// Delegation Rules — M-07: governance config requires admin access
router.get('/delegation-rules', orgAdmin, Controller.getDelegationRules);
router.post('/delegation-rules', orgAdmin, Controller.createDelegationRule);
router.put('/delegation-rules/:id', orgAdmin, Controller.updateDelegationRule);
router.delete('/delegation-rules/:id', orgAdmin, Controller.deleteDelegationRule);

export default router;
