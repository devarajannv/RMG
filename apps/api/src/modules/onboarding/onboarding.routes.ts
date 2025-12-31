/**
 * Onboarding Routes
 * 
 * API routes for Organization Onboarding module
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as Controller from './onboarding.controller';

const router = Router();

// =============================================================================
// PUBLIC ROUTES (No Auth)
// =============================================================================

// Accept invitation (public)
router.post('/invitations/accept', Controller.acceptInvitation);

// Get industries list (public reference data)
router.get('/industries', Controller.getIndustries);

// =============================================================================
// AUTHENTICATED ROUTES
// =============================================================================

// Apply authentication to all routes below
router.use(authenticate);

// -----------------------------------------------------------------------------
// Progress & Orchestration
// -----------------------------------------------------------------------------
router.get('/progress', Controller.getProgress);
router.get('/summary', Controller.getSummary);
router.get('/phases', Controller.getPhasesConfig);
router.post('/steps/complete', Controller.completeStep);
router.post('/steps/skip', Controller.skipStep);
router.post('/initialize-defaults', Controller.initializeDefaults);

// -----------------------------------------------------------------------------
// Phase 1: Identity
// -----------------------------------------------------------------------------
router.get('/profile', Controller.getProfile);
router.put('/profile', Controller.createOrUpdateProfile);
router.patch('/profile/branding', Controller.updateBranding);
router.patch('/profile/regional', Controller.updateRegionalSettings);

// -----------------------------------------------------------------------------
// Phase 2: Structure
// -----------------------------------------------------------------------------

// Departments
router.get('/departments', Controller.getDepartments);
router.get('/departments/:id', Controller.getDepartmentById);
router.post('/departments', Controller.createDepartment);
router.put('/departments/:id', Controller.updateDepartment);
router.delete('/departments/:id', Controller.deleteDepartment);

// Teams
router.get('/teams', Controller.getTeams);
router.post('/teams', Controller.createTeam);
router.put('/teams/:id', Controller.updateTeam);
router.delete('/teams/:id', Controller.deleteTeam);

// Cost Centers
router.get('/cost-centers', Controller.getCostCenters);
router.post('/cost-centers', Controller.createCostCenter);
router.put('/cost-centers/:id', Controller.updateCostCenter);
router.delete('/cost-centers/:id', Controller.deleteCostCenter);

// -----------------------------------------------------------------------------
// Phase 3: Business Roles
// -----------------------------------------------------------------------------

// Business Roles
router.get('/business-roles', Controller.getBusinessRoles);
router.post('/business-roles', Controller.createBusinessRole);
router.put('/business-roles/:id', Controller.updateBusinessRole);
router.delete('/business-roles/:id', Controller.deleteBusinessRole);

// Grade Bands
router.get('/grade-bands', Controller.getGradeBands);
router.post('/grade-bands', Controller.createGradeBand);
router.put('/grade-bands/:id', Controller.updateGradeBand);
router.delete('/grade-bands/:id', Controller.deleteGradeBand);

// -----------------------------------------------------------------------------
// Phase 4: People
// -----------------------------------------------------------------------------

// Resources
router.get('/resources', Controller.getResources);
router.get('/resources/stats', Controller.getPeopleStats);
router.get('/resources/export', Controller.exportResources);
router.post('/resources/validate-import', Controller.validateImport);
router.post('/resources/import', Controller.importResources);
router.get('/resources/:id', Controller.getResourceById);
router.post('/resources', Controller.createResource);
router.put('/resources/:id', Controller.updateResource);
router.delete('/resources/:id', Controller.deleteResource);

// User accounts
router.post('/users/create-for-resource', Controller.createUserForResource);

// Invitations
router.get('/invitations', Controller.getInvitations);
router.post('/invitations', Controller.sendInvitation);
router.delete('/invitations/:id', Controller.revokeInvitation);

// -----------------------------------------------------------------------------
// Phase 5: Governance
// -----------------------------------------------------------------------------

router.get('/governance/status', Controller.getGovernanceStatus);

// Delegation Rules
router.get('/delegation-rules', Controller.getDelegationRules);
router.post('/delegation-rules', Controller.createDelegationRule);
router.put('/delegation-rules/:id', Controller.updateDelegationRule);
router.delete('/delegation-rules/:id', Controller.deleteDelegationRule);

export default router;
