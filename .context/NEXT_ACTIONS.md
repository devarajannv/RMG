# Next Actions

> **Priority Action Queue for RMGaaS**  
> **Last Updated:** 2025-12-06T00:00:00Z

---

## How This Works

1. Tasks are prioritized P0 (critical) → P3 (low)
2. Within priority, lower action IDs go first
3. Before starting, claim with: `ctx-claim -Id A001`
4. When done: `ctx-release -Id A001 -Complete`
5. Add new actions with: `ctx-action -Add`

---

## 🔴 P0 - Critical (Do Immediately)

### A001: Initialize Project Structure
```
Status: 🟡 Unclaimed
Type: Setup
Effort: 2h
Dependencies: None
```
**Tasks:**
- [ ] Run `npm init` with correct metadata
- [ ] Set up TypeScript configuration
- [ ] Configure ESLint + Prettier
- [ ] Set up Husky for pre-commit hooks
- [ ] Create folder structure (src/client, src/server, etc.)
- [ ] Initialize Git repository

**Acceptance Criteria:**
- Project runs `npm run dev` without errors
- TypeScript compiles without errors
- Lint passes with no warnings

---

### A002: Set Up Database Schema
```
Status: 🟡 Unclaimed
Type: Database
Effort: 4h
Dependencies: A001
```
**Tasks:**
- [ ] Initialize Prisma with PostgreSQL
- [ ] Create core schemas:
  - [ ] Tenant (organization)
  - [ ] User
  - [ ] Resource (employee)
  - [ ] Project
  - [ ] Allocation
  - [ ] Skill
- [ ] Set up multi-tenant RLS policies
- [ ] Create seed data script

**Acceptance Criteria:**
- `prisma migrate dev` runs successfully
- Seed data populates correctly
- RLS prevents cross-tenant access

---

### A003: Implement Authentication
```
Status: 🟡 Unclaimed
Type: Backend
Effort: 6h
Dependencies: A002
```
**Tasks:**
- [ ] Create auth service with JWT
- [ ] Implement password hashing (argon2)
- [ ] Build login endpoint
- [ ] Build logout endpoint
- [ ] Build refresh token endpoint
- [ ] Create auth middleware
- [ ] Add rate limiting

**Acceptance Criteria:**
- Login returns valid JWT
- Refresh works correctly
- Protected routes reject invalid tokens
- Rate limiting prevents brute force

---

## 🟠 P1 - High Priority (This Sprint)

### A004: Resource CRUD API
```
Status: 🟡 Unclaimed
Type: Backend
Effort: 4h
Dependencies: A002, A003
```
**Tasks:**
- [ ] GET /resources (list with filters)
- [ ] GET /resources/:id
- [ ] POST /resources
- [ ] PUT /resources/:id
- [ ] DELETE /resources/:id
- [ ] Input validation
- [ ] Unit tests

---

### A005: GraphQL Query Layer
```
Status: 🟡 Unclaimed
Type: Backend
Effort: 4h
Dependencies: A004
```
**Tasks:**
- [ ] Set up Apollo Server
- [ ] Define GraphQL schema
- [ ] Implement resolvers for:
  - [ ] Resources query
  - [ ] Projects query
  - [ ] Allocations query
- [ ] Add authentication to context
- [ ] DataLoader for N+1 prevention

---

### A006: Frontend Foundation
```
Status: 🟡 Unclaimed
Type: Frontend
Effort: 3h
Dependencies: A001
```
**Tasks:**
- [ ] Vite + React setup
- [ ] TailwindCSS configuration
- [ ] shadcn/ui component setup
- [ ] React Router configuration
- [ ] Layout components (sidebar, header)
- [ ] Theme support (light/dark)

---

### A007: Login UI
```
Status: 🟡 Unclaimed
Type: Frontend
Effort: 3h
Dependencies: A003, A006
```
**Tasks:**
- [ ] Login page design
- [ ] Form validation
- [ ] API integration
- [ ] Token storage
- [ ] Auth context/provider
- [ ] Protected route wrapper

---

## 🟡 P2 - Medium Priority (Next Sprint)

### A008: Resource List UI
```
Status: 🟡 Unclaimed
Type: Frontend
Effort: 4h
Dependencies: A004, A007
```
**Tasks:**
- [ ] Data table component
- [ ] Filters (skill, availability, band)
- [ ] Search functionality
- [ ] Pagination
- [ ] Export to CSV

---

### A009: Resource Detail/Edit UI
```
Status: 🟡 Unclaimed
Type: Frontend
Effort: 4h
Dependencies: A008
```
**Tasks:**
- [ ] Detail view layout
- [ ] Edit form with validation
- [ ] Skill management
- [ ] Allocation timeline
- [ ] Activity history

---

### A010: Dashboard MVP
```
Status: 🟡 Unclaimed
Type: Frontend
Effort: 6h
Dependencies: A005, A007
```
**Tasks:**
- [ ] Dashboard layout
- [ ] KPI cards (bench, utilization, etc.)
- [ ] Utilization chart
- [ ] Availability timeline
- [ ] Quick actions

---

### A011: Allocation Management API
```
Status: 🟡 Unclaimed
Type: Backend
Effort: 6h
Dependencies: A004
```
**Tasks:**
- [ ] Allocation CRUD endpoints
- [ ] Conflict detection
- [ ] Capacity calculation
- [ ] Timeline queries
- [ ] Bulk operations

---

## 🟢 P3 - Low Priority (Backlog)

### A012: CSV Import
```
Status: 🟡 Unclaimed
Type: Backend
Effort: 4h
Dependencies: A004
```

### A013: Notification System
```
Status: 🟡 Unclaimed
Type: Backend
Effort: 6h
Dependencies: A003
```

### A014: Audit Logging
```
Status: 🟡 Unclaimed
Type: Backend
Effort: 3h
Dependencies: A003
```

### A015: Docker Setup
```
Status: 🟡 Unclaimed
Type: DevOps
Effort: 3h
Dependencies: A001
```

### A016: CI/CD Pipeline
```
Status: 🟡 Unclaimed
Type: DevOps
Effort: 4h
Dependencies: A015
```

---

## Completed Actions

| ID | Title | Completed | By |
|----|-------|-----------|-----|
| - | - | - | - |

---

## Blocked Actions

| ID | Title | Blocked By | Notes |
|----|-------|------------|-------|
| - | - | - | - |

---

## Action ID Reference

| Range | Category |
|-------|----------|
| A001-A050 | Setup & Infrastructure |
| A051-A100 | Authentication & Security |
| A101-A200 | Resource Management |
| A201-A300 | Allocation & Scheduling |
| A301-A400 | Reporting & Analytics |
| A401-A500 | Integrations |
| A501+ | Enhancements |

---

## Commands

```powershell
# List all actions
.\ctx-action.ps1 -List

# Add new action
.\ctx-action.ps1 -Add -Title "New task" -Priority P1 -Effort 2

# Claim an action
.\ctx-claim.ps1 -Id A001

# Complete an action
.\ctx-release.ps1 -Id A001 -Complete

# See what's claimed
.\ctx-who.ps1
```
