# WS-6 Migration & Reconciliation Runbook

Date: 2026-02-23  
Timestamp (UTC): 2026-02-23 12:35:00 UTC
Scope: Request audit taxonomy hardening + delegation override lifecycle rollout

## Objective
Provide a deterministic rollout sequence with reconciliation and rollback gates for tenant-safe deployment.

## Preconditions
- Production backup/snapshot completed and verified.
- API build and type-check are green.
- Pending migration exists: `20260223115000_extend_audit_action_taxonomy`.

## Rollout Sequence
1. Deploy schema migration:
   - `npm run migrate:deploy --workspace=@rmgaas/api`
2. Regenerate Prisma client (if build image does not auto-generate):
   - `npm run generate --workspace=@rmgaas/api`
3. Deploy API service code.
4. Run static audit guard:
   - `npm run audit:check:bypass --workspace=@rmgaas/api`
5. Run request-to-audit reconciliation:
   - `npm run audit:reconcile:requests --workspace=@rmgaas/api`

## Reconciliation Gate (Must Pass)
- Script: `apps/api/src/scripts/reconcile-request-audit.ts`
- Mapping validated:
  - `CREATED -> CREATE`
  - `UPDATED -> UPDATE`
  - `SUBMITTED -> SUBMIT`
  - `APPROVED -> APPROVE`
  - `REJECTED -> REJECT`
  - `RETURNED -> REQUEST_RETURNED`
  - `CANCELLED -> REQUEST_CANCELLED`
- Success criterion:
  - zero tenant/action deltas in mapped `RequestHistory` vs `AuditLog` counts.

## Rollback Plan
If any gate fails:
1. Stop rollout and keep write path in current version.
2. Roll back API deployment to prior version.
3. If migration side-effects require reversal, restore from database snapshot (enum additions are additive; prefer app rollback first).
4. Investigate and patch reconciliation mismatch before re-attempt.

## Evidence Capture
- Save command outputs from steps 4 and 5.
- Record timestamp, environment, operator, and git SHA in release notes.
- Attach mismatch table (if any) to incident/release ticket.
