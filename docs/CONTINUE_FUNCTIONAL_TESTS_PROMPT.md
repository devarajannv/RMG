# Comprehensive Functional Test Implementation Prompt

## Context

You are continuing a functional test implementation effort for an RMG (Resource Management) application built with:
- **Frontend**: React + TypeScript + Vite
- **Testing**: Vitest + React Testing Library + MSW
- **Backend**: Node.js + Express + Prisma

## What Was Completed

### 1. Bug Fix (Currency Dropdown)
Fixed incorrect API endpoints in 3 files:
- `DashboardPage.tsx`: `/currency` → `/currency/currencies`, `/currency/convert` → `/currency/exchange-rates/convert`
- `ClientDetailPage.tsx`: Same fixes
- `AnalyticsPage.tsx`: Same fixes

### 2. DashboardPage Functional Tests (24 tests - ALL PASSING)
Created `/apps/frontend/src/pages/DashboardPage.test.tsx` with comprehensive tests:
- Currency selector loads and converts values
- API calls to correct endpoints
- Refresh functionality
- Error handling with Try Again
- KPI card rendering with real data

### 3. MSW Handler Updates
Added to `/apps/frontend/src/test/mocks/handlers.ts`:
- Dashboard metrics, utilization-trend, practice-utilization, capacity-forecast
- Currency exchange-rates/convert endpoint
- Updated mockCurrencies to use INR as base currency

## What Needs To Be Done

Create functional tests for the remaining 14 pages following this pattern:

### Test Pattern
```typescript
describe('PageName', () => {
  beforeEach(() => { resetMockData(); });

  describe('Page Rendering', () => { /* verify UI loads with API data */ });
  describe('Create', () => { /* test add modal, form submission, API call */ });
  describe('Update', () => { /* test edit form, API call */ });
  describe('Delete', () => { /* test confirmation, API call */ });
  describe('Navigation', () => { /* test routing to detail pages */ });
  describe('Error Handling', () => { /* test API failure scenarios */ });
});
```

### Pages To Test (in priority order)

1. **LoginPage** - `/apps/frontend/src/pages/LoginPage.tsx`
   - Test login form validation
   - Test `authApi.login()` call
   - Test SSO button redirects to `/api/v1/auth/microsoft`
   - Test error display

2. **ResourceDetailPage** - `/apps/frontend/src/pages/ResourceDetailPage.tsx`
   - Test loads resource by ID from URL params
   - Test edit functionality
   - Test navigation back to list

3. **ProjectDetailPage** - `/apps/frontend/src/pages/ProjectDetailPage.tsx`
   - Test team assignment features
   - Test status changes

4. **ClientDetailPage** - `/apps/frontend/src/pages/ClientDetailPage.tsx`
   - Test currency display (uses same currency endpoints as Dashboard)
   - Test contracts/projects listing

5. **ContractDetailPage** - `/apps/frontend/src/pages/ContractDetailPage.tsx`
   - Test activation workflow
   - Test value display with currency

6. **TimesheetsPage** - `/apps/frontend/src/pages/TimesheetsPage.tsx`
   - Test entry creation
   - Test approval workflow

7. **BenchAnalysisPage** - `/apps/frontend/src/pages/BenchAnalysisPage.tsx`
   - Test filtering
   - Test availability display

8. **AnalyticsPage** - `/apps/frontend/src/pages/AnalyticsPage.tsx`
   - Similar to Dashboard - test currency conversion
   - Test chart rendering

9. **SmartSearchPage** - `/apps/frontend/src/pages/SmartSearchPage.tsx`
   - Test AI search submission
   - Test result navigation

10. **ExportImportPage** - `/apps/frontend/src/pages/ExportImportPage.tsx`
    - Test export triggers
    - Test import validation

11. **ReportsPage** - `/apps/frontend/src/pages/ReportsPage.tsx`
    - Test report generation
    - Test filters

12. **SettingsPage** - Enhance existing tests at `/apps/frontend/src/pages/SettingsPage.test.tsx`
    - Add functional tests for each of the 7 tabs
    - Test form submissions for each tab

13. **Enhance existing tests** for ResourcesPage, ProjectsPage, ClientsPage, ContractsPage, AllocationsPage
    - Currently only test rendering
    - Need to add CRUD operation tests

## Key Files Reference

### Test Utilities
```typescript
// /apps/frontend/src/test/utils.tsx
import { renderWithProviders } from '../test/utils';
// Returns { user, queryClient, ...renderResult }
```

### MSW Handlers
```typescript
// /apps/frontend/src/test/mocks/handlers.ts
import { resetMockData, mockResources, mockProjects, ... } from '../test/mocks/handlers';
import { server } from '../test/mocks/server';
import { http, HttpResponse } from 'msw';

// Override handlers for specific tests:
server.use(
  http.get('/api/v1/endpoint', () => {
    return HttpResponse.json({ data: ... });
  })
);
```

### API Pattern
Frontend uses `/apps/frontend/src/lib/api.ts`:
```typescript
api.get<ResponseType>('/endpoint')
api.post<ResponseType>('/endpoint', body)
api.put<ResponseType>('/endpoint', body)
api.delete('/endpoint')
```

## MSW Handlers May Need Adding

Check each page's API calls and ensure handlers exist:

```bash
# Find API calls in a page
grep -n "api\.\(get\|post\|put\|delete\)" apps/frontend/src/pages/PageName.tsx
```

Example handlers to add:
```typescript
// Timesheets
http.get(`${API_BASE}/timesheets`, () => { ... })
http.post(`${API_BASE}/timesheets`, () => { ... })

// Analytics
http.get(`${API_BASE}/analytics/utilization`, () => { ... })
http.get(`${API_BASE}/analytics/revenue`, () => { ... })

// Reports
http.get(`${API_BASE}/reports/generate`, () => { ... })

// Smart Search
http.post(`${API_BASE}/intelligence/search`, () => { ... })
```

## Commands

```bash
# Run all frontend tests
cd /home/devarajan/RMG/RMG/apps/frontend && npm test

# Run specific test file
npm test -- --run PageName.test.tsx

# Run with verbose output
npm test -- --run PageName.test.tsx 2>&1
```

## Current Test Status

- **Total tests before this effort**: 41 (passing)
- **DashboardPage tests added**: 24 (passing)
- **Current total**: 65 tests
- **Target**: ~150-200 tests for comprehensive coverage

## Documentation

Update `/home/devarajan/RMG/RMG/docs/FUNCTIONAL_TEST_TODO.md` as you complete each page.

## Final Deliverable

After all tests are created, generate a comprehensive test documentation file at:
`/home/devarajan/RMG/RMG/docs/TEST_DOCUMENTATION.md`

This should include:
- Complete list of all tests by page
- Test coverage summary
- How to run tests
- How to add new tests
