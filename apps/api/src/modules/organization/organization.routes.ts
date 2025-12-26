/**
 * Organization Routes
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as organizationController from './organization.controller';

const router = Router();

router.use(authenticate);

router.get('/stats', organizationController.getOrganizationStats);

export default router;
