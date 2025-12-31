/**
 * Identity Service
 * 
 * Handles Phase 1 of Organization Onboarding: Organization Identity
 * - Tenant profile management
 * - Branding settings
 * - Regional settings
 */

import prisma from '../../lib/prisma';
import { logger } from '../../lib/logger';
import type { EmployeeCountRange, RevenueRange, OnboardingStatus } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

export interface TenantProfileInput {
  // Legal Entity
  legalName: string;
  tradingName?: string;
  registrationNo?: string;
  taxId?: string;
  
  // Industry & Size
  industry: string;
  industryCode?: string;
  employeeCount?: EmployeeCountRange;
  annualRevenue?: RevenueRange;
  
  // Contact
  primaryEmail: string;
  primaryPhone?: string;
  website?: string;
  
  // Address
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface BrandingInput {
  secondaryColor?: string;
  accentColor?: string;
  faviconUrl?: string;
}

export interface RegionalInput {
  dateFormat?: string;
  timeFormat?: string;
  weekStartDay?: number;
}

// =============================================================================
// TENANT PROFILE
// =============================================================================

/**
 * Get tenant profile
 */
export async function getTenantProfile(tenantId: string) {
  return prisma.tenantProfile.findUnique({
    where: { tenantId },
  });
}

/**
 * Create tenant profile
 */
export async function createTenantProfile(tenantId: string, input: TenantProfileInput) {
  logger.info('Creating tenant profile', { tenantId });
  
  const profile = await prisma.tenantProfile.create({
    data: {
      tenantId,
      legalName: input.legalName,
      tradingName: input.tradingName,
      registrationNo: input.registrationNo,
      taxId: input.taxId,
      industry: input.industry,
      industryCode: input.industryCode,
      employeeCount: input.employeeCount || 'SMALL',
      annualRevenue: input.annualRevenue,
      primaryEmail: input.primaryEmail,
      primaryPhone: input.primaryPhone,
      website: input.website,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      city: input.city,
      state: input.state,
      country: input.country || 'India',
      postalCode: input.postalCode,
    },
  });
  
  logger.info('Tenant profile created', { tenantId, profileId: profile.id });
  return profile;
}

/**
 * Update tenant profile
 */
export async function updateTenantProfile(tenantId: string, input: Partial<TenantProfileInput>) {
  logger.info('Updating tenant profile', { tenantId });
  
  return prisma.tenantProfile.update({
    where: { tenantId },
    data: {
      ...(input.legalName && { legalName: input.legalName }),
      ...(input.tradingName !== undefined && { tradingName: input.tradingName }),
      ...(input.registrationNo !== undefined && { registrationNo: input.registrationNo }),
      ...(input.taxId !== undefined && { taxId: input.taxId }),
      ...(input.industry && { industry: input.industry }),
      ...(input.industryCode !== undefined && { industryCode: input.industryCode }),
      ...(input.employeeCount && { employeeCount: input.employeeCount }),
      ...(input.annualRevenue !== undefined && { annualRevenue: input.annualRevenue }),
      ...(input.primaryEmail && { primaryEmail: input.primaryEmail }),
      ...(input.primaryPhone !== undefined && { primaryPhone: input.primaryPhone }),
      ...(input.website !== undefined && { website: input.website }),
      ...(input.addressLine1 !== undefined && { addressLine1: input.addressLine1 }),
      ...(input.addressLine2 !== undefined && { addressLine2: input.addressLine2 }),
      ...(input.city !== undefined && { city: input.city }),
      ...(input.state !== undefined && { state: input.state }),
      ...(input.country !== undefined && { country: input.country }),
      ...(input.postalCode !== undefined && { postalCode: input.postalCode }),
    },
  });
}

/**
 * Create or update tenant profile
 */
export async function upsertTenantProfile(tenantId: string, input: TenantProfileInput) {
  const existing = await getTenantProfile(tenantId);
  if (existing) {
    return updateTenantProfile(tenantId, input);
  }
  return createTenantProfile(tenantId, input);
}

// =============================================================================
// BRANDING
// =============================================================================

/**
 * Update branding settings
 */
export async function updateBranding(tenantId: string, input: BrandingInput) {
  logger.info('Updating branding', { tenantId });
  
  return prisma.tenantProfile.update({
    where: { tenantId },
    data: {
      ...(input.secondaryColor !== undefined && { secondaryColor: input.secondaryColor }),
      ...(input.accentColor !== undefined && { accentColor: input.accentColor }),
      ...(input.faviconUrl !== undefined && { faviconUrl: input.faviconUrl }),
    },
  });
}

// =============================================================================
// REGIONAL SETTINGS
// =============================================================================

/**
 * Update regional settings
 */
export async function updateRegionalSettings(tenantId: string, input: RegionalInput) {
  logger.info('Updating regional settings', { tenantId });
  
  return prisma.tenantProfile.update({
    where: { tenantId },
    data: {
      ...(input.dateFormat !== undefined && { dateFormat: input.dateFormat }),
      ...(input.timeFormat !== undefined && { timeFormat: input.timeFormat }),
      ...(input.weekStartDay !== undefined && { weekStartDay: input.weekStartDay }),
    },
  });
}

// =============================================================================
// ONBOARDING STATUS
// =============================================================================

/**
 * Update onboarding status
 */
export async function updateOnboardingStatus(
  tenantId: string,
  status: OnboardingStatus,
  phase?: number
) {
  return prisma.tenantProfile.update({
    where: { tenantId },
    data: {
      onboardingStatus: status,
      ...(phase && { onboardingPhase: phase }),
      ...(status === 'IN_PROGRESS' && { onboardingStartedAt: new Date() }),
      ...(status === 'COMPLETED' && { onboardingCompletedAt: new Date() }),
    },
  });
}

/**
 * Get industries list
 */
export function getIndustries(): { code: string; name: string }[] {
  return [
    { code: 'IT', name: 'Information Technology' },
    { code: 'FIN', name: 'Financial Services' },
    { code: 'HC', name: 'Healthcare' },
    { code: 'MFG', name: 'Manufacturing' },
    { code: 'RET', name: 'Retail' },
    { code: 'EDU', name: 'Education' },
    { code: 'GOV', name: 'Government' },
    { code: 'TEL', name: 'Telecommunications' },
    { code: 'ENG', name: 'Engineering' },
    { code: 'CON', name: 'Consulting' },
    { code: 'OTH', name: 'Other' },
  ];
}
