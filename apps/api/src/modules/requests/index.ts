/**
 * Request Flow Module
 * Enterprise request and approval workflow system
 */

import requestRoutes from './request.routes';
import requestTypesRoutes from './request-types.routes';
import approvalChainRoutes from './approval-chain.routes';
import delegationRoutes from './delegation.routes';
import slaRoutes from './sla.routes';
import notificationRoutes from './notification.routes';

export { 
  requestRoutes, 
  requestTypesRoutes, 
  approvalChainRoutes, 
  delegationRoutes, 
  slaRoutes,
  notificationRoutes 
};
export * as requestService from './request.service';
export * as approvalChainService from './approval-chain.service';
export * as slaService from './sla.service';
export * as notificationService from './notification.service';
