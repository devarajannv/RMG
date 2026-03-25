/**
 * URL Validator — H-04: Prevent SSRF via webhook URL validation
 * 
 * Validates that URLs are:
 * 1. Valid parseable URLs
 * 2. Using https:// (or http:// in development)
 * 3. Not targeting internal/private IP ranges
 * 4. Not using dangerous protocols (file://, ftp://, etc.)
 */

import { resolve } from 'dns';
import { promisify } from 'util';

const dnsResolve = promisify(resolve);

// Private/internal IP ranges (RFC 1918, RFC 4193, loopback, link-local, etc.)
const PRIVATE_IP_PATTERNS = [
  /^127\./,                            // Loopback
  /^10\./,                             // 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\./,       // 172.16.0.0/12
  /^192\.168\./,                       // 192.168.0.0/16
  /^169\.254\./,                       // Link-local
  /^0\./,                              // 0.0.0.0/8
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // Carrier-grade NAT
  /^::1$/,                             // IPv6 loopback
  /^fe80:/i,                           // IPv6 link-local
  /^fc00:/i,                           // IPv6 unique local
  /^fd/i,                              // IPv6 unique local
];

const BLOCKED_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',           // GCP metadata
  'instance-data',                      // AWS metadata alias
];

const ALLOWED_PROTOCOLS = ['https:'];
const DEV_ALLOWED_PROTOCOLS = ['https:', 'http:'];

function isPrivateIp(ip: string): boolean {
  return PRIVATE_IP_PATTERNS.some(pattern => pattern.test(ip));
}

function isBlockedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return BLOCKED_HOSTNAMES.some(blocked => lower === blocked || lower.endsWith(`.${blocked}`));
}

/**
 * Validates a webhook URL is safe to send requests to.
 * @returns null if valid, error message string if invalid
 */
export function validateWebhookUrl(url: string, isDev: boolean = false): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'Invalid URL format';
  }

  // Check protocol
  const allowedProtocols = isDev ? DEV_ALLOWED_PROTOCOLS : ALLOWED_PROTOCOLS;
  if (!allowedProtocols.includes(parsed.protocol)) {
    return `URL must use ${allowedProtocols.join(' or ')} protocol`;
  }

  // Check for blocked hostnames
  if (isBlockedHostname(parsed.hostname)) {
    return 'URL hostname is not allowed';
  }

  // Check if hostname is an IP address and if it's private
  if (isPrivateIp(parsed.hostname)) {
    return 'URL must not target private/internal IP addresses';
  }

  // Block AWS metadata endpoint (169.254.169.254)
  if (parsed.hostname === '169.254.169.254') {
    return 'URL must not target cloud metadata endpoints';
  }

  // Block username/password in URL
  if (parsed.username || parsed.password) {
    return 'URL must not contain credentials';
  }

  return null; // Valid
}

/**
 * Async validation with DNS resolution check.
 * Resolves the hostname and verifies the resolved IP is not private.
 */
export async function validateWebhookUrlWithDns(url: string, isDev: boolean = false): Promise<string | null> {
  const syncError = validateWebhookUrl(url, isDev);
  if (syncError) return syncError;

  const parsed = new URL(url);

  // Skip DNS check for raw IPs
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(parsed.hostname)) {
    return null; // Already checked by validateWebhookUrl
  }

  try {
    const addresses = await dnsResolve(parsed.hostname);
    for (const addr of addresses) {
      if (isPrivateIp(addr)) {
        return 'URL resolves to a private/internal IP address';
      }
    }
  } catch {
    // DNS resolution failure — allow (the webhook delivery will fail naturally)
    return null;
  }

  return null;
}
