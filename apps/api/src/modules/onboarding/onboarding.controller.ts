/**
 * Onboarding Controller
 * 
 * HTTP handlers for all organization onboarding endpoints
 */

import { Request, Response, NextFunction } from 'express';

import * as IdentityService from './identity.service';
import * as StructureService from './structure.service';
import * as RolesService from './roles.service';
import * as PeopleService from './people.service';
import * as GovernanceService from './governance.service';
import * as OnboardingService from './onboarding.service';

// =============================================================================
// HELPERS
// =============================================================================

function getTenantId(req: Request): string {
  const tenantId = (req as any).user?.tenantId;
  if (!tenantId) throw new Error('Tenant ID not found');
  return tenantId;
}

function getUserId(req: Request): string {
  const userId = (req as any).user?.id;
  if (!userId) throw new Error('User ID not found');
  return userId;
}

// =============================================================================
// PROGRESS & ORCHESTRATION
// =============================================================================

export async function getProgress(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const progress = await OnboardingService.getOnboardingProgress(tenantId);
    res.json({ success: true, data: progress });
  } catch (error) {
    next(error);
  }
}

export async function getSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const summary = await OnboardingService.getOnboardingSummary(tenantId);
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
}

export async function completeStep(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const { phase, stepCode } = req.body;
    
    await OnboardingService.completeStep(tenantId, phase, stepCode, userId);
    res.json({ success: true, message: 'Step completed' });
  } catch (error) {
    next(error);
  }
}

export async function skipStep(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const { phase, stepCode } = req.body;
    
    await OnboardingService.skipStep(tenantId, phase, stepCode, userId);
    res.json({ success: true, message: 'Step skipped' });
  } catch (error) {
    next(error);
  }
}

export async function initializeDefaults(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const options = req.body;
    
    const result = await OnboardingService.initializeDefaults(tenantId, options);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getPhasesConfig(_req: Request, res: Response, next: NextFunction) {
  try {
    const config = OnboardingService.getPhasesConfig();
    res.json({ success: true, data: config });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// PHASE 1: IDENTITY
// =============================================================================

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const profile = await IdentityService.getTenantProfile(tenantId);
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
}

export async function createOrUpdateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const profile = await IdentityService.upsertTenantProfile(tenantId, req.body);
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
}

export async function updateBranding(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const profile = await IdentityService.updateBranding(tenantId, req.body);
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
}

export async function updateRegionalSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const profile = await IdentityService.updateRegionalSettings(tenantId, req.body);
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
}

export async function getIndustries(_req: Request, res: Response, next: NextFunction) {
  try {
    const industries = IdentityService.getIndustries();
    res.json({ success: true, data: industries });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// PHASE 2: STRUCTURE
// =============================================================================

// Departments
export async function getDepartments(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const departments = await StructureService.getDepartments(tenantId);
    res.json({ success: true, data: departments });
  } catch (error) {
    next(error);
  }
}

export async function getDepartmentById(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const department = await StructureService.getDepartmentById(tenantId, id);
    
    if (!department) {
      res.status(404).json({ success: false, message: 'Department not found' });
      return;
    }
    
    res.json({ success: true, data: department });
  } catch (error) {
    next(error);
  }
}

export async function createDepartment(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const department = await StructureService.createDepartment(tenantId, req.body);
    res.status(201).json({ success: true, data: department });
  } catch (error) {
    next(error);
  }
}

export async function updateDepartment(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const department = await StructureService.updateDepartment(tenantId, id, req.body);
    res.json({ success: true, data: department });
  } catch (error) {
    next(error);
  }
}

export async function deleteDepartment(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    await StructureService.deleteDepartment(tenantId, id);
    res.json({ success: true, message: 'Department deleted' });
  } catch (error) {
    next(error);
  }
}

// Teams
export async function getTeams(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const { departmentId } = req.query;
    const teams = await StructureService.getTeams(tenantId, departmentId as string | undefined);
    res.json({ success: true, data: teams });
  } catch (error) {
    next(error);
  }
}

export async function createTeam(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const team = await StructureService.createTeam(tenantId, req.body);
    res.status(201).json({ success: true, data: team });
  } catch (error) {
    next(error);
  }
}

export async function updateTeam(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const team = await StructureService.updateTeam(tenantId, id, req.body);
    res.json({ success: true, data: team });
  } catch (error) {
    next(error);
  }
}

export async function deleteTeam(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    await StructureService.deleteTeam(tenantId, id);
    res.json({ success: true, message: 'Team deleted' });
  } catch (error) {
    next(error);
  }
}

// Cost Centers
export async function getCostCenters(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const costCenters = await StructureService.getCostCenters(tenantId);
    res.json({ success: true, data: costCenters });
  } catch (error) {
    next(error);
  }
}

export async function createCostCenter(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const costCenter = await StructureService.createCostCenter(tenantId, req.body);
    res.status(201).json({ success: true, data: costCenter });
  } catch (error) {
    next(error);
  }
}

export async function updateCostCenter(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const costCenter = await StructureService.updateCostCenter(tenantId, id, req.body);
    res.json({ success: true, data: costCenter });
  } catch (error) {
    next(error);
  }
}

export async function deleteCostCenter(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    await StructureService.deleteCostCenter(tenantId, id);
    res.json({ success: true, message: 'Cost center deleted' });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// PHASE 3: BUSINESS ROLES
// =============================================================================

// Business Roles
export async function getBusinessRoles(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const roles = await RolesService.getBusinessRoles(tenantId);
    res.json({ success: true, data: roles });
  } catch (error) {
    next(error);
  }
}

export async function createBusinessRole(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const role = await RolesService.createBusinessRole(tenantId, req.body);
    res.status(201).json({ success: true, data: role });
  } catch (error) {
    next(error);
  }
}

export async function updateBusinessRole(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const role = await RolesService.updateBusinessRole(tenantId, id, req.body);
    res.json({ success: true, data: role });
  } catch (error) {
    next(error);
  }
}

export async function deleteBusinessRole(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    await RolesService.deleteBusinessRole(tenantId, id);
    res.json({ success: true, message: 'Business role deleted' });
  } catch (error) {
    next(error);
  }
}

// Grade Bands
export async function getGradeBands(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const grades = await RolesService.getGradeBands(tenantId);
    res.json({ success: true, data: grades });
  } catch (error) {
    next(error);
  }
}

export async function createGradeBand(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const grade = await RolesService.createGradeBand(tenantId, req.body);
    res.status(201).json({ success: true, data: grade });
  } catch (error) {
    next(error);
  }
}

export async function updateGradeBand(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const grade = await RolesService.updateGradeBand(tenantId, id, req.body);
    res.json({ success: true, data: grade });
  } catch (error) {
    next(error);
  }
}

export async function deleteGradeBand(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    await RolesService.deleteGradeBand(tenantId, id);
    res.json({ success: true, message: 'Grade band deleted' });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// PHASE 4: PEOPLE
// =============================================================================

export async function getResources(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const { status, departmentId, search, page, limit } = req.query;
    
    const result = await PeopleService.getResources(tenantId, {
      status: status as any,
      departmentId: departmentId as string,
      search: search as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    
    res.json({ success: true, data: result.data, total: result.total });
  } catch (error) {
    next(error);
  }
}

export async function getResourceById(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const resource = await PeopleService.getResourceById(tenantId, id);
    
    if (!resource) {
      res.status(404).json({ success: false, message: 'Resource not found' });
      return;
    }
    
    res.json({ success: true, data: resource });
  } catch (error) {
    next(error);
  }
}

export async function createResource(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const resource = await PeopleService.createResource(tenantId, req.body);
    res.status(201).json({ success: true, data: resource });
  } catch (error) {
    next(error);
  }
}

export async function updateResource(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const resource = await PeopleService.updateResource(tenantId, id, req.body);
    res.json({ success: true, data: resource });
  } catch (error) {
    next(error);
  }
}

export async function deleteResource(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    await PeopleService.deleteResource(tenantId, id);
    res.json({ success: true, message: 'Resource deleted' });
  } catch (error) {
    next(error);
  }
}

// User Account
export async function createUserForResource(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const result = await PeopleService.createUserForResource(tenantId, req.body, userId);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// Invitations
export async function getInvitations(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const { status } = req.query;
    const invitations = await PeopleService.getInvitations(tenantId, status as any);
    res.json({ success: true, data: invitations });
  } catch (error) {
    next(error);
  }
}

export async function sendInvitation(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const invitation = await PeopleService.sendInvitation(tenantId, req.body, userId);
    res.status(201).json({ success: true, data: invitation });
  } catch (error) {
    next(error);
  }
}

export async function revokeInvitation(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    await PeopleService.revokeInvitation(tenantId, id);
    res.json({ success: true, message: 'Invitation revoked' });
  } catch (error) {
    next(error);
  }
}

// Public endpoint - no auth required
export async function acceptInvitation(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, password } = req.body;
    const result = await PeopleService.acceptInvitation(token, password);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// Import/Export
export async function validateImport(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const { rows } = req.body;
    const result = await PeopleService.validateImport(tenantId, rows);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function importResources(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const { rows } = req.body;
    const result = await PeopleService.importResources(tenantId, rows);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function exportResources(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const data = await PeopleService.exportResources(tenantId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getPeopleStats(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const stats = await PeopleService.getPeopleStats(tenantId);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// PHASE 5: GOVERNANCE
// =============================================================================

// Delegation Rules
export async function getDelegationRules(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const { active } = req.query;
    const rules = await GovernanceService.getDelegationRules(tenantId, active === 'true');
    res.json({ success: true, data: rules });
  } catch (error) {
    next(error);
  }
}

export async function createDelegationRule(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const rule = await GovernanceService.createDelegationRule(tenantId, req.body);
    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
}

export async function updateDelegationRule(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const rule = await GovernanceService.updateDelegationRule(tenantId, id, req.body);
    res.json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
}

export async function deleteDelegationRule(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    await GovernanceService.deleteDelegationRule(tenantId, id);
    res.json({ success: true, message: 'Delegation rule deleted' });
  } catch (error) {
    next(error);
  }
}

export async function getGovernanceStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId(req);
    const status = await GovernanceService.getGovernanceStatus(tenantId);
    res.json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
}
