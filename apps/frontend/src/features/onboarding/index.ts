/**
 * Onboarding Feature Module
 * 
 * Organization Onboarding - Phase 0 of the product.
 * Guides new tenants through initial setup.
 */

// Types
export * from './types';

// API Hooks
export * from './api';

// Store
export { useOnboardingStore, useCurrentPhase, useCurrentStep, useExpandedSections } from './store';

// Components
export { 
  OnboardingWizard, 
  IdentityPhase, 
  StructurePhase, 
  RolesPhase, 
  PeoplePhase, 
  GovernancePhase 
} from './components';
