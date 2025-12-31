/**
 * Onboarding Module
 * 
 * Organization Onboarding - Phase 0 of RMGaaS
 * Handles the complete setup flow for new tenants
 */

// Services
export * as IdentityService from './identity.service';
export * as StructureService from './structure.service';
export * as RolesService from './roles.service';
export * as PeopleService from './people.service';
export * as GovernanceService from './governance.service';
export * as OnboardingService from './onboarding.service';

// Controller
export * as OnboardingController from './onboarding.controller';

// Routes
export { default as onboardingRoutes } from './onboarding.routes';
