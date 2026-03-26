#!/usr/bin/env bash
# M-18: npm audit enforcement script
# Run this in CI to fail builds with critical/high vulnerabilities
set -e

echo "🔍 Running npm audit for security vulnerabilities..."

# Run audit and capture exit code
# --audit-level=high means only fail on high/critical
npm audit --audit-level=high --omit=dev 2>/dev/null || {
  echo ""
  echo "❌ npm audit found high/critical vulnerabilities!"
  echo "   Run 'npm audit' for details"
  echo "   Run 'npm audit fix' to auto-fix where possible"
  exit 1
}

echo "✅ No high/critical vulnerabilities found"
