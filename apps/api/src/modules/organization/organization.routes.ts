/**
 * Organization Routes
 */

import { Router } from 'express';
import { authenticate, requireRoles } from '../../middleware/auth';
import * as organizationController from './organization.controller';

const router = Router();

router.use(authenticate);

// L-01: Restrict org stats to admin roles
router.get('/stats', requireRoles('ADMIN', 'ORG_ADMIN'), organizationController.getOrganizationStats);
router.get('/billing-taxonomy', requireRoles('ADMIN', 'ORG_ADMIN'), organizationController.getBillingTaxonomy);
router.patch('/billing-taxonomy', requireRoles('ADMIN', 'ORG_ADMIN'), organizationController.updateBillingTaxonomy);
router.get('/document-taxonomy', requireRoles('ADMIN', 'ORG_ADMIN'), organizationController.getDocumentTaxonomy);
router.patch('/document-taxonomy', requireRoles('ADMIN', 'ORG_ADMIN'), organizationController.updateDocumentTaxonomy);

export default router;
