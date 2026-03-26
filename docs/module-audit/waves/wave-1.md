# WAVE-1 Report — Control Plane

Last Updated: 2026-02-25 05:13:00 UTC
Status: COMPLETE (Deep Audit Wave 1)

## Modules
- `auth`
- `users`
- `roles`
- `organization`
- `onboarding`
- `requests`

## Score Summary (Deep Audit)
- `auth`: 81.4
- `users`: 76.8
- `roles`: 74.1
- `organization`: 77.0
- `onboarding`: 77.2
- `requests`: 78.4
- Wave average: 77.5/100

## Key Findings
1. `users` remediation completed: strict Zod validation parity, tenant-safe role assignment checks, and tenant-guarded update mutation flow.
2. `requests` remediation completed: visibility-scope enforcement added in `getRequest` and strict request-id/action/update schema validation enforced on remediated controller paths.
3. `requests` code ergonomics hardening completed: request-type and workflow create paths now auto-generate valid unique codes when code is omitted, with deterministic conflict suffixing.
4. `auth` remediation completed: verification/reset email delivery integrated, token-in-body leakage removed, and verified-email middleware gate enforced.
5. `roles` remediation completed: role assignment/revoke now invalidates target refresh-token sessions and is validated with fast + higher-fidelity tests.

## Risk Heatmap
- High: side-effect operational TODOs in `requests` (notification/async execution paths).
- Medium: permission-check contract hardening remains open in `roles` (`/permissions/check`).
- Low: maintainability hotspots in large controllers/services (`onboarding`, `requests`).

## Remediation Priorities
- P1: Implement admin cancel override policy and close async side-effect TODOs in requests.
- P1: Harden `/permissions/check` contract and consolidate legacy/current permission aliases in roles.
- P1: Maintain and monitor auth mail delivery reliability and verification gate metrics.
