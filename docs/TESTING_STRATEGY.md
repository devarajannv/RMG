# Testing Strategy

> **Last Updated:** December 30, 2025

## Fundamental Principle

> **Tests exist to find bugs in the product. NOT to be weakened until they pass.**

When a test fails:
1. **FIRST**: Investigate the component - is this a real bug?
2. **SECOND**: If it's a real bug, fix the component
3. **ONLY LAST**: If the test expectation is genuinely wrong, fix the test

---

## Test Suite Overview (December 30, 2025)

### Backend Tests: 1,700+ tests

| Category | Tests | Status |
|----------|-------|--------|
| Unit Tests | 1,644 | ✅ All Passing |
| E2E Tests | 10 suites | ✅ All Passing |
| Performance Tests | 3 suites | ✅ All Passing |
| **Total** | **1,700+** | ✅ All Passing |

### E2E Test Suites (NEW)

| Suite | Coverage | File |
|-------|----------|------|
| Authentication | Login, logout, session, rate limiting | `auth.e2e.test.ts` |
| Requests | Full CRUD, status transitions | `requests.e2e.test.ts` |
| Approvals | Multi-step chains, delegation, SLA | `approval-workflow.e2e.test.ts` |
| Resources | CRUD, status, manager hierarchy | `resources.e2e.test.ts` |
| Contracts | Lifecycle, milestones, documents | `contracts.e2e.test.ts` |
| Budget | Creation, utilization, alerts | `budget.e2e.test.ts` |
| Timesheets | Entry, submission, approval | `timesheet.e2e.test.ts` |
| Notifications | Create, read states, bulk ops | `notifications.e2e.test.ts` |
| Webhooks | Config, events, signatures | `webhooks.e2e.test.ts` |
| Search | Full-text, facets, pagination | `search.e2e.test.ts` |

### Performance Tests (NEW)

| Test | Target | Status |
|------|--------|--------|
| Health endpoint latency | <50ms | ✅ |
| Auth under load (10 concurrent) | <500ms p99 | ✅ |
| API response time | <200ms average | ✅ |

### Frontend Tests: 23+ tests

| Category | Tests | Status |
|----------|-------|--------|
| Component Tests | 23+ | ✅ All Passing |
| E2E Ready | Playwright configured | ✅ Ready |

---

## Current Test Coverage (Updated December 30, 2025)

### Frontend Tests (204 total)

| Page | Tests | Status |
|------|-------|--------|
| LoginPage | 10 | ✅ Passing |
| DashboardPage | 12 | ✅ Passing |
| ResourcesPage | 10 | ✅ Passing |
| ProjectsPage | 11 | ✅ Passing |
| AllocationsPage | 20 | ✅ Passing |
| ClientsPage | 12 | ✅ Passing |
| ContractsPage | 9 | ✅ Passing |
| SettingsPage | 15 | ✅ Passing |
| AnalyticsPage | 10 | ✅ Passing |
| BenchAnalysisPage | 14 | ✅ Passing |
| ReportsPage | 19 | ✅ Passing |
| TimesheetsPage | 8 | ✅ Passing |
| SmartSearchPage | 9 | ✅ Passing |
| ExportImportPage | 11 | ✅ Passing |
| ResourceDetailPage | 3 | ✅ Passing |
| ProjectDetailPage | 3 | ✅ Passing |
| ClientDetailPage | 2 | ✅ Passing |
| ContractDetailPage | 2 | ✅ Passing |
| Global Components | 24 | ✅ Passing |
| **Total** | **204** | ✅ All Passing |

### Backend Tests (889 total)

| Module | Tests | Status |
|--------|-------|--------|
| Resources | 57 | ✅ Passing |
| Allocations | 45 | ✅ Passing |
| Analytics | 103 | ✅ Passing |
| AI Migration | 79 | ✅ Passing |
| Currency | 80 | ✅ Passing |
| Other Modules | 525+ | ✅ Passing |
| **Total** | **889** | ✅ All Passing |

### Overall: 1,093 tests (100% passing)

### Bugs Found and Fixed
1. **ResourcesPage**: Skills data structure mismatch (objects vs strings) - Fixed in MSW mock data
2. **ClientsPage**: API response format mismatch (missing pagination wrapper) - Fixed in MSW handler
3. **AllocationsPage**: Missing rolloffs endpoint handler - Added to MSW handlers
4. **ContractsPage**: Missing stats/summary endpoint handler - Added to MSW handlers

## What We Deleted (And Why)

### Removed Files
- 16 test files in `/apps/frontend/src/pages/*.test.tsx` (~200KB)
- 1300+ line bloated `handlers.ts` mock file

### Why They Were Useless
1. **Tests were weakened to pass** - When assertions failed, we changed:
   - `getByText()` → `getAllByText()[0]` (hides duplicate text bugs)
   - `getByRole('button', { name: 'Save' })` → `getByRole('button')` (loses specificity)
   - Removed assertions entirely when they failed

2. **Tests proved nothing** - A test that just renders without assertions tells you nothing:
   ```tsx
   // USELESS TEST
   it('renders', () => {
     render(<Component />);
     expect(true).toBe(true);
   });
   ```

3. **False confidence** - 294 "passing" tests that don't actually verify behavior are worse than 0 tests

## Correct Testing Approach

### 1. Test Real User Behavior
```tsx
// GOOD: Tests actual user flow
it('should create a resource when form is submitted', async () => {
  const { user } = renderWithProviders(<ResourcesPage />);
  
  // User clicks Add button
  await user.click(screen.getByRole('button', { name: /add resource/i }));
  
  // User fills form
  await user.type(screen.getByLabelText(/first name/i), 'John');
  await user.type(screen.getByLabelText(/last name/i), 'Doe');
  await user.type(screen.getByLabelText(/email/i), 'john@example.com');
  
  // User submits
  await user.click(screen.getByRole('button', { name: /save/i }));
  
  // Verify success - this MUST be visible to user
  await waitFor(() => {
    expect(screen.getByText(/resource created/i)).toBeInTheDocument();
  });
});
```

### 2. When Tests Fail - Investigation Checklist

1. **Read the error message** - What exactly failed?
2. **Check the rendered output** - Use `screen.debug()` to see what's actually rendered
3. **Compare to real browser** - Does the component work in the actual app?
4. **Identify the root cause**:
   - Component bug? → Fix the component
   - Missing data handling? → Fix the component
   - Wrong test expectation? → Only then fix the test

### 3. Test Categories

| Category | What to Test | Example |
|----------|--------------|---------|
| **Rendering** | Critical content appears | Page title, main heading |
| **Data Display** | API data shows correctly | Resource names, project counts |
| **User Actions** | Buttons/forms work | Create, Edit, Delete flows |
| **Error States** | Failures show feedback | "Failed to load" messages |
| **Navigation** | Links go to right places | Click project → project detail |

### 4. What NOT to Test

- Implementation details (internal state, hooks)
- Third-party library functionality
- Styling/CSS (unless critical to UX)
- Every possible edge case (focus on common paths)

## Test File Structure

```
apps/frontend/src/
├── test/
│   ├── setup.ts              # Vitest config, MSW setup
│   ├── utils.tsx             # renderWithProviders helper
│   └── mocks/
│       ├── handlers.ts       # MSW API mocks (LEAN - ~280 lines)
│       └── server.ts         # MSW server instance
└── pages/
    ├── ResourcesPage.tsx
    └── ResourcesPage.test.tsx  # Co-located with component
```

## MSW Handler Rules

1. **Return realistic data** - Match actual API response structure
2. **Keep it minimal** - Don't add handlers "just in case"
3. **Add handlers as needed** - When a real test needs an endpoint
4. **Verify handler matches API** - Check against actual backend routes

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific file
npm test -- ResourcesPage.test.tsx

# Run in watch mode
npm test -- --watch
```

## Quality Checklist

Before considering tests "done":

- [ ] Tests verify actual user-visible behavior
- [ ] Tests use realistic assertions (not `expect(true).toBe(true)`)
- [ ] Failed tests were investigated before being "fixed"
- [ ] Component bugs found by tests were fixed in components
- [ ] No `getAllByText()[0]` hacks to hide duplicate content issues
- [ ] Tests run reliably (no flaky tests)

## Remember

> A failing test is **valuable information**. It's telling you something is wrong.
> Making it pass by weakening the assertion throws away that information.
