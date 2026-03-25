#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SCOPED_PATHS=(
  "apps/api/src/modules/allocations"
  "apps/api/src/modules/timesheets"
  "apps/api/src/modules/currency"
  "apps/api/src/modules/requests"
)

PATTERN='prisma\.auditLog\.create\('

matches=""
for path in "${SCOPED_PATHS[@]}"; do
  if [[ -d "$path" ]]; then
    result=$(grep -RInE "$PATTERN" "$path" || true)
    if [[ -n "$result" ]]; then
      matches+="$result"$'\n'
    fi
  fi
done

if [[ -n "$matches" ]]; then
  echo "❌ Direct audit log writes detected in scoped modules. Use createAuditLog helper instead:"
  echo "$matches"
  exit 1
fi

echo "✅ No direct prisma.auditLog.create usage found in scoped modules."
