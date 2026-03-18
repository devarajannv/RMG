# Frontend Defect Log

**Logged At**: March 16, 2026 14:08:08 UTC  
**Environment**: Development  
**Frontend URL**: `http://localhost:3000`  
**API URL**: `http://localhost:4000/api/v1`  
**Test Scope**: Screen 1, Login screen; Screen 2, Dashboard landing screen; Screen 3, Requests landing screen  
**Execution Method**: Playwright E2E (`logged-out` project)

---

## Execution Summary

| Area | Total | Passed | Failed | Notes |
|------|-------|--------|--------|-------|
| Login Screen | 9 | 7 | 2 | Two navigation defects confirmed |

Validated working behavior:
- login page renders expected copy and controls
- password visibility toggle works
- Remember me checkbox works
- Google SSO button is correctly disabled and labeled as coming soon
- valid sign-in works with seeded credentials
- invalid credentials show error feedback
- Microsoft 365 button starts auth flow

Additional execution:

| Area | Total | Passed | Failed | Notes |
|------|-------|--------|--------|-------|
| Dashboard Screen | 7 | 7 | 0 | No product defects confirmed after selector fix in test code |
| Requests Screen | 8 | 8 | 0 | No product defects confirmed; screen rendered correctly with zero seeded requests |

Validated working behavior:
- dashboard renders expected sections and KPI summary cards with sane numeric data
- currency selector changes successfully
- Refresh button works without breaking the screen
- quick navigation opens Bench Resources correctly
- quick navigation opens Upcoming Roll-offs correctly
- quick navigation opens Pipeline Projects correctly
- quick navigation opens In Notice resources correctly

Validated working behavior:
- requests landing screen renders heading, summary cards, tabs, filters, and primary CTA correctly
- request summary cards show sane numeric values
- tab switching works across All Requests, My Requests, and Pending My Approval
- search input accepts and clears text correctly
- status filter can be applied and cleared correctly
- type filter can be applied and cleared correctly
- New Request opens the create-request modal correctly
- request type selection opens the request form with expected actions
- Cancel closes the request form correctly

---

## Defects

### DEF-LOGIN-001: Forgot password link does not navigate

- **Status**: Open
- **Severity**: Medium
- **Area**: Authentication, login screen
- **Detected At**: March 16, 2026 13:43 UTC
- **Source Test**: `LOGIN-SCREEN-007`

**Observed behavior**
- Clicking `Forgot password?` leaves the user on `/login`.

**Expected behavior**
- User should navigate to `/forgot-password`.

**Reproduction steps**
1. Open `/login` while logged out.
2. Click `Forgot password?`.
3. Observe that the URL remains `/login`.

**Impact**
- Users cannot access password recovery from the login page.
- This blocks self-service recovery for locked-out users.

**Evidence**
- UI link exists in `apps/frontend/src/pages/LoginPage.tsx` and points to `/forgot-password`.
- No matching application route exists in `apps/frontend/src/App.tsx`.
- Catch-all routing redirects unmatched paths back into the default flow.

**Likely root cause**
- Missing route/page implementation for `/forgot-password`.

**Suggested fix**
- Add a public route and page for `/forgot-password`.
- Ensure the route is not swallowed by the catch-all redirect.

---

### DEF-LOGIN-002: Request Access link does not navigate

- **Status**: Open
- **Severity**: Medium
- **Area**: Authentication, login screen
- **Detected At**: March 16, 2026 13:43 UTC
- **Source Test**: `LOGIN-SCREEN-008`

**Observed behavior**
- Clicking `Request Access` leaves the user on `/login`.

**Expected behavior**
- User should navigate to `/register`.

**Reproduction steps**
1. Open `/login` while logged out.
2. Click `Request Access`.
3. Observe that the URL remains `/login`.

**Impact**
- New users cannot reach the access request or registration flow from the login page.
- This blocks onboarding entry from the primary public auth screen.

**Evidence**
- UI link exists in `apps/frontend/src/pages/LoginPage.tsx` and points to `/register`.
- No matching application route exists in `apps/frontend/src/App.tsx`.
- Catch-all routing redirects unmatched paths back into the default flow.

**Likely root cause**
- Missing route/page implementation for `/register`.

**Suggested fix**
- Add a public route and page for `/register`.
- Ensure the route is not swallowed by the catch-all redirect.

---

## Root Cause Pattern

Both open defects are navigation failures caused by linked public destinations being present in the login UI without corresponding router entries.

Affected code areas:
- `apps/frontend/src/pages/LoginPage.tsx`
- `apps/frontend/src/App.tsx`

---

## Next Verification After Fix

Re-run the login screen suite and confirm:
- `LOGIN-SCREEN-007` passes for `/forgot-password`
- `LOGIN-SCREEN-008` passes for `/register`
- public-route behavior remains correct for unauthenticated users

Dashboard screen currently requires no defect follow-up. Re-run if dashboard UI structure changes materially.

Requests screen currently requires no defect follow-up. Re-run if request list population or modal structure changes materially.