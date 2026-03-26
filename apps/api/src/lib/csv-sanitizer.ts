/**
 * CSV Injection (Formula Injection) Prevention
 * H-11: Sanitize cell values to prevent formula injection in exported CSVs
 *
 * Dangerous characters that trigger formula execution in spreadsheet applications:
 * = (equals), + (plus), - (minus), @ (at), \t (tab), \r (carriage return)
 *
 * @see https://owasp.org/www-community/attacks/CSV_Injection
 */

const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r', '\n'];

/**
 * Sanitize a single cell value to prevent CSV injection
 * Prefixes dangerous values with a single quote (') which is the standard mitigation
 */
export function sanitizeCellValue(value: unknown): string {
  if (value === null || value === undefined) return '';

  const str = String(value);
  if (str.length === 0) return '';

  // Check if the first character is a dangerous formula prefix
  if (FORMULA_PREFIXES.includes(str[0])) {
    return `'${str}`;
  }

  return str;
}

/**
 * Sanitize an entire row of values
 */
export function sanitizeRow(row: Record<string, unknown>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    sanitized[key] = sanitizeCellValue(value);
  }
  return sanitized;
}

/**
 * Sanitize an array of rows for CSV export
 */
export function sanitizeForCsvExport(rows: Record<string, unknown>[]): Record<string, string>[] {
  return rows.map(sanitizeRow);
}

/**
 * Sanitize a value being imported from CSV
 * Strips leading formula characters rather than quoting them
 */
export function sanitizeImportValue(value: unknown): string {
  if (value === null || value === undefined) return '';

  let str = String(value).trim();

  // Strip leading dangerous characters for imports
  while (str.length > 0 && FORMULA_PREFIXES.includes(str[0])) {
    str = str.substring(1).trim();
  }

  return str;
}
