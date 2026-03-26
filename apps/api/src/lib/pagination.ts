/**
 * Pagination Utility — M-16
 * 
 * Enforces safe pagination defaults across all endpoints.
 * Clamps limit to a configurable max (default: 100).
 */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;
const MIN_PAGE = 1;

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Parse and validate pagination query parameters.
 * @param query - Express req.query object
 * @param maxLimit - Override max limit (default: 100)
 */
export function parsePaginationParams(
  query: Record<string, unknown>,
  maxLimit: number = MAX_LIMIT
): PaginationParams {
  let page = parseInt(String(query.page || ''), 10);
  let limit = parseInt(String(query.limit || ''), 10);

  // Validate and clamp
  if (isNaN(page) || page < MIN_PAGE) {
    page = DEFAULT_PAGE;
  }

  if (isNaN(limit) || limit < MIN_LIMIT) {
    limit = DEFAULT_LIMIT;
  }

  // Enforce max limit
  limit = Math.min(limit, maxLimit);

  const offset = (page - 1) * limit;

  return { page, limit, offset };
}
