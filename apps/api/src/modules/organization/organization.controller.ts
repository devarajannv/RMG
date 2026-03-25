/**
 * Organization Controller
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as organizationService from './organization.service';

const updateBillingTaxonomySchema = z.object({
  allowedInvoicingModels: z.array(z.enum(['CONTRACT_LED', 'PROJECT_LED', 'HYBRID'])).min(1).optional(),
  allowedBillingTypes: z.array(z.string().min(1)).min(1).optional(),
  allowContractProjectLinkage: z.boolean().optional(),
});

const updateDocumentTaxonomySchema = z.object({
  allowedCategories: z.array(z.string().trim().min(1)).min(1).optional(),
});

export async function getOrganizationStats(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const stats = await organizationService.getOrganizationStats(tenantId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}

export async function getBillingTaxonomy(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const policy = await organizationService.getBillingTaxonomyPolicy(tenantId);

    res.json({
      success: true,
      data: policy,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateBillingTaxonomy(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    const input = updateBillingTaxonomySchema.parse(req.body);

    const policy = await organizationService.updateBillingTaxonomyPolicy(tenantId, userId, input);

    res.json({
      success: true,
      data: policy,
      message: 'Billing taxonomy policy updated',
    });
  } catch (error) {
    next(error);
  }
}

export async function getDocumentTaxonomy(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const policy = await organizationService.getDocumentTaxonomyPolicy(tenantId);

    res.json({
      success: true,
      data: policy,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateDocumentTaxonomy(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    const input = updateDocumentTaxonomySchema.parse(req.body);

    const policy = await organizationService.updateDocumentTaxonomyPolicy(tenantId, userId, input);

    res.json({
      success: true,
      data: policy,
      message: 'Document taxonomy policy updated',
    });
  } catch (error) {
    next(error);
  }
}
