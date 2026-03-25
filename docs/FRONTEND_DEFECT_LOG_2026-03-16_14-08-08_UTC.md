# Frontend Defect Log

**Logged At**: March 16, 2026 14:08:08 UTC  
**Environment**: Development  
**Frontend URL**: `http://localhost:3000`  
**API URL**: `http://localhost:4000/api/v1`  
**Test Scope**: Screen 1, Login screen; Screen 2, Dashboard landing screen; Screen 3, Requests landing screen; Screen 4, Request detail screen  
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
| Request Detail Screen | 8 | 7 | 1 | One request metadata defect confirmed on draft detail sidebar |

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

Validated working behavior:
- request detail screen renders the draft header, primary actions, and tab controls correctly
- back button returns to the Requests landing screen correctly
- Details, Comments, and History tabs switch correctly
- posting a new comment works correctly
- Edit opens and closes correctly
- saving draft edits updates the visible request title and description correctly
- submitting a draft for approval completes successfully
- cancelling a draft from More actions completes successfully

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

### DEF-REQUEST-001: Request detail sidebar shows invalid metadata for newly created draft

- **Status**: Open
- **Severity**: Medium
- **Area**: Requests, Request detail screen
- **Detected At**: March 18, 2026 12:39 UTC
- **Source Test**: `REQUEST-DETAIL-SCREEN-001`

**Observed behavior**
- A newly created `CUSTOMER_ONBOARDING` draft opens on the Request detail page with sidebar metadata showing `Type: Unknown Type` and `Version: v0`.

**Expected behavior**
- The Request detail sidebar should show the actual request type label for the created draft.
- A newly created draft should display an initial version value that makes sense to users, expected as `v1` for first saved version.

**Reproduction steps**
1. Sign in and create a valid new request draft.
2. Open the new draft on `/requests/:id`.
3. Inspect the right-hand `Request Information` sidebar.
4. Observe `Type: Unknown Type` and `Version: v0`.

**Impact**
- Request metadata looks incomplete or broken on first view.
- Users cannot trust the request type label shown on the detail page.
- `v0` suggests the record is in a pre-save or invalid state even though the draft already exists and is editable.

**Evidence**
- Screen-4 Playwright run result: 7 passed, 1 failed in the `logged-out` project.
- Captured page snapshot shows the created draft with `Type: Unknown Type` and `Version: v0` in the sidebar.
- The request was created with type code `CUSTOMER_ONBOARDING`, so the type should not be unknown.

**Likely root cause**
- Request detail metadata mapping is not resolving the request type label for seeded or API-created drafts.
- Version display is likely using a zero-based internal field directly instead of a user-facing version number.

**Suggested fix**
- Resolve the displayed type label from the request type catalog or persisted request type relation before rendering the sidebar.
- Convert internal version numbering to the user-facing convention, or initialize persisted drafts with version `1` if that is the intended product rule.

---

### DEF-DASHBOARD-001: Dashboard utilization KPI is implausibly low relative to active workload

- **Status**: Resolved
- **Severity**: High
- **Area**: Dashboard landing screen, KPI data veracity
- **Detected At**: March 24, 2026 08:10 UTC
- **Source Test**: `DASHBOARD-SCREEN-001` follow-up review

**Observed behavior**
- The dashboard currently shows `Utilization Rate: 2.4%` while also showing `152` active projects and `92` active allocations.

**Expected behavior**
- Dashboard KPIs should be business-plausible and internally credible to users.
- A tenant showing dozens of active projects and allocations should not present a near-zero utilization rate unless the underlying denominator or workload model explicitly justifies it.

**Impact**
- The main dashboard appears untrustworthy.
- Users may disregard the KPI layer entirely if headline utilization is obviously inconsistent with visible workload volume.

**Evidence**
- Live API response from `/api/v1/dashboard/metrics` returned:
	- `resources.total = 655`
	- `projects.active = 152`
	- `allocations.active = 92`
	- `utilization.current = 2.4`
- Database inspection showed:
	- `totalCapacity = 65500`
	- `totalBillable = 1590`
	- `totalNonBillable = 6600`
- The API calculation is mathematically consistent with the stored data, but the resulting KPI is not believable as an executive dashboard metric for the visible workload footprint.

**Likely root cause**
- Either the seeded/imported resource and allocation data are not balanced for dashboard reporting,
- or the utilization denominator is too broad for the KPI being presented on the main dashboard.

**Suggested fix**
- Reconcile seed/import data so active projects, active allocations, and resource capacity produce believable utilization.
- Review whether dashboard utilization should be calculated across all active resources, only deployable resources, or another narrower capacity base.
- Add business-rule validation for dashboard seed data so obviously implausible KPI combinations are caught before UI validation.

**Resolution**
- Dashboard metrics were corrected to use total utilized capacity for the headline utilization KPI instead of billable-only utilization.
- Active projects were corrected to reflect currently staffed projects rather than stale project status counts.
- Bench count was corrected to reflect active non-contractor resources without a current active allocation.

**Verification**
- Live API response from `/api/v1/dashboard/metrics` now returns internally consistent values:
	- `utilization.current = 12.5`
	- `utilization.billable = 2.4`
	- `utilization.nonBillable = 10.1`
	- `projects.active = 28`
	- `resources.onBench = 534`
- Dashboard service test file `dashboard.service.comprehensive.test.ts` passes with 15/15 tests.
- Playwright dashboard screen suite passes with 7/7 tests using the live app at `http://localhost:3000`.

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

Dashboard screen follow-up:
- Re-run `DASHBOARD-SCREEN-001` after dashboard KPI logic or seeded data is corrected.
- Verify utilization is not only within `0..100`, but also credible relative to active projects, allocations, and deployed resources.

Requests screen currently requires no defect follow-up. Re-run if request list population or modal structure changes materially.

Request detail screen follow-up:
- Re-run `REQUEST-DETAIL-SCREEN-001` after the metadata mapping/version display is corrected.
- Verify the sidebar shows the actual request type label and a user-facing initial version.

---

## Enhancements

### ENH-UX-001: Hero cards should be clickable

- **Status**: Requested
- **Priority**: Medium
- **Area**: Dashboard and comparable landing screens with hero / summary cards
- **Logged At**: March 18, 2026 12:09 UTC
- **Requested By**: User during screen-by-screen frontend review

**Requested behavior**
- Hero cards should act as direct navigation or drill-down targets instead of being static summary surfaces.

**Rationale**
- Users naturally treat high-visibility summary cards as actionable entry points.
- Making those cards clickable reduces friction when moving from overview screens into the underlying filtered detail views.

**Suggested implementation direction**
- Add clear click affordance and keyboard accessibility for hero cards.
- Route each card to the most relevant filtered destination for that metric.
- Preserve metric readability while avoiding accidental navigation from embedded controls.