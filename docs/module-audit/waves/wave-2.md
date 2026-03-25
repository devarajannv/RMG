# WAVE-2 Report — Operational Core

Last Updated: 2026-03-04 08:25:00 UTC
Status: COMPLETE (Deep Audit Wave 2)

## Modules
- `resources`
- `allocations`
- `projects`
- `clients`
- `contracts`
- `timesheets`

## Score Summary (Deep Audit)
- `resources`: 73.8
- `allocations`: 70.4
- `projects`: 71.6
- `clients`: 74.2
- `contracts`: 67.8
- `timesheets`: 74.0
- Wave average: 72.0/100

## Key Findings
1. Timesheets scoped-read fallback is remediated: scoped users without linked resources now fail closed, and explicit resource queries require access checks.
2. Contracts ownership drift is remediated: `/api/v1/contracts` now mounts through canonical `modules/contracts` runtime entrypoint.
3. Allocations bulk-create conflict-bypass is remediated: bulk path now enforces standard conflict checks.
4. Projects and resources need stronger update-time referential validation parity and count/filter contract correctness.

## Risk Heatmap
- Medium: referential validation parity gaps (`projects`, `resources`), non-transactional multi-step workflows (`contracts`, `timesheets`).
- Low: performance headroom constraints in iterative availability and linkage routines.

## Remediation Priorities
- P1: Add referential validation parity + transaction hardening across Wave 2 mutating flows.
