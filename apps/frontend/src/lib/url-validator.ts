/**
 * URL Validator Utility
 * H-21: Prevent javascript: and data: protocol exploitation via window.open
 */

/**
 * Validates that a URL is safe to open (HTTP/HTTPS only)
 * Prevents javascript:, data:, and other potentially dangerous protocol handlers
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Safely opens a URL in a new tab, validating the protocol first
 * @returns true if the URL was opened, false if it was blocked
 */
export function safeWindowOpen(url: string): boolean {
  if (!isSafeUrl(url)) {
    console.error('Blocked unsafe URL:', url);
    return false;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}
