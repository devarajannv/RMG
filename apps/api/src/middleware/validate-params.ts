/**
 * UUID Parameter Validation Middleware — M-15
 * 
 * Validates that path parameters are valid UUIDs before they reach controllers.
 * Returns 400 with clean error instead of Prisma 500 errors.
 */

import { Request, Response, NextFunction } from 'express';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Middleware that validates specific route params are valid UUIDs.
 * @param paramNames - Name(s) of route params to validate (default: ['id'])
 * 
 * Usage:
 *   router.get('/:id', validateUuidParams(), controller.get);
 *   router.get('/:userId/roles/:roleId', validateUuidParams('userId', 'roleId'), ...);
 */
export function validateUuidParams(...paramNames: string[]) {
  const names = paramNames.length > 0 ? paramNames : ['id'];

  return (req: Request, res: Response, next: NextFunction): void => {
    for (const name of names) {
      const value = req.params[name];
      if (value && !UUID_REGEX.test(value)) {
        res.status(400).json({
          error: `Invalid ${name} format — expected UUID`,
          code: 'VALIDATION_ERROR',
        });
        return;
      }
    }
    next();
  };
}
