/**
 * Express type augmentations
 * Extends Express Request with AuthUser and request tracking fields
 */

import 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      tenantId: string;
      email: string;
      roles: string[];
      permissions: string[];
    };
    tenantId?: string;
    requestId: string;
    correlationId?: string;
    startTime: number;
  }
}
